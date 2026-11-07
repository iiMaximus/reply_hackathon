import { z } from 'zod';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function insist(condition, status, message) {
  if (!condition) throw new HttpError(status, message);
}
export const id = z.coerce.number().int().positive();
export const email = z.string().trim().toLowerCase().email().max(254);
export const text = z.string().trim().max(50000);
export const title = z.string().trim().min(1).max(200);

export function requireLogin(req, _res, next) {
  insist(req.user, 401, 'Please sign in.');
  next();
}
export function professor(req) {
  insist(req.user.role === 'professor', 403, 'Professor access required.');
}
export function student(req) {
  insist(req.user.role === 'student', 403, 'Student access required.');
}
export function classAccess(db, user, classId, ownerOnly = false) {
  const classroom = db.prepare('SELECT * FROM classes WHERE id=?').get(id.parse(classId));
  insist(classroom, 404, 'Class not found.');
  if (classroom.professor_id === user.id) return classroom;
  insist(!ownerOnly, 403, 'Only the class professor can do that.');
  const member = db.prepare('SELECT status FROM members WHERE class_id=? AND user_id=?').get(classroom.id, user.id);
  insist(member?.status === 'active', 403, 'You are not an active member of this class.');
  return classroom;
}
export function quizAccess(db, user, quizId, ownerOnly = false) {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id=?').get(id.parse(quizId));
  insist(quiz, 404, 'Question not found.');
  classAccess(db, user, quiz.class_id, ownerOnly);
  return quiz;
}
export function attachment(db, user, classId, fileId, purpose) {
  if (!fileId) return;
  const file = db.prepare('SELECT * FROM files WHERE id=?').get(fileId);
  insist(file && file.owner_id === user.id && file.class_id === classId && file.purpose === purpose,
    400, 'Invalid image attachment.');
}
export function notify(db, userId, classId, message, quizId = null) {
  db.prepare('INSERT INTO notifications(user_id,class_id,quiz_id,message) VALUES (?,?,?,?)')
    .run(userId, classId, quizId, message);
}
export function notifyClass(db, classId, message, quizId = null) {
  for (const member of db.prepare("SELECT user_id FROM members WHERE class_id=? AND status='active'").all(classId)) {
    notify(db, member.user_id, classId, message, quizId);
  }
}
export function publicQuiz(quiz) {
  const { reference_answer, rubric, ...visible } = quiz;
  return visible;
}
export function serializeSubmission(row) {
  return { ...row, assessment: row.assessment ? JSON.parse(row.assessment) : null };
}
