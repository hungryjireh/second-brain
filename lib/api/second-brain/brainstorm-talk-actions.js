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
    const transcript = await transcribeWithUnrealSpeech({
      audioBase64: req.body?.audio_base64,
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

  return res.status(404).json({ error: "Not found" });
}
