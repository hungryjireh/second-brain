import { getUserTimezone, setSetting } from '../lib/db.js';
import { getBearerToken, verifyAuthToken, resolveAuthUserId } from '../lib/auth.js';

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

  if (req.method === 'GET') {
    try {
      const timezone = await getUserTimezone(userId, token);
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
      await setSetting(userId, 'timezone', timezone, token);
      return json(res, 200, { timezone });
    } catch (err) {
      console.error('[PATCH /api/settings]', err);
      return json(res, 500, { error: err.message });
    }
  }

  return json(res, 405, { error: 'Method not allowed' });
}
