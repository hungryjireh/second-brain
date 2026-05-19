export function normalizeThoughtText(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\u2028|\u2029/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function toThoughtBlock(part) {
  const unwrapped = part.replace(/^>\s?/gm, "").trim();
  const isQuote =
    /^>\s?/.test(part) ||
    /^".+"$/.test(part) ||
    /^“.+”$/.test(part) ||
    /^'.+'$/.test(part);
  return { text: isQuote ? unwrapped : part, isQuote };
}

export function parseThoughtBlocks(text) {
  const normalized = normalizeThoughtText(text);
  if (!normalized) return [];
  return normalized
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(toThoughtBlock);
}
