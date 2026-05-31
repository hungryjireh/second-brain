import {
  getBearerToken,
  verifyAuthToken,
  resolveAuthUserId,
} from "../../auth.js";
import { json, supabaseRequest, getEpochDayInTimezone } from "../helpers.js";
import { loadOpenBrainReactionSummary } from "../reaction-summary.js";
import { loadOpenBrainSaveCounts } from "../save-counts.js";

const REACTION_TYPES = new Set(["felt_this", "me_too", "made_me_think"]);
const EVERYONE_LIMIT = 60;
const FOLLOWING_LIMIT_MIN = 30;
const FOLLOWING_LIMIT_MAX = 90;
const FEED_TAB_VALUES = new Set(["following", "everyone"]);

function mapThoughtRows(rows, profileMap) {
  return (rows || []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    text: typeof row.content?.text === "string" ? row.content.text : "",
    created_at: row.created_at,
    visibility: row.visibility,
    share_slug: row.share_slug || null,
    viewer_has_added_to_second_brain: false,
    profile: profileMap.get(row.user_id) || null,
  }));
}

function parseIsoDate(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
}

function normalizeFeedTab(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (!FEED_TAB_VALUES.has(normalized)) return "";
  return normalized;
}

function collectThoughtIds(thoughts) {
  return Array.from(new Set(thoughts.map((item) => item.id).filter(Boolean)));
}

function enrichThoughts(
  thoughts,
  { reactionSummary, saveCountByThoughtId, savedThoughtIds },
) {
  return thoughts.map((thought) => ({
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
    save_count: Number(saveCountByThoughtId.get(thought.id) || 0),
    viewer_has_added_to_second_brain: savedThoughtIds?.has(thought.id) || false,
  }));
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();

  const token = getBearerToken(req);
  if (!token) return json(res, 401, { error: "missing bearer token" });

  let authUser;
  try {
    authUser = await verifyAuthToken(token);
  } catch (err) {
    return json(res, 401, { error: err.message || "unauthorized" });
  }

  const userId = resolveAuthUserId(authUser);
  if (!userId) return json(res, 401, { error: "invalid auth user" });

  try {
    if (req.method === "POST") {
      const thoughtId = String(req.body?.thought_id || "").trim();
      const type = String(req.body?.type || "").trim();
      if (!thoughtId || !REACTION_TYPES.has(type)) {
        return json(res, 400, { error: "invalid reaction payload" });
      }

      const inserted = await supabaseRequest("/rest/v1/reactions", {
        method: "POST",
        body: [{ thought_id: thoughtId, user_id: userId, type }],
        prefer: "return=representation",
        authToken: token,
      });

      try {
        const thoughtRows = await supabaseRequest("/rest/v1/thoughts", {
          method: "GET",
          query: {
            select: "id,user_id",
            id: `eq.${thoughtId}`,
            limit: 1,
          },
          authToken: token,
        });
        const thoughtOwnerId = thoughtRows?.[0]?.user_id;
        if (thoughtOwnerId && thoughtOwnerId !== userId) {
          await supabaseRequest("/rest/v1/notifications", {
            method: "POST",
            body: [
              {
                user_id: thoughtOwnerId,
                actor_id: userId,
                type: "reaction",
                payload: {
                  thought_id: thoughtId,
                  reaction_type: type,
                },
              },
            ],
            prefer: "return=minimal",
            authToken: token,
          });
        }
      } catch {
        // Reaction write should still succeed even if notification delivery fails.
      }

      return json(res, 201, { reaction: inserted?.[0] || null });
    }

    if (req.method === "DELETE") {
      const thoughtId = String(req.query?.thought_id || "").trim();
      const type = String(req.query?.type || "").trim();
      if (!thoughtId || !REACTION_TYPES.has(type)) {
        return json(res, 400, { error: "invalid reaction payload" });
      }

      await supabaseRequest("/rest/v1/reactions", {
        method: "DELETE",
        query: {
          thought_id: `eq.${thoughtId}`,
          user_id: `eq.${userId}`,
          type: `eq.${type}`,
        },
        authToken: token,
      });

      return json(res, 200, { ok: true });
    }

    if (req.method !== "GET")
      return json(res, 405, { error: "Method not allowed" });

    const tab = normalizeFeedTab(req.query?.tab);
    const before = parseIsoDate(req.query?.before);
    const followingBefore =
      tab === "following" ? before : parseIsoDate(req.query?.following_before);
    const everyoneBefore =
      tab === "everyone" ? before : parseIsoDate(req.query?.everyone_before);
    const shouldLoadFollowing = tab !== "everyone";
    const shouldLoadEveryone = tab !== "following";
    const profileRows = await supabaseRequest("/rest/v1/profiles", {
      method: "GET",
      query: {
        select: "id,timezone",
        id: `eq.${userId}`,
        limit: 1,
      },
      authToken: token,
    });
    const timezone = profileRows?.[0]?.timezone || "UTC";
    const nowDay = getEpochDayInTimezone(new Date(), timezone);
    const [viewerThoughtRows, follows, everyoneRowsRaw] = await Promise.all([
      supabaseRequest("/rest/v1/thoughts", {
        method: "GET",
        query: {
          select: "created_at",
          user_id: `eq.${userId}`,
          order: "created_at.desc",
          limit: 1,
        },
        authToken: token,
      }),
      supabaseRequest("/rest/v1/follows", {
        method: "GET",
        query: {
          select: "following_id",
          follower_id: `eq.${userId}`,
        },
        authToken: token,
      }),
      shouldLoadEveryone
        ? supabaseRequest("/rest/v1/thoughts", {
            method: "GET",
            query: {
              select: "id,user_id,content,created_at,visibility,share_slug",
              visibility: "eq.public",
              ...(everyoneBefore ? { created_at: `lt.${everyoneBefore}` } : {}),
              order: "created_at.desc",
              limit: EVERYONE_LIMIT + 1,
            },
            authToken: token,
          })
        : Promise.resolve([]),
    ]);
    const latestViewerThoughtAt = viewerThoughtRows?.[0]?.created_at;
    const latestViewerDay = latestViewerThoughtAt
      ? getEpochDayInTimezone(new Date(latestViewerThoughtAt), timezone)
      : null;
    const hasPostedToday =
      Number.isInteger(nowDay) &&
      Number.isInteger(latestViewerDay) &&
      latestViewerDay === nowDay;

    const followingIds = Array.from(
      new Set(
        (follows || [])
          .map((row) => row.following_id)
          .filter((id) => Boolean(id) && id !== userId),
      ),
    );
    const followingIdSet = new Set(followingIds);

    const followingLimit = Math.min(
      FOLLOWING_LIMIT_MAX,
      Math.max(FOLLOWING_LIMIT_MIN, followingIds.length * 3),
    );
    const followingRowsRaw =
      shouldLoadFollowing && followingIds.length
        ? await supabaseRequest("/rest/v1/thoughts", {
            method: "GET",
            query: {
              select: "id,user_id,content,created_at,visibility,share_slug",
              user_id: `in.(${followingIds.join(",")})`,
              visibility: "eq.public",
              ...(followingBefore
                ? { created_at: `lt.${followingBefore}` }
                : {}),
              order: "created_at.desc",
              limit: followingLimit + 1,
            },
            authToken: token,
          })
        : [];
    const followingHasMore = followingRowsRaw.length > followingLimit;
    const everyoneHasMore = everyoneRowsRaw.length > EVERYONE_LIMIT;
    const followingRows = followingHasMore
      ? followingRowsRaw.slice(0, followingLimit)
      : followingRowsRaw;
    const everyoneRows = everyoneHasMore
      ? everyoneRowsRaw.slice(0, EVERYONE_LIMIT)
      : everyoneRowsRaw;

    const visibleAuthorIds = Array.from(
      new Set([
        ...followingRows.map((row) => row.user_id),
        ...everyoneRows.map((row) => row.user_id),
      ]),
    );

    const profiles = visibleAuthorIds.length
      ? await supabaseRequest("/rest/v1/profiles", {
          method: "GET",
          query: {
            select: "id,username,avatar_url,streak_count",
            id: `in.(${visibleAuthorIds.join(",")})`,
          },
          authToken: token,
        })
      : [];
    const profileMap = new Map(
      (profiles || []).map((profile) => [
        profile.id,
        {
          ...profile,
          save_count: 0,
          is_self: profile.id === userId,
          is_following: followingIdSet.has(profile.id),
        },
      ]),
    );
    const everyoneThoughts = mapThoughtRows(everyoneRows, profileMap);
    const followingThoughts = mapThoughtRows(followingRows, profileMap);

    const reactionTargets = collectThoughtIds([
      ...everyoneThoughts,
      ...followingThoughts,
    ]);
    const [reactionSummary, saveCountsResult, savedRows] = await Promise.all([
      loadOpenBrainReactionSummary({
        token,
        thoughtIds: reactionTargets,
        viewerId: userId,
      }),
      loadOpenBrainSaveCounts({
        token,
        profileIds: visibleAuthorIds,
        thoughtIds: reactionTargets,
      }),
      reactionTargets.length
        ? supabaseRequest("/rest/v1/thought_second_brain_saves", {
            method: "GET",
            query: {
              select: "thought_id",
              user_id: `eq.${userId}`,
              thought_id: `in.(${reactionTargets.join(",")})`,
            },
            authToken: token,
          })
        : Promise.resolve([]),
    ]);
    const { profileCounts, thoughtCounts: saveCountByThoughtId } =
      saveCountsResult;
    for (const [profileId, saveCount] of profileCounts.entries()) {
      const profile = profileMap.get(profileId);
      if (!profile) continue;
      profileMap.set(profileId, {
        ...profile,
        save_count: Number(saveCount || 0),
      });
    }
    const savedThoughtIds = new Set(
      (savedRows || []).map((row) => row.thought_id).filter(Boolean),
    );
    const everyoneEnriched = enrichThoughts(everyoneThoughts, {
      reactionSummary,
      saveCountByThoughtId,
      savedThoughtIds,
    });
    const followingEnriched = enrichThoughts(followingThoughts, {
      reactionSummary,
      saveCountByThoughtId,
      savedThoughtIds,
    });

    return json(res, 200, {
      following: followingEnriched,
      everyone: everyoneEnriched,
      has_posted_today: hasPostedToday,
      page: {
        following: {
          has_more: followingHasMore,
          next_cursor: followingHasMore
            ? followingRows[followingRows.length - 1]?.created_at || null
            : null,
        },
        everyone: {
          has_more: everyoneHasMore,
          next_cursor: everyoneHasMore
            ? everyoneRows[everyoneRows.length - 1]?.created_at || null
            : null,
        },
      },
    });
  } catch (err) {
    const message = err?.data?.message || err.message || "request failed";
    if (err.status === 401 || err.status === 403)
      return json(res, 401, { error: "unauthorized" });
    return json(res, 500, { error: message });
  }
}
