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
  };
}

function jsonBody(res) {
  return res.body ? JSON.parse(res.body) : null;
}

async function importFresh(path, tag) {
  return import(`${path}?t=${Date.now()}-${tag}`);
}

test('POST /api/open-brain/notifications creates follow notification', async () => {
  const original = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
    fetch: global.fetch,
  };

  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'anon-key';

  let insertPayload = null;
  let insertHeaders = null;

  global.fetch = async (input, init = {}) => {
    const url = new URL(input);
    const method = init.method || 'GET';

    if (url.pathname === '/auth/v1/user' && method === 'GET') {
      return new Response(JSON.stringify({ id: '11111111-1111-4111-8111-111111111111' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/rest/v1/notifications' && method === 'POST') {
      insertPayload = init.body ? JSON.parse(init.body) : null;
      insertHeaders = init.headers;
      return new Response(JSON.stringify([{
        id: '33333333-3333-4333-8333-333333333333',
        user_id: '22222222-2222-4222-8222-222222222222',
        actor_id: '11111111-1111-4111-8111-111111111111',
        type: 'follow',
      }]), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unexpected fetch call: ${method} ${url.pathname}`);
  };

  const { default: notificationsHandler } = await importFresh('../../lib/open-brain/routes/notifications.js', 'notifications-create-success');
  const req = createReq({
    method: 'POST',
    headers: { authorization: 'Bearer non-jwt-token' },
    body: {
      user_id: '22222222-2222-4222-8222-222222222222',
      type: 'follow',
    },
  });
  const res = createRes();

  try {
    await notificationsHandler(req, res);
  } finally {
    process.env.SUPABASE_URL = original.SUPABASE_URL;
    process.env.SUPABASE_PUBLISHABLE_KEY = original.SUPABASE_PUBLISHABLE_KEY;
    global.fetch = original.fetch;
  }

  assert.equal(res.statusCode, 201);
  assert.deepEqual(insertPayload, [{
    user_id: '22222222-2222-4222-8222-222222222222',
    actor_id: '11111111-1111-4111-8111-111111111111',
    type: 'follow',
  }]);
  assert.equal(insertHeaders.Prefer, 'return=representation');
  assert.equal(jsonBody(res)?.notification?.type, 'follow');
});

test('POST /api/open-brain/notifications rejects unsupported notification type', async () => {
  const original = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
    fetch: global.fetch,
  };

  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'anon-key';

  global.fetch = async (input, init = {}) => {
    const url = new URL(input);
    const method = init.method || 'GET';

    if (url.pathname === '/auth/v1/user' && method === 'GET') {
      return new Response(JSON.stringify({ id: '11111111-1111-4111-8111-111111111111' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unexpected fetch call: ${method} ${url.pathname}`);
  };

  const { default: notificationsHandler } = await importFresh('../../lib/open-brain/routes/notifications.js', 'notifications-invalid-type');
  const req = createReq({
    method: 'POST',
    headers: { authorization: 'Bearer non-jwt-token' },
    body: {
      user_id: '22222222-2222-4222-8222-222222222222',
      type: 'comment',
    },
  });
  const res = createRes();

  try {
    await notificationsHandler(req, res);
  } finally {
    process.env.SUPABASE_URL = original.SUPABASE_URL;
    process.env.SUPABASE_PUBLISHABLE_KEY = original.SUPABASE_PUBLISHABLE_KEY;
    global.fetch = original.fetch;
  }

  assert.equal(res.statusCode, 400);
  assert.deepEqual(jsonBody(res), { error: 'unsupported notification type' });
});

test('POST /api/open-brain/notifications maps Supabase auth errors to 401', async () => {
  const original = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
    fetch: global.fetch,
  };

  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'anon-key';

  global.fetch = async (input, init = {}) => {
    const url = new URL(input);
    const method = init.method || 'GET';

    if (url.pathname === '/auth/v1/user' && method === 'GET') {
      return new Response(JSON.stringify({ id: '11111111-1111-4111-8111-111111111111' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/rest/v1/notifications' && method === 'POST') {
      return new Response(JSON.stringify({ message: 'permission denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unexpected fetch call: ${method} ${url.pathname}`);
  };

  const { default: notificationsHandler } = await importFresh('../../lib/open-brain/routes/notifications.js', 'notifications-supabase-auth-error');
  const req = createReq({
    method: 'POST',
    headers: { authorization: 'Bearer non-jwt-token' },
    body: {
      user_id: '22222222-2222-4222-8222-222222222222',
      type: 'follow',
    },
  });
  const res = createRes();

  try {
    await notificationsHandler(req, res);
  } finally {
    process.env.SUPABASE_URL = original.SUPABASE_URL;
    process.env.SUPABASE_PUBLISHABLE_KEY = original.SUPABASE_PUBLISHABLE_KEY;
    global.fetch = original.fetch;
  }

  assert.equal(res.statusCode, 401);
  assert.deepEqual(jsonBody(res), { error: 'unauthorized' });
});

test('GET /api/open-brain/notifications lists notifications for auth user', async () => {
  const original = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
    fetch: global.fetch,
  };

  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'anon-key';

  global.fetch = async (input, init = {}) => {
    const url = new URL(input);
    const method = init.method || 'GET';

    if (url.pathname === '/auth/v1/user' && method === 'GET') {
      return new Response(JSON.stringify({ id: '11111111-1111-4111-8111-111111111111' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/rest/v1/notifications' && method === 'GET') {
      return new Response(JSON.stringify([{
        id: '33333333-3333-4333-8333-333333333333',
        user_id: '11111111-1111-4111-8111-111111111111',
        actor_id: '22222222-2222-4222-8222-222222222222',
        type: 'follow',
        read_at: null,
      }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unexpected fetch call: ${method} ${url.pathname}`);
  };

  const { default: notificationsHandler } = await importFresh('../../lib/open-brain/routes/notifications.js', 'notifications-list-success');
  const req = createReq({
    method: 'GET',
    headers: { authorization: 'Bearer non-jwt-token' },
  });
  const res = createRes();

  try {
    await notificationsHandler(req, res);
  } finally {
    process.env.SUPABASE_URL = original.SUPABASE_URL;
    process.env.SUPABASE_PUBLISHABLE_KEY = original.SUPABASE_PUBLISHABLE_KEY;
    global.fetch = original.fetch;
  }

  assert.equal(res.statusCode, 200);
  assert.equal(Array.isArray(jsonBody(res)?.notifications), true);
  assert.equal(jsonBody(res)?.notifications?.[0]?.type, 'follow');
});
