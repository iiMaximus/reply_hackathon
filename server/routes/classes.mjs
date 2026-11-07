import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { classAccess, email, id, insist, notify, professor, student, text, title } from '../access.mjs';

const settings = z.object({
  name: title, description: text, join_mode: z.enum(['open','approval','whitelist']),
});
const createSettings = settings.extend({
  description: text.default(''), join_mode: settings.shape.join_mode.default('approval'),
});
const updateSettings = settings.partial().refine(value => Object.keys(value).length > 0, {
  message: 'Supply at least one class setting to update.',
});

export function classRoutes(db) {
  const router = Router();
  router.get('/', (req, res) => {
    const rows = req.user.role === 'professor'
      ? db.prepare("SELECT *, 'owner' AS membership FROM classes WHERE professor_id=? ORDER BY id DESC").all(req.user.id)
      : db.prepare(`SELECT c.id,c.name,c.description,c.created_at,m.status AS membership,u.name AS professor_name
          FROM classes c JOIN members m ON m.class_id=c.id JOIN users u ON u.id=c.professor_id
          WHERE m.user_id=? AND m.status!='blocked' ORDER BY c.id DESC`).all(req.user.id);
    res.json({ classes: rows });
  });
  router.post('/', (req, res) => {
    professor(req);
    const input = createSettings.parse(req.body);
    const code = randomBytes(5).toString('hex').toUpperCase();
    const result = db.prepare('INSERT INTO classes(professor_id,name,description,code,join_mode) VALUES (?,?,?,?,?)')
      .run(req.user.id, input.name, input.description, code, input.join_mode);
    res.status(201).json({ id: Number(result.lastInsertRowid) });
  });
  router.post('/join', (req, res) => {
    student(req);
    const { code } = z.object({ code: z.string().trim().toUpperCase().min(1).max(30) }).parse(req.body);
    const classroom = db.prepare('SELECT * FROM classes WHERE code=?').get(code);
    insist(classroom, 404, 'No class matches that code.');
    const existing = db.prepare('SELECT status FROM members WHERE class_id=? AND user_id=?').get(classroom.id, req.user.id);
    insist(existing?.status !== 'blocked', 403, 'You have been removed from this class. Contact the professor.');
    if (existing) return res.json({ id: classroom.id, membership: existing.status });
    const allowed = db.prepare('SELECT 1 FROM whitelist WHERE class_id=? AND email=?').get(classroom.id, req.user.email);
    insist(classroom.join_mode !== 'whitelist' || allowed, 403, 'Your email is not on this class’s whitelist.');
    const status = classroom.join_mode === 'approval' && !allowed ? 'pending' : 'active';
    db.prepare('INSERT INTO members VALUES (?,?,?)').run(classroom.id, req.user.id, status);
    notify(db, classroom.professor_id, classroom.id, `${req.user.name} ${status === 'pending' ? 'requested to join' : 'joined'} ${classroom.name}.`);
    res.status(201).json({ id: classroom.id, membership: status });
  });
  router.get('/:classId', (req, res) => {
    const classroom = classAccess(db, req.user, req.params.classId);
    if (classroom.professor_id !== req.user.id) delete classroom.code;
    res.json({ classroom });
  });
  router.patch('/:classId', (req, res) => {
    const classroom = classAccess(db, req.user, req.params.classId, true);
    const input = { ...classroom, ...updateSettings.parse(req.body) };
    db.prepare('UPDATE classes SET name=?,description=?,join_mode=? WHERE id=?')
      .run(input.name, input.description, input.join_mode, classroom.id);
    res.json({ ok: true });
  });
  router.get('/:classId/members', (req, res) => {
    const classroom = classAccess(db, req.user, req.params.classId, true);
    res.json({ members: db.prepare(`SELECT u.id,u.name,u.email,m.status FROM members m JOIN users u ON u.id=m.user_id
      WHERE class_id=? ORDER BY m.status,u.name`).all(classroom.id),
      whitelist: db.prepare('SELECT email FROM whitelist WHERE class_id=? ORDER BY email').all(classroom.id).map(row => row.email) });
  });
  router.put('/:classId/whitelist', (req, res) => {
    const classroom = classAccess(db, req.user, req.params.classId, true);
    const { emails } = z.object({ emails: z.array(email).max(2000) }).parse(req.body);
    db.exec('BEGIN');
    try {
      db.prepare('DELETE FROM whitelist WHERE class_id=?').run(classroom.id);
      const insert = db.prepare('INSERT OR IGNORE INTO whitelist VALUES (?,?)');
      for (const address of emails) insert.run(classroom.id, address);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    res.json({ ok: true });
  });
  router.patch('/:classId/members/:userId', (req, res) => {
    const classroom = classAccess(db, req.user, req.params.classId, true);
    const { status } = z.object({ status: z.enum(['active','blocked']) }).parse(req.body);
    const userId = id.parse(req.params.userId);
    insist(db.prepare('SELECT 1 FROM members WHERE class_id=? AND user_id=?').get(classroom.id, userId), 404, 'Member not found.');
    db.prepare('UPDATE members SET status=? WHERE class_id=? AND user_id=?').run(status, classroom.id, userId);
    if (status === 'active') notify(db, userId, classroom.id, `You now have access to ${classroom.name}.`);
    res.json({ ok: true });
  });
  return router;
}
