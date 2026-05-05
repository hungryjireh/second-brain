import { getUserTimezone, setSetting } from '../lib/db.js';

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function isValidTimezone(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    try {
      const timezone = await getUserTimezone();
      return json(res, 200, { timezone });
    } catch (err) {
      console.error('[GET /api/settings]', err);
      return json(res, 500, { error: err.message });
    }
  }

  if (req.method === 'PATCH') {
    const { timezone } = req.body ?? {};
    if (!isValidTimezone(timezone)) {
      return json(res, 400, { error: 'timezone must be a valid IANA timezone' });
    }

    try {
      await setSetting('timezone', timezone);
      return json(res, 200, { timezone });
    } catch (err) {
      console.error('[PATCH /api/settings]', err);
      return json(res, 500, { error: err.message });
    }
  }

  return json(res, 405, { error: 'Method not allowed' });
}
