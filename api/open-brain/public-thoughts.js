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

async function supabaseRequest(path, { method = 'GET', query, authToken } = {}) {
  requireSupabaseEnv();
  const url = new URL(path, SUPABASE_URL);

  for (const [key, value] of Object.entries(query || {})) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    method,
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${authToken}`,
    },
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
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const token = getBearerToken(req);
  const requestedUserId = String(req.query?.user_id || '').trim();
  const hasRequestedUserId = isUuid(requestedUserId);

  let authUserId = null;
  let authToken = SUPABASE_PUBLISHABLE_KEY;

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
        select: 'id,content,created_at,visibility',
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
    }));

    return json(res, 200, { thoughts });
  } catch (err) {
    const message = err?.data?.message || err.message || 'request failed';
    if (err.status === 401 || err.status === 403) return json(res, 401, { error: 'unauthorized' });
    return json(res, 500, { error: message });
  }
}
