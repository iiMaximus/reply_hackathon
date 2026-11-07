import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { SQLiteSessionStore } from './database.mjs';
import { HttpError, insist, requireLogin } from './access.mjs';
import { createGradingService } from './grading.mjs';
import { authRoutes } from './routes/auth.mjs';
import { classRoutes } from './routes/classes.mjs';
import { quizRoutes } from './routes/quizzes.mjs';
import { resourceRoutes } from './routes/resources.mjs';
import { insightRoutes } from './routes/insights.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function createApp({ db, ai, sessionSecret, trustProxy = false }) {
  const app = express();
  if (trustProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: { directives: {
      'img-src': ["'self'", 'data:', 'blob:'],
      'upgrade-insecure-requests': null, // Local HTTP must work on phones too.
    } },
    strictTransportSecurity: process.env.NODE_ENV === 'production' ? undefined : false,
  }));
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use('/api', (req, _res, next) => {
    // Custom header prevents cross-site forms, including multipart upload CSRF.
    if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
      insist(req.get('X-Requested-With') === 'classroom', 403, 'Invalid request. Refresh the page and retry.');
      const origin = req.get('origin');
      insist(!origin || origin === `${req.protocol}://${req.get('host')}`, 403, 'Cross-origin requests are not allowed.');
    }
    next();
  });
  app.use(express.json({ limit: '128kb' }));
  app.use('/api', session({
    name: 'classroom.sid', secret: sessionSecret, store: new SQLiteSessionStore(db),
    resave: false, saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'strict', secure: 'auto', maxAge: 7 * 24 * 60 * 60 * 1000 },
  }));
  app.use('/api', (req, _res, next) => {
    if (req.session.userId) req.user = db.prepare('SELECT id,name,email,role,created_at FROM users WHERE id=?').get(req.session.userId);
    next();
  });
  app.use('/api/auth', authRoutes(db));
  app.use('/api', requireLogin);
  app.get('/api/config', (_req, res) => res.json({ ai_configured: ai.configured, model: ai.model }));
  app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 180, keyGenerator: req => `user:${req.user.id}`,
    standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: 'Too many requests. Please wait a minute.' } }));
  app.use('/api/classes', classRoutes(db));
  app.use('/api', quizRoutes(db, createGradingService(db, ai)));
  app.use('/api', resourceRoutes(db));
  app.use('/api', insightRoutes(db, ai));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint not found.' }));

  app.get('/vendor/marked.js', (_req, res) => res.sendFile(resolve(root, 'node_modules/marked/lib/marked.esm.js')));
  app.get('/vendor/purify.js', (_req, res) => res.sendFile(resolve(root, 'node_modules/dompurify/dist/purify.es.mjs')));
  app.get('/vendor/marked-katex.js', (_req, res) => res.sendFile(resolve(root, 'node_modules/marked-katex-extension/lib/index.umd.js')));
  app.use('/vendor/katex', express.static(resolve(root, 'node_modules/katex/dist'), { index: false }));
  app.use(express.static(resolve(root, 'public')));
  app.use((error, _req, res, _next) => {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues.map(i => `${i.path.join('.') || 'Input'}: ${i.message}`).join('; ') });
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Images must be 8 MB or smaller.' });
    const status = error.status ?? (error.name === 'MulterError' ? 400 : 500);
    if (status >= 500) console.error('Request failed:', error.name, error.status ?? 'internal');
    const message = status >= 500 && !(error instanceof HttpError)
      ? 'The request could not be completed. Your saved work is preserved.' : error.message;
    res.status(status).json({ error: message });
  });
  return app;
}
