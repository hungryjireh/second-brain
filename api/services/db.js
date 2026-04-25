import { createClient } from '@libsql/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '../../data/second_brain.db');

// Ensure data directory exists
mkdirSync(join(__dirname, '../../data'), { recursive: true });

// Create libSQL client pointing at a local SQLite file
export const db = createClient({ url: `file:${DB_PATH}` });

// Initialize DB (PRAGMAs + table)
await db.batch([
  'PRAGMA journal_mode = WAL;',
  'PRAGMA foreign_keys = ON;',
  `CREATE TABLE IF NOT EXISTS entries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_text    TEXT    NOT NULL,
    category    TEXT    NOT NULL CHECK(category IN ('reminder','todo','thought','note')),
    content     TEXT    NOT NULL,
    remind_at   INTEGER,
    reminded    INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );`
], 'write');

console.log('[db] libSQL ready at', DB_PATH);

// ─── Helpers (async) ─────────────────────────────────────────────────────────

export async function insertEntry({ raw_text, category, content, remind_at }) {
  const args = [raw_text, category, content, remind_at ?? null];
  const res = await db.execute({
    sql: `INSERT INTO entries (raw_text, category, content, remind_at)
          VALUES (?, ?, ?, ?) RETURNING *`,
    args,
  });
  return res.rows?.[0] ?? null;
}

export async function getEntry(id) {
  const res = await db.execute({ sql: 'SELECT * FROM entries WHERE id = ?', args: [id] });
  return res.rows?.[0] ?? null;
}

export async function getAllEntries() {
  const res = await db.execute({ sql: 'SELECT * FROM entries ORDER BY created_at DESC' });
  return res.rows ?? [];
}

export async function getEntriesByCategory(category) {
  const res = await db.execute({ sql: 'SELECT * FROM entries WHERE category = ? ORDER BY created_at DESC', args: [category] });
  return res.rows ?? [];
}

export async function getDueReminders() {
  const now = Math.floor(Date.now() / 1000);
  const res = await db.execute({
    sql: `SELECT * FROM entries WHERE remind_at <= ? AND reminded = 0 AND category = 'reminder'`,
    args: [now],
  });
  return res.rows ?? [];
}

export async function markReminded(id) {
  await db.execute({ sql: 'UPDATE entries SET reminded = 1 WHERE id = ?', args: [id] });
}

export async function deleteEntry(id) {
  const res = await db.execute({ sql: 'DELETE FROM entries WHERE id = ? RETURNING id', args: [id] });
  return (res.rows && res.rows.length > 0) || false;
}

export default db;
