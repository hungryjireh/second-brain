import { getBearerToken, verifyAuthToken, resolveAuthUserId } from '../../auth.js';
import { json, supabaseRequest, getEpochDayInTimezone } from '../helpers.js';

const REACTION_TYPES = new Set(['felt_this', 'me_too', 'made_me_think']);
const EVERYONE_LIMIT = 60;
const PAGE_SIZE = 1000;
const THOUGHT_ID_CHUNK_SIZE = 200;

function mapThoughtRows(rows, profileMap) {
  return (rows || []).map(row => ({
    id: row.id,
    user_id: row.user_id,
    text: typeof row.content?.text === 'string' ? row.content.text : '',
    created_at: row.created_at,
    visibility: row.visibility,
    share_slug: row.share_slug || null,
    viewer_has_added_to_second_brain: false,
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

function appendSecondBrainSaveData(thoughts, savedThoughtIds) {
  return thoughts.map(thought => ({
    ...thought,
    viewer_has_added_to_second_brain: savedThoughtIds?.has(thought.id) || false,
  }));
}

async function loadSaveCountByThought({ token, thoughtIds }) {
  if (!thoughtIds.length) return new Map();

  const saveCountByThoughtId = new Map();
  for (let i = 0; i < thoughtIds.length; i += THOUGHT_ID_CHUNK_SIZE) {
    const chunk = thoughtIds.slice(i, i + THOUGHT_ID_CHUNK_SIZE);
    let offset = 0;

    while (true) {
      const saveRows = await supabaseRequest('/rest/v1/thought_second_brain_saves', {
        method: 'GET',
        query: {
          select: 'thought_id',
          thought_id: `in.(${chunk.join(',')})`,
          limit: PAGE_SIZE,
          offset,
        },
        authToken: token,
      });

      if (!Array.isArray(saveRows) || saveRows.length === 0) break;

      for (const row of saveRows) {
        const thoughtId = row?.thought_id;
        if (!thoughtId) continue;
        saveCountByThoughtId.set(thoughtId, Number(saveCountByThoughtId.get(thoughtId) || 0) + 1);
      }

      if (saveRows.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  }

  return saveCountByThoughtId;
}

function appendThoughtSaveCounts(thoughts, saveCountByThoughtId) {
  return thoughts.map(thought => ({
    ...thought,
    save_count: Number(saveCountByThoughtId.get(thought.id) || 0),
  }));
}

async function loadSaveCountByAuthor({ token, authorIds }) {
  if (!authorIds.length) return new Map();

  const authorThoughtRows = [];
  let thoughtOffset = 0;
  while (true) {
    const page = await supabaseRequest('/rest/v1/thoughts', {
      method: 'GET',
      query: {
        select: 'id,user_id',
        user_id: `in.(${authorIds.join(',')})`,
        visibility: 'eq.public',
        limit: PAGE_SIZE,
        offset: thoughtOffset,
      },
      authToken: token,
    });
    if (!Array.isArray(page) || page.length === 0) break;
    authorThoughtRows.push(...page);
    if (page.length < PAGE_SIZE) break;
    thoughtOffset += PAGE_SIZE;
  }

  const thoughtOwnerById = new Map();
  for (const row of authorThoughtRows) {
    if (!row?.id || !row?.user_id) continue;
    thoughtOwnerById.set(row.id, row.user_id);
  }

  const thoughtIds = Array.from(thoughtOwnerById.keys());
  if (!thoughtIds.length) return new Map();

  const saveCountByAuthorId = new Map();
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
        authToken: token,
      });

      if (!Array.isArray(saveRows) || saveRows.length === 0) break;

      for (const row of saveRows) {
        const ownerId = thoughtOwnerById.get(row?.thought_id);
        if (!ownerId) continue;
        saveCountByAuthorId.set(ownerId, Number(saveCountByAuthorId.get(ownerId) || 0) + 1);
      }

      if (saveRows.length < PAGE_SIZE) break;
      saveOffset += PAGE_SIZE;
    }
  }

  return saveCountByAuthorId;
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

    const followingIds = Array.from(new Set(
      (follows || [])
        .map(row => row.following_id)
        .filter(id => Boolean(id) && id !== userId)
    ));

    const everyoneRows = await supabaseRequest('/rest/v1/thoughts', {
      method: 'GET',
      query: {
        select: 'id,user_id,content,created_at,visibility,share_slug',
        visibility: 'eq.public',
        order: 'created_at.desc',
        limit: EVERYONE_LIMIT,
      },
      authToken: token,
    });

    const followingRows = followingIds.length
      ? await supabaseRequest('/rest/v1/thoughts', {
          method: 'GET',
          query: {
            select: 'id,user_id,content,created_at,visibility,share_slug',
            user_id: `in.(${followingIds.join(',')})`,
            visibility: 'eq.public',
            order: 'created_at.desc',
            limit: Math.max(30, followingIds.length * 3),
          },
          authToken: token,
        })
      : [];

    const allProfileIds = Array.from(new Set([
      ...followingIds,
      ...followingRows.map(row => row.user_id),
      ...everyoneRows.map(row => row.user_id),
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
    const saveCountByAuthorId = await loadSaveCountByAuthor({ token, authorIds: allProfileIds });

    const profileMap = new Map((profiles || []).map(profile => [profile.id, {
      ...profile,
      save_count: Number(saveCountByAuthorId.get(profile.id) || 0),
      is_self: profile.id === userId,
      is_following: followingIds.includes(profile.id),
    }]));
    const everyoneThoughts = mapThoughtRows(everyoneRows, profileMap);

    const followingThoughts = mapThoughtRows(followingRows, profileMap);

    const reactionTargets = collectThoughtIds([
      ...everyoneThoughts,
      ...followingThoughts,
    ]);
    const reactionSummary = await loadReactionSummary({ token, thoughtIds: reactionTargets, viewerId: userId });
    const saveCountByThoughtId = await loadSaveCountByThought({ token, thoughtIds: reactionTargets });
    const savedRows = reactionTargets.length
      ? await supabaseRequest('/rest/v1/thought_second_brain_saves', {
          method: 'GET',
          query: {
            select: 'thought_id',
            user_id: `eq.${userId}`,
            thought_id: `in.(${reactionTargets.join(',')})`,
          },
          authToken: token,
        })
      : [];
    const savedThoughtIds = new Set((savedRows || []).map(row => row.thought_id).filter(Boolean));

    const everyoneWithReactions = appendReactionData(everyoneThoughts, reactionSummary);
    const followingWithReactions = appendReactionData(followingThoughts, reactionSummary);
    const everyoneWithSaveCounts = appendThoughtSaveCounts(everyoneWithReactions, saveCountByThoughtId);
    const followingWithSaveCounts = appendThoughtSaveCounts(followingWithReactions, saveCountByThoughtId);
    const everyoneWithSaves = appendSecondBrainSaveData(everyoneWithSaveCounts, savedThoughtIds);
    const followingWithSaves = appendSecondBrainSaveData(followingWithSaveCounts, savedThoughtIds);

    return json(res, 200, {
      following: followingWithSaves,
      everyone: everyoneWithSaves,
      has_posted_today: hasPostedToday,
    });
  } catch (err) {
    const message = err?.data?.message || err.message || 'request failed';
    if (err.status === 401 || err.status === 403) return json(res, 401, { error: 'unauthorized' });
    return json(res, 500, { error: message });
  }
}
