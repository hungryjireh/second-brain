import Groq from "groq-sdk";
import { unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { createReadStream } from "fs";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Download audio from a URL, transcribe via Groq Whisper, return plain text.
 * Uses /tmp (the only writable path in Vercel serverless functions).
 *
 * @param {string} audioUrl  – publicly accessible audio URL (Telegram CDN)
 * @returns {Promise<string>}
 */
export async function transcribeFromUrl(audioUrl) {
  // Download to /tmp — Vercel allows up to 512 MB there
  const tmpPath = join(tmpdir(), `voice_${Date.now()}.ogg`);

  const res = await fetch(audioUrl);
  if (!res.ok) throw new Error(`Failed to download audio: ${res.status}`);

  const buffer = await res.arrayBuffer();
  writeFileSync(tmpPath, Buffer.from(buffer));

  try {
    const transcription = await groq.audio.transcriptions.create({
      file: createReadStream(tmpPath),
      model: "whisper-large-v3-turbo",
      language: "en",
      response_format: "json",
      temperature: 0.0,
    });
    return transcription.text?.trim() ?? "";
  } finally {
    try {
      unlinkSync(tmpPath);
    } catch {
      /* ignore cleanup errors */
    }
  }
}

export async function transcribeFromBuffer(audioBuffer, extension = "m4a") {
  const safeExtension =
    String(extension || "m4a")
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase() || "m4a";
  const tmpPath = join(tmpdir(), `voice_${Date.now()}.${safeExtension}`);
  writeFileSync(tmpPath, audioBuffer);

  try {
    const transcription = await groq.audio.transcriptions.create({
      file: createReadStream(tmpPath),
      model: "whisper-large-v3-turbo",
      language: "en",
      response_format: "json",
      temperature: 0.0,
    });
    return transcription.text?.trim() ?? "";
  } finally {
    try {
      unlinkSync(tmpPath);
    } catch {
      /* ignore cleanup errors */
    }
  }
}
