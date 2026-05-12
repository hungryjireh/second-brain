import { getBearerToken, verifyAuthToken, resolveAuthUserId } from '../../lib/auth.js';
import { json, supabaseRequest } from './helpers.js';

const USER_LIMIT = 8;
const THOUGHT_LIMIT = 10;

function toSafeText(value) {
  return typeof value === 'string' ? value : '';
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const token = getBearerToken(req);
  if (!token) return json(res, 401, { error: 'missing bearer token' });

  let authUser;
  try {
    authUser = await verifyAuthToken(token);
  } catch (err) {
    return json(res, 401, { error: err.message || 'unauthorized' });
  }

  const userId = resolveAuthUserId(authUser);
  if (!userId) return json(res, 401, { error: 'invalid auth user' });

  const rawQuery = String(req.query?.q || '').trim();
  if (rawQuery.length < 2) {
    return json(res, 200, { users: [], thoughts: [] });
  }

  try {
    const userRows = await supabaseRequest('/rest/v1/profiles', {
      method: 'GET',
      query: {
        select: 'id,username,avatar_url,streak_count',
        username: `ilike.*${rawQuery}*`,
        order: 'streak_count.desc.nullslast,username.asc',
        limit: USER_LIMIT,
      },
      authToken: token,
    });

    const thoughtRows = await supabaseRequest('/rest/v1/thoughts', {
      method: 'GET',
      query: {
        select: 'id,user_id,content,created_at',
        visibility: 'eq.public',
        'content->>text': `ilike.*${rawQuery}*`,
        order: 'created_at.desc',
        limit: THOUGHT_LIMIT,
      },
      authToken: token,
    });

    const authorIds = Array.from(new Set((thoughtRows || []).map(row => row.user_id).filter(Boolean)));
    const authorRows = authorIds.length
      ? await supabaseRequest('/rest/v1/profiles', {
          method: 'GET',
          query: {
            select: 'id,username,avatar_url,streak_count',
            id: `in.(${authorIds.join(',')})`,
          },
          authToken: token,
        })
      : [];
    const authorMap = new Map((authorRows || []).map(row => [row.id, row]));

    return json(res, 200, {
      users: (userRows || []).map(row => ({
        id: row.id,
        username: row.username,
        avatar_url: row.avatar_url,
        streak_count: row.streak_count,
      })),
      thoughts: (thoughtRows || []).map(row => ({
        id: row.id,
        user_id: row.user_id,
        text: toSafeText(row.content?.text),
        created_at: row.created_at,
        profile: authorMap.get(row.user_id) || null,
      })),
    });
  } catch (err) {
    const message = err?.data?.message || err.message || 'request failed';
    if (err.status === 401 || err.status === 403) return json(res, 401, { error: 'unauthorized' });
    return json(res, 500, { error: message });
  }
}
