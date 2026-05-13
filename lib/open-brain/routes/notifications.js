import { getBearerToken, verifyAuthToken, resolveAuthUserId } from '../../auth.js';
import { json, supabaseRequest, isUuid } from '../helpers.js';
const NOTIFICATION_TYPES = new Set(['follow']);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST', 'PATCH'].includes(req.method)) return json(res, 405, { error: 'Method not allowed' });

  const token = getBearerToken(req);
  if (!token) return json(res, 401, { error: 'missing bearer token' });

  let authUser;
  try {
    authUser = await verifyAuthToken(token);
  } catch (err) {
    return json(res, 401, { error: err.message || 'unauthorized' });
  }

  const actorId = resolveAuthUserId(authUser);
  if (!actorId) return json(res, 401, { error: 'invalid auth user' });

  if (req.method === 'GET') {
    try {
      const rows = await supabaseRequest('/rest/v1/notifications', {
        query: {
          select: 'id,user_id,actor_id,type,read_at,created_at',
          user_id: `eq.${actorId}`,
          order: 'created_at.desc',
          limit: 50,
        },
        authToken: token,
      });
      return json(res, 200, { notifications: Array.isArray(rows) ? rows : [] });
    } catch (err) {
      const message = err?.data?.message || err.message || 'request failed';
      if (err.status === 401 || err.status === 403) return json(res, 401, { error: 'unauthorized' });
      return json(res, 500, { error: message });
    }
  }

  if (req.method === 'PATCH') {
    const id = String(req.body?.id || '').trim();
    if (!isUuid(id)) return json(res, 400, { error: 'id must be a valid UUID' });

    try {
      const rows = await supabaseRequest('/rest/v1/notifications', {
        method: 'PATCH',
        query: {
          id: `eq.${id}`,
          user_id: `eq.${actorId}`,
          select: 'id,user_id,actor_id,type,read_at,created_at',
        },
        body: { read_at: new Date().toISOString() },
        authToken: token,
        prefer: 'return=representation',
      });
      return json(res, 200, { notification: rows?.[0] || null });
    } catch (err) {
      const message = err?.data?.message || err.message || 'request failed';
      if (err.status === 401 || err.status === 403) return json(res, 401, { error: 'unauthorized' });
      return json(res, 500, { error: message });
    }
  }

  const userId = String(req.body?.user_id || '').trim();
  const type = String(req.body?.type || '').trim();

  if (!isUuid(userId)) return json(res, 400, { error: 'user_id must be a valid UUID' });
  if (userId === actorId) return json(res, 400, { error: 'cannot notify yourself' });
  if (!NOTIFICATION_TYPES.has(type)) return json(res, 400, { error: 'unsupported notification type' });

  try {
    const rows = await supabaseRequest('/rest/v1/notifications', {
      method: 'POST',
      body: [{ user_id: userId, actor_id: actorId, type }],
      authToken: token,
      prefer: 'return=representation',
    });

    return json(res, 201, { notification: rows?.[0] || null });
  } catch (err) {
    const message = err?.data?.message || err.message || 'request failed';
    if (err.status === 401 || err.status === 403) return json(res, 401, { error: 'unauthorized' });
    return json(res, 500, { error: message });
  }
}
