export function normalizeTagValue(input) {
  return String(input || "")
    .trim()
    .replace(/^#+/, "")
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 32);
}

export function parseTagInput(input) {
  const seen = new Set();
  return String(input || "")
    .split(",")
    .map((part) => normalizeTagValue(part))
    .filter((tag) => {
      if (!tag || seen.has(tag)) return false;
      seen.add(tag);
      return true;
    });
}

export function tagsToInput(tags) {
  if (!Array.isArray(tags)) return "";
  return tags
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .join(",");
}
