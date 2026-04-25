import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '../../data/second_brain.db');

// Ensure data directory exists
mkdirSync(join(__dirname, '../../data'), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_text    TEXT    NOT NULL,
    category    TEXT    NOT NULL CHECK(category IN ('reminder','todo','thought','note')),
    content     TEXT    NOT NULL,
    remind_at   INTEGER,
    reminded    INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

console.log('[db] SQLite ready at', DB_PATH);

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function insertEntry({ raw_text, category, content, remind_at }) {
  const stmt = db.prepare(`
    INSERT INTO entries (raw_text, category, content, remind_at)
    VALUES (@raw_text, @category, @content, @remind_at)
  `);
  const info = stmt.run({ raw_text, category, content, remind_at: remind_at ?? null });
  return getEntry(info.lastInsertRowid);
}

export function getEntry(id) {
  return db.prepare('SELECT * FROM entries WHERE id = ?').get(id);
}

export function getAllEntries() {
  return db.prepare('SELECT * FROM entries ORDER BY created_at DESC').all();
}

export function getEntriesByCategory(category) {
  return db.prepare('SELECT * FROM entries WHERE category = ? ORDER BY created_at DESC').all(category);
}

export function getDueReminders() {
  const now = Math.floor(Date.now() / 1000);
  return db.prepare(`
    SELECT * FROM entries
    WHERE remind_at <= ? AND reminded = 0 AND category = 'reminder'
  `).all(now);
}

export function markReminded(id) {
  db.prepare('UPDATE entries SET reminded = 1 WHERE id = ?').run(id);
}

export function deleteEntry(id) {
  const info = db.prepare('DELETE FROM entries WHERE id = ?').run(id);
  return info.changes > 0;
}

export default db;
