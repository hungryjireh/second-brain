import fs from 'fs';
import Groq from 'groq-sdk';
import 'dotenv/config';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Transcribe an audio file using Groq Whisper (whisper-large-v3-turbo).
 * @param {string} filePath  – path to OGG/MP3/WAV/M4A file
 * @returns {Promise<string>} – transcribed plain text
 */
export async function transcribe(filePath) {
  const transcription = await groq.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: 'whisper-large-v3-turbo',
    language: 'en',
    response_format: 'json',
    temperature: 0.0,
  });

  return transcription.text?.trim() ?? '';
}
