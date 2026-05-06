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

test('POST /api/auth/login returns 400 when identifier/password are missing', async () => {
  const { default: loginHandler } = await importFresh('../auth/login.js', 'login-missing');
  const req = createReq({ method: 'POST', body: {} });
  const res = createRes();

  await loginHandler(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(jsonBody(res), { error: 'username and password are required' });
});

test('POST /api/auth/login rejects invalid email/password credentials', async () => {
  const { default: loginHandler } = await importFresh('../auth/login.js', 'login-invalid-email');
  const req = createReq({
    method: 'POST',
    body: { email: 'nobody@example.com', password: 'wrong' },
  });
  const res = createRes();

  await loginHandler(req, res);

  assert.ok([401, 500].includes(res.statusCode));
  assert.equal(typeof jsonBody(res)?.error, 'string');
});

test('POST /api/auth/login returns 401 for non-email username when local auth does not match', async () => {
  const { default: loginHandler } = await importFresh('../auth/login.js', 'login-invalid');
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

test('auth handlers: OPTIONS returns 204 and unsupported methods return 405', async () => {
  const { default: loginHandler } = await importFresh('../auth/login.js', 'login-methods');

  const loginOptionsRes = createRes();
  await loginHandler(createReq({ method: 'OPTIONS' }), loginOptionsRes);
  assert.equal(loginOptionsRes.statusCode, 204);
});

test('settings handler: OPTIONS preflight and bearer token guard', async () => {
  const { default: settingsHandler } = await importFresh('../settings.js', 'settings-preflight-auth');

  const optionsReq = createReq({ method: 'OPTIONS' });
  const optionsRes = createRes();
  await settingsHandler(optionsReq, optionsRes);
  assert.equal(optionsRes.statusCode, 204);

  const authReq = createReq({ method: 'GET', headers: {} });
  const authRes = createRes();
  await settingsHandler(authReq, authRes);
  assert.equal(authRes.statusCode, 401);
  assert.deepEqual(jsonBody(authRes), { error: 'missing bearer token' });
});

test('PATCH /api/settings returns 401 for invalid bearer token', async () => {
  const { default: settingsHandler } = await importFresh('../settings.js', 'settings-invalid-token');
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

test('telegram link key handler: OPTIONS, bearer token guard, and method check', async () => {
  const { default: telegramLinkKeyHandler } = await importFresh('../telegram/link-key.js', 'telegram-methods');

  const optionsReq = createReq({ method: 'OPTIONS' });
  const optionsRes = createRes();
  await telegramLinkKeyHandler(optionsReq, optionsRes);
  assert.equal(optionsRes.statusCode, 204);

  const noBearerReq = createReq({ method: 'GET' });
  const noBearerRes = createRes();
  await telegramLinkKeyHandler(noBearerReq, noBearerRes);
  assert.equal(noBearerRes.statusCode, 401);
  assert.deepEqual(jsonBody(noBearerRes), { error: 'missing bearer token' });

  const wrongMethodReq = createReq({ method: 'POST' });
  const wrongMethodRes = createRes();
  await telegramLinkKeyHandler(wrongMethodReq, wrongMethodRes);
  assert.equal(wrongMethodRes.statusCode, 405);
  assert.deepEqual(jsonBody(wrongMethodRes), { error: 'Method not allowed' });
});

test('entries handler: OPTIONS preflight and bearer token guard', async () => {
  const { default: entriesHandler } = await importFresh('../entries.js', 'entries-preflight-auth');

  const optionsReq = createReq({ method: 'OPTIONS' });
  const optionsRes = createRes();
  await entriesHandler(optionsReq, optionsRes);
  assert.equal(optionsRes.statusCode, 204);

  const noTokenReq = createReq({ method: 'GET', headers: {} });
  const noTokenRes = createRes();
  await entriesHandler(noTokenReq, noTokenRes);
  assert.equal(noTokenRes.statusCode, 401);
  assert.deepEqual(jsonBody(noTokenRes), { error: 'missing bearer token' });
});

test('ics handler: method guard and bearer token guard', async () => {
  const { default: icsHandler } = await importFresh('../ics.js', 'ics-guards');

  const wrongMethodReq = createReq({ method: 'POST' });
  const wrongMethodRes = createRes();
  await icsHandler(wrongMethodReq, wrongMethodRes);
  assert.equal(wrongMethodRes.statusCode, 405);

  const noTokenReq = createReq({ method: 'GET', headers: {}, query: { id: '1' } });
  const noTokenRes = createRes();
  await icsHandler(noTokenReq, noTokenRes);
  assert.equal(noTokenRes.statusCode, 401);
  assert.deepEqual(jsonBody(noTokenRes), { error: 'missing bearer token' });
});

test('bot handler: method guard and no-message noop', async () => {
  const { default: botHandler } = await importFresh('../bot.js', 'bot-guards');

  const wrongMethodReq = createReq({ method: 'GET' });
  const wrongMethodRes = createRes();
  await botHandler(wrongMethodReq, wrongMethodRes);
  assert.equal(wrongMethodRes.statusCode, 405);

  const noMessageReq = createReq({
    method: 'POST',
    body: {},
  });
  const noMessageRes = createRes();
  await botHandler(noMessageReq, noMessageRes);
  assert.equal(noMessageRes.statusCode, 200);
});
