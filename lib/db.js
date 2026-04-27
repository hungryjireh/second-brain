import { createClient } from '@libsql/client';
import { inspect } from 'util';

// Turso connection — set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN in Vercel env vars.
// For local dev with `vercel dev`, add them to .env.local
const db = createClient({
  url:       process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

function mask(value) {
  if (!value) return '<missing>';
  if (value.length <= 10) return '***masked***';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getMaskedEnv() {
  return {
    TURSO_DATABASE_URL: mask(process.env.TURSO_DATABASE_URL),
    TURSO_AUTH_TOKEN:   mask(process.env.TURSO_AUTH_TOKEN),
  };
}

function logEnvAndError(err) {
  console.error('[db] Env (masked):', getMaskedEnv());
  console.error('[db] Error (full):', inspect(err, { depth: null }));
  // If the client attached a response object (common in HTTP libs), print it too
  try {
    if (err && err.response) {
      console.error('[db] Error.response:', inspect(err.response, { depth: null }));
    }
  } catch (e) {
    console.error('[db] Failed to inspect err.response', e);
  }
}

// ─── Schema migration (run once via `npm run migrate`) ───────────────────────

export async function migrate() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS entries (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        raw_text    TEXT    NOT NULL,
        category    TEXT    NOT NULL,
        content     TEXT    NOT NULL,
        remind_at   INTEGER,
        reminded    INTEGER NOT NULL DEFAULT 0,
        created_at  INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    console.log('[db] Migration complete');
  } catch (err) {
    console.error('[db] Migration failed');
    logEnvAndError(err);
    throw err;
  }
}

// Run migrate when this file is executed directly
if (process.argv[1] && process.argv[1].endsWith('db.js')) {
  try {
    await migrate();
    process.exit(0);
  } catch (err) {
    console.error('[db] migrate script failed');
    logEnvAndError(err);
    process.exit(1);
  }
}

// ─── Helpers (all async — libSQL is always async, even in-process) ────────────

export async function insertEntry({ raw_text, category, content, remind_at }) {
  const result = await db.execute({
    sql: `INSERT INTO entries (raw_text, category, content, remind_at)
          VALUES (?, ?, ?, ?)`,
    args: [raw_text, category, content, remind_at ?? null],
  });
  return getEntry(Number(result.lastInsertRowid));
}

export async function getEntry(id) {
  const result = await db.execute({
    sql:  'SELECT * FROM entries WHERE id = ?',
    args: [id],
  });
  return result.rows[0] ?? null;
}

export async function getAllEntries() {
  const result = await db.execute(
    'SELECT * FROM entries ORDER BY created_at DESC'
  );
  return result.rows;
}

export async function getEntriesByCategory(category) {
  const result = await db.execute({
    sql:  'SELECT * FROM entries WHERE category = ? ORDER BY created_at DESC',
    args: [category],
  });
  return result.rows;
}

export async function getDueReminders() {
  const now = Math.floor(Date.now() / 1000);
  const result = await db.execute({
    sql:  `SELECT * FROM entries
           WHERE remind_at <= ? AND reminded = 0 AND category = 'reminder'`,
    args: [now],
  });
  return result.rows;
}

export async function markReminded(id) {
  await db.execute({
    sql:  'UPDATE entries SET reminded = 1 WHERE id = ?',
    args: [id],
  });
}

export async function deleteEntry(id) {
  const result = await db.execute({
    sql:  'DELETE FROM entries WHERE id = ?',
    args: [id],
  });
  return result.rowsAffected > 0;
}

export default db;
