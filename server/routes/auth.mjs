import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { email, title, insist, requireLogin } from '../access.mjs';

const account = z.object({
  name: title, email, password: z.string().min(10).max(72), role: z.enum(['student', 'professor']),
});
const credentials = z.object({ email, password: z.string().min(1).max(72) });

function signIn(req, userId) {
  return new Promise((resolve, reject) => req.session.regenerate(error => {
    if (error) return reject(error);
    req.session.userId = userId;
    req.session.save(error => error ? reject(error) : resolve());
  }));
}

export function authRoutes(db) {
  const router = Router();
  const attempts = rateLimit({ windowMs: 15 * 60 * 1000, limit: 40,
    standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many attempts. Try again in 15 minutes.' } });
  router.post('/register', attempts, async (req, res) => {
    const input = account.parse(req.body);
    insist(Buffer.byteLength(input.password) <= 72, 400, 'Password must fit within 72 UTF-8 bytes.');
    const hash = await bcrypt.hash(input.password, 12);
    // Check after hashing too: another request may have registered this email while we awaited.
    insist(!db.prepare('SELECT id FROM users WHERE email=?').get(input.email), 409, 'That email is already registered.');
    const result = db.prepare('INSERT INTO users(name,email,password_hash,role) VALUES (?,?,?,?)')
      .run(input.name, input.email, hash, input.role);
    await signIn(req, Number(result.lastInsertRowid));
    res.status(201).json({ user: { id: Number(result.lastInsertRowid), name: input.name, email: input.email, role: input.role } });
  });
  router.post('/login', attempts, async (req, res) => {
    const input = credentials.parse(req.body);
    const user = db.prepare('SELECT * FROM users WHERE email=?').get(input.email);
    // Use a real hash even for unknown addresses to keep the expensive path comparable.
    const hash = user?.password_hash ?? '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxCO0WtQfUU4mSj49R8HcOSG7me';
    const valid = await bcrypt.compare(input.password, hash);
    insist(user && valid, 401, 'Email or password is incorrect.');
    await signIn(req, user.id);
    const { password_hash, ...safe } = user;
    res.json({ user: safe });
  });
  router.get('/me', requireLogin, (req, res) => res.json({ user: req.user }));
  router.post('/logout', requireLogin, (req, res, next) => {
    req.session.destroy(error => {
      if (error) return next(error);
      res.clearCookie('classroom.sid').json({ ok: true });
    });
  });
  return router;
}
