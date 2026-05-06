import test from 'node:test';
import assert from 'node:assert/strict';

import requestHandler from '../../api/auth/request.js';
import verifyHandler from '../../api/auth/verify.js';
import settingsHandler from '../../api/settings.js';
import telegramLinkKeyHandler from '../../api/telegram/link-key.js';

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

test('POST /api/auth/login returns 400 when identifier/password are missing', async () => {
  const { default: loginHandler } = await import(`../../api/auth/login.js?t=${Date.now()}-missing`);
  const req = createReq({ method: 'POST', body: {} });
  const res = createRes();

  await loginHandler(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(jsonBody(res), { error: 'username and password are required' });
});

test('POST /api/auth/login returns token for configured local credentials', async () => {
  const original = {
    AUTH_USERNAME: process.env.AUTH_USERNAME,
    AUTH_PASSWORD: process.env.AUTH_PASSWORD,
    JWT_SECRET: process.env.JWT_SECRET,
  };

  process.env.AUTH_USERNAME = 'admin';
  process.env.AUTH_PASSWORD = 'pass123';
  process.env.JWT_SECRET = 'test-secret';

  try {
    const { default: loginHandler } = await import(`../../api/auth/login.js?t=${Date.now()}-success`);
    const req = createReq({
      method: 'POST',
      body: { username: 'admin', password: 'pass123' },
    });
    const res = createRes();

    await loginHandler(req, res);

    assert.equal(res.statusCode, 200);
    const body = jsonBody(res);
    assert.equal(typeof body.token, 'string');
    assert.ok(body.token.length > 20);
  } finally {
    process.env.AUTH_USERNAME = original.AUTH_USERNAME;
    process.env.AUTH_PASSWORD = original.AUTH_PASSWORD;
    process.env.JWT_SECRET = original.JWT_SECRET;
  }
});

test('POST /api/auth/login returns 401 for non-email username when local auth does not match', async () => {
  const { default: loginHandler } = await import(`../../api/auth/login.js?t=${Date.now()}-invalid`);
  const original = {
    AUTH_USERNAME: process.env.AUTH_USERNAME,
    AUTH_PASSWORD: process.env.AUTH_PASSWORD,
  };

  process.env.AUTH_USERNAME = 'admin';
  process.env.AUTH_PASSWORD = 'pass123';

  const req = createReq({
    method: 'POST',
    body: { username: 'someoneelse', password: 'wrong' },
  });
  const res = createRes();

  try {
    await loginHandler(req, res);
  } finally {
    process.env.AUTH_USERNAME = original.AUTH_USERNAME;
    process.env.AUTH_PASSWORD = original.AUTH_PASSWORD;
  }

  assert.equal(res.statusCode, 401);
  assert.deepEqual(jsonBody(res), { error: 'invalid credentials' });
});

test('POST /api/auth/request rejects invalid email', async () => {
  const req = createReq({ method: 'POST', body: { email: 'invalid' } });
  const res = createRes();

  await requestHandler(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(jsonBody(res), { error: 'valid email is required' });
});

test('GET /api/auth/verify rejects missing token', async () => {
  const req = createReq({ method: 'GET', query: {} });
  const res = createRes();

  await verifyHandler(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(jsonBody(res), { error: 'token is required' });
});

test('GET /api/settings requires bearer token', async () => {
  const req = createReq({ method: 'GET', headers: {} });
  const res = createRes();

  await settingsHandler(req, res);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(jsonBody(res), { error: 'missing bearer token' });
});

test('PATCH /api/settings returns 401 for invalid bearer token', async () => {
  const req = createReq({
    method: 'PATCH',
    headers: { authorization: 'Bearer obviously-invalid-token' },
    body: { timezone: 'Not/A_Timezone' },
  });
  const res = createRes();

  await settingsHandler(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(typeof jsonBody(res)?.error, 'string');
});

test('GET /api/telegram/link-key requires bearer token', async () => {
  const req = createReq({ method: 'GET' });
  const res = createRes();

  await telegramLinkKeyHandler(req, res);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(jsonBody(res), { error: 'missing bearer token' });
});

test('method checks: settings and telegram handlers reject invalid methods', async () => {
  const settingsReq = createReq({ method: 'DELETE', headers: { authorization: 'Bearer token' } });
  const settingsRes = createRes();
  await settingsHandler(settingsReq, settingsRes);

  const telegramReq = createReq({ method: 'POST' });
  const telegramRes = createRes();
  await telegramLinkKeyHandler(telegramReq, telegramRes);

  assert.equal(settingsRes.statusCode, 401);
  assert.equal(telegramRes.statusCode, 405);
  assert.deepEqual(jsonBody(telegramRes), { error: 'Method not allowed' });
});
