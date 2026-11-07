import { Router } from 'express';
import { z } from 'zod';
import { classAccess, id, insist, serializeSubmission, student } from '../access.mjs';
import { summarySchema } from '../ai.mjs';

/** Every aggregate uses one latest attempt per active student per question. */
export function latestSubmissions(db, classId) {
  return db.prepare(`SELECT s.*,q.title AS quiz_title,q.weight FROM submissions s
    JOIN quizzes q ON q.id=s.quiz_id JOIN members m ON m.class_id=q.class_id AND m.user_id=s.student_id
    WHERE q.class_id=? AND m.status='active'
      AND s.id=(SELECT MAX(s2.id) FROM submissions s2 WHERE s2.quiz_id=s.quiz_id AND s2.student_id=s.student_id)
    ORDER BY s.id DESC`).all(classId).map(serializeSubmission);
}
function countConcepts(submissions, key) {
  const counts = new Map();
  for (const row of submissions) {
    // A teacher override can invalidate the AI's labels; don't reuse those as measured traits.
    if (row.reviewed_by || !['graded','review'].includes(row.status)) continue;
    for (const concept of new Set(row.assessment?.[key] ?? [])) counts.set(concept, (counts.get(concept) ?? 0) + 1);
  }
  return [...counts].map(([concept, count]) => ({ concept, count })).sort((a, b) => b.count - a.count);
}

export function insightRoutes(db, ai) {
  const router = Router();
  const summarizing = new Set();
  router.get('/classes/:classId/stats', (req, res) => {
    const classroom = classAccess(db, req.user, req.params.classId, true);
    const submissions = latestSubmissions(db, classroom.id);
    const scored = submissions.filter(s => s.status === 'graded' && s.score !== null);
    const summary = db.prepare('SELECT * FROM summaries WHERE class_id=?').get(classroom.id);
    res.json({
      enrolled: db.prepare("SELECT COUNT(*) AS n FROM members WHERE class_id=? AND status='active'").get(classroom.id).n,
      respondents: new Set(submissions.map(s => s.student_id)).size,
      submission_count: submissions.length, scored_count: scored.length,
      average_score: scored.length ? scored.reduce((sum, s) => sum + s.score, 0) / scored.length : null,
      distribution: [0, 20, 40, 60, 80].map(min => ({ label: min === 80 ? '80–100' : `${min}–${min + 19}`, count: scored.filter(s => s.score >= min && (min === 80 || s.score < min + 20)).length })),
      misconceptions: countConcepts(submissions, 'misconceptions'),
      review_queue: submissions.filter(s => s.status !== 'graded'),
      summary: summary ? { ...JSON.parse(summary.data), created_at: summary.created_at } : null,
    });
  });
  router.post('/classes/:classId/summary', async (req, res) => {
    const classroom = classAccess(db, req.user, req.params.classId, true);
    insist(ai.configured, 503, 'Set OPENAI_API_KEY on the server to generate a summary.');
    insist(!summarizing.has(classroom.id), 409, 'A summary is already being generated.');
    const latest = latestSubmissions(db, classroom.id).filter(s => s.status === 'graded' || s.status === 'review');
    insist(latest.length > 0, 409, 'Assess at least one response before generating a summary.');
    // Bound request size; report the subset instead of silently implying a whole-class analysis.
    const submissions = latest.slice(0, 100).map(s => ({
      id: s.id, quiz_title: s.quiz_title, answer: s.answer.slice(0, 4000), status: s.status,
      assessment: s.reviewed_by ? null : s.assessment, score: s.score, professor_note: s.review_note,
    }));
    const resources = db.prepare("SELECT id,title,content,url FROM resources WHERE class_id=? AND status='approved' ORDER BY id DESC LIMIT 12").all(classroom.id);
    summarizing.add(classroom.id);
    try {
      const result = summarySchema.parse(await ai.summarize({ classroom, submissions, resources }));
      const validIds = new Set(submissions.map(s => s.id));
      const resourceIds = new Set(resources.map(r => r.id));
      result.misconceptions = result.misconceptions.map(m => ({ ...m, submission_ids: [...new Set(m.submission_ids.filter(i => validIds.has(i)))] })).filter(m => m.submission_ids.length);
      result.recommended_resource_ids = [...new Set(result.recommended_resource_ids.filter(i => resourceIds.has(i)))];
      result.responses_analyzed = submissions.length;
      result.total_assessed_responses = latest.length;
      db.prepare('INSERT OR REPLACE INTO summaries(class_id,data) VALUES (?,?)').run(classroom.id, JSON.stringify(result));
      res.json({ summary: result });
    } finally { summarizing.delete(classroom.id); }
  });
  router.get('/classes/:classId/leaderboard', (req, res) => {
    const classroom = classAccess(db, req.user, req.params.classId);
    const latest = latestSubmissions(db, classroom.id);
    const members = db.prepare(`SELECT u.id,u.name FROM members m JOIN users u ON u.id=m.user_id
      WHERE m.class_id=? AND m.status='active'`).all(classroom.id);
    const leaderboard = members.map(member => ({ ...member,
      points: latest.filter(s => s.student_id === member.id && s.status === 'graded' && s.score !== null)
        .reduce((sum, s) => sum + s.weight * s.score / 100, 0),
    })).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
    res.json({ leaderboard });
  });
  router.get('/progress', (req, res) => {
    student(req);
    const classes = db.prepare("SELECT class_id FROM members WHERE user_id=? AND status='active'").all(req.user.id);
    const submissions = classes.flatMap(c => latestSubmissions(db, c.class_id).filter(s => s.student_id === req.user.id));
    const scored = submissions.filter(s => s.status === 'graded' && s.score !== null);
    res.json({ strengths: countConcepts(submissions, 'strengths'), weaknesses: countConcepts(submissions, 'weaknesses'),
      answered: submissions.length, assessed: scored.length,
      average_score: scored.length ? scored.reduce((sum, s) => sum + s.score, 0) / scored.length : null,
    });
  });
  router.get('/notifications', (req, res) => {
    const visibility = `FROM notifications n JOIN classes c ON c.id=n.class_id
      WHERE n.user_id=? AND (c.professor_id=? OR EXISTS
        (SELECT 1 FROM members m WHERE m.class_id=c.id AND m.user_id=? AND m.status='active'))`;
    const args = [req.user.id, req.user.id, req.user.id];
    res.json({ notifications: db.prepare(`SELECT n.* ${visibility} ORDER BY n.id DESC LIMIT 100`).all(...args),
      unread: db.prepare(`SELECT COUNT(*) AS n ${visibility} AND n.read_at IS NULL`).get(...args).n });
  });
  router.post('/notifications/read', (req, res) => {
    const { ids } = z.object({ ids: z.array(id).max(100) }).parse(req.body);
    const update = db.prepare('UPDATE notifications SET read_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?');
    for (const notificationId of ids) update.run(notificationId, req.user.id);
    res.json({ ok: true });
  });
  return router;
}
