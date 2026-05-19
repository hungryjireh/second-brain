import test from "node:test";
import assert from "node:assert/strict";

async function importFresh(path, tag) {
  return import(`${path}?t=${Date.now()}-${tag}`);
}

test("telegram link key embeds provided auth token", async () => {
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
    );
    const { userId, authToken } = verifyTelegramLinkKey(linkKey);
    assert.equal(userId, "123e4567-e89b-42d3-a456-426614174000");
    assert.equal(authToken, "short-lived-login-token");
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
