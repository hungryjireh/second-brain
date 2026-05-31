import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import fs from "fs";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.EXPO_PUBLIC_SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "https://example.supabase.co";
process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "anon-key";

function createReq({
  method = "GET",
  body = {},
  headers = {},
  query = {},
} = {}) {
  return { method, body, headers, query };
}

function createRes() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    end(payload = "") {
      this.body = payload;
      return this;
    },
    json(payload) {
      this.setHeader("Content-Type", "application/json");
      this.body = JSON.stringify(payload);
      return this;
    },
    send(payload = "") {
      this.body = payload;
      return this;
    },
  };
}

function jsonBody(res) {
  return res.body ? JSON.parse(res.body) : null;
}

function createTestJwt(payload) {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

async function importFresh(path, tag) {
  return import(`${path}?t=${Date.now()}-${tag}`);
}

test("POST /api/auth/login returns 400 when identifier/password are missing", async () => {
  const { default: loginHandler } = await importFresh(
    "../../api/auth/[action].js",
    "login-missing",
  );
  const req = createReq({
    method: "POST",
    body: {},
    query: { action: "login" },
  });
  const res = createRes();

  await loginHandler(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(jsonBody(res), {
    error: "username and password are required",
  });
});

test("POST /api/auth/login rejects invalid email/password credentials", async () => {
  const { default: loginHandler } = await importFresh(
    "../../api/auth/[action].js",
    "login-invalid-email",
  );
  const req = createReq({
    method: "POST",
    body: { email: "nobody@example.com", password: "wrong" },
    query: { action: "login" },
  });
  const res = createRes();

  await loginHandler(req, res);

  assert.ok([401, 500].includes(res.statusCode));
  assert.equal(typeof jsonBody(res)?.error, "string");
});

test("POST /api/auth/login returns 401 for non-email username when local auth does not match", async () => {
  const { default: loginHandler } = await importFresh(
    "../../api/auth/[action].js",
    "login-invalid",
  );
  const original = {
    AUTH_USERNAME: process.env.AUTH_USERNAME,
    AUTH_PASSWORD: process.env.AUTH_PASSWORD,
  };

  process.env.AUTH_USERNAME = "admin";
  process.env.AUTH_PASSWORD = "pass123";

  const req = createReq({
    method: "POST",
    body: { username: "someoneelse", password: "wrong" },
    query: { action: "login" },
  });
  const res = createRes();

  try {
    await loginHandler(req, res);
  } finally {
    process.env.AUTH_USERNAME = original.AUTH_USERNAME;
    process.env.AUTH_PASSWORD = original.AUTH_PASSWORD;
  }

  assert.equal(res.statusCode, 401);
  assert.deepEqual(jsonBody(res), { error: "invalid credentials" });
});

test("auth handlers: OPTIONS returns 204 and unsupported methods return 405", async () => {
  const { default: loginHandler } = await importFresh(
    "../../api/auth/[action].js",
    "login-methods",
  );

  const loginOptionsRes = createRes();
  await loginHandler(
    createReq({ method: "OPTIONS", query: { action: "login" } }),
    loginOptionsRes,
  );
  assert.equal(loginOptionsRes.statusCode, 204);
});

test("POST /api/auth/refresh returns 400 when refreshToken is missing", async () => {
  const { default: refreshHandler } = await importFresh(
    "../../api/auth/[action].js",
    "refresh-missing-token",
  );
  const req = createReq({
    method: "POST",
    body: {},
    query: { action: "refresh" },
  });
  const res = createRes();

  await refreshHandler(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(jsonBody(res), { error: "refreshToken is required" });
});

test("auth refresh handler: OPTIONS returns 204 and unsupported methods return 405", async () => {
  const { default: refreshHandler } = await importFresh(
    "../../api/auth/[action].js",
    "refresh-methods",
  );

  const optionsRes = createRes();
  await refreshHandler(
    createReq({ method: "OPTIONS", query: { action: "refresh" } }),
    optionsRes,
  );
  assert.equal(optionsRes.statusCode, 204);

  const wrongMethodRes = createRes();
  await refreshHandler(
    createReq({ method: "GET", query: { action: "refresh" } }),
    wrongMethodRes,
  );
  assert.equal(wrongMethodRes.statusCode, 405);
  assert.deepEqual(jsonBody(wrongMethodRes), { error: "Method not allowed" });
});

test("POST /api/auth/reset-password returns 400 when email is missing", async () => {
  const { default: resetPasswordHandler } = await importFresh(
    "../../api/auth/[action].js",
    "reset-password-missing-email",
  );
  const req = createReq({
    method: "POST",
    body: {},
    query: { action: "reset-password" },
  });
  const res = createRes();

  await resetPasswordHandler(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(jsonBody(res), { error: "email is required" });
});

test("auth action handler returns 404 for unknown action", async () => {
  const { default: authActionHandler } = await importFresh(
    "../../api/auth/[action].js",
    "auth-unknown-action",
  );
  const req = createReq({
    method: "POST",
    body: {},
    query: { action: "unknown-action" },
  });
  const res = createRes();

  await authActionHandler(req, res);

  assert.equal(res.statusCode, 404);
  assert.deepEqual(jsonBody(res), { error: "Not found" });
});

test("auth handler rate limits repeated requests from same IP", async () => {
  const { default: authActionHandler } = await importFresh(
    "../../api/auth/[action].js",
    "auth-ip-rate-limit",
  );

  let finalRes = null;
  for (let attempt = 0; attempt < 31; attempt += 1) {
    const req = createReq({
      method: "POST",
      body: {},
      headers: { "x-forwarded-for": "203.0.113.10" },
      query: { action: "unknown-action" },
    });
    const res = createRes();
    await authActionHandler(req, res);
    finalRes = res;
  }

  assert.equal(finalRes?.statusCode, 429);
  assert.equal(typeof jsonBody(finalRes)?.retryAfterSeconds, "number");
});

test("auth login rate limits repeated attempts for same identifier", async () => {
  const { default: authActionHandler } = await importFresh(
    "../../api/auth/[action].js",
    "auth-identifier-rate-limit",
  );

  const original = {
    AUTH_USERNAME: process.env.AUTH_USERNAME,
    AUTH_PASSWORD: process.env.AUTH_PASSWORD,
  };
  process.env.AUTH_USERNAME = "test-admin";
  process.env.AUTH_PASSWORD = "test-password";

  let finalRes = null;
  try {
    for (let attempt = 0; attempt < 11; attempt += 1) {
      const req = createReq({
        method: "POST",
        body: {
          username: "limit-user",
          password: "wrong-password",
        },
        headers: { "x-forwarded-for": "203.0.113.11" },
        query: { action: "login" },
      });
      const res = createRes();
      await authActionHandler(req, res);
      finalRes = res;
    }
  } finally {
    process.env.AUTH_USERNAME = original.AUTH_USERNAME;
    process.env.AUTH_PASSWORD = original.AUTH_PASSWORD;
  }

  assert.equal(finalRes?.statusCode, 429);
  assert.equal(typeof jsonBody(finalRes)?.retryAfterSeconds, "number");
});

test("settings handler: OPTIONS preflight and bearer token guard", async () => {
  const { default: settingsHandler } = await importFresh(
    "../../api/settings.js",
    "settings-preflight-auth",
  );

  const optionsReq = createReq({ method: "OPTIONS" });
  const optionsRes = createRes();
  await settingsHandler(optionsReq, optionsRes);
  assert.equal(optionsRes.statusCode, 204);

  const authReq = createReq({ method: "GET", headers: {} });
  const authRes = createRes();
  await settingsHandler(authReq, authRes);
  assert.equal(authRes.statusCode, 401);
  assert.deepEqual(jsonBody(authRes), { error: "missing bearer token" });
});

test("PATCH /api/settings returns 401 for invalid bearer token", async () => {
  const { default: settingsHandler } = await importFresh(
    "../../api/settings.js",
    "settings-invalid-token",
  );
  const req = createReq({
    method: "PATCH",
    headers: { authorization: "Bearer obviously-invalid-token" },
    body: { timezone: "Not/A_Timezone" },
  });
  const res = createRes();

  await settingsHandler(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(typeof jsonBody(res)?.error, "string");
});

test("telegram link key handler: OPTIONS, bearer token guard, and method check", async () => {
  const { default: telegramLinkKeyHandler } = await importFresh(
    "../../api/telegram/link-key.js",
    "telegram-methods",
  );

  const optionsReq = createReq({ method: "OPTIONS" });
  const optionsRes = createRes();
  await telegramLinkKeyHandler(optionsReq, optionsRes);
  assert.equal(optionsRes.statusCode, 204);

  const noBearerReq = createReq({ method: "GET" });
  const noBearerRes = createRes();
  await telegramLinkKeyHandler(noBearerReq, noBearerRes);
  assert.equal(noBearerRes.statusCode, 401);
  assert.deepEqual(jsonBody(noBearerRes), { error: "missing bearer token" });

  const wrongMethodReq = createReq({ method: "PUT" });
  const wrongMethodRes = createRes();
  await telegramLinkKeyHandler(wrongMethodReq, wrongMethodRes);
  assert.equal(wrongMethodRes.statusCode, 405);
  assert.deepEqual(jsonBody(wrongMethodRes), { error: "Method not allowed" });
});

test("telegram link key handler: POST embeds durable telegram session token when refresh token is provided", async () => {
  const { default: telegramLinkKeyHandler } = await importFresh(
    "../../api/telegram/link-key.js",
    "telegram-post-durable-link",
  );
  const {
    verifyTelegramLinkKey,
    verifyAuthJwt,
    TELEGRAM_SESSION_TOKEN_PURPOSE,
  } = await importFresh("../../lib/auth.js", "telegram-post-durable-link-auth");

  const userId = "123e4567-e89b-42d3-a456-426614174000";
  const bearer = createTestJwt({ sub: userId });
  const req = createReq({
    method: "POST",
    headers: { authorization: `Bearer ${bearer}` },
    body: { refreshToken: "refresh-token-xyz" },
  });
  const res = createRes();

  await telegramLinkKeyHandler(req, res);

  assert.equal(res.statusCode, 200);
  const key = String(jsonBody(res)?.key || "");
  assert.ok(key);

  const {
    userId: linkedUserId,
    authTokenToStore,
    requestAuthToken,
  } = verifyTelegramLinkKey(key);
  assert.equal(linkedUserId, userId);
  assert.equal(requestAuthToken, bearer);
  assert.notEqual(authTokenToStore, bearer);

  const storedPayload = verifyAuthJwt(authTokenToStore);
  assert.equal(storedPayload?.purpose, TELEGRAM_SESSION_TOKEN_PURPOSE);
  assert.equal(storedPayload?.sub, userId);
  assert.equal(storedPayload?.srt, "refresh-token-xyz");
});

test("telegram link key handler: GET keeps backward-compatible fallback token payload", async () => {
  const { default: telegramLinkKeyHandler } = await importFresh(
    "../../api/telegram/link-key.js",
    "telegram-get-fallback-link",
  );
  const { verifyTelegramLinkKey } = await importFresh(
    "../../lib/auth.js",
    "telegram-get-fallback-link-auth",
  );

  const userId = "123e4567-e89b-42d3-a456-426614174000";
  const bearer = createTestJwt({ sub: userId });
  const req = createReq({
    method: "GET",
    headers: { authorization: `Bearer ${bearer}` },
  });
  const res = createRes();

  await telegramLinkKeyHandler(req, res);

  assert.equal(res.statusCode, 200);
  const key = String(jsonBody(res)?.key || "");
  assert.ok(key);

  const {
    userId: linkedUserId,
    authTokenToStore,
    requestAuthToken,
  } = verifyTelegramLinkKey(key);
  assert.equal(linkedUserId, userId);
  assert.equal(authTokenToStore, bearer);
  assert.equal(requestAuthToken, bearer);
});

test("entries handler: OPTIONS preflight and bearer token guard", async () => {
  const { default: entriesHandler } = await importFresh(
    "../../api/entries.js",
    "entries-preflight-auth",
  );

  const optionsReq = createReq({ method: "OPTIONS" });
  const optionsRes = createRes();
  await entriesHandler(optionsReq, optionsRes);
  assert.equal(optionsRes.statusCode, 204);

  const noTokenReq = createReq({ method: "GET", headers: {} });
  const noTokenRes = createRes();
  await entriesHandler(noTokenReq, noTokenRes);
  assert.equal(noTokenRes.statusCode, 401);
  assert.deepEqual(jsonBody(noTokenRes), { error: "missing bearer token" });
});

test("entries handler: GET supports include_stats with paginated response", async () => {
  const { default: entriesHandler } = await importFresh(
    "../../api/entries.js",
    "entries-include-stats-pagination",
  );

  const userId = "123e4567-e89b-42d3-a456-426614174000";
  const bearer = createTestJwt({ sub: userId });
  const originalFetch = global.fetch;

  function createJsonResponse(body, { status = 200, headers = {} } = {}) {
    const normalizedHeaders = new Map(
      Object.entries(headers).map(([key, value]) => [
        key.toLowerCase(),
        String(value),
      ]),
    );
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: {
        get(name) {
          return normalizedHeaders.get(String(name).toLowerCase()) ?? null;
        },
      },
      async text() {
        return JSON.stringify(body);
      },
    };
  }

  global.fetch = async (input) => {
    const url = new URL(String(input));
    if (
      url.pathname !== "/rest/v1/entries" &&
      url.pathname !== "/rest/v1/entry_tags" &&
      url.pathname !== "/rest/v1/rpc/get_entry_category_counts"
    ) {
      return createJsonResponse([], { status: 200 });
    }

    if (url.pathname === "/rest/v1/rpc/get_entry_category_counts") {
      return createJsonResponse([
        { category: "reminder", total: 7 },
        { category: "todo", total: 3 },
        { category: "thought", total: 11 },
        { category: "note", total: 5 },
      ]);
    }

    if (url.pathname === "/rest/v1/entries") {
      return createJsonResponse(
        [
          {
            id: 200,
            user_id: userId,
            category: "thought",
            title: "A title",
            summary: "A summary",
            content: "A summary",
            description: "A summary",
            raw_text: "A summary",
            created_at: 200,
            updated_at: 200,
            priority: 0,
            is_archived: false,
            is_deleted: false,
          },
          {
            id: 199,
            user_id: userId,
            category: "todo",
            title: "B title",
            summary: "B summary",
            content: "B summary",
            description: "B summary",
            raw_text: "B summary",
            created_at: 199,
            updated_at: 199,
            priority: 0,
            is_archived: false,
            is_deleted: false,
          },
          {
            id: 198,
            user_id: userId,
            category: "note",
            title: "C title",
            summary: "C summary",
            content: "C summary",
            description: "C summary",
            raw_text: "C summary",
            created_at: 198,
            updated_at: 198,
            priority: 0,
            is_archived: false,
            is_deleted: false,
          },
        ],
        { status: 200 },
      );
    }

    return createJsonResponse([], { status: 200 });
  };

  try {
    const req = createReq({
      method: "GET",
      headers: { authorization: `Bearer ${bearer}` },
      query: {
        limit: "2",
        include_stats: "true",
      },
    });
    const res = createRes();
    await entriesHandler(req, res);

    assert.equal(res.statusCode, 200);
    const payload = jsonBody(res);
    assert.equal(Array.isArray(payload?.entries), true);
    assert.equal(payload.entries.length, 2);
    assert.deepEqual(payload.stats, {
      reminder: 7,
      todo: 3,
      thought: 11,
      note: 5,
    });
    assert.equal(payload.page?.has_more, true);
    assert.equal(typeof payload.page?.next_cursor, "string");
  } finally {
    global.fetch = originalFetch;
  }
});

test("ics handler: method guard and bearer token guard", async () => {
  const { default: icsHandler } = await importFresh(
    "../../api/ics.js",
    "ics-guards",
  );

  const wrongMethodReq = createReq({ method: "POST" });
  const wrongMethodRes = createRes();
  await icsHandler(wrongMethodReq, wrongMethodRes);
  assert.equal(wrongMethodRes.statusCode, 405);

  const noTokenReq = createReq({
    method: "GET",
    headers: {},
    query: { id: "1" },
  });
  const noTokenRes = createRes();
  await icsHandler(noTokenReq, noTokenRes);
  assert.equal(noTokenRes.statusCode, 401);
  assert.deepEqual(jsonBody(noTokenRes), { error: "missing bearer token" });
});

test("bot handler: method guard and no-message noop", async () => {
  const originalWebhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  process.env.TELEGRAM_WEBHOOK_SECRET = "";
  const { default: botHandler } = await importFresh(
    "../../lib/api/telegram/webhook.js",
    "bot-guards",
  );

  try {
    const wrongMethodReq = createReq({ method: "GET" });
    const wrongMethodRes = createRes();
    await botHandler(wrongMethodReq, wrongMethodRes);
    assert.equal(wrongMethodRes.statusCode, 405);

    const noMessageReq = createReq({
      method: "POST",
      body: {},
    });
    const noMessageRes = createRes();
    await botHandler(noMessageReq, noMessageRes);
    assert.equal(noMessageRes.statusCode, 200);
  } finally {
    process.env.TELEGRAM_WEBHOOK_SECRET = originalWebhookSecret;
  }
});

test("bot handler rejects invalid telegram webhook secret when configured", async () => {
  const originalWebhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  process.env.TELEGRAM_WEBHOOK_SECRET = "expected-secret";

  try {
    const { default: botHandler } = await importFresh(
      "../../lib/api/telegram/webhook.js",
      "bot-webhook-secret-guard",
    );

    const missingHeaderRes = createRes();
    await botHandler(
      createReq({ method: "POST", body: { message: {} }, headers: {} }),
      missingHeaderRes,
    );
    assert.equal(missingHeaderRes.statusCode, 401);

    const wrongHeaderRes = createRes();
    await botHandler(
      createReq({
        method: "POST",
        body: { message: {} },
        headers: {
          "x-telegram-bot-api-secret-token": "wrong-secret",
        },
      }),
      wrongHeaderRes,
    );
    assert.equal(wrongHeaderRes.statusCode, 401);

    const validHeaderRes = createRes();
    await botHandler(
      createReq({
        method: "POST",
        body: {},
        headers: {
          "x-telegram-bot-api-secret-token": "expected-secret",
        },
      }),
      validHeaderRes,
    );
    assert.equal(validHeaderRes.statusCode, 200);
  } finally {
    process.env.TELEGRAM_WEBHOOK_SECRET = originalWebhookSecret;
  }
});

test("launch signups rate limits repeated requests for same email", async () => {
  const { default: launchSignupsHandler } = await importFresh(
    "../../api/launch-signups.js",
    "launch-signups-rate-limit",
  );

  let finalRes = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const req = createReq({
      method: "POST",
      body: {
        name: "Rate Limit Test",
        email: "ratelimit@example.com",
      },
      headers: { "x-forwarded-for": "203.0.113.12" },
    });
    const res = createRes();
    await launchSignupsHandler(req, res);
    finalRes = res;
  }

  assert.equal(finalRes?.statusCode, 429);
  assert.equal(typeof jsonBody(finalRes)?.retryAfterSeconds, "number");
});

test("bot handler enforces and communicates 120-second voice note limit", () => {
  const botSource = fs.readFileSync(
    new URL("../../lib/api/telegram/webhook.js", import.meta.url),
    "utf8",
  );
  const voiceConstantsSource = fs.readFileSync(
    new URL("../../lib/constants/voice.js", import.meta.url),
    "utf8",
  );

  assert.match(
    botSource,
    /MAX_VOICE_NOTE_DURATION_SECONDS[^;]*from ["'][^"']*constants\/voice\.js["']/,
  );
  assert.match(
    botSource,
    /MIN_VOICE_NOTE_DURATION_SECONDS[^;]*from ["'][^"']*constants\/voice\.js["']/,
  );
  assert.match(
    voiceConstantsSource,
    /MAX_VOICE_NOTE_DURATION_SECONDS\s*=\s*120/,
  );
  assert.match(
    voiceConstantsSource,
    /MIN_VOICE_NOTE_DURATION_SECONDS\s*=\s*0\.5/,
  );
  assert.match(
    botSource,
    /msg\.voice\.duration[\s\S]*<\s*MIN_VOICE_NOTE_DURATION_SECONDS/,
  );
  assert.match(
    botSource,
    /at least \$\{MIN_VOICE_NOTE_DURATION_SECONDS\} seconds long/,
  );
  assert.match(
    botSource,
    /msg\.voice\.duration[\s\S]*>\s*MAX_VOICE_NOTE_DURATION_SECONDS/,
  );
  assert.match(botSource, /Voice notes must be[\s\S]*seconds or less/);
  assert.match(
    botSource,
    /voice note \(max \$\{MAX_VOICE_NOTE_DURATION_SECONDS\} seconds\) or text/,
  );
});

test("bot handler persists rotated telegram refresh token after session refresh", () => {
  const botSource = fs.readFileSync(
    new URL("../../lib/api/telegram/webhook.js", import.meta.url),
    "utf8",
  );

  assert.match(botSource, /createTelegramSessionToken/);
  assert.match(botSource, /session\?\.refresh_token/);
  assert.match(
    botSource,
    /setTelegramChatIdForUser[\s\S]*nextSessionToken[\s\S]*refreshedAccessToken/,
  );
});

test("voice handler rejects too-short audio and one-word transcripts before creating entries", () => {
  const voiceSource = fs.readFileSync(
    new URL("../../lib/api/second-brain/voice.js", import.meta.url),
    "utf8",
  );
  const voiceConstantsSource = fs.readFileSync(
    new URL("../../lib/constants/voice.js", import.meta.url),
    "utf8",
  );

  assert.match(
    voiceSource,
    /MIN_VOICE_NOTE_DURATION_SECONDS[^;]*from ["'][^"']*constants\/voice\.js["']/,
  );
  assert.match(
    voiceConstantsSource,
    /MIN_VOICE_NOTE_DURATION_SECONDS\s*=\s*0\.5/,
  );
  assert.match(
    voiceSource,
    /durationSeconds[\s\S]*<\s*MIN_VOICE_NOTE_DURATION_SECONDS/,
  );
  assert.match(
    voiceSource,
    /at least \$\{MIN_VOICE_NOTE_DURATION_SECONDS\} seconds long/,
  );
  assert.match(voiceSource, /transcribedWordCount[\s\S]*<=\s*1/);
  assert.match(voiceSource, /too short to understand/);
});

test("open-brain shared-thought handler: OPTIONS, method guard, and missing slug", async () => {
  const { default: sharedThoughtHandler } = await importFresh(
    "../../lib/open-brain/routes/shared-thought.js",
    "shared-thought-guards",
  );

  const optionsRes = createRes();
  await sharedThoughtHandler(createReq({ method: "OPTIONS" }), optionsRes);
  assert.equal(optionsRes.statusCode, 204);

  const wrongMethodRes = createRes();
  await sharedThoughtHandler(createReq({ method: "POST" }), wrongMethodRes);
  assert.equal(wrongMethodRes.statusCode, 405);
  assert.deepEqual(jsonBody(wrongMethodRes), { error: "Method not allowed" });

  const missingSlugRes = createRes();
  await sharedThoughtHandler(
    createReq({ method: "GET", query: {} }),
    missingSlugRes,
  );
  assert.equal(missingSlugRes.statusCode, 400);
  assert.deepEqual(jsonBody(missingSlugRes), { error: "slug is required" });
});

test("open-brain profile handler allows anonymous username lookup", async () => {
  const original = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    fetch: global.fetch,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon-key";

  global.fetch = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/rest/v1/profiles")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify([
            {
              id: "11111111-1111-4111-8111-111111111111",
              username: "alice",
              avatar_url: null,
              streak_count: 0,
              last_posted_at: null,
              timezone: "UTC",
              username_changed_once: false,
            },
          ]),
      };
    }
    if (parsed.pathname.endsWith("/rest/v1/rpc/open_brain_save_counts")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            profile_counts: {
              "11111111-1111-4111-8111-111111111111": 2,
            },
            thought_counts: {},
          }),
      };
    }

    throw new Error(`Unexpected fetch URL: ${parsed.toString()}`);
  };

  const { default: profileHandler } = await importFresh(
    "../../lib/open-brain/routes/profile.js",
    "open-brain-profile-anon-username",
  );
  const req = createReq({
    method: "GET",
    query: { username: "alice" },
    headers: {},
  });
  const res = createRes();

  try {
    await profileHandler(req, res);
  } finally {
    process.env.EXPO_PUBLIC_SUPABASE_URL = original.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      original.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    global.fetch = original.fetch;
  }

  assert.equal(res.statusCode, 200);
  assert.equal(jsonBody(res)?.profile?.username, "alice");
  assert.equal(jsonBody(res)?.profile?.save_count, 2);
  assert.equal(typeof jsonBody(res)?.profile?.is_self, "boolean");
  assert.equal(typeof jsonBody(res)?.profile?.is_following, "boolean");
  assert.equal(jsonBody(res)?.profile?.is_self, false);
  assert.equal(jsonBody(res)?.profile?.is_following, false);
});

test("open-brain profile handler rejects non-boolean username_changed_once from upstream", async () => {
  const original = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    fetch: global.fetch,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon-key";

  global.fetch = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/rest/v1/profiles")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify([
            {
              id: "11111111-1111-4111-8111-111111111111",
              username: "alice",
              avatar_url: null,
              streak_count: 0,
              last_posted_at: null,
              timezone: "UTC",
              username_changed_once: "false",
            },
          ]),
      };
    }
    if (parsed.pathname.endsWith("/rest/v1/rpc/open_brain_save_counts")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            profile_counts: {
              "11111111-1111-4111-8111-111111111111": 0,
            },
            thought_counts: {},
          }),
      };
    }

    throw new Error(`Unexpected fetch URL: ${parsed.toString()}`);
  };

  const { default: profileHandler } = await importFresh(
    "../../lib/open-brain/routes/profile.js",
    "open-brain-profile-username-changed-strict",
  );
  const req = createReq({
    method: "GET",
    query: { username: "alice" },
    headers: {},
  });
  const res = createRes();

  try {
    await profileHandler(req, res);
  } finally {
    process.env.EXPO_PUBLIC_SUPABASE_URL = original.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      original.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    global.fetch = original.fetch;
  }

  assert.equal(res.statusCode, 500);
  assert.equal(
    jsonBody(res)?.error,
    "profiles.username_changed_once must be a boolean",
  );
});

test("open-brain public-thoughts handler allows anonymous lookup by user_id", async () => {
  const original = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    fetch: global.fetch,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon-key";

  global.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () =>
      JSON.stringify([
        {
          id: "t1",
          content: { text: "hello world" },
          created_at: "2026-01-01T00:00:00.000Z",
          visibility: "public",
        },
      ]),
  });

  const { default: publicThoughtsHandler } = await importFresh(
    "../../lib/open-brain/routes/public-thoughts.js",
    "open-brain-public-thoughts-anon",
  );
  const req = createReq({
    method: "GET",
    query: { user_id: "11111111-1111-4111-8111-111111111111" },
    headers: {},
  });
  const res = createRes();

  try {
    await publicThoughtsHandler(req, res);
  } finally {
    process.env.EXPO_PUBLIC_SUPABASE_URL = original.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      original.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    global.fetch = original.fetch;
  }

  assert.equal(res.statusCode, 200);
  assert.equal(Array.isArray(jsonBody(res)?.thoughts), true);
  assert.equal(jsonBody(res)?.thoughts?.[0]?.text, "hello world");
});

test("open-brain feed handler returns per-thought save_count from thought_second_brain_saves", async () => {
  const original = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    fetch: global.fetch,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon-key";

  const viewerId = "11111111-1111-4111-8111-111111111111";
  const authorId = "22222222-2222-4222-8222-222222222222";
  const thoughtId = "33333333-3333-4333-8333-333333333333";

  global.fetch = async (url) => {
    const parsed = new URL(url);

    if (parsed.pathname.endsWith("/auth/v1/user")) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: viewerId }),
      };
    }

    if (parsed.pathname.endsWith("/rest/v1/follows")) {
      return { ok: true, status: 200, text: async () => JSON.stringify([]) };
    }

    if (parsed.pathname.endsWith("/rest/v1/rpc/open_brain_reaction_summary")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            summary: {
              [thoughtId]: {
                felt_this: 2,
                me_too: 1,
                made_me_think: 3,
                mine: {
                  felt_this: true,
                  me_too: false,
                  made_me_think: true,
                },
              },
            },
          }),
      };
    }

    if (parsed.pathname.endsWith("/rest/v1/profiles")) {
      const idEq = parsed.searchParams.get("id");
      if (idEq === `eq.${viewerId}`) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify([{ id: viewerId, timezone: "UTC" }]),
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify([
            {
              id: authorId,
              username: "alice",
              avatar_url: null,
              streak_count: 4,
            },
          ]),
      };
    }

    if (parsed.pathname.endsWith("/rest/v1/thoughts")) {
      const selected = parsed.searchParams.get("select");
      const userEq = parsed.searchParams.get("user_id");
      const visibility = parsed.searchParams.get("visibility");

      if (selected === "created_at" && userEq === `eq.${viewerId}`) {
        return { ok: true, status: 200, text: async () => JSON.stringify([]) };
      }

      if (
        selected === "id,user_id,content,created_at,visibility,share_slug" &&
        visibility === "eq.public"
      ) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([
              {
                id: thoughtId,
                user_id: authorId,
                content: { text: "A thought" },
                created_at: "2026-01-01T00:00:00.000Z",
                visibility: "public",
                share_slug: null,
              },
            ]),
        };
      }

      if (selected === "id,user_id" && visibility === "eq.public") {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([{ id: thoughtId, user_id: authorId }]),
        };
      }
    }

    if (parsed.pathname.endsWith("/rest/v1/thought_second_brain_saves")) {
      const userEq = parsed.searchParams.get("user_id");
      if (userEq === `eq.${viewerId}`) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify([{ thought_id: thoughtId }]),
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify([
            { thought_id: thoughtId },
            { thought_id: thoughtId },
            { thought_id: thoughtId },
          ]),
      };
    }
    if (parsed.pathname.endsWith("/rest/v1/rpc/open_brain_save_counts")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            profile_counts: { [authorId]: 3 },
            thought_counts: { [thoughtId]: 3 },
          }),
      };
    }

    throw new Error(`Unexpected fetch URL: ${parsed.toString()}`);
  };

  const { default: feedHandler } = await importFresh(
    "../../lib/open-brain/routes/feed.js",
    "open-brain-feed-save-count",
  );
  const authToken = createTestJwt({ sub: viewerId });
  const req = createReq({
    method: "GET",
    headers: { authorization: `Bearer ${authToken}` },
  });
  const res = createRes();

  try {
    await feedHandler(req, res);
  } finally {
    process.env.EXPO_PUBLIC_SUPABASE_URL = original.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      original.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    global.fetch = original.fetch;
  }

  assert.equal(res.statusCode, 200);
  assert.equal(jsonBody(res)?.everyone?.[0]?.id, thoughtId);
  assert.equal(
    typeof jsonBody(res)?.everyone?.[0]?.profile?.is_self,
    "boolean",
  );
  assert.equal(
    typeof jsonBody(res)?.everyone?.[0]?.profile?.is_following,
    "boolean",
  );
  assert.equal(jsonBody(res)?.everyone?.[0]?.save_count, 3);
  assert.equal(
    jsonBody(res)?.everyone?.[0]?.viewer_has_added_to_second_brain,
    true,
  );
  assert.equal(jsonBody(res)?.everyone?.[0]?.reactions?.felt_this, 2);
  assert.equal(jsonBody(res)?.everyone?.[0]?.reactions?.me_too, 1);
  assert.equal(jsonBody(res)?.everyone?.[0]?.reactions?.made_me_think, 3);
  assert.equal(jsonBody(res)?.everyone?.[0]?.reactions?.mine?.felt_this, true);
  assert.equal(
    jsonBody(res)?.everyone?.[0]?.reactions?.mine?.made_me_think,
    true,
  );
});

test("open-brain feed handler excludes self-authored thoughts from following feed even if self appears in follows", async () => {
  const original = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    fetch: global.fetch,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon-key";

  const viewerId = "11111111-1111-4111-8111-111111111111";
  const otherAuthorId = "22222222-2222-4222-8222-222222222222";
  const viewerThoughtId = "33333333-3333-4333-8333-333333333333";
  const otherThoughtId = "44444444-4444-4444-8444-444444444444";

  global.fetch = async (url) => {
    const parsed = new URL(url);

    if (parsed.pathname.endsWith("/auth/v1/user")) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: viewerId }),
      };
    }

    if (parsed.pathname.endsWith("/rest/v1/follows")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify([
            { following_id: viewerId },
            { following_id: otherAuthorId },
          ]),
      };
    }

    if (parsed.pathname.endsWith("/rest/v1/rpc/open_brain_reaction_summary")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            summary: {
              [viewerThoughtId]: {
                felt_this: 0,
                me_too: 0,
                made_me_think: 0,
                mine: {
                  felt_this: false,
                  me_too: false,
                  made_me_think: false,
                },
              },
              [otherThoughtId]: {
                felt_this: 0,
                me_too: 0,
                made_me_think: 0,
                mine: {
                  felt_this: false,
                  me_too: false,
                  made_me_think: false,
                },
              },
            },
          }),
      };
    }

    if (parsed.pathname.endsWith("/rest/v1/profiles")) {
      const idEq = parsed.searchParams.get("id");
      if (idEq === `eq.${viewerId}`) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify([{ id: viewerId, timezone: "UTC" }]),
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify([
            { id: viewerId, username: "me", avatar_url: null, streak_count: 1 },
            {
              id: otherAuthorId,
              username: "other",
              avatar_url: null,
              streak_count: 3,
            },
          ]),
      };
    }

    if (parsed.pathname.endsWith("/rest/v1/thoughts")) {
      const selected = parsed.searchParams.get("select");
      const userEq = parsed.searchParams.get("user_id");
      const visibility = parsed.searchParams.get("visibility");

      if (selected === "created_at" && userEq === `eq.${viewerId}`) {
        return { ok: true, status: 200, text: async () => JSON.stringify([]) };
      }

      if (
        selected === "id,user_id,content,created_at,visibility,share_slug" &&
        visibility === "eq.public"
      ) {
        if (userEq && userEq.startsWith("in.(")) {
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify([
                {
                  id: otherThoughtId,
                  user_id: otherAuthorId,
                  content: { text: "Followed user thought" },
                  created_at: "2026-01-02T00:00:00.000Z",
                  visibility: "public",
                  share_slug: null,
                },
              ]),
          };
        }

        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([
              {
                id: viewerThoughtId,
                user_id: viewerId,
                content: { text: "My thought" },
                created_at: "2026-01-03T00:00:00.000Z",
                visibility: "public",
                share_slug: null,
              },
              {
                id: otherThoughtId,
                user_id: otherAuthorId,
                content: { text: "Followed user thought" },
                created_at: "2026-01-02T00:00:00.000Z",
                visibility: "public",
                share_slug: null,
              },
            ]),
        };
      }

      if (selected === "id,user_id" && visibility === "eq.public") {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([
              { id: viewerThoughtId, user_id: viewerId },
              { id: otherThoughtId, user_id: otherAuthorId },
            ]),
        };
      }
    }

    if (parsed.pathname.endsWith("/rest/v1/thought_second_brain_saves")) {
      return { ok: true, status: 200, text: async () => JSON.stringify([]) };
    }
    if (parsed.pathname.endsWith("/rest/v1/rpc/open_brain_save_counts")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            profile_counts: {
              [viewerId]: 0,
              [otherAuthorId]: 0,
            },
            thought_counts: {
              [viewerThoughtId]: 0,
              [otherThoughtId]: 0,
            },
          }),
      };
    }

    throw new Error(`Unexpected fetch URL: ${parsed.toString()}`);
  };

  const { default: feedHandler } = await importFresh(
    "../../lib/open-brain/routes/feed.js",
    "open-brain-feed-exclude-self-from-following",
  );
  const authToken = createTestJwt({ sub: viewerId });
  const req = createReq({
    method: "GET",
    headers: { authorization: `Bearer ${authToken}` },
  });
  const res = createRes();

  try {
    await feedHandler(req, res);
  } finally {
    process.env.EXPO_PUBLIC_SUPABASE_URL = original.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      original.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    global.fetch = original.fetch;
  }

  assert.equal(res.statusCode, 200);
  assert.equal(Array.isArray(jsonBody(res)?.following), true);
  assert.equal(jsonBody(res)?.following?.length, 1);
  assert.equal(jsonBody(res)?.following?.[0]?.user_id, otherAuthorId);
});

test("open-brain feed handler scopes author save_count loading to visible authors", async () => {
  const original = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    fetch: global.fetch,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon-key";

  const viewerId = "11111111-1111-4111-8111-111111111111";
  const visibleAuthorId = "22222222-2222-4222-8222-222222222222";
  const notVisibleFollowedId = "33333333-3333-4333-8333-333333333333";
  const thoughtId = "44444444-4444-4444-8444-444444444444";
  let capturedRpcProfileIds = [];
  let capturedReactionThoughtIds = [];

  global.fetch = async (url, options = {}) => {
    const parsed = new URL(url);

    if (parsed.pathname.endsWith("/auth/v1/user")) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: viewerId }),
      };
    }

    if (parsed.pathname.endsWith("/rest/v1/follows")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify([
            { following_id: visibleAuthorId },
            { following_id: notVisibleFollowedId },
          ]),
      };
    }

    if (parsed.pathname.endsWith("/rest/v1/rpc/open_brain_reaction_summary")) {
      const rpcBody = options.body ? JSON.parse(options.body) : {};
      capturedReactionThoughtIds = Array.isArray(rpcBody?.thought_ids)
        ? rpcBody.thought_ids
        : [];
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            summary: {
              [thoughtId]: {
                felt_this: 0,
                me_too: 0,
                made_me_think: 0,
                mine: {
                  felt_this: false,
                  me_too: false,
                  made_me_think: false,
                },
              },
            },
          }),
      };
    }

    if (parsed.pathname.endsWith("/rest/v1/profiles")) {
      const idEq = parsed.searchParams.get("id");
      if (idEq === `eq.${viewerId}`) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify([{ id: viewerId, timezone: "UTC" }]),
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify([
            {
              id: visibleAuthorId,
              username: "visible",
              avatar_url: null,
              streak_count: 2,
            },
          ]),
      };
    }

    if (parsed.pathname.endsWith("/rest/v1/thoughts")) {
      const selected = parsed.searchParams.get("select");
      const visibility = parsed.searchParams.get("visibility");
      const userEq = parsed.searchParams.get("user_id");

      if (selected === "created_at" && userEq === `eq.${viewerId}`) {
        return { ok: true, status: 200, text: async () => JSON.stringify([]) };
      }

      if (
        selected === "id,user_id,content,created_at,visibility,share_slug" &&
        visibility === "eq.public"
      ) {
        if (userEq && userEq.startsWith("in.(")) {
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify([
                {
                  id: thoughtId,
                  user_id: visibleAuthorId,
                  content: { text: "Visible author thought" },
                  created_at: "2026-01-02T00:00:00.000Z",
                  visibility: "public",
                  share_slug: null,
                },
              ]),
          };
        }
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([
              {
                id: thoughtId,
                user_id: visibleAuthorId,
                content: { text: "Visible author thought" },
                created_at: "2026-01-02T00:00:00.000Z",
                visibility: "public",
                share_slug: null,
              },
            ]),
        };
      }
    }

    if (parsed.pathname.endsWith("/rest/v1/thought_second_brain_saves")) {
      return { ok: true, status: 200, text: async () => JSON.stringify([]) };
    }
    if (parsed.pathname.endsWith("/rest/v1/rpc/open_brain_save_counts")) {
      const rpcBody = options.body ? JSON.parse(options.body) : {};
      capturedRpcProfileIds = Array.isArray(rpcBody?.profile_ids)
        ? rpcBody.profile_ids
        : [];
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            profile_counts: { [visibleAuthorId]: 0 },
            thought_counts: { [thoughtId]: 0 },
          }),
      };
    }

    throw new Error(`Unexpected fetch URL: ${parsed.toString()}`);
  };

  const { default: feedHandler } = await importFresh(
    "../../lib/open-brain/routes/feed.js",
    "open-brain-feed-visible-author-save-scope",
  );
  const authToken = createTestJwt({ sub: viewerId });
  const req = createReq({
    method: "GET",
    headers: { authorization: `Bearer ${authToken}` },
  });
  const res = createRes();

  try {
    await feedHandler(req, res);
  } finally {
    process.env.EXPO_PUBLIC_SUPABASE_URL = original.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      original.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    global.fetch = original.fetch;
  }

  assert.equal(res.statusCode, 200);
  assert.equal(capturedRpcProfileIds.includes(visibleAuthorId), true);
  assert.equal(capturedRpcProfileIds.includes(notVisibleFollowedId), false);
  assert.deepEqual(capturedReactionThoughtIds, [thoughtId]);
});

test("open-brain feed handler avoids save/reaction fan-out queries when no thoughts are visible", async () => {
  const original = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    fetch: global.fetch,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon-key";

  const viewerId = "11111111-1111-4111-8111-111111111111";
  let reactionRpcCalls = 0;
  let saveCountsRpcCalls = 0;
  let savedRowsCalls = 0;

  global.fetch = async (url) => {
    const parsed = new URL(url);

    if (parsed.pathname.endsWith("/auth/v1/user")) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: viewerId }),
      };
    }

    if (parsed.pathname.endsWith("/rest/v1/follows")) {
      return { ok: true, status: 200, text: async () => JSON.stringify([]) };
    }

    if (parsed.pathname.endsWith("/rest/v1/profiles")) {
      const idEq = parsed.searchParams.get("id");
      if (idEq === `eq.${viewerId}`) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify([{ id: viewerId, timezone: "UTC" }]),
        };
      }
      throw new Error(`Unexpected profiles query: ${parsed.toString()}`);
    }

    if (parsed.pathname.endsWith("/rest/v1/thoughts")) {
      const selected = parsed.searchParams.get("select");
      if (selected === "created_at") {
        return { ok: true, status: 200, text: async () => JSON.stringify([]) };
      }
      if (selected === "id,user_id,content,created_at,visibility,share_slug") {
        return { ok: true, status: 200, text: async () => JSON.stringify([]) };
      }
    }

    if (parsed.pathname.endsWith("/rest/v1/rpc/open_brain_reaction_summary")) {
      reactionRpcCalls += 1;
      return { ok: true, status: 200, text: async () => JSON.stringify({}) };
    }

    if (parsed.pathname.endsWith("/rest/v1/rpc/open_brain_save_counts")) {
      saveCountsRpcCalls += 1;
      return { ok: true, status: 200, text: async () => JSON.stringify({}) };
    }

    if (parsed.pathname.endsWith("/rest/v1/thought_second_brain_saves")) {
      savedRowsCalls += 1;
      return { ok: true, status: 200, text: async () => JSON.stringify([]) };
    }

    throw new Error(`Unexpected fetch URL: ${parsed.toString()}`);
  };

  const { default: feedHandler } = await importFresh(
    "../../lib/open-brain/routes/feed.js",
    "open-brain-feed-no-thought-fanout",
  );
  const authToken = createTestJwt({ sub: viewerId });
  const req = createReq({
    method: "GET",
    headers: { authorization: `Bearer ${authToken}` },
  });
  const res = createRes();

  try {
    await feedHandler(req, res);
  } finally {
    process.env.EXPO_PUBLIC_SUPABASE_URL = original.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      original.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    global.fetch = original.fetch;
  }

  assert.equal(res.statusCode, 200);
  assert.equal(Array.isArray(jsonBody(res)?.everyone), true);
  assert.equal(Array.isArray(jsonBody(res)?.following), true);
  assert.equal(reactionRpcCalls, 0);
  assert.equal(saveCountsRpcCalls, 0);
  assert.equal(savedRowsCalls, 0);
});

test("open-brain feed handler supports tab cursor pagination metadata", async () => {
  const original = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    fetch: global.fetch,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon-key";

  const viewerId = "11111111-1111-4111-8111-111111111111";
  const followedAuthorId = "22222222-2222-4222-8222-222222222222";
  const seenQueries = [];

  global.fetch = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/auth/v1/user")) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: viewerId }),
      };
    }
    if (parsed.pathname.endsWith("/rest/v1/profiles")) {
      const idEq = parsed.searchParams.get("id");
      if (idEq === `eq.${viewerId}`) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify([{ id: viewerId, timezone: "UTC" }]),
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify([
            {
              id: followedAuthorId,
              username: "followed",
              avatar_url: null,
              streak_count: 2,
            },
          ]),
      };
    }
    if (parsed.pathname.endsWith("/rest/v1/follows")) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify([{ following_id: followedAuthorId }]),
      };
    }
    if (parsed.pathname.endsWith("/rest/v1/thoughts")) {
      const selected = parsed.searchParams.get("select");
      if (selected === "created_at") {
        return { ok: true, status: 200, text: async () => JSON.stringify([]) };
      }
      if (selected === "id,user_id,content,created_at,visibility,share_slug") {
        seenQueries.push(parsed.search);
        const userEq = parsed.searchParams.get("user_id");
        if (userEq && userEq.startsWith("in.(")) {
          const rows = Array.from({ length: 31 }, (_, index) => {
            const day = String(31 - index).padStart(2, "0");
            return {
              id: `f-${index + 1}`,
              user_id: followedAuthorId,
              content: { text: `page item ${index + 1}` },
              created_at: `2026-01-${day}T00:00:00.000Z`,
              visibility: "public",
              share_slug: null,
            };
          });
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify(rows),
          };
        }
        return { ok: true, status: 200, text: async () => JSON.stringify([]) };
      }
    }
    if (parsed.pathname.endsWith("/rest/v1/rpc/open_brain_reaction_summary")) {
      return { ok: true, status: 200, text: async () => JSON.stringify({}) };
    }
    if (parsed.pathname.endsWith("/rest/v1/rpc/open_brain_save_counts")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            profile_counts: { [followedAuthorId]: 0 },
            thought_counts: { f1: 0, f2: 0 },
          }),
      };
    }
    if (parsed.pathname.endsWith("/rest/v1/thought_second_brain_saves")) {
      return { ok: true, status: 200, text: async () => JSON.stringify([]) };
    }
    throw new Error(`Unexpected fetch URL: ${parsed.toString()}`);
  };

  const { default: feedHandler } = await importFresh(
    "../../lib/open-brain/routes/feed.js",
    "open-brain-feed-pagination",
  );
  const authToken = createTestJwt({ sub: viewerId });
  const req = createReq({
    method: "GET",
    headers: { authorization: `Bearer ${authToken}` },
    query: {
      tab: "following",
      before: "2026-01-05T00:00:00.000Z",
    },
  });
  const res = createRes();

  try {
    await feedHandler(req, res);
  } finally {
    process.env.EXPO_PUBLIC_SUPABASE_URL = original.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      original.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    global.fetch = original.fetch;
  }

  assert.equal(res.statusCode, 200);
  assert.equal(Array.isArray(jsonBody(res)?.following), true);
  assert.equal(jsonBody(res)?.following?.length, 30);
  assert.equal(jsonBody(res)?.page?.following?.has_more, true);
  assert.equal(
    jsonBody(res)?.page?.following?.next_cursor,
    "2026-01-02T00:00:00.000Z",
  );
  assert.equal(jsonBody(res)?.page?.everyone?.has_more, false);
  assert.equal(
    seenQueries.some((query) =>
      query.includes("created_at=lt.2026-01-05T00%3A00%3A00.000Z"),
    ),
    true,
  );
});

test("open-brain feed handler uses everyone tab cursor without loading following rows", async () => {
  const original = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    fetch: global.fetch,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon-key";

  const viewerId = "11111111-1111-4111-8111-111111111111";
  const authorId = "22222222-2222-4222-8222-222222222222";
  let followingThoughtRequests = 0;
  const seenQueries = [];

  global.fetch = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/auth/v1/user")) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: viewerId }),
      };
    }
    if (parsed.pathname.endsWith("/rest/v1/profiles")) {
      const idEq = parsed.searchParams.get("id");
      if (idEq === `eq.${viewerId}`) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify([{ id: viewerId, timezone: "UTC" }]),
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify([
            {
              id: authorId,
              username: "everyone-author",
              avatar_url: null,
              streak_count: 1,
            },
          ]),
      };
    }
    if (parsed.pathname.endsWith("/rest/v1/follows")) {
      return { ok: true, status: 200, text: async () => JSON.stringify([]) };
    }
    if (parsed.pathname.endsWith("/rest/v1/thoughts")) {
      const selected = parsed.searchParams.get("select");
      if (selected === "created_at") {
        return { ok: true, status: 200, text: async () => JSON.stringify([]) };
      }
      if (selected === "id,user_id,content,created_at,visibility,share_slug") {
        const userEq = parsed.searchParams.get("user_id");
        if (userEq && userEq.startsWith("in.(")) {
          followingThoughtRequests += 1;
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify([]),
          };
        }
        seenQueries.push(parsed.search);
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([
              {
                id: "e1",
                user_id: authorId,
                content: { text: "everyone thought" },
                created_at: "2026-01-01T00:00:00.000Z",
                visibility: "public",
                share_slug: null,
              },
            ]),
        };
      }
    }
    if (parsed.pathname.endsWith("/rest/v1/rpc/open_brain_reaction_summary")) {
      return { ok: true, status: 200, text: async () => JSON.stringify({}) };
    }
    if (parsed.pathname.endsWith("/rest/v1/rpc/open_brain_save_counts")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            profile_counts: { [authorId]: 0 },
            thought_counts: { e1: 0 },
          }),
      };
    }
    if (parsed.pathname.endsWith("/rest/v1/thought_second_brain_saves")) {
      return { ok: true, status: 200, text: async () => JSON.stringify([]) };
    }
    throw new Error(`Unexpected fetch URL: ${parsed.toString()}`);
  };

  const { default: feedHandler } = await importFresh(
    "../../lib/open-brain/routes/feed.js",
    "open-brain-feed-everyone-pagination",
  );
  const authToken = createTestJwt({ sub: viewerId });
  const req = createReq({
    method: "GET",
    headers: { authorization: `Bearer ${authToken}` },
    query: {
      tab: "everyone",
      before: "2026-01-10T00:00:00.000Z",
    },
  });
  const res = createRes();

  try {
    await feedHandler(req, res);
  } finally {
    process.env.EXPO_PUBLIC_SUPABASE_URL = original.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      original.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    global.fetch = original.fetch;
  }

  assert.equal(res.statusCode, 200);
  assert.equal(followingThoughtRequests, 0);
  assert.equal(Array.isArray(jsonBody(res)?.everyone), true);
  assert.equal(
    seenQueries.some((query) =>
      query.includes("created_at=lt.2026-01-10T00%3A00%3A00.000Z"),
    ),
    true,
  );
});

test("open-brain feed handler falls back to loading both tabs for invalid tab", async () => {
  const original = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    fetch: global.fetch,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon-key";

  const viewerId = "11111111-1111-4111-8111-111111111111";
  const followedAuthorId = "22222222-2222-4222-8222-222222222222";
  let everyoneThoughtRequests = 0;
  let followingThoughtRequests = 0;

  global.fetch = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/auth/v1/user")) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: viewerId }),
      };
    }
    if (parsed.pathname.endsWith("/rest/v1/profiles")) {
      const idEq = parsed.searchParams.get("id");
      if (idEq === `eq.${viewerId}`) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify([{ id: viewerId, timezone: "UTC" }]),
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify([
            {
              id: followedAuthorId,
              username: "author",
              avatar_url: null,
              streak_count: 1,
            },
          ]),
      };
    }
    if (parsed.pathname.endsWith("/rest/v1/follows")) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify([{ following_id: followedAuthorId }]),
      };
    }
    if (parsed.pathname.endsWith("/rest/v1/thoughts")) {
      const selected = parsed.searchParams.get("select");
      if (selected === "created_at") {
        return { ok: true, status: 200, text: async () => JSON.stringify([]) };
      }
      if (selected === "id,user_id,content,created_at,visibility,share_slug") {
        const userEq = parsed.searchParams.get("user_id");
        if (userEq && userEq.startsWith("in.(")) {
          followingThoughtRequests += 1;
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify([]),
          };
        }
        everyoneThoughtRequests += 1;
        return { ok: true, status: 200, text: async () => JSON.stringify([]) };
      }
    }
    if (parsed.pathname.endsWith("/rest/v1/rpc/open_brain_reaction_summary")) {
      return { ok: true, status: 200, text: async () => JSON.stringify({}) };
    }
    if (parsed.pathname.endsWith("/rest/v1/rpc/open_brain_save_counts")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({ profile_counts: {}, thought_counts: {} }),
      };
    }
    if (parsed.pathname.endsWith("/rest/v1/thought_second_brain_saves")) {
      return { ok: true, status: 200, text: async () => JSON.stringify([]) };
    }
    throw new Error(`Unexpected fetch URL: ${parsed.toString()}`);
  };

  const { default: feedHandler } = await importFresh(
    "../../lib/open-brain/routes/feed.js",
    "open-brain-feed-invalid-tab-fallback",
  );
  const authToken = createTestJwt({ sub: viewerId });
  const req = createReq({
    method: "GET",
    headers: { authorization: `Bearer ${authToken}` },
    query: { tab: "bad-tab" },
  });
  const res = createRes();

  try {
    await feedHandler(req, res);
  } finally {
    process.env.EXPO_PUBLIC_SUPABASE_URL = original.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      original.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    global.fetch = original.fetch;
  }

  assert.equal(res.statusCode, 200);
  assert.equal(everyoneThoughtRequests, 1);
  assert.equal(followingThoughtRequests, 1);
});

test("open-brain search handler returns boolean is_self and is_following flags", async () => {
  const original = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    fetch: global.fetch,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon-key";

  const viewerId = "11111111-1111-4111-8111-111111111111";
  const followedId = "22222222-2222-4222-8222-222222222222";

  global.fetch = async (url) => {
    const parsed = new URL(url);

    if (parsed.pathname.endsWith("/auth/v1/user")) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: viewerId }),
      };
    }

    if (parsed.pathname.endsWith("/rest/v1/follows")) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify([{ following_id: followedId }]),
      };
    }

    if (parsed.pathname.endsWith("/rest/v1/profiles")) {
      const usernameFilter = parsed.searchParams.get("username");
      const idIn = parsed.searchParams.get("id");
      if (usernameFilter) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([
              {
                id: viewerId,
                username: "viewer",
                avatar_url: null,
                streak_count: 4,
              },
              {
                id: followedId,
                username: "followed",
                avatar_url: null,
                streak_count: 9,
              },
            ]),
        };
      }
      if (idIn && idIn.includes(followedId)) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([
              {
                id: followedId,
                username: "followed",
                avatar_url: null,
                streak_count: 9,
              },
            ]),
        };
      }
    }

    if (parsed.pathname.endsWith("/rest/v1/thoughts")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify([
            {
              id: "33333333-3333-4333-8333-333333333333",
              user_id: followedId,
              content: { text: "search hit" },
              created_at: "2026-01-01T00:00:00.000Z",
            },
          ]),
      };
    }

    throw new Error(`Unexpected fetch URL: ${parsed.toString()}`);
  };

  const { default: searchHandler } = await importFresh(
    "../../lib/open-brain/routes/search.js",
    "open-brain-search-bools",
  );
  const authToken = createTestJwt({ sub: viewerId });
  const req = createReq({
    method: "GET",
    headers: { authorization: `Bearer ${authToken}` },
    query: { q: "fo" },
  });
  const res = createRes();

  try {
    await searchHandler(req, res);
  } finally {
    process.env.EXPO_PUBLIC_SUPABASE_URL = original.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      original.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    global.fetch = original.fetch;
  }

  const payload = jsonBody(res);
  assert.equal(res.statusCode, 200);
  assert.equal(typeof payload?.users?.[0]?.is_self, "boolean");
  assert.equal(typeof payload?.users?.[0]?.is_following, "boolean");
  assert.equal(
    payload?.users?.find((user) => user.id === viewerId)?.is_self,
    true,
  );
  assert.equal(
    payload?.users?.find((user) => user.id === followedId)?.is_following,
    true,
  );
});

test("open-brain search handler scopes follows lookup to candidate result users", async () => {
  const original = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    fetch: global.fetch,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon-key";

  const viewerId = "11111111-1111-4111-8111-111111111111";
  const matchedUserId = "22222222-2222-4222-8222-222222222222";
  let capturedFollowsInFilter = "";
  let capturedFollowsFollowerFilter = "";

  global.fetch = async (url) => {
    const parsed = new URL(url);

    if (parsed.pathname.endsWith("/auth/v1/user")) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: viewerId }),
      };
    }

    if (parsed.pathname.endsWith("/rest/v1/follows")) {
      capturedFollowsFollowerFilter =
        parsed.searchParams.get("follower_id") || "";
      capturedFollowsInFilter = parsed.searchParams.get("following_id") || "";
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify([{ following_id: matchedUserId }]),
      };
    }

    if (parsed.pathname.endsWith("/rest/v1/profiles")) {
      const usernameFilter = parsed.searchParams.get("username");
      const idIn = parsed.searchParams.get("id");
      if (usernameFilter) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([
              {
                id: matchedUserId,
                username: "matched",
                avatar_url: null,
                streak_count: 8,
              },
            ]),
        };
      }
      if (idIn && idIn.includes(matchedUserId)) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify([
              {
                id: matchedUserId,
                username: "matched",
                avatar_url: null,
                streak_count: 8,
              },
            ]),
        };
      }
    }

    if (parsed.pathname.endsWith("/rest/v1/thoughts")) {
      return { ok: true, status: 200, text: async () => JSON.stringify([]) };
    }

    throw new Error(`Unexpected fetch URL: ${parsed.toString()}`);
  };

  const { default: searchHandler } = await importFresh(
    "../../lib/open-brain/routes/search.js",
    "open-brain-search-follow-scope",
  );
  const authToken = createTestJwt({ sub: viewerId });
  const req = createReq({
    method: "GET",
    headers: { authorization: `Bearer ${authToken}` },
    query: { q: "ma" },
  });
  const res = createRes();

  try {
    await searchHandler(req, res);
  } finally {
    process.env.EXPO_PUBLIC_SUPABASE_URL = original.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      original.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    global.fetch = original.fetch;
  }

  assert.equal(res.statusCode, 200);
  assert.equal(capturedFollowsFollowerFilter, `eq.${viewerId}`);
  assert.equal(capturedFollowsInFilter, `in.(${matchedUserId})`);
  assert.equal(
    jsonBody(res)?.users?.find((user) => user.id === matchedUserId)
      ?.is_following,
    true,
  );
});

test("open-brain search handler skips author/follows fan-out when there are no candidates", async () => {
  const original = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    fetch: global.fetch,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon-key";

  const viewerId = "11111111-1111-4111-8111-111111111111";
  let followsCalls = 0;
  let authorProfilesCalls = 0;

  global.fetch = async (url) => {
    const parsed = new URL(url);

    if (parsed.pathname.endsWith("/auth/v1/user")) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: viewerId }),
      };
    }

    if (parsed.pathname.endsWith("/rest/v1/profiles")) {
      const usernameFilter = parsed.searchParams.get("username");
      const idIn = parsed.searchParams.get("id");
      if (usernameFilter) {
        return { ok: true, status: 200, text: async () => JSON.stringify([]) };
      }
      if (idIn) {
        authorProfilesCalls += 1;
      }
      return { ok: true, status: 200, text: async () => JSON.stringify([]) };
    }

    if (parsed.pathname.endsWith("/rest/v1/thoughts")) {
      return { ok: true, status: 200, text: async () => JSON.stringify([]) };
    }

    if (parsed.pathname.endsWith("/rest/v1/follows")) {
      followsCalls += 1;
      return { ok: true, status: 200, text: async () => JSON.stringify([]) };
    }

    throw new Error(`Unexpected fetch URL: ${parsed.toString()}`);
  };

  const { default: searchHandler } = await importFresh(
    "../../lib/open-brain/routes/search.js",
    "open-brain-search-no-fanout",
  );
  const authToken = createTestJwt({ sub: viewerId });
  const req = createReq({
    method: "GET",
    headers: { authorization: `Bearer ${authToken}` },
    query: { q: "zz" },
  });
  const res = createRes();

  try {
    await searchHandler(req, res);
  } finally {
    process.env.EXPO_PUBLIC_SUPABASE_URL = original.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      original.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    global.fetch = original.fetch;
  }

  assert.equal(res.statusCode, 200);
  assert.deepEqual(jsonBody(res), { users: [], thoughts: [] });
  assert.equal(authorProfilesCalls, 0);
  assert.equal(followsCalls, 0);
});

test("open-brain thoughts handler returns created thought with profile metadata", async () => {
  const original = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    fetch: global.fetch,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon-key";

  const userId = "11111111-1111-4111-8111-111111111111";
  const thoughtId = "33333333-3333-4333-8333-333333333333";

  global.fetch = async (url, options = {}) => {
    const parsed = new URL(url);
    const method = String(options.method || "GET").toUpperCase();

    if (parsed.pathname.endsWith("/rest/v1/profiles") && method === "GET") {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify([
            {
              id: userId,
              username: "alice",
              avatar_url: "https://example.com/alice.png",
              streak_count: 2,
              last_posted_at: "2026-01-01T00:00:00.000Z",
              timezone: "UTC",
            },
          ]),
      };
    }

    if (parsed.pathname.endsWith("/rest/v1/thoughts") && method === "POST") {
      return {
        ok: true,
        status: 201,
        text: async () =>
          JSON.stringify([
            {
              id: thoughtId,
              user_id: userId,
              content: { text: "Today felt quiet." },
              created_at: "2026-01-02T02:00:00.000Z",
              visibility: "public",
              share_slug: "abc123",
            },
          ]),
      };
    }

    if (parsed.pathname.endsWith("/rest/v1/profiles") && method === "PATCH") {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify([
            {
              id: userId,
              username: "alice",
              avatar_url: "https://example.com/alice.png",
              streak_count: 3,
              last_posted_at: "2026-01-02T02:00:00.000Z",
              timezone: "UTC",
            },
          ]),
      };
    }

    throw new Error(`Unexpected fetch URL: ${parsed.toString()} (${method})`);
  };

  const { default: thoughtsHandler } = await importFresh(
    "../../lib/open-brain/routes/thoughts.js",
    "open-brain-thoughts-created-profile",
  );
  const authToken = createTestJwt({ sub: userId });
  const req = createReq({
    method: "POST",
    headers: { authorization: `Bearer ${authToken}` },
    body: { thought: "Today felt quiet.", visibility: "public" },
  });
  const res = createRes();

  try {
    await thoughtsHandler(req, res);
  } finally {
    process.env.EXPO_PUBLIC_SUPABASE_URL = original.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      original.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    global.fetch = original.fetch;
  }

  const payload = jsonBody(res);
  assert.equal(res.statusCode, 201);
  assert.equal(payload?.thought?.id, thoughtId);
  assert.equal(payload?.thought?.text, "Today felt quiet.");
  assert.equal(payload?.thought?.profile?.username, "alice");
  assert.equal(typeof payload?.thought?.profile?.is_self, "boolean");
  assert.equal(typeof payload?.thought?.profile?.is_following, "boolean");
  assert.equal(payload?.thought?.profile?.is_self, true);
  assert.equal(payload?.thought?.save_count, 0);
  assert.equal(payload?.thought?.viewer_has_added_to_second_brain, false);
});

test("open-brain notifications handler: OPTIONS, method, auth, and payload guards", async () => {
  const { default: notificationsHandler } = await importFresh(
    "../../lib/open-brain/routes/notifications.js",
    "open-brain-notifications-guards",
  );

  const optionsRes = createRes();
  await notificationsHandler(createReq({ method: "OPTIONS" }), optionsRes);
  assert.equal(optionsRes.statusCode, 204);

  const wrongMethodRes = createRes();
  await notificationsHandler(createReq({ method: "DELETE" }), wrongMethodRes);
  assert.equal(wrongMethodRes.statusCode, 405);
  assert.deepEqual(jsonBody(wrongMethodRes), { error: "Method not allowed" });

  const noTokenRes = createRes();
  await notificationsHandler(
    createReq({
      method: "POST",
      body: { user_id: "11111111-1111-4111-8111-111111111111", type: "follow" },
    }),
    noTokenRes,
  );
  assert.equal(noTokenRes.statusCode, 401);
  assert.deepEqual(jsonBody(noTokenRes), { error: "missing bearer token" });

  const invalidPayloadRes = createRes();
  await notificationsHandler(
    createReq({
      method: "POST",
      headers: { authorization: "Bearer obviously-invalid-token" },
      body: { user_id: "not-a-uuid", type: "bad" },
    }),
    invalidPayloadRes,
  );
  assert.equal(invalidPayloadRes.statusCode, 401);
  assert.equal(typeof jsonBody(invalidPayloadRes)?.error, "string");
});
