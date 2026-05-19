import {
  getBearerToken,
  verifyAuthToken,
  resolveAuthUserId,
} from "../../auth.js";
import { json, supabaseRequest, isUuid } from "../helpers.js";
const NOTIFICATION_TYPES = new Set(["follow", "reaction"]);
const REACTION_TYPES = new Set(["felt_this", "me_too", "made_me_think"]);

function parseNotificationPayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!["GET", "POST", "PATCH"].includes(req.method))
    return json(res, 405, { error: "Method not allowed" });

  const token = getBearerToken(req);
  if (!token) return json(res, 401, { error: "missing bearer token" });

  let authUser;
  try {
    authUser = await verifyAuthToken(token);
  } catch (err) {
    return json(res, 401, { error: err.message || "unauthorized" });
  }

  const actorId = resolveAuthUserId(authUser);
  if (!actorId) return json(res, 401, { error: "invalid auth user" });

  if (req.method === "GET") {
    try {
      const rows = await supabaseRequest("/rest/v1/notifications", {
        query: {
          select: "id,user_id,actor_id,type,payload,read_at,created_at",
          user_id: `eq.${actorId}`,
          order: "created_at.desc",
          limit: 50,
        },
        authToken: token,
      });
      const notifications = Array.isArray(rows) ? rows : [];
      const actorIds = [
        ...new Set(
          notifications
            .map((item) => item?.actor_id)
            .filter((value) => typeof value === "string" && value.length > 0),
        ),
      ];
      const thoughtIds = [
        ...new Set(
          notifications
            .map((item) => parseNotificationPayload(item?.payload)?.thought_id)
            .filter((value) => typeof value === "string" && value.length > 0),
        ),
      ];

      if (actorIds.length === 0 && thoughtIds.length === 0) {
        return json(res, 200, { notifications });
      }

      const [profileRows, thoughtRows] = await Promise.all([
        actorIds.length
          ? supabaseRequest("/rest/v1/profiles", {
              query: {
                select: "id,username",
                id: `in.(${actorIds.join(",")})`,
              },
              authToken: token,
            })
          : [],
        thoughtIds.length
          ? supabaseRequest("/rest/v1/thoughts", {
              query: {
                select: "id,share_slug",
                id: `in.(${thoughtIds.join(",")})`,
              },
              authToken: token,
            })
          : [],
      ]);

      const usernameById = new Map(
        (Array.isArray(profileRows) ? profileRows : []).map((profile) => [
          profile?.id,
          profile?.username || null,
        ]),
      );
      const thoughtById = new Map(
        (Array.isArray(thoughtRows) ? thoughtRows : []).map((thought) => [
          thought?.id,
          { id: thought?.id, share_slug: thought?.share_slug || null },
        ]),
      );

      const notificationsWithActorProfiles = notifications.map((item) => ({
        ...item,
        payload: parseNotificationPayload(item?.payload),
        profiles: {
          username: usernameById.get(item?.actor_id) || null,
        },
        thought:
          thoughtById.get(
            parseNotificationPayload(item?.payload)?.thought_id,
          ) || null,
      }));

      return json(res, 200, { notifications: notificationsWithActorProfiles });
    } catch (err) {
      const message = err?.data?.message || err.message || "request failed";
      if (err.status === 401 || err.status === 403)
        return json(res, 401, { error: "unauthorized" });
      return json(res, 500, { error: message });
    }
  }

  if (req.method === "PATCH") {
    const id = String(req.body?.id || "").trim();
    if (!isUuid(id))
      return json(res, 400, { error: "id must be a valid UUID" });

    try {
      const rows = await supabaseRequest("/rest/v1/notifications", {
        method: "PATCH",
        query: {
          id: `eq.${id}`,
          user_id: `eq.${actorId}`,
          select: "id,user_id,actor_id,type,payload,read_at,created_at",
        },
        body: { read_at: new Date().toISOString() },
        authToken: token,
        prefer: "return=representation",
      });
      return json(res, 200, { notification: rows?.[0] || null });
    } catch (err) {
      const message = err?.data?.message || err.message || "request failed";
      if (err.status === 401 || err.status === 403)
        return json(res, 401, { error: "unauthorized" });
      return json(res, 500, { error: message });
    }
  }

  const userId = String(req.body?.user_id || "").trim();
  const type = String(req.body?.type || "").trim();
  const payload = parseNotificationPayload(req.body?.payload);
  const thoughtId = String(
    payload?.thought_id || req.body?.thought_id || "",
  ).trim();
  const reactionType = String(
    payload?.reaction_type || req.body?.reaction_type || "",
  ).trim();

  if (!isUuid(userId))
    return json(res, 400, { error: "user_id must be a valid UUID" });
  if (userId === actorId)
    return json(res, 400, { error: "cannot notify yourself" });
  if (!NOTIFICATION_TYPES.has(type))
    return json(res, 400, { error: "unsupported notification type" });
  if (type === "reaction") {
    if (!isUuid(thoughtId))
      return json(res, 400, { error: "thought_id must be a valid UUID" });
    if (!REACTION_TYPES.has(reactionType))
      return json(res, 400, { error: "unsupported reaction type" });
  }

  try {
    const insertRow =
      type === "reaction"
        ? {
            user_id: userId,
            actor_id: actorId,
            type,
            payload: { thought_id: thoughtId, reaction_type: reactionType },
          }
        : { user_id: userId, actor_id: actorId, type, payload: {} };
    await supabaseRequest("/rest/v1/notifications", {
      method: "POST",
      body: [insertRow],
      authToken: token,
      prefer: "return=minimal",
    });

    return json(res, 201, {
      notification: {
        user_id: userId,
        actor_id: actorId,
        type,
        payload:
          type === "reaction"
            ? { thought_id: thoughtId, reaction_type: reactionType }
            : {},
      },
    });
  } catch (err) {
    const message = err?.data?.message || err.message || "request failed";
    if (err.status === 401 || err.status === 403)
      return json(res, 401, { error: "unauthorized" });
    return json(res, 500, { error: message });
  }
}
