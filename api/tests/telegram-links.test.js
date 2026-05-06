import test from 'node:test';
import assert from 'node:assert/strict';

async function importFresh(path, tag) {
  return import(`${path}?t=${Date.now()}-${tag}`);
}

test('telegram link token is stored encrypted and returned decrypted via RPC lookup', async () => {
  const originalEnv = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
    TELEGRAM_TOKEN_ENCRYPTION_KEY: process.env.TELEGRAM_TOKEN_ENCRYPTION_KEY,
  };
  const originalFetch = global.fetch;

  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_key_for_tests';
  process.env.TELEGRAM_TOKEN_ENCRYPTION_KEY = 'test-key-material';

  const rows = new Map();

  global.fetch = async (input, init = {}) => {
    const url = new URL(input);
    const path = url.pathname;
    const method = init.method || 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;

    if (path === '/rest/v1/telegram_links' && method === 'POST') {
      const row = body?.[0];
      rows.set(String(row.chat_id), row);
      return new Response('[]', { status: 201, headers: { 'Content-Type': 'application/json' } });
    }

    if (path === '/rest/v1/rpc/lookup_telegram_link_by_chat_id' && method === 'POST') {
      const row = rows.get(String(body?.p_chat_id));
      const payload = row ? [{ user_id: row.user_id, auth_token: row.auth_token }] : [];
      return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    throw new Error(`Unexpected fetch call in test: ${method} ${path}`);
  };

  try {
    const { setTelegramChatIdForUser, getTelegramLinkByChatId } = await importFresh('../../lib/db.js', 'telegram-roundtrip');
    await setTelegramChatIdForUser('user-1', 'chat-1', 'plain-token-123');

    const stored = rows.get('chat-1');
    assert.ok(stored);
    assert.notEqual(stored.auth_token, 'plain-token-123');
    assert.match(stored.auth_token, /^enc-v1:/);

    const linked = await getTelegramLinkByChatId('chat-1');
    assert.deepEqual(linked, { userId: 'user-1', authToken: 'plain-token-123' });
  } finally {
    global.fetch = originalFetch;
    process.env.SUPABASE_URL = originalEnv.SUPABASE_URL;
    process.env.SUPABASE_PUBLISHABLE_KEY = originalEnv.SUPABASE_PUBLISHABLE_KEY;
    process.env.TELEGRAM_TOKEN_ENCRYPTION_KEY = originalEnv.TELEGRAM_TOKEN_ENCRYPTION_KEY;
  }
});

test('telegram RPC lookup still supports legacy plaintext auth_token rows', async () => {
  const originalEnv = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
    TELEGRAM_TOKEN_ENCRYPTION_KEY: process.env.TELEGRAM_TOKEN_ENCRYPTION_KEY,
  };
  const originalFetch = global.fetch;

  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_key_for_tests';
  process.env.TELEGRAM_TOKEN_ENCRYPTION_KEY = 'test-key-material';

  global.fetch = async (input, init = {}) => {
    const url = new URL(input);
    const path = url.pathname;
    const method = init.method || 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;

    if (path === '/rest/v1/rpc/lookup_telegram_link_by_chat_id' && method === 'POST') {
      const payload = body?.p_chat_id === 'legacy-chat'
        ? [{ user_id: 'legacy-user', auth_token: 'legacy-plaintext-token' }]
        : [];
      return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    throw new Error(`Unexpected fetch call in test: ${method} ${path}`);
  };

  try {
    const { getTelegramLinkByChatId } = await importFresh('../../lib/db.js', 'telegram-legacy');
    const linked = await getTelegramLinkByChatId('legacy-chat');
    assert.deepEqual(linked, { userId: 'legacy-user', authToken: 'legacy-plaintext-token' });
  } finally {
    global.fetch = originalFetch;
    process.env.SUPABASE_URL = originalEnv.SUPABASE_URL;
    process.env.SUPABASE_PUBLISHABLE_KEY = originalEnv.SUPABASE_PUBLISHABLE_KEY;
    process.env.TELEGRAM_TOKEN_ENCRYPTION_KEY = originalEnv.TELEGRAM_TOKEN_ENCRYPTION_KEY;
  }
});
