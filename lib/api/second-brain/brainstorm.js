import { json } from "../../open-brain/helpers.js";
import {
  getBearerToken,
  verifyAuthToken,
  resolveAuthUserId,
} from "../../auth.js";
import { getUserTimezone } from "../../db.js";
import { brainstormReply } from "./brainstorm-core.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  let authUser;
  const token = getBearerToken(req);
  if (!token) return json(res, 401, { error: "missing bearer token" });
  try {
    authUser = await verifyAuthToken(token);
  } catch (err) {
    return json(res, 401, { error: err.message || "unauthorized" });
  }

  const userId = resolveAuthUserId(authUser);
  if (!userId) {
    return json(res, 401, {
      error: "invalid auth token payload: expected UUID user id",
    });
  }

  const message =
    typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message) {
    return json(res, 400, { error: "message is required" });
  }

  const history = Array.isArray(req.body?.history) ? req.body.history : [];

  try {
    const timezone = await getUserTimezone(userId, token);
    const reply = await brainstormReply({ message, history, timezone });
    if (!reply) {
      return json(res, 502, { error: "empty brainstorm reply" });
    }
    return json(res, 200, { reply });
  } catch (err) {
    console.error("[POST /api/brainstorm]", err);
    return json(res, 500, {
      error: err.message || "Failed to process brainstorm message",
    });
  }
}
