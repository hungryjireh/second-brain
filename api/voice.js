import { classify } from '../lib/classify.js';
import { extractCategoryOverride } from '../lib/category-override.js';
import { transcribeFromBuffer } from '../lib/whisper.js';
import { insertEntry, getUserTags, getUserTimezone } from '../lib/db.js';
import { getBearerToken, verifyAuthToken, resolveAuthUserId } from '../lib/auth.js';

function compactWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function parseTags(input) {
  if (!Array.isArray(input)) return [];

  const deduped = new Map();
  for (const raw of input) {
    if (typeof raw !== 'string') continue;
    const label = compactWhitespace(raw.replace(/^#+/, ''));
    if (!label) continue;
    const normalized = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32);
    if (!normalized) continue;
    if (!deduped.has(normalized)) {
      deduped.set(normalized, {
        name: label.slice(0, 32),
        normalized_name: normalized,
      });
    }
  }
  return [...deduped.values()].slice(0, 12);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });

  let authUser;
  try {
    authUser = await verifyAuthToken(token);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  const userId = resolveAuthUserId(authUser);

  try {
    const audioBase64 = String(req.body?.audio_base64 || '').trim();
    const extension = String(req.body?.extension || 'm4a').trim();
    if (!audioBase64) {
      return res.status(400).json({ error: 'audio_base64 is required' });
    }

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    if (!audioBuffer.length) {
      return res.status(400).json({ error: 'Invalid audio payload' });
    }

    const rawText = await transcribeFromBuffer(audioBuffer, extension);
    if (!rawText) {
      return res.status(422).json({ error: "Couldn't transcribe audio" });
    }

    const { category: forcedCategory, text: cleanedText } = extractCategoryOverride(rawText);
    const textToClassify = cleanedText || String(rawText ?? '').trim();
    const timezone = await getUserTimezone(userId, token);
    const existingTags = await getUserTags(userId, token);
    const { category, title, summary, content, remind_at, tags } = await classify(textToClassify, {
      timezone,
      existingTags,
    });
    const finalCategory = forcedCategory ?? category;
    const normalizedTitle = typeof title === 'string' ? title.trim() : '';
    const normalizedSummary = typeof summary === 'string' ? summary.trim() : '';
    const normalizedContent = typeof content === 'string' ? content.trim() : '';

    const created = await insertEntry({
      userId,
      raw_text: textToClassify,
      category: finalCategory,
      title: normalizedTitle || normalizedContent || textToClassify,
      summary: normalizedSummary || normalizedContent || textToClassify,
      remind_at,
      tags: parseTags(tags),
      authToken: token,
    });

    return res.status(200).json({
      entry: created,
      transcription: rawText,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to process voice note' });
  }
}
