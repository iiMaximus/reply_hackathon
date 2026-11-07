import { assessmentSchema } from './ai.mjs';
import { notify } from './access.mjs';
import { requireAppropriateAnswer } from './moderation.mjs';

/** Saves first, assesses second. A failure is a retryable state, never a lost answer. */
export function createGradingService(db, ai) {
  const running = new Set();
  return {
    isRunning: id => running.has(id),
    async grade(submissionId) {
      if (running.has(submissionId)) return;
      const submission = db.prepare('SELECT * FROM submissions WHERE id=?').get(submissionId);
      if (!ai.configured) {
        db.prepare("UPDATE submissions SET status='awaiting_ai' WHERE id=?").run(submissionId);
        return;
      }
      running.add(submissionId);
      db.prepare("UPDATE submissions SET status='pending' WHERE id=?").run(submissionId);
      const quiz = db.prepare('SELECT * FROM quizzes WHERE id=?').get(submission.quiz_id);
      try {
        // Apply the policy to retries too, including work saved before moderation existed.
        requireAppropriateAnswer(submission.answer);
        const resources = db.prepare("SELECT * FROM resources WHERE class_id=? AND status='approved' ORDER BY id DESC LIMIT 12").all(quiz.class_id);
        const getImage = fileId => fileId ? db.prepare('SELECT * FROM files WHERE id=?').get(fileId) : null;
        const assessment = assessmentSchema.parse(await ai.assess({ quiz, submission, resources,
          questionImage: getImage(quiz.image_id), answerImage: getImage(submission.image_id),
          resourceImages: resources.filter(r => r.image_id).slice(0, 4).map(resource => ({ resource, file: getImage(resource.image_id) })),
        }));
        if (assessment.review_reason.trim()) assessment.needs_review = true;
        if (!submission.image_id && (assessment.evidence.length === 0 || assessment.evidence.some(e => !e.quote.trim()))) {
          assessment.needs_review = true;
          assessment.review_reason = 'No checkable evidence from the submitted answer was provided. Professor review required.';
        }
        // Evidence for typed answers must be an actual substring, not a plausible invention.
        if (!submission.image_id && assessment.evidence.some(e => !submission.answer.includes(e.quote))) {
          assessment.needs_review = true;
          assessment.review_reason = 'An AI evidence quote could not be matched to the submitted answer. Professor review required.';
        }
        if (ai.requiresProfessorReview) {
          assessment.needs_review = true;
          assessment.review_reason = [assessment.review_reason, 'Local test-model feedback requires professor approval.'].filter(Boolean).join(' ');
        }
        db.prepare('UPDATE submissions SET status=?,assessment=?,score=? WHERE id=?').run(
          assessment.needs_review ? 'review' : 'graded', JSON.stringify(assessment),
          assessment.needs_review ? null : assessment.score, submissionId);
        notify(db, submission.student_id, quiz.class_id,
          `Feedback is ready for “${quiz.title}”${assessment.needs_review ? ' (professor review needed)' : ''}.`, quiz.id);
      } catch (error) {
        // Provider errors may contain request contents. Log no credentials or student work.
        console.error('AI assessment failed:', error.name, error.status ?? 'invalid response');
        db.prepare("UPDATE submissions SET status='failed' WHERE id=?").run(submissionId);
      } finally { running.delete(submissionId); }
    },
  };
}
