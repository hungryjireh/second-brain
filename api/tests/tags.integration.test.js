import test from 'node:test';
import assert from 'node:assert/strict';

async function importFresh(path, tag) {
  return import(`${path}?t=${Date.now()}-${tag}`);
}

test('insertEntry persists classifier string tags into tags and entry_tags tables', async () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  };

  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';

  const tagsTable = [];
  const entryTagsTable = [];
  let nextTagId = 1;

  function jsonResponse(status, body) {
    return {
      ok: status >= 200 && status < 300,
      status,
      async text() {
        return body === null ? '' : JSON.stringify(body);
      },
    };
  }

  global.fetch = async (input, options = {}) => {
    const method = options.method || 'GET';
    const url = new URL(String(input));
    const path = url.pathname;
    const body = options.body ? JSON.parse(options.body) : undefined;

    if (path === '/rest/v1/entries' && method === 'POST') {
      const row = body?.[0] ?? {};
      return jsonResponse(201, [{
        id: 42,
        user_id: row.user_id,
        raw_text: row.raw_text,
        category: row.category,
        title: row.title,
        summary: row.summary,
        remind_at: row.remind_at,
        priority: row.priority,
        is_archived: row.is_archived,
        is_deleted: row.is_deleted,
      }]);
    }

    if (path === '/rest/v1/entry_tags' && method === 'DELETE') {
      const entryId = Number((url.searchParams.get('entry_id') || '').replace('eq.', ''));
      const userId = (url.searchParams.get('user_id') || '').replace('eq.', '');
      for (let i = entryTagsTable.length - 1; i >= 0; i -= 1) {
        const row = entryTagsTable[i];
        if (row.entry_id === entryId && row.user_id === userId) {
          entryTagsTable.splice(i, 1);
        }
      }
      return jsonResponse(204, null);
    }

    if (path === '/rest/v1/tags' && method === 'POST') {
      const row = body?.[0] ?? {};
      const exists = tagsTable.some(
        t => t.user_id === row.user_id && t.normalized_name === row.normalized_name
      );
      if (exists) {
        return jsonResponse(409, { message: 'duplicate key value violates unique constraint' });
      }
      tagsTable.push({
        id: nextTagId++,
        user_id: row.user_id,
        name: row.name,
        normalized_name: row.normalized_name,
      });
      return jsonResponse(201, null);
    }

    if (path === '/rest/v1/tags' && method === 'GET') {
      const userId = (url.searchParams.get('user_id') || '').replace('eq.', '');
      const normalizedIn = url.searchParams.get('normalized_name') || '';
      if (!normalizedIn) {
        return jsonResponse(200, tagsTable.filter(t => t.user_id === userId));
      }
      const values = normalizedIn
        .replace(/^in\.\(/, '')
        .replace(/\)$/, '')
        .split(',')
        .map(s => s.trim().replace(/^"|"$/g, ''))
        .filter(Boolean);
      const rows = tagsTable.filter(
        t => t.user_id === userId && values.includes(t.normalized_name)
      );
      return jsonResponse(200, rows);
    }

    if (path === '/rest/v1/tags' && method === 'DELETE') {
      const userId = (url.searchParams.get('user_id') || '').replace('eq.', '');
      const idFilter = url.searchParams.get('id') || '';
      const keepIds = idFilter.startsWith('not.in.(')
        ? idFilter
          .replace(/^not\.in\.\(/, '')
          .replace(/\)$/, '')
          .split(',')
          .map(v => Number(v.trim()))
          .filter(Number.isInteger)
        : [];
      for (let i = tagsTable.length - 1; i >= 0; i -= 1) {
        const row = tagsTable[i];
        if (row.user_id !== userId) continue;
        if (keepIds.length > 0 && keepIds.includes(row.id)) continue;
        tagsTable.splice(i, 1);
      }
      return jsonResponse(204, null);
    }

    if (path === '/rest/v1/entry_tags' && method === 'POST') {
      for (const row of body ?? []) {
        const exists = entryTagsTable.some(
          r => r.user_id === row.user_id && r.entry_id === row.entry_id && r.tag_id === row.tag_id
        );
        if (!exists) {
          entryTagsTable.push({
            user_id: row.user_id,
            entry_id: row.entry_id,
            tag_id: row.tag_id,
          });
        }
      }
      return jsonResponse(201, null);
    }

    if (path === '/rest/v1/entry_tags' && method === 'GET') {
      const userId = (url.searchParams.get('user_id') || '').replace('eq.', '');
      const entryIdRaw = url.searchParams.get('entry_id');
      if (!entryIdRaw) {
        return jsonResponse(200, entryTagsTable
          .filter(row => row.user_id === userId)
          .map(row => ({ tag_id: row.tag_id })));
      }
      const entryId = Number(entryIdRaw.replace('eq.', ''));
      const rows = entryTagsTable
        .filter(row => row.entry_id === entryId && row.user_id === userId)
        .map(row => {
          const tag = tagsTable.find(t => t.id === row.tag_id);
          return {
            tags: tag ? { name: tag.name, normalized_name: tag.normalized_name } : null,
          };
        });
      return jsonResponse(200, rows);
    }

    throw new Error(`Unhandled fetch: ${method} ${path}`);
  };

  try {
    const { insertEntry } = await importFresh('../../lib/db.js', 'insert-tags-integration');
    await insertEntry({
      userId: '11111111-1111-4111-8111-111111111111',
      raw_text: 'Follow up with Alice about quarterly planning',
      category: 'todo',
      title: 'Follow up with Alice',
      summary: 'Follow up about quarterly planning',
      tags: ['Work', 'planning', 'work'],
      authToken: 'token',
    });

    assert.equal(tagsTable.length, 2);
    assert.deepEqual(
      tagsTable.map(t => t.normalized_name).sort(),
      ['planning', 'work']
    );

    assert.equal(entryTagsTable.length, 2);
    assert.ok(entryTagsTable.every(row => row.entry_id === 42));
  } finally {
    global.fetch = originalFetch;
    process.env.SUPABASE_URL = originalEnv.SUPABASE_URL;
    process.env.SUPABASE_PUBLISHABLE_KEY = originalEnv.SUPABASE_PUBLISHABLE_KEY;
  }
});

test('replaceEntryTags deletes user tags that are no longer referenced', async () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  };

  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';

  const userId = '11111111-1111-4111-8111-111111111111';
  const tagsTable = [
    { id: 1, user_id: userId, name: 'Work', normalized_name: 'work' },
    { id: 2, user_id: userId, name: 'Personal', normalized_name: 'personal' },
    { id: 3, user_id: userId, name: 'Travel', normalized_name: 'travel' },
  ];
  const entryTagsTable = [
    { user_id: userId, entry_id: 7, tag_id: 1 },
    { user_id: userId, entry_id: 7, tag_id: 2 },
    { user_id: userId, entry_id: 8, tag_id: 3 },
  ];

  function jsonResponse(status, body) {
    return {
      ok: status >= 200 && status < 300,
      status,
      async text() {
        return body === null ? '' : JSON.stringify(body);
      },
    };
  }

  global.fetch = async (input, options = {}) => {
    const method = options.method || 'GET';
    const url = new URL(String(input));
    const path = url.pathname;
    const body = options.body ? JSON.parse(options.body) : undefined;

    if (path === '/rest/v1/entry_tags' && method === 'DELETE') {
      const entryId = Number((url.searchParams.get('entry_id') || '').replace('eq.', ''));
      const scopedUserId = (url.searchParams.get('user_id') || '').replace('eq.', '');
      for (let i = entryTagsTable.length - 1; i >= 0; i -= 1) {
        const row = entryTagsTable[i];
        if (row.entry_id === entryId && row.user_id === scopedUserId) {
          entryTagsTable.splice(i, 1);
        }
      }
      return jsonResponse(204, null);
    }

    if (path === '/rest/v1/tags' && method === 'GET') {
      const scopedUserId = (url.searchParams.get('user_id') || '').replace('eq.', '');
      const normalizedIn = url.searchParams.get('normalized_name') || '';
      if (!normalizedIn) {
        return jsonResponse(200, tagsTable.filter(t => t.user_id === scopedUserId));
      }
      const values = normalizedIn
        .replace(/^in\.\(/, '')
        .replace(/\)$/, '')
        .split(',')
        .map(s => s.trim().replace(/^"|"$/g, ''))
        .filter(Boolean);
      const rows = tagsTable.filter(
        t => t.user_id === scopedUserId && values.includes(t.normalized_name)
      );
      return jsonResponse(200, rows);
    }

    if (path === '/rest/v1/tags' && method === 'POST') {
      const row = body?.[0] ?? {};
      const exists = tagsTable.some(
        t => t.user_id === row.user_id && t.normalized_name === row.normalized_name
      );
      if (exists) {
        return jsonResponse(409, { message: 'duplicate key value violates unique constraint' });
      }
      const nextId = tagsTable.reduce((max, t) => Math.max(max, t.id), 0) + 1;
      tagsTable.push({
        id: nextId,
        user_id: row.user_id,
        name: row.name,
        normalized_name: row.normalized_name,
      });
      return jsonResponse(201, null);
    }

    if (path === '/rest/v1/entry_tags' && method === 'POST') {
      for (const row of body ?? []) {
        const exists = entryTagsTable.some(
          r => r.user_id === row.user_id && r.entry_id === row.entry_id && r.tag_id === row.tag_id
        );
        if (!exists) entryTagsTable.push(row);
      }
      return jsonResponse(201, null);
    }

    if (path === '/rest/v1/entry_tags' && method === 'GET') {
      const scopedUserId = (url.searchParams.get('user_id') || '').replace('eq.', '');
      const entryIdRaw = url.searchParams.get('entry_id');
      if (entryIdRaw) {
        const entryId = Number(entryIdRaw.replace('eq.', ''));
        const rows = entryTagsTable
          .filter(row => row.user_id === scopedUserId && row.entry_id === entryId)
          .map(row => {
            const tag = tagsTable.find(t => t.id === row.tag_id);
            return { tags: tag ? { name: tag.name, normalized_name: tag.normalized_name } : null };
          });
        return jsonResponse(200, rows);
      }
      const rows = entryTagsTable
        .filter(row => row.user_id === scopedUserId)
        .map(row => ({ tag_id: row.tag_id }));
      return jsonResponse(200, rows);
    }

    if (path === '/rest/v1/tags' && method === 'DELETE') {
      const scopedUserId = (url.searchParams.get('user_id') || '').replace('eq.', '');
      const idFilter = url.searchParams.get('id') || '';
      const keepIds = idFilter.startsWith('not.in.(')
        ? idFilter
          .replace(/^not\.in\.\(/, '')
          .replace(/\)$/, '')
          .split(',')
          .map(v => Number(v.trim()))
          .filter(Number.isInteger)
        : [];
      for (let i = tagsTable.length - 1; i >= 0; i -= 1) {
        const row = tagsTable[i];
        if (row.user_id !== scopedUserId) continue;
        if (keepIds.length > 0 && keepIds.includes(row.id)) continue;
        tagsTable.splice(i, 1);
      }
      return jsonResponse(204, null);
    }

    throw new Error(`Unhandled fetch: ${method} ${path}`);
  };

  try {
    const { replaceEntryTags } = await importFresh('../../lib/db.js', 'replace-tags-cleanup');
    await replaceEntryTags(userId, 7, ['Work'], 'token');

    assert.deepEqual(
      tagsTable.map(t => t.normalized_name).sort(),
      ['travel', 'work']
    );
    assert.deepEqual(
      entryTagsTable
        .filter(row => row.user_id === userId && row.entry_id === 7)
        .map(row => row.tag_id)
        .sort((a, b) => a - b),
      [1]
    );
  } finally {
    global.fetch = originalFetch;
    process.env.SUPABASE_URL = originalEnv.SUPABASE_URL;
    process.env.SUPABASE_PUBLISHABLE_KEY = originalEnv.SUPABASE_PUBLISHABLE_KEY;
  }
});

test('replaceEntryTags enforces a maximum of 10 user tags', async () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  };

  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';

  const userId = '11111111-1111-4111-8111-111111111111';
  const tagsTable = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    user_id: userId,
    name: `Tag ${i + 1}`,
    normalized_name: `tag-${i + 1}`,
  }));

  function jsonResponse(status, body) {
    return {
      ok: status >= 200 && status < 300,
      status,
      async text() {
        return body === null ? '' : JSON.stringify(body);
      },
    };
  }

  global.fetch = async (input, options = {}) => {
    const method = options.method || 'GET';
    const url = new URL(String(input));
    const path = url.pathname;
    const body = options.body ? JSON.parse(options.body) : undefined;

    if (path === '/rest/v1/entry_tags' && method === 'DELETE') {
      return jsonResponse(204, null);
    }

    if (path === '/rest/v1/tags' && method === 'GET') {
      const scopedUserId = (url.searchParams.get('user_id') || '').replace('eq.', '');
      const normalizedIn = url.searchParams.get('normalized_name') || '';
      if (!normalizedIn) {
        return jsonResponse(200, tagsTable.filter(t => t.user_id === scopedUserId));
      }
      const values = normalizedIn
        .replace(/^in\.\(/, '')
        .replace(/\)$/, '')
        .split(',')
        .map(s => s.trim().replace(/^"|"$/g, ''))
        .filter(Boolean);
      const rows = tagsTable.filter(
        t => t.user_id === scopedUserId && values.includes(t.normalized_name)
      );
      return jsonResponse(200, rows);
    }

    if (path === '/rest/v1/tags' && method === 'POST') {
      const row = body?.[0] ?? {};
      tagsTable.push({
        id: tagsTable.length + 1,
        user_id: row.user_id,
        name: row.name,
        normalized_name: row.normalized_name,
      });
      return jsonResponse(201, null);
    }

    if (path === '/rest/v1/entry_tags' && method === 'POST') {
      return jsonResponse(201, null);
    }

    if (path === '/rest/v1/entry_tags' && method === 'GET') {
      return jsonResponse(200, []);
    }

    if (path === '/rest/v1/tags' && method === 'DELETE') {
      return jsonResponse(204, null);
    }

    throw new Error(`Unhandled fetch: ${method} ${path}`);
  };

  try {
    const { replaceEntryTags } = await importFresh('../../lib/db.js', 'replace-tags-max-limit');
    await assert.rejects(
      () => replaceEntryTags(userId, 9, ['new-tag'], 'token'),
      /maximum of 10 tags is allowed per user/i
    );
    assert.equal(tagsTable.length, 10);
  } finally {
    global.fetch = originalFetch;
    process.env.SUPABASE_URL = originalEnv.SUPABASE_URL;
    process.env.SUPABASE_PUBLISHABLE_KEY = originalEnv.SUPABASE_PUBLISHABLE_KEY;
  }
});
