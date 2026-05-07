import { getBearerToken, verifyAuthToken, resolveAuthUserId } from '../../lib/auth.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function requireSupabaseEnv() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Missing Supabase env configuration');
  }
}

function isUuid(value) {
  return UUID_REGEX.test(String(value || ''));
}

async function supabaseRequest(path, { method = 'GET', query, body, authToken, prefer } = {}) {
  requireSupabaseEnv();
  const url = new URL(path, SUPABASE_URL);

  for (const [key, value] of Object.entries(query || {})) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, String(value));
  }

  const headers = {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${authToken}`,
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (prefer) headers.Prefer = prefer;

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;

  if (!response.ok) {
    const err = new Error(data?.message || `Supabase request failed (${response.status})`);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) return json(res, 405, { error: 'Method not allowed' });

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

  try {
    if (req.method === 'GET') {
      const rows = await supabaseRequest('/rest/v1/follows', {
        method: 'GET',
        query: {
          select: 'following_id',
          follower_id: `eq.${userId}`,
        },
        authToken: token,
      });
      return json(res, 200, { following_ids: (rows || []).map(row => row.following_id).filter(Boolean) });
    }

    const targetId = String(req.body?.following_id || req.query?.following_id || '').trim();
    if (!isUuid(targetId)) return json(res, 400, { error: 'following_id must be a valid UUID' });
    if (targetId === userId) return json(res, 400, { error: 'cannot follow yourself' });

    if (req.method === 'POST') {
      const rows = await supabaseRequest('/rest/v1/follows', {
        method: 'POST',
        body: [{ follower_id: userId, following_id: targetId }],
        prefer: 'resolution=ignore-duplicates,return=representation',
        authToken: token,
      });
      return json(res, 201, { follow: rows?.[0] || { follower_id: userId, following_id: targetId } });
    }

    await supabaseRequest('/rest/v1/follows', {
      method: 'DELETE',
      query: {
        follower_id: `eq.${userId}`,
        following_id: `eq.${targetId}`,
      },
      authToken: token,
    });
    return json(res, 200, { ok: true });
  } catch (err) {
    const message = err?.data?.message || err.message || 'request failed';
    if (err.status === 401 || err.status === 403) return json(res, 401, { error: 'unauthorized' });
    return json(res, 500, { error: message });
  }
}
