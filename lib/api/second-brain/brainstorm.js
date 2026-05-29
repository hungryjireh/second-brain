import { json } from "../../open-brain/helpers.js";
import {
  getBearerToken,
  verifyAuthToken,
  resolveAuthUserId,
} from "../../auth.js";
import { getUserTimezone } from "../../db.js";
import Groq from "groq-sdk";
import { getGroqModel } from "./classify.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are a brainstorming partner for a personal knowledge app.
Help the user think through ideas by asking useful follow-up questions, offering options, and gently structuring their thoughts.
Keep responses concise, practical, and conversational.
Do not output JSON or markdown wrappers.`;

async function brainstormReply({
  message,
  history = [],
  timezone = "Asia/Singapore",
}) {
  const trimmedMessage = typeof message === "string" ? message.trim() : "";
  if (!trimmedMessage) {
    throw new Error("message is required");
  }

  const normalizedHistory = Array.isArray(history)
    ? history
        .map((item) => ({
          role: item?.role === "assistant" ? "assistant" : "user",
          content: typeof item?.content === "string" ? item.content.trim() : "",
        }))
        .filter((item) => item.content.length > 0)
        .slice(-12)
    : [];

  const completion = await groq.chat.completions.create({
    model: getGroqModel(),
    temperature: 0.6,
    max_tokens: 300,
    messages: [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}\nThe user's timezone is ${timezone}.`,
      },
      ...normalizedHistory,
      { role: "user", content: trimmedMessage },
    ],
  });

  const content = completion?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() : "";
}

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
