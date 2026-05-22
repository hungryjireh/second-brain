import test from "node:test";
import assert from "node:assert/strict";

async function importFresh(path, tag) {
  return import(`${path}?t=${Date.now()}-${tag}`);
}

test("telegram link key embeds durable telegram session token and request auth token", async () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-secret";

  try {
    const { createTelegramLinkKey, verifyTelegramLinkKey } = await importFresh(
      "../../lib/auth.js",
      "telegram-session-token",
    );

    const linkKey = createTelegramLinkKey(
      "123e4567-e89b-42d3-a456-426614174000",
      "short-lived-login-token",
      "durable-refresh-token",
    );
    const { userId, authTokenToStore, requestAuthToken } =
      verifyTelegramLinkKey(linkKey);
    assert.equal(userId, "123e4567-e89b-42d3-a456-426614174000");
    assert.equal(requestAuthToken, "short-lived-login-token");
    assert.equal(typeof authTokenToStore, "string");
    assert.notEqual(authTokenToStore, "short-lived-login-token");
  } finally {
    process.env.JWT_SECRET = originalJwtSecret;
  }
});

test("telegram link key fallback stores bearer token when refresh token is missing", async () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-secret";

  try {
    const { createTelegramLinkKey, verifyTelegramLinkKey } = await importFresh(
      "../../lib/auth.js",
      "telegram-link-fallback-token",
    );

    const bearerToken = "short-lived-login-token";
    const linkKey = createTelegramLinkKey(
      "123e4567-e89b-42d3-a456-426614174000",
      bearerToken,
    );
    const { userId, authTokenToStore, requestAuthToken } =
      verifyTelegramLinkKey(linkKey);
    assert.equal(userId, "123e4567-e89b-42d3-a456-426614174000");
    assert.equal(authTokenToStore, bearerToken);
    assert.equal(requestAuthToken, bearerToken);
  } finally {
    process.env.JWT_SECRET = originalJwtSecret;
  }
});

test("telegram session token includes purpose/version/refresh token payload", async () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-secret";

  try {
    const {
      createTelegramSessionToken,
      verifyAuthJwt,
      TELEGRAM_SESSION_TOKEN_PURPOSE,
      TELEGRAM_SESSION_VERSION,
    } = await importFresh("../../lib/auth.js", "telegram-session-payload");

    const sessionToken = createTelegramSessionToken(
      "123e4567-e89b-42d3-a456-426614174000",
      "durable-refresh-token",
    );
    const payload = verifyAuthJwt(sessionToken);
    assert.equal(payload?.sub, "123e4567-e89b-42d3-a456-426614174000");
    assert.equal(payload?.purpose, TELEGRAM_SESSION_TOKEN_PURPOSE);
    assert.equal(payload?.v, TELEGRAM_SESSION_VERSION);
    assert.equal(payload?.srt, "durable-refresh-token");
  } finally {
    process.env.JWT_SECRET = originalJwtSecret;
  }
});

test("createTelegramSessionToken rejects missing refresh token", async () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-secret";

  try {
    const { createTelegramSessionToken } = await importFresh(
      "../../lib/auth.js",
      "telegram-session-missing-refresh",
    );

    assert.throws(
      () => createTelegramSessionToken("123e4567-e89b-42d3-a456-426614174000"),
      /Missing refresh token for Telegram session/,
    );
  } finally {
    process.env.JWT_SECRET = originalJwtSecret;
  }
});

test("refreshSupabaseSession exchanges refresh token for new session", async () => {
  const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const originalFetch = global.fetch;
  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon-key";

  try {
    global.fetch = async (url, options) => {
      assert.equal(
        String(url),
        "https://example.supabase.co/auth/v1/token?grant_type=refresh_token",
      );
      assert.equal(options.method, "POST");
      assert.equal(options.headers["Content-Type"], "application/json");
      assert.deepEqual(JSON.parse(options.body), {
        refresh_token: "refresh-token-123",
      });
      return {
        ok: true,
        text: async () =>
          JSON.stringify({
            access_token: "new-access-token",
            refresh_token: "next-refresh-token",
          }),
      };
    };

    const { refreshSupabaseSession } = await importFresh(
      "../../lib/auth.js",
      "refresh-supabase-session",
    );
    const session = await refreshSupabaseSession({
      refreshToken: "refresh-token-123",
    });
    assert.equal(session.access_token, "new-access-token");
    assert.equal(session.refresh_token, "next-refresh-token");
  } finally {
    global.fetch = originalFetch;
    process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
  }
});
