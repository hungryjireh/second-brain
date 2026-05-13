import { json, supabaseRequest } from '../helpers.js';
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const slug = String(req.query?.slug || '').trim();
  if (!slug) return json(res, 400, { error: 'slug is required' });

  try {
    const thoughtRows = await supabaseRequest('/rest/v1/thoughts', {
      method: 'GET',
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

    const profileRows = await supabaseRequest('/rest/v1/profiles', {
      method: 'GET',
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
