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

function compactWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function truncateWords(value, maxWords) {
  const words = compactWhitespace(value).split(' ').filter(Boolean);
  return words.slice(0, maxWords).join(' ');
}

function truncateChars(value, maxChars) {
  const text = compactWhitespace(value);
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1).trimEnd()}…`;
}

function deriveEntryFields(description, classifiedContent = '') {
  const normalizedDescription = compactWhitespace(description);
  const normalizedClassified = compactWhitespace(classifiedContent);
  const titleSource = normalizedClassified || normalizedDescription;
  const summarySource = normalizedClassified || normalizedDescription;
  const title = truncateChars(truncateWords(titleSource, 8), 80) || 'Untitled';
  const summary = truncateChars(truncateWords(summarySource, 22), 180) || 'No summary.';
  return { title, summary, raw_text: normalizedDescription };
}

function normalizeEntry(entry) {
  if (!entry) return entry;
  const rawText = entry.raw_text ?? entry.description ?? entry.content ?? '';
  const fallback = deriveEntryFields(rawText, entry.summary ?? entry.content ?? '');
  return {
    ...entry,
    raw_text: rawText,
    title: entry.title ?? fallback.title,
    summary: entry.summary ?? entry.content ?? fallback.summary,
  };
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
      return json(res, 200, entries.map(normalizeEntry));
    } catch (err) {
      console.error('[GET /api/entries]', err);
      return json(res, 500, { error: err.message });
    }
  }

  // ── POST /api/entries  { description } ─────────────────────────────────────
  if (req.method === 'POST') {
    const { description, text, priority } = req.body ?? {};
    const sourceDescription = description ?? text;
    if (!sourceDescription?.trim()) return json(res, 400, { error: 'description is required' });
    const parsedPriority = parsePriority(priority, { defaultValue: 0 });
    if (parsedPriority === null) {
      return json(res, 400, { error: 'priority must be an integer from 0 to 10' });
    }

    try {
      const normalizedDescription = sourceDescription.trim();
      const timezone = await getUserTimezone(userId, token);
      const { category, title, summary, content, remind_at } = await classify(normalizedDescription, { timezone });
      const derived = deriveEntryFields(normalizedDescription, content);
      const entry = await insertEntry({
        userId,
        raw_text: derived.raw_text,
        category,
        title: compactWhitespace(title) || derived.title,
        summary: compactWhitespace(summary) || derived.summary,
        remind_at,
        priority: parsedPriority,
        authToken: token,
      });
      return json(res, 201, normalizeEntry(entry));
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

  // ── PATCH /api/entries?id=X  { category?, title?, summary?, description?, remind_at?, priority?, is_archived? } ─
  if (req.method === 'PATCH') {
    const id = parseInt(req.query.id, 10);
    if (isNaN(id)) return json(res, 400, { error: 'invalid id' });

    const {
      category,
      title,
      summary,
      content,
      description,
      remind_at,
      priority,
      is_archived,
    } = req.body ?? {};
    const validCategories = new Set(['reminder', 'todo', 'thought', 'note']);
    const updates = {};

    if (category !== undefined) {
      if (!validCategories.has(category)) {
        return json(res, 400, { error: 'invalid category' });
      }
      updates.category = category;
    }

    const nextDescriptionSource = description ?? content;
    if (nextDescriptionSource !== undefined) {
      if (!nextDescriptionSource?.trim()) return json(res, 400, { error: 'description is required' });
      const derived = deriveEntryFields(nextDescriptionSource.trim());
      updates.raw_text = derived.raw_text;
      updates.title = derived.title;
      updates.summary = derived.summary;
    }

    if (title !== undefined) {
      if (typeof title !== 'string') return json(res, 400, { error: 'title must be a string' });
      updates.title = compactWhitespace(title) || null;
    }

    if (summary !== undefined) {
      if (typeof summary !== 'string') return json(res, 400, { error: 'summary must be a string' });
      updates.summary = compactWhitespace(summary) || null;
    }

    if (remind_at !== undefined) {
      if (remind_at != null && !Number.isInteger(remind_at)) {
        return json(res, 400, { error: 'remind_at must be an integer unix timestamp or null' });
      }
      updates.remind_at = remind_at ?? null;
    }

    if (priority !== undefined) {
      const parsedPriority = parsePriority(priority, { defaultValue: undefined });
      if (parsedPriority === null || parsedPriority === undefined) {
        return json(res, 400, { error: 'priority must be an integer from 0 to 10' });
      }
      updates.priority = parsedPriority;
    }

    if (is_archived !== undefined) {
      if (typeof is_archived !== 'boolean') {
        return json(res, 400, { error: 'is_archived must be a boolean' });
      }
      updates.is_archived = is_archived;
    }

    if (Object.keys(updates).length === 0) {
      return json(res, 400, { error: 'no valid fields to update' });
    }

    try {
      const entry = await updateEntry(userId, id, updates, token);
      if (!entry) return json(res, 404, { error: 'not found' });
      return json(res, 200, normalizeEntry(entry));
    } catch (err) {
      console.error('[PATCH /api/entries]', err);
      return json(res, 500, { error: err.message });
    }
  }

  json(res, 405, { error: 'Method not allowed' });
}
