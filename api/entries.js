import {
  getAllEntries,
  getEntriesByCategory,
  insertEntry,
  deleteEntry,
  updateEntry,
  getUserTimezone,
} from '../lib/db.js';
import { classify } from '../lib/classify.js';
import { getBearerToken, verifyAuthToken, resolveAuthUserId } from '../lib/auth.js';

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function parsePriority(value, { defaultValue } = { defaultValue: 0 }) {
  if (value === undefined) return defaultValue;
  if (!Number.isInteger(value) || value < 0 || value > 10) return null;
  return value;
}

export default async function handler(req, res) {
  // OPTIONS pre-flight (CORS headers set globally in vercel.json)
  if (req.method === 'OPTIONS') return res.status(204).end();

  let authUser;
  const token = getBearerToken(req);
  if (!token) return json(res, 401, { error: 'missing bearer token' });

  try {
    authUser = await verifyAuthToken(token);
  } catch (err) {
    return json(res, 401, { error: err.message || 'unauthorized' });
  }
  const userId = resolveAuthUserId(authUser);
  if (!userId) return json(res, 401, { error: 'invalid auth token payload: expected UUID user id' });

  // ── GET /api/entries[?category=X] ──────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { category } = req.query;
      const entries = category
        ? await getEntriesByCategory(userId, category, token)
        : await getAllEntries(userId, token);
      return json(res, 200, entries);
    } catch (err) {
      console.error('[GET /api/entries]', err);
      return json(res, 500, { error: err.message });
    }
  }

  // ── POST /api/entries  { text } ────────────────────────────────────────────
  if (req.method === 'POST') {
    const { text, priority } = req.body ?? {};
    if (!text?.trim()) return json(res, 400, { error: 'text is required' });
    const parsedPriority = parsePriority(priority, { defaultValue: 0 });
    if (parsedPriority === null) {
      return json(res, 400, { error: 'priority must be an integer from 0 to 10' });
    }

    try {
      const timezone = await getUserTimezone(userId);
      const { category, content, remind_at } = await classify(text.trim(), { timezone });
      const entry = await insertEntry({
        userId,
        raw_text: text.trim(),
        category,
        content,
        remind_at,
        priority: parsedPriority,
        authToken: token,
      });
      return json(res, 201, entry);
    } catch (err) {
      console.error('[POST /api/entries]', err.message);
      return json(res, 500, { error: err.message });
    }
  }

  // ── DELETE /api/entries?id=X ───────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const id = parseInt(req.query.id, 10);
    if (isNaN(id)) return json(res, 400, { error: 'invalid id' });

    try {
      const deleted = await deleteEntry(userId, id, token);
      if (!deleted) return json(res, 404, { error: 'not found' });
      return json(res, 200, { deleted: true });
    } catch (err) {
      console.error('[DELETE /api/entries]', err);
      return json(res, 500, { error: err.message });
    }
  }

  // ── PATCH /api/entries?id=X  { category, content, remind_at, priority } ─────
  if (req.method === 'PATCH') {
    const id = parseInt(req.query.id, 10);
    if (isNaN(id)) return json(res, 400, { error: 'invalid id' });

    const { category, content, remind_at, priority } = req.body ?? {};
    const validCategories = new Set(['reminder', 'todo', 'thought', 'note']);

    if (!validCategories.has(category)) {
      return json(res, 400, { error: 'invalid category' });
    }
    if (!content?.trim()) return json(res, 400, { error: 'content is required' });
    if (remind_at != null && !Number.isInteger(remind_at)) {
      return json(res, 400, { error: 'remind_at must be an integer unix timestamp or null' });
    }
    const parsedPriority = parsePriority(priority, { defaultValue: undefined });
    if (parsedPriority === null || parsedPriority === undefined) {
      return json(res, 400, { error: 'priority must be an integer from 0 to 10' });
    }

    try {
      const entry = await updateEntry(
        userId,
        id,
        {
          category,
          content: content.trim(),
          remind_at: remind_at ?? null,
          priority: parsedPriority,
        },
        token
      );
      if (!entry) return json(res, 404, { error: 'not found' });
      return json(res, 200, entry);
    } catch (err) {
      console.error('[PATCH /api/entries]', err);
      return json(res, 500, { error: err.message });
    }
  }

  json(res, 405, { error: 'Method not allowed' });
}
