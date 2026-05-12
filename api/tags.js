import { getUserTags } from '../lib/db.js';
import { getBearerToken, verifyAuthToken, resolveAuthUserId } from '../lib/auth.js';

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return json(res, 405, { error: 'method not allowed' });

  const token = getBearerToken(req);
  if (!token) return json(res, 401, { error: 'missing bearer token' });

  let authUser;
  try {
    authUser = await verifyAuthToken(token);
  } catch (err) {
    return json(res, 401, { error: err.message || 'unauthorized' });
  }

  const userId = resolveAuthUserId(authUser);
  if (!userId) return json(res, 401, { error: 'invalid auth token payload: expected UUID user id' });

  try {
    const tags = await getUserTags(userId, token);
    return json(res, 200, { tags });
  } catch (err) {
    console.error('[GET /api/tags]', err);
    return json(res, 500, { error: err.message });
  }
}
