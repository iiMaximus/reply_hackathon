import { Router } from 'express';
import { z } from 'zod';
import { attachment, classAccess, id, insist, notify, notifyClass, publicQuiz, quizAccess, serializeSubmission, student, text, title } from '../access.mjs';

const imageId = id.nullable().optional();
const questionInput = z.object({
  title, question: text.default(''), image_id: imageId,
  weight: z.coerce.number().positive().max(1000).default(1),
  reference_answer: text.default(''), rubric: text.default(''), notify_students: z.boolean().default(false),
}).refine(q => q.question || q.image_id, { message: 'Add question text or an image.' });

export function quizRoutes(db, grading) {
  const router = Router();
  router.get('/classes/:classId/quizzes', (req, res) => {
    const classroom = classAccess(db, req.user, req.params.classId);
    const owner = classroom.professor_id === req.user.id;
    const quizzes = db.prepare('SELECT * FROM quizzes WHERE class_id=? ORDER BY id DESC').all(classroom.id);
    res.json({ quizzes: quizzes.map(quiz => {
      if (owner) return { ...quiz, response_count: db.prepare('SELECT COUNT(DISTINCT student_id) AS n FROM submissions WHERE quiz_id=?').get(quiz.id).n };
      const latest = db.prepare('SELECT * FROM submissions WHERE quiz_id=? AND student_id=? ORDER BY id DESC LIMIT 1').get(quiz.id, req.user.id);
      return { ...publicQuiz(quiz), submission: latest ? serializeSubmission(latest) : null };
    }) });
  });
  router.post('/classes/:classId/quizzes', (req, res) => {
    const classroom = classAccess(db, req.user, req.params.classId, true);
    const input = questionInput.parse(req.body);
    attachment(db, req.user, classroom.id, input.image_id, 'question');
    const result = db.prepare(`INSERT INTO quizzes(class_id,title,question,image_id,weight,reference_answer,rubric)
      VALUES (?,?,?,?,?,?,?)`).run(classroom.id, input.title, input.question, input.image_id ?? null,
      input.weight, input.reference_answer, input.rubric);
    const quizId = Number(result.lastInsertRowid);
    if (input.notify_students) notifyClass(db, classroom.id, `New question in ${classroom.name}: ${input.title}`, quizId);
    res.status(201).json({ id: quizId });
  });
  router.get('/quizzes/:quizId', (req, res) => {
    const quiz = quizAccess(db, req.user, req.params.quizId);
    const owner = db.prepare('SELECT professor_id FROM classes WHERE id=?').get(quiz.class_id).professor_id === req.user.id;
    const rows = owner
      ? db.prepare(`SELECT s.*,u.name AS student_name,u.email AS student_email FROM submissions s
          JOIN users u ON u.id=s.student_id WHERE quiz_id=? ORDER BY s.id DESC`).all(quiz.id)
      : db.prepare('SELECT * FROM submissions WHERE quiz_id=? AND student_id=? ORDER BY id DESC').all(quiz.id, req.user.id);
    res.json({ quiz: owner ? quiz : publicQuiz(quiz), submissions: rows.map(serializeSubmission) });
  });
  router.patch('/quizzes/:quizId', (req, res) => {
    const quiz = quizAccess(db, req.user, req.params.quizId, true);
    const { status } = z.object({ status: z.enum(['open','closed','archived']) }).parse(req.body);
    db.prepare('UPDATE quizzes SET status=? WHERE id=?').run(status, quiz.id);
    res.json({ ok: true });
  });
  router.post('/quizzes/:quizId/notify', (req, res) => {
    const quiz = quizAccess(db, req.user, req.params.quizId, true);
    insist(quiz.status === 'open', 409, 'Reopen the question before notifying students.');
    notifyClass(db, quiz.class_id, `Reminder: ${quiz.title}`, quiz.id);
    res.json({ ok: true });
  });
  router.post('/quizzes/:quizId/submissions', async (req, res) => {
    student(req);
    const quiz = quizAccess(db, req.user, req.params.quizId);
    insist(quiz.status === 'open', 409, 'This question is closed. Your previous work is still available.');
    const input = z.object({ answer: text.default(''), image_id: imageId })
      .refine(s => s.answer || s.image_id, { message: 'Write an answer or attach an image.' }).parse(req.body);
    attachment(db, req.user, quiz.class_id, input.image_id, 'answer');
    insist(!db.prepare("SELECT 1 FROM submissions WHERE quiz_id=? AND student_id=? AND status='pending'")
      .get(quiz.id, req.user.id), 409, 'Your previous answer is still being assessed.');
    const result = db.prepare('INSERT INTO submissions(quiz_id,student_id,answer,image_id) VALUES (?,?,?,?)')
      .run(quiz.id, req.user.id, input.answer, input.image_id ?? null);
    const submissionId = Number(result.lastInsertRowid);
    await grading.grade(submissionId);
    res.status(201).json({ submission: serializeSubmission(db.prepare('SELECT * FROM submissions WHERE id=?').get(submissionId)) });
  });
  router.post('/submissions/:submissionId/retry', async (req, res) => {
    const submission = db.prepare('SELECT * FROM submissions WHERE id=?').get(id.parse(req.params.submissionId));
    insist(submission, 404, 'Submission not found.');
    quizAccess(db, req.user, submission.quiz_id, submission.student_id !== req.user.id);
    insist(['awaiting_ai','failed'].includes(submission.status), 409, 'Only unassessed submissions can be retried.');
    insist(!grading.isRunning(submission.id), 409, 'Assessment already running.');
    await grading.grade(submission.id);
    res.json({ ok: true });
  });
  router.patch('/submissions/:submissionId/review', (req, res) => {
    const submission = db.prepare('SELECT * FROM submissions WHERE id=?').get(id.parse(req.params.submissionId));
    insist(submission, 404, 'Submission not found.');
    const quiz = quizAccess(db, req.user, submission.quiz_id, true);
    insist(!grading.isRunning(submission.id), 409, 'Wait for assessment to finish.');
    const { score, note } = z.object({ score: z.coerce.number().min(0).max(100), note: z.string().trim().min(1).max(5000) }).parse(req.body);
    db.prepare("UPDATE submissions SET score=?,status='graded',review_note=?,reviewed_by=? WHERE id=?")
      .run(score, note, req.user.id, submission.id);
    notify(db, submission.student_id, quiz.class_id, `Professor feedback is ready for “${quiz.title}”.`, quiz.id);
    res.json({ ok: true });
  });
  return router;
}
