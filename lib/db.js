import dotenv from 'dotenv';
import { inspect } from 'util';

// Load local env files when running directly with Node.
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL) {
  throw new Error('Missing SUPABASE_URL. Add it to .env.local or .env.');
}

if (!SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Missing SUPABASE_PUBLISHABLE_KEY. Add it to .env.local or .env.');
}

function mask(value) {
  if (!value) return '<missing>';
  if (value.length <= 10) return '***masked***';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getMaskedEnv() {
  return {
    SUPABASE_URL: mask(SUPABASE_URL),
    SUPABASE_PUBLISHABLE_KEY: mask(SUPABASE_PUBLISHABLE_KEY),
  };
}

function logEnvAndError(err) {
  console.error('[db] Env (masked):', getMaskedEnv());
  console.error('[db] Error (full):', inspect(err, { depth: null }));
}

function buildUrl(path, query = {}) {
  const url = new URL(path, SUPABASE_URL);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, String(value));
  }
  return url;
}

async function supabaseRequest(path, { method = 'GET', query, body, prefer, authToken } = {}) {
  const key = SUPABASE_PUBLISHABLE_KEY;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${authToken || key}`,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (prefer) {
    headers.Prefer = prefer;
  }

  const res = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const raw = await res.text();
  const data = raw ? JSON.parse(raw) : null;

  if (!res.ok) {
    const error = new Error(data?.message ?? `Supabase request failed (${res.status})`);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

async function getEntriesTableColumns() {
  return supabaseRequest('/rest/v1/entries', {
    method: 'GET',
    query: { select: '*', limit: 1 },
  });
}

export async function migrate() {
  try {
    await getEntriesTableColumns();
    await supabaseRequest('/rest/v1/settings', {
      method: 'GET',
      query: { select: 'key', limit: 1 },
    });
    console.log('[db] Supabase connectivity check passed');
  } catch (err) {
    console.error('[db] Supabase migrate/check failed');
    console.error('[db] Make sure tables exist in your Supabase project:');
    console.error('[db] entries(id bigserial pk, user_id text not null, raw_text text, category text, content text, priority int default 0, remind_at bigint null, reminded boolean default false, created_at bigint default extract(epoch from now())::bigint)');
    console.error('[db] settings(user_id text not null, key text not null, value text not null, primary key(user_id,key))');
    logEnvAndError(err);
    throw err;
  }
}

if (process.argv[1] && process.argv[1].endsWith('db.js')) {
  try {
    await migrate();
    process.exit(0);
  } catch (err) {
    console.error('[db] migrate script failed');
    logEnvAndError(err);
    process.exit(1);
  }
}

export async function insertEntry({
  userId,
  raw_text,
  category,
  title,
  summary,
  tags = [],
  remind_at,
  priority = 0,
  authToken,
}) {
  const normalizedTags = uniqueByNormalized(tags);
  const rows = await supabaseRequest('/rest/v1/entries', {
    method: 'POST',
    body: [{
      user_id: userId,
      raw_text,
      category,
      title,
      summary,
      remind_at: remind_at ?? null,
      priority,
      is_archived: false,
      is_deleted: false,
    }],
    prefer: 'return=representation',
    authToken,
  });
  const entry = rows?.[0] ?? null;
  if (entry) {
    await replaceEntryTags(userId, entry.id, normalizedTags, authToken);
    entry.tags = await getEntryTags(userId, entry.id, authToken);
  }
  return entry;
}

export async function getEntry(userId, id) {
  const rows = await supabaseRequest('/rest/v1/entries', {
    method: 'GET',
    query: {
      select: '*',
      user_id: `eq.${userId}`,
      id: `eq.${id}`,
      limit: 1,
    },
  });
  return rows?.[0] ?? null;
}

export async function getAllEntries(userId, authToken) {
  const entries = await supabaseRequest('/rest/v1/entries', {
    method: 'GET',
    query: {
      select: '*',
      user_id: `eq.${userId}`,
      is_deleted: 'eq.false',
      order: 'priority.desc,created_at.desc',
    },
    authToken,
  });
  return hydrateEntriesWithTags(userId, entries, authToken);
}

export async function getEntriesByCategory(userId, category, authToken) {
  const entries = await supabaseRequest('/rest/v1/entries', {
    method: 'GET',
    query: {
      select: '*',
      user_id: `eq.${userId}`,
      category: `eq.${category}`,
      is_deleted: 'eq.false',
      order: 'priority.desc,created_at.desc',
    },
    authToken,
  });
  return hydrateEntriesWithTags(userId, entries, authToken);
}

export async function deleteEntry(userId, id, authToken) {
  const rows = await supabaseRequest('/rest/v1/entries', {
    method: 'PATCH',
    query: { user_id: `eq.${userId}`, id: `eq.${id}`, is_deleted: 'eq.false', select: 'id' },
    body: { is_deleted: true },
    prefer: 'return=representation',
    authToken,
  });
  return Array.isArray(rows) && rows.length > 0;
}

export async function updateEntry(userId, id, updates, authToken) {
  const body = {};
  if (updates.category !== undefined) body.category = updates.category;
  if (updates.raw_text !== undefined) body.raw_text = updates.raw_text;
  if (updates.title !== undefined) body.title = updates.title;
  if (updates.summary !== undefined) body.summary = updates.summary;
  if (updates.remind_at !== undefined) body.remind_at = updates.remind_at ?? null;
  if (updates.priority !== undefined) body.priority = updates.priority;
  if (updates.is_archived !== undefined) body.is_archived = updates.is_archived;

  const rows = await supabaseRequest('/rest/v1/entries', {
    method: 'PATCH',
    query: { user_id: `eq.${userId}`, id: `eq.${id}`, select: '*' },
    body,
    prefer: 'return=representation',
    authToken,
  });
  const entry = rows?.[0] ?? null;
  if (!entry) return null;
  if (updates.tags !== undefined) {
    const normalizedTags = uniqueByNormalized(updates.tags);
    await replaceEntryTags(userId, id, normalizedTags, authToken);
    entry.tags = await getEntryTags(userId, id, authToken);
  } else {
    entry.tags = await getEntryTags(userId, id, authToken);
  }
  return entry;
}

function quotePostgrestValue(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

const MAX_USER_TAGS = 10;

async function getUserTagCount(userId, authToken) {
  const rows = await supabaseRequest('/rest/v1/tags', {
    method: 'GET',
    query: {
      select: 'id',
      user_id: `eq.${userId}`,
      limit: MAX_USER_TAGS + 1,
    },
    authToken,
  });
  return Array.isArray(rows) ? rows.length : 0;
}

export async function getUserTags(userId, authToken) {
  const rows = await supabaseRequest('/rest/v1/tags', {
    method: 'GET',
    query: {
      select: 'name',
      user_id: `eq.${userId}`,
      order: 'name.asc',
      limit: MAX_USER_TAGS,
    },
    authToken,
  });

  return (Array.isArray(rows) ? rows : [])
    .map(row => String(row?.name ?? '').trim())
    .filter(Boolean);
}

function toTagObject(tag) {
  if (!tag) return null;

  if (typeof tag === 'string') {
    const label = tag.trim().replace(/^#+/, '');
    if (!label) return null;
    const normalized = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32);
    if (!normalized) return null;
    return {
      name: label.slice(0, 32),
      normalized_name: normalized,
    };
  }

  if (typeof tag === 'object') {
    const label = String(tag.name ?? '').trim().replace(/^#+/, '');
    const normalized = String(tag.normalized_name ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32);
    if (!label || !normalized) return null;
    return {
      name: label.slice(0, 32),
      normalized_name: normalized,
    };
  }

  return null;
}

function uniqueByNormalized(tags = []) {
  const seen = new Set();
  const out = [];
  for (const raw of tags) {
    const tag = toTagObject(raw);
    if (!tag || seen.has(tag.normalized_name)) continue;
    seen.add(tag.normalized_name);
    out.push(tag);
  }
  return out;
}

async function upsertTags(userId, tags, authToken) {
  const deduped = uniqueByNormalized(tags);
  if (deduped.length === 0) return [];

  const inQuery = deduped.map(tag => quotePostgrestValue(tag.normalized_name)).join(',');
  const existingRows = await supabaseRequest('/rest/v1/tags', {
    method: 'GET',
    query: {
      select: 'id,normalized_name',
      user_id: `eq.${userId}`,
      normalized_name: `in.(${inQuery})`,
    },
    authToken,
  });
  const existingNormalized = new Set((existingRows || []).map(row => row.normalized_name));
  const missingTags = deduped.filter(tag => !existingNormalized.has(tag.normalized_name));

  if (missingTags.length > 0) {
    const userTagCount = await getUserTagCount(userId, authToken);
    if (userTagCount + missingTags.length > MAX_USER_TAGS) {
      throw new Error(`A maximum of ${MAX_USER_TAGS} tags is allowed per user`);
    }
  }

  for (const tag of missingTags) {
    try {
      await supabaseRequest('/rest/v1/tags', {
        method: 'POST',
        body: [{
          user_id: userId,
          name: tag.name,
          normalized_name: tag.normalized_name,
        }],
        prefer: 'return=minimal',
        authToken,
      });
    } catch (err) {
      // Unique violations mean the tag already exists; we'll fetch canonical rows below.
      if (err?.status !== 409) throw err;
    }
  }

  return supabaseRequest('/rest/v1/tags', {
    method: 'GET',
    query: {
      select: 'id,name,normalized_name',
      user_id: `eq.${userId}`,
      normalized_name: `in.(${inQuery})`,
    },
    authToken,
  });
}

async function getEntryTags(userId, entryId, authToken) {
  const rows = await supabaseRequest('/rest/v1/entry_tags', {
    method: 'GET',
    query: {
      select: 'tags(name,normalized_name)',
      user_id: `eq.${userId}`,
      entry_id: `eq.${entryId}`,
    },
    authToken,
  });

  return rows
    .map(row => row.tags)
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
    .map(tag => tag.name);
}

async function hydrateEntriesWithTags(userId, entries, authToken) {
  if (!Array.isArray(entries) || entries.length === 0) return [];
  const entryIds = entries.map(e => e.id).filter(id => Number.isInteger(id));
  if (entryIds.length === 0) return entries.map(e => ({ ...e, tags: [] }));

  const inQuery = entryIds.join(',');
  const rows = await supabaseRequest('/rest/v1/entry_tags', {
    method: 'GET',
    query: {
      select: 'entry_id,tags(name)',
      user_id: `eq.${userId}`,
      entry_id: `in.(${inQuery})`,
    },
    authToken,
  });

  const tagMap = new Map();
  for (const row of rows) {
    if (!row?.tags?.name) continue;
    const arr = tagMap.get(row.entry_id) ?? [];
    arr.push(row.tags.name);
    tagMap.set(row.entry_id, arr);
  }

  return entries.map(entry => ({
    ...entry,
    tags: (tagMap.get(entry.id) ?? []).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })),
  }));
}

export async function replaceEntryTags(userId, entryId, tags, authToken) {
  await supabaseRequest('/rest/v1/entry_tags', {
    method: 'DELETE',
    query: {
      user_id: `eq.${userId}`,
      entry_id: `eq.${entryId}`,
    },
    authToken,
  });

  if (Array.isArray(tags) && tags.length > 0) {
    const upsertedTags = await upsertTags(userId, tags, authToken);
    if (upsertedTags.length === 0) {
      throw new Error('No tags could be persisted in tags table');
    }

    await supabaseRequest('/rest/v1/entry_tags', {
      method: 'POST',
      body: upsertedTags.map(tag => ({
        user_id: userId,
        entry_id: entryId,
        tag_id: tag.id,
      })),
      prefer: 'resolution=ignore-duplicates,return=minimal',
      authToken,
    });
  }

  await cleanupUnusedTags(userId, authToken);
}

async function cleanupUnusedTags(userId, authToken) {
  const rows = await supabaseRequest('/rest/v1/entry_tags', {
    method: 'GET',
    query: {
      select: 'tag_id',
      user_id: `eq.${userId}`,
    },
    authToken,
  });

  const usedTagIds = [...new Set(
    (Array.isArray(rows) ? rows : [])
      .map(row => Number(row?.tag_id))
      .filter(Number.isInteger)
  )];

  const query = { user_id: `eq.${userId}` };
  if (usedTagIds.length > 0) {
    query.id = `not.in.(${usedTagIds.join(',')})`;
  }

  await supabaseRequest('/rest/v1/tags', {
    method: 'DELETE',
    query,
    authToken,
  });
}

export async function getSetting(userId, key, authToken) {
  const rows = await supabaseRequest('/rest/v1/settings', {
    method: 'GET',
    query: {
      select: 'value',
      user_id: `eq.${userId}`,
      key: `eq.${key}`,
      limit: 1,
    },
    authToken,
  });
  return rows?.[0]?.value ?? null;
}

export async function setSetting(userId, key, value, authToken) {
  await supabaseRequest('/rest/v1/settings', {
    method: 'POST',
    query: { on_conflict: 'user_id,key' },
    body: [{ user_id: userId, key, value }],
    prefer: 'resolution=merge-duplicates,return=minimal',
    authToken,
  });
}

export async function getUserTimezone(userId, authToken) {
  return (await getSetting(userId, 'timezone', authToken)) ?? 'Asia/Singapore';
}

export async function getTelegramLinkByChatId(chatId) {
  const rows = await supabaseRequest('/rest/v1/telegram_links', {
    method: 'GET',
    query: {
      select: 'user_id,auth_token',
      chat_id: `eq.${chatId}`,
      limit: 1,
    },
  });
  const row = rows?.[0];
  if (!row?.user_id) return null;
  return {
    userId: row.user_id,
    authToken: row.auth_token || null,
  };
}

export async function setTelegramChatIdForUser(userId, chatId, authToken) {
  await supabaseRequest('/rest/v1/telegram_links', {
    method: 'POST',
    query: { on_conflict: 'user_id' },
    body: [{ user_id: userId, chat_id: String(chatId), auth_token: authToken }],
    prefer: 'resolution=merge-duplicates,return=minimal',
    authToken,
  });
}

export async function insertMagicLink({ email, token_hash, expires_at }) {
  const rows = await supabaseRequest('/rest/v1/magic_links', {
    method: 'POST',
    body: [{ email, token_hash, expires_at }],
    prefer: 'return=representation',
  });
  return rows?.[0] ?? null;
}

export async function getValidMagicLinkByHash(tokenHash, nowUnix) {
  const rows = await supabaseRequest('/rest/v1/magic_links', {
    method: 'GET',
    query: {
      select: '*',
      token_hash: `eq.${tokenHash}`,
      used_at: 'is.null',
      expires_at: `gt.${nowUnix}`,
      order: 'created_at.desc',
      limit: 1,
    },
  });
  return rows?.[0] ?? null;
}

export async function markMagicLinkUsed(id, usedAtUnix) {
  const rows = await supabaseRequest('/rest/v1/magic_links', {
    method: 'PATCH',
    query: { id: `eq.${id}`, select: '*' },
    body: { used_at: usedAtUnix },
    prefer: 'return=representation',
  });
  return rows?.[0] ?? null;
}

export default { supabaseRequest };
