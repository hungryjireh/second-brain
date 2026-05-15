const CATEGORY_PREFIX_PATTERN = /^\s*(?:\/(reminder|todo|note|thought)|slash\s+(reminder|todo|note|thought))\b[\s,:-]*/i;

/**
 * Parses explicit category prefixes from user text.
 * Supports typed prefixes (/todo) and voice-transcribed prefixes (slash todo).
 *
 * @param {string} input
 * @returns {{ category: 'reminder'|'todo'|'note'|'thought'|null, text: string }}
 */
export function extractCategoryOverride(input) {
  const original = String(input ?? '');
  const match = original.match(CATEGORY_PREFIX_PATTERN);

  if (!match) {
    return { category: null, text: original.trim() };
  }

  const category = (match[1] || match[2] || '').toLowerCase();
  const text = original.slice(match[0].length).trim();

  return {
    category: category || null,
    text,
  };
}
