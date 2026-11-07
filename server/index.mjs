import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './database.mjs';
import { createAI } from './ai.mjs';
import { createApp } from './app.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const databasePath = resolve(root, process.env.DATABASE_PATH || 'data/classroom.sqlite');
const db = openDatabase(databasePath);
const secretPath = resolve(dirname(databasePath), '.session-secret');
let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  if (!existsSync(secretPath)) writeFileSync(secretPath, randomBytes(48).toString('hex'), { mode: 0o600, flag: 'wx' });
  sessionSecret = readFileSync(secretPath, 'utf8');
}
const ai = createAI();
const app = createApp({ db, ai, sessionSecret, trustProxy: process.env.TRUST_PROXY === '1' });
const port = Number(process.env.PORT || 4173);
const server = app.listen(port, process.env.HOST || '0.0.0.0', () => {
  console.log(`Classroom running at http://localhost:${port}`);
  console.log(`AI feedback: ${ai.configured ? ai.model : 'disabled — set OPENAI_API_KEY in .env'}`);
});
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close(() => { db.close(); process.exit(0); }));
