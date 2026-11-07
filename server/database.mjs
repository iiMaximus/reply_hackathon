import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import session from 'express-session';

/** One SQLite connection per app. All queries use bound parameters. */
export function openDatabase(filename) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('student','professor')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (sid TEXT PRIMARY KEY, data TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY, professor_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', code TEXT NOT NULL UNIQUE,
      join_mode TEXT NOT NULL DEFAULT 'approval' CHECK(join_mode IN ('open','approval','whitelist')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS members (
      class_id INTEGER NOT NULL REFERENCES classes(id), user_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL CHECK(status IN ('active','pending','blocked')),
      PRIMARY KEY(class_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS whitelist (
      class_id INTEGER NOT NULL REFERENCES classes(id), email TEXT NOT NULL,
      PRIMARY KEY(class_id, email)
    );
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY, class_id INTEGER NOT NULL REFERENCES classes(id),
      owner_id INTEGER NOT NULL REFERENCES users(id), purpose TEXT NOT NULL,
      name TEXT NOT NULL, mime TEXT NOT NULL, data BLOB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY, class_id INTEGER NOT NULL REFERENCES classes(id),
      title TEXT NOT NULL, question TEXT NOT NULL DEFAULT '', image_id INTEGER REFERENCES files(id),
      weight REAL NOT NULL DEFAULT 1 CHECK(weight > 0), reference_answer TEXT NOT NULL DEFAULT '',
      rubric TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'open'
        CHECK(status IN ('open','closed','archived')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY, quiz_id INTEGER NOT NULL REFERENCES quizzes(id),
      student_id INTEGER NOT NULL REFERENCES users(id), answer TEXT NOT NULL DEFAULT '',
      image_id INTEGER REFERENCES files(id), status TEXT NOT NULL DEFAULT 'pending',
      assessment TEXT, score REAL, review_note TEXT, reviewed_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS submissions_quiz_student ON submissions(quiz_id, student_id, id DESC);
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
      class_id INTEGER NOT NULL REFERENCES classes(id), quiz_id INTEGER REFERENCES quizzes(id),
      message TEXT NOT NULL, read_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS notifications_user ON notifications(user_id, id DESC);
    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY, class_id INTEGER NOT NULL REFERENCES classes(id),
      author_id INTEGER NOT NULL REFERENCES users(id), title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '', url TEXT NOT NULL DEFAULT '', image_id INTEGER REFERENCES files(id),
      status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS summaries (
      class_id INTEGER PRIMARY KEY REFERENCES classes(id), data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  // A process restart must not leave saved work stuck in a fictitious running job.
  db.prepare("UPDATE submissions SET status='failed' WHERE status='pending'").run();
  return db;
}

/** express-session owns cookie handling; this store makes sessions survive restarts. */
export class SQLiteSessionStore extends session.Store {
  constructor(db) { super(); this.db = db; }
  get(sid, callback) {
    try {
      const row = this.db.prepare('SELECT data FROM sessions WHERE sid=? AND expires>?').get(sid, Date.now());
      callback(null, row ? JSON.parse(row.data) : null);
    } catch (error) { callback(error); }
  }
  set(sid, value, callback = () => {}) {
    try {
      this.db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());
      this.db.prepare('INSERT OR REPLACE INTO sessions VALUES (?,?,?)')
        .run(sid, JSON.stringify(value), new Date(value.cookie.expires).getTime());
      callback();
    } catch (error) { callback(error); }
  }
  destroy(sid, callback = () => {}) {
    try { this.db.prepare('DELETE FROM sessions WHERE sid=?').run(sid); callback(); }
    catch (error) { callback(error); }
  }
  touch(sid, value, callback) { this.set(sid, value, callback); }
}
