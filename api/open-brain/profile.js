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

async function supabaseProfilesRequest(path, { method = 'GET', query, body, authToken, prefer } = {}) {
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

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (prefer) {
    headers.Prefer = prefer;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const raw = await res.text();
  const data = raw ? JSON.parse(raw) : null;

  if (!res.ok) {
    const err = new Error(data?.message || `Supabase request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

function isValidUsername(value) {
  return /^[a-z0-9_]{3,24}$/i.test(value);
}

function isUuid(value) {
  return UUID_REGEX.test(String(value || ''));
}

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

  const userId = resolveAuthUserId(authUser);
  if (!userId) return json(res, 401, { error: 'invalid auth user' });

  try {
    if (req.method === 'GET') {
      const requestedUserId = String(req.query?.id || '').trim();
      const requestedUsername = String(req.query?.username || '').trim();
      const targetId = isUuid(requestedUserId) ? requestedUserId : userId;
      const usingUsernameLookup = !requestedUserId && requestedUsername;
      const rows = await supabaseProfilesRequest('/rest/v1/profiles', {
        method: 'GET',
        query: usingUsernameLookup
          ? { select: 'id,username,avatar_url,streak_count,last_posted_at,timezone', username: `eq.${requestedUsername}`, limit: 1 }
          : { select: 'id,username,avatar_url,streak_count,last_posted_at,timezone', id: `eq.${targetId}`, limit: 1 },
        authToken: token,
      });

      if (!rows?.[0]) return json(res, 404, { profile: null });
      const profile = rows[0];
      const isSelf = profile.id === userId;
      let isFollowing = false;

      if (!isSelf) {
        const followRows = await supabaseProfilesRequest('/rest/v1/follows', {
          method: 'GET',
          query: {
            select: 'following_id',
            follower_id: `eq.${userId}`,
            following_id: `eq.${profile.id}`,
            limit: 1,
          },
          authToken: token,
        });
        isFollowing = Boolean(followRows?.length);
      }

      return json(res, 200, {
        profile: {
          ...profile,
          is_self: isSelf,
          is_following: isFollowing,
        },
      });
    }

    if (req.method === 'POST') {
      const username = String(req.body?.username || '').trim();
      const avatarUrl = String(req.body?.avatar_url || '').trim() || null;
      const timezone = String(req.body?.timezone || '').trim() || 'UTC';

      if (!isValidUsername(username)) {
        return json(res, 400, { error: 'username must be 3-24 chars and use letters, numbers, or underscores' });
      }

      if (avatarUrl && !/^https?:\/\//i.test(avatarUrl)) {
        return json(res, 400, { error: 'avatar_url must be a valid http(s) URL' });
      }

      const rows = await supabaseProfilesRequest('/rest/v1/profiles', {
        method: 'POST',
        query: { on_conflict: 'id' },
        body: [{
          id: userId,
          username,
          avatar_url: avatarUrl,
          timezone,
        }],
        prefer: 'resolution=merge-duplicates,return=representation',
        authToken: token,
      });

      return json(res, 201, { profile: rows?.[0] || null });
    }

    const avatarUrl = String(req.body?.avatar_url || '').trim() || null;
    const timezone = String(req.body?.timezone || '').trim() || 'UTC';

    if (avatarUrl && !/^https?:\/\//i.test(avatarUrl)) {
      return json(res, 400, { error: 'avatar_url must be a valid http(s) URL' });
    }

    const rows = await supabaseProfilesRequest('/rest/v1/profiles', {
      method: 'PATCH',
      query: { id: `eq.${userId}` },
      body: {
        avatar_url: avatarUrl,
        timezone,
      },
      prefer: 'return=representation',
      authToken: token,
    });

    return json(res, 200, { profile: rows?.[0] || null });
  } catch (err) {
    const message = err?.data?.message || err.message || 'request failed';
    if (err.status === 409) return json(res, 409, { error: message });
    if (err.status === 401 || err.status === 403) return json(res, 401, { error: 'unauthorized' });
    return json(res, 500, { error: message });
  }
}
