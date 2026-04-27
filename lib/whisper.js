import Groq from 'groq-sdk';
import { createWriteStream, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createReadStream } from 'fs';

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
  const { writeFileSync } = await import('fs');
  writeFileSync(tmpPath, Buffer.from(buffer));

  try {
    const transcription = await groq.audio.transcriptions.create({
      file:            createReadStream(tmpPath),
      model:           'whisper-large-v3-turbo',
      language:        'en',
      response_format: 'json',
      temperature:     0.0,
    });
    return transcription.text?.trim() ?? '';
  } finally {
    try { unlinkSync(tmpPath); } catch { /* ignore cleanup errors */ }
  }
}
