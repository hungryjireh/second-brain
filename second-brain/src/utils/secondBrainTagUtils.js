import {
  GLOBALLY_PERMISSIVE_TAGS_NORMALIZED,
  MAX_ENTRY_TAGS,
} from "../constants/tags";

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
    })
    .slice(0, MAX_ENTRY_TAGS);
}

export function tagsToInput(tags) {
  if (!Array.isArray(tags)) return "";
  return tags
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .join(",");
}

export function countBillableGlobalTags(tags) {
  return new Set(
    tags
      .map((tag) => normalizeTagValue(tag))
      .filter((tag) => tag && !GLOBALLY_PERMISSIVE_TAGS_NORMALIZED.has(tag)),
  ).size;
}
