import test from 'node:test';
import assert from 'node:assert/strict';

function createReq({ method = 'GET', body = {}, headers = {}, query = {} } = {}) {
  return { method, body, headers, query };
}

function createRes() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    end(payload = '') {
      this.body = payload;
      return this;
    },
    json(payload) {
      this.setHeader('Content-Type', 'application/json');
      this.body = JSON.stringify(payload);
      return this;
    },
    send(payload = '') {
      this.body = payload;
      return this;
    },
  };
}

function jsonBody(res) {
  return res.body ? JSON.parse(res.body) : null;
}

async function importFresh(path, tag) {
  return import(`${path}?t=${Date.now()}-${tag}`);
}

test('PATCH /api/settings accepts valid timezone and persists setting', async () => {
  const original = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    fetch: global.fetch,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'anon-key';

  let savedPayload = null;

  global.fetch = async (input, init = {}) => {
    const url = new URL(input);
    const method = init.method || 'GET';

    if (url.pathname === '/auth/v1/user' && method === 'GET') {
      return new Response(JSON.stringify({ id: '11111111-1111-4111-8111-111111111111' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/rest/v1/settings' && method === 'POST') {
      savedPayload = init.body ? JSON.parse(init.body) : null;
      return new Response('', { status: 201, headers: { 'Content-Type': 'application/json' } });
    }

    throw new Error(`Unexpected fetch call: ${method} ${url.pathname}`);
  };

  const { default: settingsHandler } = await importFresh('../../api/settings.js', 'settings-patch-success');
  const req = createReq({
    method: 'PATCH',
    headers: { authorization: 'Bearer non-jwt-token' },
    body: { timezone: 'America/New_York' },
  });
  const res = createRes();

  try {
    await settingsHandler(req, res);
  } finally {
    process.env.EXPO_PUBLIC_SUPABASE_URL = original.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = original.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    global.fetch = original.fetch;
  }

  assert.equal(res.statusCode, 200);
  assert.deepEqual(jsonBody(res), { timezone: 'America/New_York' });
  assert.deepEqual(savedPayload, [{
    user_id: '11111111-1111-4111-8111-111111111111',
    key: 'timezone',
    value: 'America/New_York',
  }]);
});

test('GET /api/ics exports calendar with escaped content and safe filename', async () => {
  const original = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    fetch: global.fetch,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'anon-key';

  global.fetch = async (input, init = {}) => {
    const url = new URL(input);
    const method = init.method || 'GET';

    if (url.pathname === '/auth/v1/user' && method === 'GET') {
      return new Response(JSON.stringify({ id: '11111111-1111-4111-8111-111111111111' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/rest/v1/entries' && method === 'GET') {
      return new Response(JSON.stringify([{
        id: 42,
        category: 'reminder',
        remind_at: 1767225600,
        title: 'Team: plan, review; kickoff',
        description: 'Line one\nLine two; with comma, too',
      }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unexpected fetch call: ${method} ${url.pathname}`);
  };

  const { default: icsHandler } = await importFresh('../../api/ics.js', 'ics-export-success');
  const req = createReq({
    method: 'GET',
    headers: { authorization: 'Bearer non-jwt-token' },
    query: { id: '42' },
  });
  const res = createRes();

  try {
    await icsHandler(req, res);
  } finally {
    process.env.EXPO_PUBLIC_SUPABASE_URL = original.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = original.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    global.fetch = original.fetch;
  }

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['content-type'], 'text/calendar; charset=utf-8');
  assert.match(res.headers['content-disposition'], /second-brain-team-plan-review-kickoff-42\.ics/);
  assert.match(res.body, /BEGIN:VCALENDAR/);
  assert.match(res.body, /SUMMARY:Team: plan\\, review\\; kickoff/);
  assert.match(res.body, /DESCRIPTION:Line one\\nLine two\\; with comma\\, too/);
  assert.match(res.body, /DTSTART:20260101T000000Z/);
});

test('GET /api/ics rejects entries that are not scheduled reminders', async () => {
  const original = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    fetch: global.fetch,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'anon-key';

  global.fetch = async (input, init = {}) => {
    const url = new URL(input);
    const method = init.method || 'GET';

    if (url.pathname === '/auth/v1/user' && method === 'GET') {
      return new Response(JSON.stringify({ id: '11111111-1111-4111-8111-111111111111' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/rest/v1/entries' && method === 'GET') {
      return new Response(JSON.stringify([{
        id: 99,
        category: 'note',
        remind_at: null,
      }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unexpected fetch call: ${method} ${url.pathname}`);
  };

  const { default: icsHandler } = await importFresh('../../api/ics.js', 'ics-invalid-category');
  const req = createReq({
    method: 'GET',
    headers: { authorization: 'Bearer non-jwt-token' },
    query: { id: '99' },
  });
  const res = createRes();

  try {
    await icsHandler(req, res);
  } finally {
    process.env.EXPO_PUBLIC_SUPABASE_URL = original.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = original.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    global.fetch = original.fetch;
  }

  assert.equal(res.statusCode, 400);
  assert.deepEqual(jsonBody(res), { error: 'entry is not a reminder with schedule' });
});
