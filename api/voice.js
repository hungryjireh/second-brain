import { transcribeFromBuffer } from "../lib/whisper.js";
import {
  getBearerToken,
  verifyAuthToken,
  resolveAuthUserId,
} from "../lib/auth.js";
import { classifyAndInsertEntry } from "../lib/entry-processing.js";
import { MAX_VOICE_NOTE_DURATION_SECONDS } from "../lib/constants/voice.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: "Missing bearer token" });

  let authUser;
  try {
    authUser = await verifyAuthToken(token);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  const userId = resolveAuthUserId(authUser);

  try {
    const audioBase64 = String(req.body?.audio_base64 || "").trim();
    const extension = String(req.body?.extension || "m4a").trim();
    const durationSeconds = Number(req.body?.duration_seconds);
    if (!audioBase64) {
      return res.status(400).json({ error: "audio_base64 is required" });
    }
    if (
      Number.isFinite(durationSeconds) &&
      durationSeconds > MAX_VOICE_NOTE_DURATION_SECONDS
    ) {
      return res.status(400).json({
        error: `Voice notes must be ${MAX_VOICE_NOTE_DURATION_SECONDS} seconds or less`,
      });
    }

    const audioBuffer = Buffer.from(audioBase64, "base64");
    if (!audioBuffer.length) {
      return res.status(400).json({ error: "Invalid audio payload" });
    }

    const rawText = await transcribeFromBuffer(audioBuffer, extension);
    if (!rawText) {
      return res.status(422).json({ error: "Couldn't transcribe audio" });
    }

    const { entry: created } = await classifyAndInsertEntry({
      rawText,
      userId,
      authToken: token,
    });

    return res.status(200).json({
      entry: created,
      transcription: rawText,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to process voice note" });
  }
}
