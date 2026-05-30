import {
  getBearerToken,
  verifyAuthToken,
  resolveAuthUserId,
} from "../../auth.js";
import { json, supabaseRequest, isUuid } from "../helpers.js";
import { loadOpenBrainSaveCounts } from "../save-counts.js";

function isValidUsername(value) {
  return /^[a-z0-9_]{3,24}$/i.test(value);
}

function assertBooleanField(value, fieldName) {
  if (typeof value !== "boolean") {
    throw new Error(`${fieldName} must be a boolean`);
  }
  return value;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!["GET", "POST", "PATCH"].includes(req.method))
    return json(res, 405, { error: "Method not allowed" });

  const token = getBearerToken(req);

  try {
    if (req.method === "GET") {
      const requestedUserId = String(req.query?.id || "").trim();
      const requestedUsername = String(req.query?.username || "").trim();
      const usingUsernameLookup = !requestedUserId && requestedUsername;
      let authUserId = null;
      let authToken = undefined;

      if (token) {
        try {
          const authUser = await verifyAuthToken(token);
          authUserId = resolveAuthUserId(authUser);
          if (!authUserId)
            return json(res, 401, { error: "invalid auth user" });
          authToken = token;
        } catch (err) {
          if (!usingUsernameLookup)
            return json(res, 401, { error: err.message || "unauthorized" });
        }
      } else if (!usingUsernameLookup) {
        return json(res, 401, { error: "missing bearer token" });
      }

      const targetId = isUuid(requestedUserId) ? requestedUserId : authUserId;
      if (!usingUsernameLookup && !targetId)
        return json(res, 401, { error: "invalid auth user" });
      const rows = await supabaseRequest("/rest/v1/profiles", {
        method: "GET",
        query: usingUsernameLookup
          ? {
              select:
                "id,username,bio,avatar_url,streak_count,last_posted_at,timezone,username_changed_once",
              username: `eq.${requestedUsername}`,
              limit: 1,
            }
          : {
              select:
                "id,username,bio,avatar_url,streak_count,last_posted_at,timezone,username_changed_once",
              id: `eq.${targetId}`,
              limit: 1,
            },
        authToken,
      });

      if (!rows?.[0]) return json(res, 404, { profile: null });
      const profile = rows[0];
      const usernameChangedOnce = assertBooleanField(
        profile.username_changed_once,
        "profiles.username_changed_once",
      );
      const { profileCounts } = await loadOpenBrainSaveCounts({
        token: authToken,
        profileIds: [profile.id],
      });
      const saveCount = Number(profileCounts.get(profile.id) || 0);
      const isSelf = Boolean(authUserId) && profile.id === authUserId;
      let isFollowing = false;

      if (authUserId && !isSelf) {
        const followRows = await supabaseRequest("/rest/v1/follows", {
          method: "GET",
          query: {
            select: "following_id",
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
          can_change_username: !usernameChangedOnce,
        },
      });
    }

    if (!token) return json(res, 401, { error: "missing bearer token" });
    let authUser;
    try {
      authUser = await verifyAuthToken(token);
    } catch (err) {
      return json(res, 401, { error: err.message || "unauthorized" });
    }

    const userId = resolveAuthUserId(authUser);
    if (!userId) return json(res, 401, { error: "invalid auth user" });

    if (req.method === "POST") {
      const username = String(req.body?.username || "").trim();
      const bio = String(req.body?.bio || "").trim() || null;
      const avatarUrl = String(req.body?.avatar_url || "").trim() || null;
      const timezone = String(req.body?.timezone || "").trim() || "UTC";

      if (!isValidUsername(username)) {
        return json(res, 400, {
          error:
            "username must be 3-24 chars and use letters, numbers, or underscores",
        });
      }

      if (avatarUrl && !/^https?:\/\//i.test(avatarUrl)) {
        return json(res, 400, {
          error: "avatar_url must be a valid http(s) URL",
        });
      }

      const rows = await supabaseRequest("/rest/v1/profiles", {
        method: "POST",
        query: { on_conflict: "id" },
        body: [
          {
            id: userId,
            username,
            avatar_url: avatarUrl,
            timezone,
            bio,
            username_changed_once: false,
          },
        ],
        prefer: "resolution=merge-duplicates,return=representation",
        authToken: token,
      });

      const profile = rows?.[0] || null;
      if (!profile) return json(res, 201, { profile: null });
      assertBooleanField(
        profile.username_changed_once,
        "profiles.username_changed_once",
      );
      return json(res, 201, { profile });
    }

    const requestedUsername = String(req.body?.username || "").trim();
    const bio = String(req.body?.bio || "").trim() || null;
    const avatarUrl = String(req.body?.avatar_url || "").trim() || null;
    const timezone = String(req.body?.timezone || "").trim() || "UTC";

    if (avatarUrl && !/^https?:\/\//i.test(avatarUrl)) {
      return json(res, 400, {
        error: "avatar_url must be a valid http(s) URL",
      });
    }

    const existingRows = await supabaseRequest("/rest/v1/profiles", {
      method: "GET",
      query: {
        select: "username,username_changed_once",
        id: `eq.${userId}`,
        limit: 1,
      },
      authToken: token,
    });
    const existingProfile = existingRows?.[0];
    if (!existingProfile) return json(res, 404, { error: "profile not found" });
    const usernameChangedOnce = assertBooleanField(
      existingProfile.username_changed_once,
      "profiles.username_changed_once",
    );

    const patchBody = {
      bio,
      avatar_url: avatarUrl,
      timezone,
    };

    if (
      requestedUsername &&
      requestedUsername !== String(existingProfile.username || "")
    ) {
      if (!isValidUsername(requestedUsername)) {
        return json(res, 400, {
          error:
            "username must be 3-24 chars and use letters, numbers, or underscores",
        });
      }
      if (usernameChangedOnce) {
        return json(res, 400, { error: "username can only be changed once" });
      }
      patchBody.username = requestedUsername;
      patchBody.username_changed_once = true;
    }

    const rows = await supabaseRequest("/rest/v1/profiles", {
      method: "PATCH",
      query: { id: `eq.${userId}` },
      body: patchBody,
      prefer: "return=representation",
      authToken: token,
    });

    const profile = rows?.[0] || null;
    if (!profile) return json(res, 200, { profile: null });
    assertBooleanField(
      profile.username_changed_once,
      "profiles.username_changed_once",
    );
    return json(res, 200, { profile });
  } catch (err) {
    const message = err?.data?.message || err.message || "request failed";
    if (err.status === 409) return json(res, 409, { error: message });
    if (err.status === 401 || err.status === 403)
      return json(res, 401, { error: "unauthorized" });
    return json(res, 500, { error: message });
  }
}
