import { classify } from './classify.js';
import { extractCategoryOverride } from './category-override.js';
import { insertEntry, getUserTags, getUserTimezone } from './db.js';

function compactWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function parseTags(input) {
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

export async function classifyAndInsertEntry({ rawText, userId, authToken }) {
  const { category: forcedCategory, text: cleanedText } = extractCategoryOverride(rawText);
  const textToClassify = cleanedText || String(rawText ?? '').trim();
  const timezone = await getUserTimezone(userId, authToken);
  const existingTags = await getUserTags(userId, authToken);
  const { category, title, summary, content, remind_at, tags } = await classify(textToClassify, {
    timezone,
    existingTags,
  });
  const finalCategory = forcedCategory ?? category;
  const normalizedTitle = typeof title === 'string' ? title.trim() : '';
  const normalizedSummary = typeof summary === 'string' ? summary.trim() : '';
  const normalizedContent = typeof content === 'string' ? content.trim() : '';

  const entry = await insertEntry({
    userId,
    raw_text: textToClassify,
    category: finalCategory,
    title: normalizedTitle || normalizedContent || textToClassify,
    summary: normalizedSummary || normalizedContent || textToClassify,
    remind_at,
    tags: parseTags(tags),
    authToken,
  });

  return {
    entry,
    textToClassify,
    finalCategory,
    normalizedContent,
    remindAt: remind_at,
  };
}
