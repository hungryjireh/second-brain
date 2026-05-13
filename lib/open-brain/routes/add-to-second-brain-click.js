import { getBearerToken, verifyAuthToken, resolveAuthUserId } from '../../auth.js';
import { json, isUuid, supabaseRequest } from '../helpers.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const token = getBearerToken(req);
  if (!token) return json(res, 401, { error: 'missing bearer token' });

  const thoughtId = String(req.body?.thought_id || '').trim();
  if (!isUuid(thoughtId)) return json(res, 400, { error: 'valid thought_id is required' });

  try {
    const authUser = await verifyAuthToken(token);
    const userId = resolveAuthUserId(authUser);
    if (!userId) return json(res, 401, { error: 'invalid auth user' });

    const existing = await supabaseRequest('/rest/v1/thought_second_brain_saves', {
      method: 'GET',
      query: {
        select: 'thought_id',
        user_id: `eq.${userId}`,
        thought_id: `eq.${thoughtId}`,
        limit: 1,
      },
      authToken: token,
    });

    if (existing?.length) {
      return json(res, 200, {
        thought_id: thoughtId,
        already_saved: true,
      });
    }

    await supabaseRequest('/rest/v1/thought_second_brain_saves', {
      method: 'POST',
      body: [{ thought_id: thoughtId, user_id: userId }],
      authToken: token,
    });

    return json(res, 200, {
      thought_id: thoughtId,
      already_saved: false,
    });
  } catch (err) {
    const message = err?.data?.message || err.message || 'request failed';
    if (err.status === 401 || err.status === 403) return json(res, 401, { error: 'unauthorized' });
    if (err.status === 404) return json(res, 404, { error: 'thought not found' });
    return json(res, 500, { error: message });
  }
}
