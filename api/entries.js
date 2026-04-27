import { getAllEntries, getEntriesByCategory, insertEntry, deleteEntry } from '../lib/db.js';
import { classify } from '../lib/classify.js';

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  // OPTIONS pre-flight (CORS headers set globally in vercel.json)
  if (req.method === 'OPTIONS') return res.status(204).end();

  // ── GET /api/entries[?category=X] ──────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { category } = req.query;
      const entries = category
        ? await getEntriesByCategory(category)
        : await getAllEntries();
      return json(res, 200, entries);
    } catch (err) {
      console.error('[GET /api/entries]', err);
      return json(res, 500, { error: err.message });
    }
  }

  // ── POST /api/entries  { text } ────────────────────────────────────────────
  if (req.method === 'POST') {
    const { text } = req.body ?? {};
    if (!text?.trim()) return json(res, 400, { error: 'text is required' });

    try {
      const { category, content, remind_at } = await classify(text.trim());
      const entry = await insertEntry({ raw_text: text.trim(), category, content, remind_at });
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
      const deleted = await deleteEntry(id);
      if (!deleted) return json(res, 404, { error: 'not found' });
      return json(res, 200, { deleted: true });
    } catch (err) {
      console.error('[DELETE /api/entries]', err);
      return json(res, 500, { error: err.message });
    }
  }

  json(res, 405, { error: 'Method not allowed' });
}
