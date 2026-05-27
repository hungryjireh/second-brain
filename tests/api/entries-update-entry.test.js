import test from "node:test";
import assert from "node:assert/strict";

async function importFresh(path, tag) {
  return import(`${path}?t=${Date.now()}-${tag}`);
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return body === null ? "" : JSON.stringify(body);
    },
  };
}

test("updateEntry PATCH includes updated_at unix timestamp", async () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";

  let patchBody = null;

  global.fetch = async (input, options = {}) => {
    const method = options.method || "GET";
    const url = new URL(String(input));
    const path = url.pathname;
    const body = options.body ? JSON.parse(options.body) : undefined;

    if (path === "/rest/v1/entries" && method === "PATCH") {
      patchBody = body;
      return jsonResponse(200, [
        {
          id: 42,
          user_id: "11111111-1111-4111-8111-111111111111",
          category: "note",
          description: body?.description ?? null,
          raw_text: "updated text",
          title: "updated title",
          summary: "updated summary",
          updated_at: body?.updated_at ?? null,
        },
      ]);
    }

    if (path === "/rest/v1/entry_tags" && method === "GET") {
      return jsonResponse(200, []);
    }

    throw new Error(`Unhandled fetch: ${method} ${path}`);
  };

  try {
    const { updateEntry } = await importFresh(
      "../../lib/db.js",
      "update-entry-updated-at",
    );
    const before = Math.floor(Date.now() / 1000);
    const entry = await updateEntry(
      "11111111-1111-4111-8111-111111111111",
      42,
      {
        description: "updated description",
        raw_text: "updated text",
        title: "updated title",
        content: "updated content",
      },
      "token",
    );
    const after = Math.floor(Date.now() / 1000);

    assert.ok(patchBody);
    assert.equal(typeof patchBody.updated_at, "number");
    assert.equal(Number.isInteger(patchBody.updated_at), true);
    assert.equal(patchBody.updated_at >= before, true);
    assert.equal(patchBody.updated_at <= after, true);
    assert.equal(patchBody.content, "updated content");
    assert.equal(patchBody.description, "updated description");
    assert.equal(entry?.description, "updated description");
    assert.equal(entry?.updated_at, patchBody.updated_at);
  } finally {
    global.fetch = originalFetch;
    process.env.EXPO_PUBLIC_SUPABASE_URL = originalEnv.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      originalEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  }
});
