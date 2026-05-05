import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { inspect } from 'util';

// Load local env files when running directly with Node.
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// Turso connection — set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN in Vercel env vars.
// For local dev with `vercel dev`, add them to .env.local
if (!process.env.TURSO_DATABASE_URL) {
  throw new Error(
    "Missing TURSO_DATABASE_URL. Add it to .env.local or .env (format: libsql://<db>.<org>.turso.io)."
  );
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
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
        priority    INTEGER NOT NULL DEFAULT 0,
        remind_at   INTEGER,
        reminded    INTEGER NOT NULL DEFAULT 0,
        created_at  INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);

    // Backfill/upgrade existing deployments created before `priority` existed.
    const tableInfo = await db.execute('PRAGMA table_info(entries)');
    const hasPriority = tableInfo.rows.some(row => row.name === 'priority');
    if (!hasPriority) {
      await db.execute('ALTER TABLE entries ADD COLUMN priority INTEGER NOT NULL DEFAULT 0');
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
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

export async function insertEntry({ raw_text, category, content, remind_at, priority = 0 }) {
  const result = await db.execute({
    sql: `INSERT INTO entries (raw_text, category, content, remind_at, priority)
          VALUES (?, ?, ?, ?, ?)`,
    args: [raw_text, category, content, remind_at ?? null, priority],
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
    'SELECT * FROM entries ORDER BY priority DESC, created_at DESC'
  );
  return result.rows;
}

export async function getEntriesByCategory(category) {
  const result = await db.execute({
    sql:  'SELECT * FROM entries WHERE category = ? ORDER BY priority DESC, created_at DESC',
    args: [category],
  });
  return result.rows;
}

export async function deleteEntry(id) {
  const result = await db.execute({
    sql:  'DELETE FROM entries WHERE id = ?',
    args: [id],
  });
  return result.rowsAffected > 0;
}

export async function updateEntry(id, { category, content, remind_at, priority }) {
  const result = await db.execute({
    sql: `UPDATE entries
          SET category = ?, content = ?, remind_at = ?, priority = ?
          WHERE id = ?`,
    args: [category, content, remind_at ?? null, priority, id],
  });
  if (result.rowsAffected === 0) return null;
  return getEntry(id);
}

export async function getSetting(key) {
  const result = await db.execute({
    sql: 'SELECT value FROM settings WHERE key = ?',
    args: [key],
  });
  return result.rows[0]?.value ?? null;
}

export async function setSetting(key, value) {
  await db.execute({
    sql: `
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
    args: [key, value],
  });
}

export async function getUserTimezone() {
  return (await getSetting('timezone')) ?? 'Asia/Singapore';
}

export default db;
