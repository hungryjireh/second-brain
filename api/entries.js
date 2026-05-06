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
} from '../lib/db.js';
import { classify } from '../lib/classify.js';
import { getBearerToken, verifyAuthToken, resolveAuthUserId } from '../lib/auth.js';

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function parsePriority(value, { defaultValue } = { defaultValue: 0 }) {
  if (value === undefined) return defaultValue;
  if (!Number.isInteger(value) || value < 0 || value > 10) return null;
  return value;
}

function compactWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function parseTags(input) {
  if (input === undefined) return undefined;
  if (!Array.isArray(input)) return null;

  const deduped = new Map();
  for (const raw of input) {
    if (typeof raw !== 'string') return null;
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

function truncateWords(value, maxWords) {
  const words = compactWhitespace(value).split(' ').filter(Boolean);
  return words.slice(0, maxWords).join(' ');
}

function truncateChars(value, maxChars) {
  const text = compactWhitespace(value);
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1).trimEnd()}…`;
}

function deriveEntryFields(description, classifiedContent = '') {
  const rawDescription = String(description ?? '').trim();
  const normalizedDescription = compactWhitespace(rawDescription);
  const normalizedClassified = compactWhitespace(classifiedContent);
  const titleSource = normalizedClassified || normalizedDescription;
  const summarySource = normalizedClassified || normalizedDescription;
  const title = truncateChars(truncateWords(titleSource, 8), 80) || 'Untitled';
  const summary = truncateChars(truncateWords(summarySource, 22), 180) || 'No summary.';
  return { title, summary, raw_text: rawDescription };
}

function parseClaudeConversationsImport(input) {
  const source = Array.isArray(input) ? input : [input];
  const conversations = [];

  for (const item of source) {
    if (!item || typeof item !== 'object') continue;
    const chatMessages = Array.isArray(item.chat_messages) ? item.chat_messages : [];
    const messages = chatMessages
      .map(msg => ({
        uuid: msg?.uuid ? String(msg.uuid) : null,
        sender: msg?.sender === 'human' ? 'human' : 'assistant',
        text: String(msg?.text ?? '').trim(),
        created_at: msg?.created_at ? String(msg.created_at) : null,
      }))
      .filter(msg => msg.text);
    if (messages.length === 0) continue;

    const firstHuman = messages.find(msg => msg.sender === 'human');
    const fallbackSummary = firstHuman?.text ?? messages[0]?.text ?? '';
    const summary = truncateChars(truncateWords(fallbackSummary, 22), 180) || 'Imported conversation';
    const title = truncateChars(compactWhitespace(String(item.name ?? 'Imported Claude conversation')), 80) || 'Imported Claude conversation';

    conversations.push({
      title,
      summary,
      raw_text: JSON.stringify({
        _format: 'chat_conversation_v1',
        source: 'claude',
        conversation: {
          uuid: item.uuid ? String(item.uuid) : null,
          name: String(item.name ?? ''),
          created_at: item.created_at ? String(item.created_at) : null,
          updated_at: item.updated_at ? String(item.updated_at) : null,
        },
        messages,
      }),
    });
  }

  return conversations;
}

function extractChatGptMessageText(message) {
  if (!message || typeof message !== 'object') return '';
  const content = message.content;
  if (!content) return '';

  if (typeof content === 'string') return content.trim();

  if (Array.isArray(content?.parts)) {
    return content.parts
      .map(part => (typeof part === 'string' ? part : ''))
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  if (Array.isArray(content)) {
    return content
      .map(part => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && typeof part.text === 'string') return part.text;
        return '';
      })
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  if (typeof content?.text === 'string') return content.text.trim();
  return '';
}

function parseChatGptConversationsImport(input) {
  const source = Array.isArray(input) ? input : [input];
  const conversations = [];

  for (const item of source) {
    if (!item || typeof item !== 'object') continue;

    let orderedMessages = [];

    if (item.mapping && typeof item.mapping === 'object') {
      const nodes = Object.values(item.mapping)
        .filter(node => node && typeof node === 'object' && node.message)
        .map(node => node.message)
        .filter(Boolean)
        .map(msg => {
          const role = msg?.author?.role === 'user' ? 'human' : msg?.author?.role === 'assistant' ? 'assistant' : null;
          const text = extractChatGptMessageText(msg);
          const createdAt = Number(msg?.create_time);
          return {
            id: msg?.id ? String(msg.id) : null,
            sender: role,
            text,
            createdAt: Number.isFinite(createdAt) ? createdAt : null,
          };
        })
        .filter(msg => msg.sender && msg.text);

      orderedMessages = nodes
        .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
        .map(msg => ({ uuid: msg.id, sender: msg.sender, text: msg.text }));
    } else if (Array.isArray(item.messages)) {
      orderedMessages = item.messages
        .map(msg => {
          const sender = msg?.author === 'user' || msg?.role === 'user' ? 'human' : 'assistant';
          const text = String(msg?.text ?? msg?.content ?? '').trim();
          return { uuid: msg?.id ? String(msg.id) : null, sender, text };
        })
        .filter(msg => msg.text);
    }

    if (orderedMessages.length === 0) continue;

    const firstHuman = orderedMessages.find(msg => msg.sender === 'human');
    const fallbackSummary = firstHuman?.text ?? orderedMessages[0]?.text ?? '';
    const summary = truncateChars(truncateWords(fallbackSummary, 22), 180) || 'Imported conversation';
    const title = truncateChars(compactWhitespace(String(item.title ?? item.name ?? 'Imported ChatGPT conversation')), 80) || 'Imported ChatGPT conversation';
    const createTime = Number(item?.create_time);
    const updateTime = Number(item?.update_time);

    conversations.push({
      title,
      summary,
      raw_text: JSON.stringify({
        _format: 'chat_conversation_v1',
        source: 'chatgpt',
        conversation: {
          uuid: item.id ? String(item.id) : null,
          name: String(item.title ?? item.name ?? ''),
          created_at: Number.isFinite(createTime) ? new Date(createTime * 1000).toISOString() : null,
          updated_at: Number.isFinite(updateTime) ? new Date(updateTime * 1000).toISOString() : null,
        },
        messages: orderedMessages,
      }),
    });
  }

  return conversations;
}

function normalizeEntry(entry) {
  if (!entry) return entry;
  const rawText = entry.raw_text ?? entry.description ?? entry.content ?? '';
  const fallback = deriveEntryFields(rawText, entry.summary ?? entry.content ?? '');
  return {
    ...entry,
    raw_text: rawText,
    title: entry.title ?? fallback.title,
    summary: entry.summary ?? entry.content ?? fallback.summary,
    tags: Array.isArray(entry.tags) ? entry.tags : [],
  };
}

function parseEntriesLimit(value) {
  if (value === undefined) return undefined;
  const n = Number.parseInt(String(value), 10);
  if (!Number.isInteger(n) || n < 1 || n > MAX_ENTRIES_PAGE_SIZE) return null;
  return n;
}

export default async function handler(req, res) {
  // OPTIONS pre-flight (CORS headers set globally in vercel.json)
  if (req.method === 'OPTIONS') return res.status(204).end();

  let authUser;
  const token = getBearerToken(req);
  if (!token) return json(res, 401, { error: 'missing bearer token' });

  try {
    authUser = await verifyAuthToken(token);
  } catch (err) {
    return json(res, 401, { error: err.message || 'unauthorized' });
  }
  const userId = resolveAuthUserId(authUser);
  if (!userId) return json(res, 401, { error: 'invalid auth token payload: expected UUID user id' });

  // ── GET /api/entries[?category=X] ──────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { category, limit: rawLimit, cursor: rawCursor } = req.query;
      const limit = parseEntriesLimit(rawLimit);
      if (limit === null) {
        return json(res, 400, { error: `limit must be an integer between 1 and ${MAX_ENTRIES_PAGE_SIZE}` });
      }

      const cursor = rawCursor === undefined ? undefined : String(rawCursor);
      if (cursor !== undefined && decodeEntriesCursor(cursor) === null) {
        return json(res, 400, { error: 'invalid cursor. expected "<created_at>:<id>"' });
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
      console.error('[GET /api/entries]', err);
      return json(res, 500, { error: err.message });
    }
  }

  // ── POST /api/entries  { description, tags? } ─────────────────────────────
  if (req.method === 'POST') {
    if (req.body?.import_format === 'claude_conversations' || req.body?.import_format === 'llm_conversations') {
      try {
        const conversations = [
          ...parseClaudeConversationsImport(req.body?.conversations),
          ...parseChatGptConversationsImport(req.body?.conversations),
        ];
        if (conversations.length === 0) {
          return json(res, 400, { error: 'No valid Claude/ChatGPT conversations found in import payload' });
        }

        const created = [];
        for (const conversation of conversations) {
          const entry = await insertEntry({
            userId,
            raw_text: conversation.raw_text,
            category: 'note',
            title: conversation.title,
            summary: conversation.summary,
            remind_at: null,
            priority: 0,
            tags: ['imported', 'claude'],
            authToken: token,
          });
          if (entry) created.push(normalizeEntry(entry));
        }
        return json(res, 201, { created });
      } catch (err) {
        console.error('[POST /api/entries import]', err);
        return json(res, 500, { error: err.message });
      }
    }

    const { description, text, priority, tags } = req.body ?? {};
    const sourceDescription = description ?? text;
    if (!sourceDescription?.trim()) return json(res, 400, { error: 'description is required' });
    const parsedPriority = parsePriority(priority, { defaultValue: 0 });
    if (parsedPriority === null) {
      return json(res, 400, { error: 'priority must be an integer from 0 to 10' });
    }
    const parsedTags = parseTags(tags);
    if (parsedTags === null) {
      return json(res, 400, { error: 'tags must be an array of strings' });
    }

    try {
      const normalizedDescription = sourceDescription.trim();
      const timezone = await getUserTimezone(userId, token);
      const existingTags = await getUserTags(userId, token);
      const { category, title, summary, content, remind_at, tags: classifiedTags } = await classify(normalizedDescription, {
        timezone,
        existingTags,
      });
      const derived = deriveEntryFields(normalizedDescription, content);
      const normalizedClassifiedTags = parseTags(classifiedTags);
      const entry = await insertEntry({
        userId,
        raw_text: derived.raw_text,
        category,
        title: compactWhitespace(title) || derived.title,
        summary: compactWhitespace(summary) || derived.summary,
        remind_at,
        priority: parsedPriority,
        tags: parsedTags ?? normalizedClassifiedTags ?? [],
        authToken: token,
      });
      return json(res, 201, normalizeEntry(entry));
    } catch (err) {
      console.error('[POST /api/entries]', err.message);
      return json(res, 500, { error: err.message });
    }
  }

  // ── DELETE /api/entries?id=X ───────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const id = parseInt(req.query.id, 10);
    if (isNaN(id)) return json(res, 400, { error: 'invalid id' });

    try {
      const deleted = await deleteEntry(userId, id, token);
      if (!deleted) return json(res, 404, { error: 'not found' });
      return json(res, 200, { deleted: true });
    } catch (err) {
      console.error('[DELETE /api/entries]', err);
      return json(res, 500, { error: err.message });
    }
  }

  // ── PATCH /api/entries?id=X  { category?, title?, summary?, description?, remind_at?, priority?, is_archived?, tags? } ─
  if (req.method === 'PATCH') {
    const id = parseInt(req.query.id, 10);
    if (isNaN(id)) return json(res, 400, { error: 'invalid id' });

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
    const validCategories = new Set(['reminder', 'todo', 'thought', 'note']);
    const updates = {};

    if (category !== undefined) {
      if (!validCategories.has(category)) {
        return json(res, 400, { error: 'invalid category' });
      }
      updates.category = category;
    }

    const nextDescriptionSource = description ?? content;
    if (nextDescriptionSource !== undefined) {
      if (!nextDescriptionSource?.trim()) return json(res, 400, { error: 'description is required' });
      const derived = deriveEntryFields(nextDescriptionSource.trim());
      updates.raw_text = derived.raw_text;
      updates.title = derived.title;
      updates.summary = derived.summary;
    }

    if (title !== undefined) {
      if (typeof title !== 'string') return json(res, 400, { error: 'title must be a string' });
      updates.title = compactWhitespace(title) || null;
    }

    if (summary !== undefined) {
      if (typeof summary !== 'string') return json(res, 400, { error: 'summary must be a string' });
      updates.summary = compactWhitespace(summary) || null;
    }

    if (remind_at !== undefined) {
      if (remind_at != null && !Number.isInteger(remind_at)) {
        return json(res, 400, { error: 'remind_at must be an integer unix timestamp or null' });
      }
      updates.remind_at = remind_at ?? null;
    }

    if (priority !== undefined) {
      const parsedPriority = parsePriority(priority, { defaultValue: undefined });
      if (parsedPriority === null || parsedPriority === undefined) {
        return json(res, 400, { error: 'priority must be an integer from 0 to 10' });
      }
      updates.priority = parsedPriority;
    }

    if (is_archived !== undefined) {
      if (typeof is_archived !== 'boolean') {
        return json(res, 400, { error: 'is_archived must be a boolean' });
      }
      updates.is_archived = is_archived;
    }
    if (tags !== undefined) {
      const parsedTags = parseTags(tags);
      if (parsedTags === null) {
        return json(res, 400, { error: 'tags must be an array of strings' });
      }
      updates.tags = parsedTags;
    }

    if (Object.keys(updates).length === 0) {
      return json(res, 400, { error: 'no valid fields to update' });
    }

    try {
      const entry = await updateEntry(userId, id, updates, token);
      if (!entry) return json(res, 404, { error: 'not found' });
      return json(res, 200, normalizeEntry(entry));
    } catch (err) {
      console.error('[PATCH /api/entries]', err);
      return json(res, 500, { error: err.message });
    }
  }

  json(res, 405, { error: 'Method not allowed' });
}
