const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function requireSupabaseEnv() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Missing Supabase env configuration');
  }
}

async function supabasePublicRequest(path, { query } = {}) {
  requireSupabaseEnv();

  const url = new URL(path, SUPABASE_URL);
  for (const [key, value] of Object.entries(query || {})) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, String(value));
  }

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    },
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

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const slug = String(req.query?.slug || '').trim();
  if (!slug) return json(res, 400, { error: 'slug is required' });

  try {
    const thoughtRows = await supabasePublicRequest('/rest/v1/thoughts', {
      query: {
        select: 'id,user_id,content,visibility,created_at,share_slug',
        share_slug: `eq.${slug}`,
        limit: 1,
      },
    });

    const thought = thoughtRows?.[0] || null;
    if (!thought || thought.visibility !== 'public') {
      return json(res, 404, { error: 'not found' });
    }

    const profileRows = await supabasePublicRequest('/rest/v1/profiles', {
      query: {
        select: 'username',
        id: `eq.${thought.user_id}`,
        limit: 1,
      },
    });

    return json(res, 200, {
      thought: {
        id: thought.id,
        text: typeof thought.content?.text === 'string' ? thought.content.text : '',
        created_at: thought.created_at,
        share_slug: thought.share_slug,
      },
      author: {
        username: profileRows?.[0]?.username || null,
      },
    });
  } catch (err) {
    const message = err?.data?.message || err.message || 'request failed';
    return json(res, 500, { error: message });
  }
}
