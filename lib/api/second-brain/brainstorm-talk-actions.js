import {
  getBearerToken,
  verifyAuthToken,
  resolveAuthUserId,
} from "../../auth.js";
import {
  transcribeWithUnrealSpeech,
  synthesizeWithUnrealSpeech,
  UnrealSpeechError,
} from "../../unreal-speech.js";
import { getUserTimezone } from "../../db.js";
import { brainstormReply } from "./brainstorm-core.js";

async function requireAuthUser(req, res) {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Missing bearer token" });
    return null;
  }

  let authUser;
  try {
    authUser = await verifyAuthToken(token);
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return null;
  }

  const userId = resolveAuthUserId(authUser);
  if (!userId) {
    res.status(401).json({ error: "Invalid auth token" });
    return null;
  }

  return { token, userId };
}

async function handleTranscribe(req, res) {
  try {
    const audioUri = String(req.body?.audio_uri || "").trim();
    const audioBase64 = String(req.body?.audio_base64 || "").trim();
    const transcript = await transcribeWithUnrealSpeech({
      audioUri,
      audioBase64,
      extension: req.body?.extension || "m4a",
      timeoutMs: Number(req.body?.timeout_ms) || undefined,
    });
    return res.status(200).json({ transcript });
  } catch (error) {
    if (error instanceof UnrealSpeechError) {
      return res
        .status(error.status)
        .json({ error: error.message, code: error.code });
    }
    return res.status(500).json({
      error: String(
        error?.message || "Failed to transcribe brainstorm talk audio",
      ),
    });
  }
}

async function handleSynthesize(req, res) {
  try {
    const payload = await synthesizeWithUnrealSpeech({
      text: req.body?.text,
      voiceId: req.body?.voice_id || "Sierra",
      bitrate: req.body?.bitrate || "192k",
      speed: req.body?.speed ?? 0,
      pitch: req.body?.pitch ?? 1,
      timeoutMs: Number(req.body?.timeout_ms) || undefined,
    });
    return res.status(200).json(payload);
  } catch (error) {
    if (error instanceof UnrealSpeechError) {
      return res
        .status(error.status)
        .json({ error: error.message, code: error.code });
    }
    return res.status(500).json({
      error: String(
        error?.message || "Failed to synthesize brainstorm talk audio",
      ),
    });
  }
}

async function handleStreamTurn(req, res, auth) {
  const partialText = String(req.body?.partial_text || "").trim();
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  const commitTurn = Boolean(req.body?.commit_turn);
  const minimumWordsForDraft = Number(req.body?.minimum_words_for_draft) || 8;
  const wordCount = partialText ? partialText.split(/\s+/).length : 0;

  if (!partialText) {
    return res.status(400).json({ error: "partial_text is required" });
  }

  if (!commitTurn && wordCount < minimumWordsForDraft) {
    return res.status(200).json({
      draftReply: "",
      deferred: true,
      wordCount,
      minimumWordsForDraft,
    });
  }

  try {
    const timezone = await getUserTimezone(auth.userId, auth.token);
    const draftReply = await brainstormReply({
      message: partialText,
      history,
      timezone,
    });
    return res.status(200).json({
      draftReply,
      deferred: false,
      wordCount,
      minimumWordsForDraft,
      committed: commitTurn,
    });
  } catch (error) {
    return res.status(500).json({
      error: String(error?.message || "Failed to process streaming turn"),
    });
  }
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await requireAuthUser(req, res);
  if (!auth) return null;

  const action = String(req.query?.action || "")
    .trim()
    .toLowerCase();
  if (action === "transcribe") {
    return handleTranscribe(req, res);
  }
  if (action === "synthesize") {
    return handleSynthesize(req, res);
  }
  if (action === "stream-turn") {
    return handleStreamTurn(req, res, auth);
  }

  return res.status(404).json({ error: "Not found" });
}
