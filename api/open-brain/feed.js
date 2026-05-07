import { getBearerToken, verifyAuthToken, resolveAuthUserId } from '../../lib/auth.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const REACTION_TYPES = new Set(['felt_this', 'me_too', 'made_me_think']);
const EVERYONE_LIMIT = 60;

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function requireSupabaseEnv() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Missing Supabase env configuration');
  }
}

function getEpochDayInTimezone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find(part => part.type === 'year')?.value);
  const month = Number(parts.find(part => part.type === 'month')?.value);
  const day = Number(parts.find(part => part.type === 'day')?.value);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
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

function mapThoughtRows(rows, profileMap) {
  return (rows || []).map(row => ({
    id: row.id,
    user_id: row.user_id,
    text: typeof row.content?.text === 'string' ? row.content.text : '',
    created_at: row.created_at,
    visibility: row.visibility,
    profile: profileMap.get(row.user_id) || null,
  }));
}

function collectThoughtIds(thoughts) {
  return thoughts.map(item => item.id).filter(Boolean);
}

async function loadReactionSummary({ token, thoughtIds, viewerId }) {
  if (!thoughtIds.length) return new Map();

  const reactions = await supabaseRequest('/rest/v1/reactions', {
    method: 'GET',
    query: {
      select: 'thought_id,user_id,type',
      thought_id: `in.(${thoughtIds.join(',')})`,
    },
    authToken: token,
  });

  const summary = new Map();
  for (const thoughtId of thoughtIds) {
    summary.set(thoughtId, {
      felt_this: 0,
      me_too: 0,
      made_me_think: 0,
      mine: {
        felt_this: false,
        me_too: false,
        made_me_think: false,
      },
    });
  }

  for (const reaction of reactions || []) {
    if (!REACTION_TYPES.has(reaction.type)) continue;
    const entry = summary.get(reaction.thought_id);
    if (!entry) continue;
    entry[reaction.type] += 1;
    if (reaction.user_id === viewerId) {
      entry.mine[reaction.type] = true;
    }
  }

  return summary;
}

function appendReactionData(thoughts, reactionSummary) {
  return thoughts.map(thought => ({
    ...thought,
    reactions: reactionSummary.get(thought.id) || {
      felt_this: 0,
      me_too: 0,
      made_me_think: 0,
      mine: {
        felt_this: false,
        me_too: false,
        made_me_think: false,
      },
    },
  }));
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();

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
    if (req.method === 'POST') {
      const thoughtId = String(req.body?.thought_id || '').trim();
      const type = String(req.body?.type || '').trim();
      if (!thoughtId || !REACTION_TYPES.has(type)) {
        return json(res, 400, { error: 'invalid reaction payload' });
      }

      const inserted = await supabaseRequest('/rest/v1/reactions', {
        method: 'POST',
        body: [{ thought_id: thoughtId, user_id: userId, type }],
        prefer: 'return=representation',
        authToken: token,
      });

      return json(res, 201, { reaction: inserted?.[0] || null });
    }

    if (req.method === 'DELETE') {
      const thoughtId = String(req.query?.thought_id || '').trim();
      const type = String(req.query?.type || '').trim();
      if (!thoughtId || !REACTION_TYPES.has(type)) {
        return json(res, 400, { error: 'invalid reaction payload' });
      }

      await supabaseRequest('/rest/v1/reactions', {
        method: 'DELETE',
        query: {
          thought_id: `eq.${thoughtId}`,
          user_id: `eq.${userId}`,
          type: `eq.${type}`,
        },
        authToken: token,
      });

      return json(res, 200, { ok: true });
    }

    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

    const profileRows = await supabaseRequest('/rest/v1/profiles', {
      method: 'GET',
      query: {
        select: 'id,timezone',
        id: `eq.${userId}`,
        limit: 1,
      },
      authToken: token,
    });
    const timezone = profileRows?.[0]?.timezone || 'UTC';
    const nowDay = getEpochDayInTimezone(new Date(), timezone);
    const viewerThoughtRows = await supabaseRequest('/rest/v1/thoughts', {
      method: 'GET',
      query: {
        select: 'created_at',
        user_id: `eq.${userId}`,
        order: 'created_at.desc',
        limit: 1,
      },
      authToken: token,
    });
    const latestViewerThoughtAt = viewerThoughtRows?.[0]?.created_at;
    const latestViewerDay = latestViewerThoughtAt
      ? getEpochDayInTimezone(new Date(latestViewerThoughtAt), timezone)
      : null;
    const hasPostedToday = Number.isInteger(nowDay)
      && Number.isInteger(latestViewerDay)
      && latestViewerDay === nowDay;

    const follows = await supabaseRequest('/rest/v1/follows', {
      method: 'GET',
      query: {
        select: 'following_id',
        follower_id: `eq.${userId}`,
      },
      authToken: token,
    });

    const followingIds = (follows || []).map(row => row.following_id).filter(Boolean);

    const everyoneRows = await supabaseRequest('/rest/v1/thoughts', {
      method: 'GET',
      query: {
        select: 'id,user_id,content,created_at,visibility',
        visibility: 'eq.public',
        order: 'created_at.desc',
        limit: EVERYONE_LIMIT,
      },
      authToken: token,
    });

    const everyoneTodayRows = (everyoneRows || []).filter(row => {
      const day = getEpochDayInTimezone(new Date(row.created_at), timezone);
      return Number.isInteger(nowDay) && Number.isInteger(day) && day === nowDay;
    });

    const followingRows = followingIds.length
      ? await supabaseRequest('/rest/v1/thoughts', {
          method: 'GET',
          query: {
            select: 'id,user_id,content,created_at,visibility',
            user_id: `in.(${followingIds.join(',')})`,
            visibility: 'eq.public',
            order: 'created_at.desc',
            limit: Math.max(30, followingIds.length * 3),
          },
          authToken: token,
        })
      : [];

    const followingTodayByUser = new Map();
    for (const row of followingRows || []) {
      const day = getEpochDayInTimezone(new Date(row.created_at), timezone);
      const isToday = Number.isInteger(nowDay) && Number.isInteger(day) && day === nowDay;
      if (!isToday || followingTodayByUser.has(row.user_id)) continue;
      followingTodayByUser.set(row.user_id, row);
    }

    const allProfileIds = Array.from(new Set([
      ...followingIds,
      ...everyoneTodayRows.map(row => row.user_id),
      ...Array.from(followingTodayByUser.keys()),
    ]));

    const profiles = allProfileIds.length
      ? await supabaseRequest('/rest/v1/profiles', {
          method: 'GET',
          query: {
            select: 'id,username,avatar_url,streak_count',
            id: `in.(${allProfileIds.join(',')})`,
          },
          authToken: token,
        })
      : [];

    const profileMap = new Map((profiles || []).map(profile => [profile.id, {
      ...profile,
      is_self: profile.id === userId,
      is_following: followingIds.includes(profile.id),
    }]));
    const everyoneThoughts = mapThoughtRows(everyoneTodayRows, profileMap);

    const followingItems = followingIds.map(id => {
      const profile = profileMap.get(id) || { id, username: 'unknown', avatar_url: null, streak_count: 0 };
      const thought = followingTodayByUser.get(id);
      if (!thought) {
        return {
          id: `missing-${id}`,
          user_id: id,
          text: '',
          created_at: null,
          visibility: 'public',
          profile,
          missing_today: true,
          reactions: {
            felt_this: 0,
            me_too: 0,
            made_me_think: 0,
            mine: { felt_this: false, me_too: false, made_me_think: false },
          },
        };
      }
      return {
        ...mapThoughtRows([thought], profileMap)[0],
        missing_today: false,
      };
    });

    const reactionTargets = collectThoughtIds([
      ...everyoneThoughts,
      ...followingItems.filter(item => !item.missing_today),
    ]);
    const reactionSummary = await loadReactionSummary({ token, thoughtIds: reactionTargets, viewerId: userId });

    const everyoneWithReactions = appendReactionData(everyoneThoughts, reactionSummary);
    const followingWithReactions = followingItems.map(item => {
      if (item.missing_today) return item;
      return {
        ...item,
        reactions: reactionSummary.get(item.id) || item.reactions,
      };
    });

    return json(res, 200, {
      following: followingWithReactions,
      everyone: everyoneWithReactions,
      has_posted_today: hasPostedToday,
    });
  } catch (err) {
    const message = err?.data?.message || err.message || 'request failed';
    if (err.status === 401 || err.status === 403) return json(res, 401, { error: 'unauthorized' });
    return json(res, 500, { error: message });
  }
}
