import { getBearerToken, verifyAuthToken, resolveAuthUserId } from '../../lib/auth.js';
import { json, supabaseRequest, isUuid } from './helpers.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const token = getBearerToken(req);
  const requestedUserId = String(req.query?.user_id || '').trim();
  const hasRequestedUserId = isUuid(requestedUserId);

  let authUserId = null;
  let authToken = undefined;

  if (token) {
    try {
      const authUser = await verifyAuthToken(token);
      authUserId = resolveAuthUserId(authUser);
      if (!authUserId) return json(res, 401, { error: 'invalid auth user' });
      authToken = token;
    } catch (err) {
      if (!hasRequestedUserId) return json(res, 401, { error: err.message || 'unauthorized' });
    }
  } else if (!hasRequestedUserId) {
    return json(res, 401, { error: 'missing bearer token' });
  }

  const targetUserId = hasRequestedUserId ? requestedUserId : authUserId;
  if (!targetUserId) return json(res, 400, { error: 'user_id is required' });

  try {
    const rows = await supabaseRequest('/rest/v1/thoughts', {
      method: 'GET',
      query: {
        select: 'id,content,created_at,visibility,share_slug',
        user_id: `eq.${targetUserId}`,
        visibility: 'eq.public',
        order: 'created_at.desc',
        limit: 200,
      },
      authToken,
    });

    const thoughts = (rows || []).map(row => ({
      id: row.id,
      text: typeof row.content?.text === 'string' ? row.content.text : '',
      created_at: row.created_at,
      visibility: row.visibility,
      share_slug: row.share_slug || null,
    }));

    return json(res, 200, { thoughts });
  } catch (err) {
    const message = err?.data?.message || err.message || 'request failed';
    if (err.status === 401 || err.status === 403) return json(res, 401, { error: 'unauthorized' });
    return json(res, 500, { error: message });
  }
}
