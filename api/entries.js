import {
  getAllEntries,
  getEntriesByCategory,
  decodeEntriesCursor,
  MAX_ENTRIES_PAGE_SIZE,
  insertEntry,
  deleteEntry,
  updateEntry,
  getUserTags,
  getUserTimezone,
} from "../lib/db.js";
import { json } from "../lib/open-brain/helpers.js";
import { classify } from "../lib/classify.js";
import { extractCategoryOverride } from "../lib/category-override.js";
import { importLlmConversationsAsEntries } from "../lib/llm-conversation-import.js";
import {
  compactWhitespace,
  truncateWords,
  truncateChars,
} from "../lib/text-format.js";
import {
  getBearerToken,
  verifyAuthToken,
  resolveAuthUserId,
} from "../lib/auth.js";
import { GLOBALLY_PERMISSIVE_TAGS_NORMALIZED } from "../lib/constants/tags.js";

function parsePriority(value, { defaultValue } = { defaultValue: 0 }) {
  if (value === undefined) return defaultValue;
  if (!Number.isInteger(value) || value < 0 || value > 10) return null;
  return value;
}

function normalizeMarkdownBullets(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/^(\s*)[•●◦▪‣]\s+(.+)$/, "$1- $2"))
    .join("\n");
}

function parseTags(input) {
  if (input === undefined) return undefined;
  if (!Array.isArray(input)) return null;

  function normalizeTagKey(value) {
    return String(value ?? "")
      .trim()
      .replace(/^#+/, "")
      .toLowerCase()
      .replace(/[\s_-]+/g, "")
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 32);
  }

  const deduped = new Map();
  for (const raw of input) {
    if (typeof raw !== "string") return null;
    const label = compactWhitespace(raw.replace(/^#+/, ""));
    if (!label) continue;
    const normalized = normalizeTagKey(label);
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

function isOpenBrainImportedThought(description, finalCategory) {
  const text = String(description ?? "").trim();
  return finalCategory === "thought" && /^thought taken from @/i.test(text);
}

function enforceOpenBrainTags(tags) {
  const requiredTag = "openbrain";
  const normalized = new Set([requiredTag]);
  const finalTags = [requiredTag];
  const source = Array.isArray(tags) ? tags : [];

  for (const tag of source) {
    const normalizedName = String(tag?.normalized_name ?? "")
      .trim()
      .toLowerCase();
    if (!normalizedName || normalized.has(normalizedName)) continue;
    finalTags.push(normalizedName);
    normalized.add(normalizedName);
    if (finalTags.length >= 3) break;
  }

  return finalTags;
}

function isGloballyPermissiveTag(normalizedName) {
  return GLOBALLY_PERMISSIVE_TAGS_NORMALIZED.has(
    String(normalizedName || "")
      .trim()
      .toLowerCase(),
  );
}

function filterClassifierTagsByPermittedUserTags(classifiedTags, existingTags) {
  const source = Array.isArray(classifiedTags) ? classifiedTags : [];
  if (source.length === 0) return [];

  const permittedUserTags = new Set(
    (Array.isArray(existingTags) ? existingTags : [])
      .map((tag) => compactWhitespace(tag).toLowerCase())
      .filter(Boolean)
      .filter((tag) => !isGloballyPermissiveTag(tag)),
  );

  return source.filter((tag) => {
    const normalized = String(tag?.normalized_name || "")
      .trim()
      .toLowerCase();
    if (!normalized) return false;
    if (isGloballyPermissiveTag(normalized)) return true;
    return permittedUserTags.has(normalized);
  });
}

export { filterClassifierTagsByPermittedUserTags };

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

function normalizeEntry(entry) {
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

export { normalizeEntry };

function parseEntriesLimit(value) {
  if (value === undefined) return undefined;
  const n = Number.parseInt(String(value), 10);
  if (!Number.isInteger(n) || n < 1 || n > MAX_ENTRIES_PAGE_SIZE) return null;
  return n;
}

export default async function handler(req, res) {
  // OPTIONS pre-flight (CORS headers set globally in vercel.json)
  if (req.method === "OPTIONS") return res.status(204).end();

  let authUser;
  const token = getBearerToken(req);
  if (!token) return json(res, 401, { error: "missing bearer token" });

  try {
    authUser = await verifyAuthToken(token);
  } catch (err) {
    return json(res, 401, { error: err.message || "unauthorized" });
  }
  const userId = resolveAuthUserId(authUser);
  if (!userId)
    return json(res, 401, {
      error: "invalid auth token payload: expected UUID user id",
    });

  // ── GET /api/entries[?category=X] ──────────────────────────────────────────
  if (req.method === "GET") {
    try {
      const { category, limit: rawLimit, cursor: rawCursor } = req.query;
      const limit = parseEntriesLimit(rawLimit);
      if (limit === null) {
        return json(res, 400, {
          error: `limit must be an integer between 1 and ${MAX_ENTRIES_PAGE_SIZE}`,
        });
      }

      const cursor = rawCursor === undefined ? undefined : String(rawCursor);
      if (cursor !== undefined && decodeEntriesCursor(cursor) === null) {
        return json(res, 400, {
          error: 'invalid cursor. expected "<created_at>:<id>"',
        });
      }

      const pageOptions = { limit, cursor };
      const result = category
        ? await getEntriesByCategory(userId, category, token, pageOptions)
        : await getAllEntries(userId, token, pageOptions);

      if (Array.isArray(result)) {
        return json(res, 200, result.map(normalizeEntry));
      }

      return json(res, 200, {
        entries: result.entries.map(normalizeEntry),
        page: {
          limit: result.limit,
          has_more: result.hasMore,
          next_cursor: result.nextCursor,
        },
      });
    } catch (err) {
      console.error("[GET /api/entries]", err);
      return json(res, 500, { error: err.message });
    }
  }

  // ── POST /api/entries  { description, category?, tags?, priority? } ───────
  if (req.method === "POST") {
    if (
      req.body?.import_format === "claude_conversations" ||
      req.body?.import_format === "llm_conversations"
    ) {
      try {
        const created = await importLlmConversationsAsEntries({
          userId,
          authToken: token,
          conversations: req.body?.conversations,
          normalizeEntry,
        });
        if (created.length === 0) {
          return json(res, 400, {
            error:
              "No valid Claude/ChatGPT conversations found in import payload",
          });
        }

        return json(res, 201, { created });
      } catch (err) {
        console.error("[POST /api/entries import]", err);
        return json(res, 500, { error: err.message });
      }
    }

    const {
      description,
      text,
      priority,
      tags,
      category: requestedCategory,
    } = req.body ?? {};
    const sourceDescription = description ?? text;
    if (!sourceDescription?.trim())
      return json(res, 400, { error: "description is required" });
    const validCategories = new Set(["reminder", "todo", "thought", "note"]);
    if (
      requestedCategory !== undefined &&
      !validCategories.has(requestedCategory)
    ) {
      return json(res, 400, { error: "invalid category" });
    }
    const parsedPriority = parsePriority(priority, { defaultValue: 0 });
    if (parsedPriority === null) {
      return json(res, 400, {
        error: "priority must be an integer from 0 to 10",
      });
    }
    const parsedTags = parseTags(tags);
    if (parsedTags === null) {
      return json(res, 400, { error: "tags must be an array of strings" });
    }

    try {
      const normalizedDescription = sourceDescription.trim();
      const { category: forcedCategory, text: cleanedText } =
        extractCategoryOverride(normalizedDescription);
      const textToClassify = cleanedText || normalizedDescription;
      const timezone = await getUserTimezone(userId, token);
      const existingTags = await getUserTags(userId, token);
      const {
        category,
        title,
        summary,
        content,
        remind_at,
        tags: classifiedTags,
      } = await classify(textToClassify, {
        timezone,
        existingTags,
      });
      const finalCategory = forcedCategory ?? requestedCategory ?? category;
      const derived = deriveEntryFields(textToClassify, content);
      const normalizedClassifiedTags = parseTags(classifiedTags);
      const validatedClassifiedTags = filterClassifierTagsByPermittedUserTags(
        normalizedClassifiedTags ?? [],
        existingTags,
      );
      const candidateTags =
        parsedTags !== undefined ? parsedTags : validatedClassifiedTags;
      const finalTags = isOpenBrainImportedThought(
        textToClassify,
        finalCategory,
      )
        ? enforceOpenBrainTags(candidateTags)
        : candidateTags;
      const entry = await insertEntry({
        userId,
        raw_text: derived.raw_text,
        category: finalCategory,
        title: compactWhitespace(title) || derived.title,
        summary: compactWhitespace(summary) || derived.summary,
        content: compactWhitespace(content) || derived.raw_text,
        remind_at,
        priority: parsedPriority,
        tags: finalTags,
        authToken: token,
      });
      return json(res, 201, normalizeEntry(entry));
    } catch (err) {
      console.error("[POST /api/entries]", err.message);
      return json(res, 500, { error: err.message });
    }
  }

  // ── DELETE /api/entries?id=X ───────────────────────────────────────────────
  if (req.method === "DELETE") {
    const id = parseInt(req.query.id, 10);
    if (isNaN(id)) return json(res, 400, { error: "invalid id" });

    try {
      const deleted = await deleteEntry(userId, id, token);
      if (!deleted) return json(res, 404, { error: "not found" });
      return json(res, 200, { deleted: true });
    } catch (err) {
      console.error("[DELETE /api/entries]", err);
      return json(res, 500, { error: err.message });
    }
  }

  // ── PATCH /api/entries?id=X  { category?, title?, summary?, description?, remind_at?, priority?, is_archived?, tags? } ─
  if (req.method === "PATCH") {
    const id = parseInt(req.query.id, 10);
    if (isNaN(id)) return json(res, 400, { error: "invalid id" });

    const {
      category,
      title,
      summary,
      content,
      description,
      remind_at,
      priority,
      is_archived,
      tags,
    } = req.body ?? {};
    const validCategories = new Set(["reminder", "todo", "thought", "note"]);
    const updates = {};

    if (category !== undefined) {
      if (!validCategories.has(category)) {
        return json(res, 400, { error: "invalid category" });
      }
      updates.category = category;
    }

    const nextDescriptionSource = description ?? content;
    if (nextDescriptionSource !== undefined) {
      if (!nextDescriptionSource?.trim())
        return json(res, 400, { error: "description is required" });
      const derived = deriveEntryFields(nextDescriptionSource.trim());
      updates.raw_text = derived.raw_text;
      updates.content = derived.raw_text;
      updates.title = derived.title;
      updates.summary = derived.summary;
    }

    if (title !== undefined) {
      if (typeof title !== "string")
        return json(res, 400, { error: "title must be a string" });
      updates.title = compactWhitespace(title) || null;
    }

    if (summary !== undefined) {
      if (typeof summary !== "string")
        return json(res, 400, { error: "summary must be a string" });
      updates.summary = compactWhitespace(summary) || null;
    }

    if (remind_at !== undefined) {
      if (remind_at != null && !Number.isInteger(remind_at)) {
        return json(res, 400, {
          error: "remind_at must be an integer unix timestamp or null",
        });
      }
      updates.remind_at = remind_at ?? null;
    }

    if (priority !== undefined) {
      const parsedPriority = parsePriority(priority, {
        defaultValue: undefined,
      });
      if (parsedPriority === null || parsedPriority === undefined) {
        return json(res, 400, {
          error: "priority must be an integer from 0 to 10",
        });
      }
      updates.priority = parsedPriority;
    }

    if (is_archived !== undefined) {
      if (typeof is_archived !== "boolean") {
        return json(res, 400, { error: "is_archived must be a boolean" });
      }
      updates.is_archived = is_archived;
    }
    if (tags !== undefined) {
      const parsedTags = parseTags(tags);
      if (parsedTags === null) {
        return json(res, 400, { error: "tags must be an array of strings" });
      }
      updates.tags = parsedTags;
    }

    if (Object.keys(updates).length === 0) {
      return json(res, 400, { error: "no valid fields to update" });
    }

    try {
      const entry = await updateEntry(userId, id, updates, token);
      if (!entry) return json(res, 404, { error: "not found" });
      return json(res, 200, normalizeEntry(entry));
    } catch (err) {
      console.error("[PATCH /api/entries]", err);
      return json(res, 500, { error: err.message });
    }
  }

  json(res, 405, { error: "Method not allowed" });
}
