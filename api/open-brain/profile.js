import { getBearerToken, verifyAuthToken, resolveAuthUserId } from '../../lib/auth.js';
import { json, supabaseRequest, isUuid } from './helpers.js';

function isValidUsername(value) {
  return /^[a-z0-9_]{3,24}$/i.test(value);
}

const PAGE_SIZE = 1000;
const THOUGHT_ID_CHUNK_SIZE = 200;

async function countSavesForUserThoughts({ profileId, authToken }) {
  const thoughtIds = [];
  let thoughtOffset = 0;
  while (true) {
    const page = await supabaseRequest('/rest/v1/thoughts', {
      method: 'GET',
      query: {
        select: 'id',
        user_id: `eq.${profileId}`,
        visibility: 'eq.public',
        limit: PAGE_SIZE,
        offset: thoughtOffset,
      },
      authToken,
    });
    if (!Array.isArray(page) || page.length === 0) break;
    thoughtIds.push(...page.map(row => row?.id).filter(Boolean));
    if (page.length < PAGE_SIZE) break;
    thoughtOffset += PAGE_SIZE;
  }

  if (!thoughtIds.length) return 0;

  let totalSaves = 0;
  for (let i = 0; i < thoughtIds.length; i += THOUGHT_ID_CHUNK_SIZE) {
    const chunk = thoughtIds.slice(i, i + THOUGHT_ID_CHUNK_SIZE);
    let saveOffset = 0;
    while (true) {
      const saveRows = await supabaseRequest('/rest/v1/thought_second_brain_saves', {
        method: 'GET',
        query: {
          select: 'thought_id',
          thought_id: `in.(${chunk.join(',')})`,
          limit: PAGE_SIZE,
          offset: saveOffset,
        },
        authToken,
      });
      if (!Array.isArray(saveRows) || saveRows.length === 0) break;
      totalSaves += saveRows.length;
      if (saveRows.length < PAGE_SIZE) break;
      saveOffset += PAGE_SIZE;
    }
  }

  return totalSaves;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST', 'PATCH'].includes(req.method)) return json(res, 405, { error: 'Method not allowed' });

  const token = getBearerToken(req);

  try {
    if (req.method === 'GET') {
      const requestedUserId = String(req.query?.id || '').trim();
      const requestedUsername = String(req.query?.username || '').trim();
      const usingUsernameLookup = !requestedUserId && requestedUsername;
      let authUserId = null;
      let authToken = undefined;

      if (token) {
        try {
          const authUser = await verifyAuthToken(token);
          authUserId = resolveAuthUserId(authUser);
          if (!authUserId) return json(res, 401, { error: 'invalid auth user' });
          authToken = token;
        } catch (err) {
          if (!usingUsernameLookup) return json(res, 401, { error: err.message || 'unauthorized' });
        }
      } else if (!usingUsernameLookup) {
        return json(res, 401, { error: 'missing bearer token' });
      }

      const targetId = isUuid(requestedUserId) ? requestedUserId : authUserId;
      if (!usingUsernameLookup && !targetId) return json(res, 401, { error: 'invalid auth user' });
      const rows = await supabaseRequest('/rest/v1/profiles', {
        method: 'GET',
        query: usingUsernameLookup
          ? { select: 'id,username,avatar_url,streak_count,last_posted_at,timezone', username: `eq.${requestedUsername}`, limit: 1 }
          : { select: 'id,username,avatar_url,streak_count,last_posted_at,timezone', id: `eq.${targetId}`, limit: 1 },
        authToken,
      });

      if (!rows?.[0]) return json(res, 404, { profile: null });
      const profile = rows[0];
      const saveCount = await countSavesForUserThoughts({ profileId: profile.id, authToken });
      const isSelf = Boolean(authUserId) && profile.id === authUserId;
      let isFollowing = false;

      if (authUserId && !isSelf) {
        const followRows = await supabaseRequest('/rest/v1/follows', {
          method: 'GET',
          query: {
            select: 'following_id',
            follower_id: `eq.${authUserId}`,
            following_id: `eq.${profile.id}`,
            limit: 1,
          },
          authToken,
        });
        isFollowing = Boolean(followRows?.length);
      }

      return json(res, 200, {
        profile: {
          ...profile,
          save_count: saveCount,
          is_self: isSelf,
          is_following: isFollowing,
        },
      });
    }

    if (!token) return json(res, 401, { error: 'missing bearer token' });
    let authUser;
    try {
      authUser = await verifyAuthToken(token);
    } catch (err) {
      return json(res, 401, { error: err.message || 'unauthorized' });
    }

    const userId = resolveAuthUserId(authUser);
    if (!userId) return json(res, 401, { error: 'invalid auth user' });

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

      const rows = await supabaseRequest('/rest/v1/profiles', {
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

    const rows = await supabaseRequest('/rest/v1/profiles', {
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
