import test from "node:test";
import assert from "node:assert/strict";

async function importFresh(path, tag) {
  return import(`${path}?t=${Date.now()}-${tag}`);
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
  };
}

test("open-brain helpers: isUuid validates UUID values", async () => {
  const { isUuid } = await importFresh(
    "../../lib/open-brain/helpers.js",
    "is-uuid",
  );

  assert.equal(isUuid("123e4567-e89b-42d3-a456-426614174000"), true);
  assert.equal(isUuid("not-a-uuid"), false);
  assert.equal(isUuid("123e4567-e89b-42d3-c456-426614174000"), false);
});

test("open-brain helpers: json writes status, content-type, and serialized body", async () => {
  const { json } = await importFresh("../../lib/open-brain/helpers.js", "json");
  const res = createRes();

  json(res, 201, { ok: true, count: 2 });

  assert.equal(res.statusCode, 201);
  assert.equal(res.headers["content-type"], "application/json");
  assert.deepEqual(JSON.parse(res.body), { ok: true, count: 2 });
});

test("open-brain helpers: getEpochDayInTimezone returns consistent UTC epoch day by timezone date", async () => {
  const { getEpochDayInTimezone } = await importFresh(
    "../../lib/open-brain/helpers.js",
    "epoch-day",
  );
  const sourceDate = new Date("2026-01-01T00:30:00.000Z");

  const utcDay = getEpochDayInTimezone(sourceDate, "UTC");
  const laDay = getEpochDayInTimezone(sourceDate, "America/Los_Angeles");

  assert.equal(utcDay, 20454);
  assert.equal(laDay, 20453);
});

test("open-brain helpers: supabaseRequest builds query/body/headers and returns parsed data", async () => {
  const original = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    fetch: global.fetch,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon-key";

  let capturedUrl = null;
  let capturedInit = null;

  global.fetch = async (input, init = {}) => {
    capturedUrl = String(input);
    capturedInit = init;
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const { supabaseRequest } = await importFresh(
      "../../lib/open-brain/helpers.js",
      "supabase-success",
    );
    const data = await supabaseRequest("/rest/v1/thoughts", {
      method: "POST",
      query: { select: "id", limit: 1, skip: undefined },
      body: [{ text: "hello" }],
      authToken: "user-token",
      prefer: "return=representation",
    });

    assert.deepEqual(data, { ok: true });
    assert.equal(capturedInit.method, "POST");
    assert.equal(capturedInit.headers.apikey, "anon-key");
    assert.equal(capturedInit.headers.Authorization, "Bearer user-token");
    assert.equal(capturedInit.headers.Prefer, "return=representation");
    assert.equal(capturedInit.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(capturedInit.body), [{ text: "hello" }]);

    const url = new URL(capturedUrl);
    assert.equal(url.origin, "https://example.supabase.co");
    assert.equal(url.pathname, "/rest/v1/thoughts");
    assert.equal(url.searchParams.get("select"), "id");
    assert.equal(url.searchParams.get("limit"), "1");
    assert.equal(url.searchParams.has("skip"), false);
  } finally {
    process.env.EXPO_PUBLIC_SUPABASE_URL = original.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      original.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    global.fetch = original.fetch;
  }
});

test("open-brain helpers: supabaseRequest uses publishable key as auth fallback", async () => {
  const original = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    fetch: global.fetch,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon-key";

  let capturedInit = null;
  global.fetch = async (_input, init = {}) => {
    capturedInit = init;
    return new Response(JSON.stringify([{ id: 1 }]), { status: 200 });
  };

  try {
    const { supabaseRequest } = await importFresh(
      "../../lib/open-brain/helpers.js",
      "supabase-public-fallback",
    );
    await supabaseRequest("/rest/v1/profiles", { method: "GET" });
    assert.equal(capturedInit.headers.Authorization, "Bearer anon-key");
  } finally {
    process.env.EXPO_PUBLIC_SUPABASE_URL = original.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      original.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    global.fetch = original.fetch;
  }
});

test("open-brain helpers: supabaseRequest throws rich error for non-OK responses", async () => {
  const original = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    fetch: global.fetch,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon-key";

  global.fetch = async () =>
    new Response(JSON.stringify({ message: "permission denied" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });

  try {
    const { supabaseRequest } = await importFresh(
      "../../lib/open-brain/helpers.js",
      "supabase-error",
    );
    await assert.rejects(
      () =>
        supabaseRequest("/rest/v1/notifications", {
          method: "POST",
          authToken: "token",
        }),
      (err) =>
        err &&
        err.message === "permission denied" &&
        err.status === 403 &&
        err.data?.message === "permission denied",
    );
  } finally {
    process.env.EXPO_PUBLIC_SUPABASE_URL = original.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      original.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    global.fetch = original.fetch;
  }
});

test("open-brain helpers: supabaseRequest throws when env is missing", async () => {
  const original = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };

  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  try {
    const { supabaseRequest } = await importFresh(
      "../../lib/open-brain/helpers.js",
      "supabase-missing-env",
    );
    await assert.rejects(
      () => supabaseRequest("/rest/v1/thoughts"),
      /Missing Supabase env configuration/,
    );
  } finally {
    process.env.EXPO_PUBLIC_SUPABASE_URL = original.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      original.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  }
});

test("open-brain reaction summary loader calls RPC and normalizes response", async () => {
  const original = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    fetch: global.fetch,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon-key";

  const thoughtA = "11111111-1111-4111-8111-111111111111";
  const thoughtB = "22222222-2222-4222-8222-222222222222";
  const viewerId = "33333333-3333-4333-8333-333333333333";
  let capturedBody = null;

  global.fetch = async (_input, init = {}) => {
    capturedBody = init.body ? JSON.parse(init.body) : null;
    return new Response(
      JSON.stringify({
        summary: {
          [thoughtA]: {
            felt_this: 2,
            me_too: 1,
            made_me_think: 0,
            mine: {
              felt_this: true,
              me_too: false,
              made_me_think: false,
            },
          },
        },
      }),
      { status: 200 },
    );
  };

  try {
    const { loadOpenBrainReactionSummary } = await importFresh(
      "../../lib/open-brain/reaction-summary.js",
      "reaction-summary-loader",
    );
    const summary = await loadOpenBrainReactionSummary({
      token: "viewer-token",
      thoughtIds: [thoughtA, thoughtB],
      viewerId,
    });

    assert.deepEqual(capturedBody, {
      thought_ids: [thoughtA, thoughtB],
      viewer_id: viewerId,
    });
    assert.deepEqual(summary.get(thoughtA), {
      felt_this: 2,
      me_too: 1,
      made_me_think: 0,
      mine: {
        felt_this: true,
        me_too: false,
        made_me_think: false,
      },
    });
    assert.deepEqual(summary.get(thoughtB), {
      felt_this: 0,
      me_too: 0,
      made_me_think: 0,
      mine: {
        felt_this: false,
        me_too: false,
        made_me_think: false,
      },
    });
  } finally {
    process.env.EXPO_PUBLIC_SUPABASE_URL = original.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      original.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    global.fetch = original.fetch;
  }
});

test("open-brain reaction summary loader returns early when viewer or thought ids are missing", async () => {
  const originalFetch = global.fetch;
  let fetchCalled = false;
  global.fetch = async () => {
    fetchCalled = true;
    return new Response(JSON.stringify({ summary: {} }), { status: 200 });
  };

  try {
    const { loadOpenBrainReactionSummary } = await importFresh(
      "../../lib/open-brain/reaction-summary.js",
      "reaction-summary-loader-empty-input",
    );

    const noViewer = await loadOpenBrainReactionSummary({
      token: "token",
      thoughtIds: ["11111111-1111-4111-8111-111111111111"],
      viewerId: "",
    });
    const noThoughts = await loadOpenBrainReactionSummary({
      token: "token",
      thoughtIds: [],
      viewerId: "33333333-3333-4333-8333-333333333333",
    });

    assert.equal(noViewer.size, 0);
    assert.equal(noThoughts.size, 0);
    assert.equal(fetchCalled, false);
  } finally {
    global.fetch = originalFetch;
  }
});
