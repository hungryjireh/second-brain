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
    const viewerThoughtRows = await supabaseRequest("/rest/v1/thoughts", {
      method: "GET",
      query: {
        select: "created_at",
        user_id: `eq.${userId}`,
        order: "created_at.desc",
        limit: 1,
      },
      authToken: token,
    });
    const latestViewerThoughtAt = viewerThoughtRows?.[0]?.created_at;
    const latestViewerDay = latestViewerThoughtAt
      ? getEpochDayInTimezone(new Date(latestViewerThoughtAt), timezone)
      : null;
    const hasPostedToday =
      Number.isInteger(nowDay) &&
      Number.isInteger(latestViewerDay) &&
      latestViewerDay === nowDay;

    const follows = await supabaseRequest("/rest/v1/follows", {
      method: "GET",
      query: {
        select: "following_id",
        follower_id: `eq.${userId}`,
      },
      authToken: token,
    });

    const followingIds = Array.from(
      new Set(
        (follows || [])
          .map((row) => row.following_id)
          .filter((id) => Boolean(id) && id !== userId),
      ),
    );
    const followingIdSet = new Set(followingIds);

    const everyoneRows = await supabaseRequest("/rest/v1/thoughts", {
      method: "GET",
      query: {
        select: "id,user_id,content,created_at,visibility,share_slug",
        visibility: "eq.public",
        order: "created_at.desc",
        limit: EVERYONE_LIMIT,
      },
      authToken: token,
    });

    const followingRows = followingIds.length
      ? await supabaseRequest("/rest/v1/thoughts", {
          method: "GET",
          query: {
            select: "id,user_id,content,created_at,visibility,share_slug",
            user_id: `in.(${followingIds.join(",")})`,
            visibility: "eq.public",
            order: "created_at.desc",
            limit: Math.max(30, followingIds.length * 3),
          },
          authToken: token,
        })
      : [];

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
    const reactionSummary = await loadOpenBrainReactionSummary({
      token,
      thoughtIds: reactionTargets,
      viewerId: userId,
    });
    const { profileCounts, thoughtCounts: saveCountByThoughtId } =
      await loadOpenBrainSaveCounts({
        token,
        profileIds: visibleAuthorIds,
        thoughtIds: reactionTargets,
      });
    for (const [profileId, saveCount] of profileCounts.entries()) {
      const profile = profileMap.get(profileId);
      if (!profile) continue;
      profileMap.set(profileId, {
        ...profile,
        save_count: Number(saveCount || 0),
      });
    }
    const savedRows = reactionTargets.length
      ? await supabaseRequest("/rest/v1/thought_second_brain_saves", {
          method: "GET",
          query: {
            select: "thought_id",
            user_id: `eq.${userId}`,
            thought_id: `in.(${reactionTargets.join(",")})`,
          },
          authToken: token,
        })
      : [];
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
    });
  } catch (err) {
    const message = err?.data?.message || err.message || "request failed";
    if (err.status === 401 || err.status === 403)
      return json(res, 401, { error: "unauthorized" });
    return json(res, 500, { error: message });
  }
}
