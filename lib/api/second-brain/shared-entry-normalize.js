import {
  compactWhitespace,
  truncateWords,
  truncateChars,
} from "../../text-format.js";

function normalizeMarkdownBullets(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/^(\s*)[•●◦▪‣]\s+(.+)$/, "$1- $2"))
    .join("\n");
}

function deriveEntryFields(description, classifiedContent = "") {
  const rawDescription = normalizeMarkdownBullets(
    String(description ?? ""),
  ).trim();
  const normalizedDescription = compactWhitespace(rawDescription);
  const normalizedClassified = compactWhitespace(classifiedContent);
  const titleSource = normalizedClassified || normalizedDescription;
  const summarySource = normalizedClassified || normalizedDescription;
  const title = truncateChars(truncateWords(titleSource, 8), 80) || "Untitled";
  const summary =
    truncateChars(truncateWords(summarySource, 22), 180) || "No summary.";
  return { title, summary, raw_text: rawDescription };
}

export function normalizeEntry(entry) {
  if (!entry) return entry;
  const rawText = entry.raw_text ?? entry.description ?? entry.content ?? "";
  const fallback = deriveEntryFields(
    rawText,
    entry.summary ?? entry.content ?? "",
  );
  return {
    ...entry,
    raw_text: rawText,
    title: entry.title ?? fallback.title,
    summary: entry.summary ?? entry.content ?? fallback.summary,
    updated_at: entry.updated_at ?? entry.created_at ?? null,
    tags: Array.isArray(entry.tags) ? entry.tags : [],
  };
}
