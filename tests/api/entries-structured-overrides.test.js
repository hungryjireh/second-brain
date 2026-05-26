import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";

function createReq({
  method = "POST",
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

function jsonResponse(status, body) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("POST /api/entries honors structured brainstorm field overrides", async () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
  process.env.GROQ_API_KEY = "test-groq-key";

  const userId = "11111111-1111-4111-8111-111111111111";
  const description =
    "# Conversation Summary\nOne sentence overview of creating a short-form video content.";
  const transcript =
    "User: Brainstorm a video concept.\n\nAssistant: Start with a simple walk-through.";
  const content =
    "Created a concept for a short-form video content.\nDecided on a lighthearted tone.";
  let groqCalls = 0;
  let createdEntryBody = null;

  global.fetch = async (input, options = {}) => {
    const url = new URL(String(input));
    const method = options.method || "GET";
    const body = options.body ? JSON.parse(options.body) : undefined;

    if (url.hostname === "api.groq.com") {
      groqCalls += 1;
      return jsonResponse(200, {
        choices: [
          {
            message: {
              content: JSON.stringify({
                category: "note",
                title: "Classifier Title",
                summary: "Classifier summary.",
                content: "Classifier content.",
                remind_at: null,
                tags: ["general"],
              }),
            },
          },
        ],
      });
    }

    if (url.pathname === "/rest/v1/settings" && method === "GET") {
      return jsonResponse(200, []);
    }

    if (url.pathname === "/rest/v1/tags" && method === "GET") {
      return jsonResponse(200, []);
    }

    if (url.pathname === "/rest/v1/entries" && method === "POST") {
      const row = body?.[0] ?? {};
      createdEntryBody = row;
      return jsonResponse(201, [{ id: 515, ...row }]);
    }

    if (url.pathname === "/rest/v1/entry_tags" && method === "DELETE") {
      return jsonResponse(204, null);
    }

    if (url.pathname === "/rest/v1/entry_tags" && method === "GET") {
      return jsonResponse(200, []);
    }

    if (url.pathname === "/rest/v1/tags" && method === "DELETE") {
      return jsonResponse(204, null);
    }

    throw new Error(`Unexpected fetch call: ${method} ${url.pathname}`);
  };

  try {
    const { default: handler } = await importFresh(
      "../../api/entries.js",
      "post-structured-overrides",
    );
    const token = createTestJwt({ sub: userId });
    const res = createRes();
    await handler(
      createReq({
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: {
          description,
          raw_text: transcript,
          title: "Short-Form Video Content Creation",
          summary:
            "Developed a concept for a short-form video content featuring a team member's experience.",
          content,
          category: "note",
          tags: [],
        },
      }),
      res,
    );

    assert.equal(res.statusCode, 201);
    assert.equal(createdEntryBody?.raw_text, transcript);
    assert.equal(createdEntryBody?.title, "Short-Form Video Content Creation");
    assert.equal(
      createdEntryBody?.summary,
      "Developed a concept for a short-form video content featuring a team member's experience.",
    );
    assert.equal(createdEntryBody?.content, content);
    assert.equal(jsonBody(res)?.content, content);
    assert.equal(groqCalls, 0);
  } finally {
    global.fetch = originalFetch;
    process.env.EXPO_PUBLIC_SUPABASE_URL = originalEnv.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      originalEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.GROQ_API_KEY = originalEnv.GROQ_API_KEY;
  }
});

test("POST /api/entries uses structured title and summary without content", async () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";

  const userId = "11111111-1111-4111-8111-111111111111";
  const description =
    "# Conversation Summary\nA user brainstormed ideas for a short-form video.";
  const summary =
    "Developing a concept for a short-form 'day in the life' video for a personal knowledge app.";
  let createdEntryBody = null;

  global.fetch = async (input, options = {}) => {
    const url = new URL(String(input));
    const method = options.method || "GET";
    const body = options.body ? JSON.parse(options.body) : undefined;

    if (url.hostname === "api.groq.com") {
      throw new Error("Classifier should not run for structured overrides");
    }

    if (url.pathname === "/rest/v1/entries" && method === "POST") {
      const row = body?.[0] ?? {};
      createdEntryBody = row;
      return jsonResponse(201, [{ id: 616, ...row }]);
    }

    if (url.pathname === "/rest/v1/entry_tags" && method === "DELETE") {
      return jsonResponse(204, null);
    }

    if (url.pathname === "/rest/v1/entry_tags" && method === "GET") {
      return jsonResponse(200, []);
    }

    if (url.pathname === "/rest/v1/tags" && method === "DELETE") {
      return jsonResponse(204, null);
    }

    throw new Error(`Unexpected fetch call: ${method} ${url.pathname}`);
  };

  try {
    const { default: handler } = await importFresh(
      "../../api/entries.js",
      "post-structured-title-summary-without-content",
    );
    const token = createTestJwt({ sub: userId });
    const res = createRes();
    await handler(
      createReq({
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: {
          description,
          title: "Personal Knowledge App Brainstorming",
          summary,
          category: "note",
          tags: [],
        },
      }),
      res,
    );

    assert.equal(res.statusCode, 201);
    assert.equal(createdEntryBody?.raw_text, description);
    assert.equal(
      createdEntryBody?.title,
      "Personal Knowledge App Brainstorming",
    );
    assert.equal(createdEntryBody?.summary, summary);
    assert.equal(createdEntryBody?.content, summary);
  } finally {
    global.fetch = originalFetch;
    process.env.EXPO_PUBLIC_SUPABASE_URL = originalEnv.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      originalEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  }
});

test("PATCH /api/entries preserves explicit raw_text when updating brainstorm summary fields", async () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";

  const userId = "11111111-1111-4111-8111-111111111111";
  const description =
    "# Conversation Summary\nA persisted summary for the finished brainstorm.";
  const transcript =
    "User: Persist the canonical conversation.\n\nAssistant: Keep it available everywhere.";
  let patchBody = null;

  global.fetch = async (input, options = {}) => {
    const url = new URL(String(input));
    const method = options.method || "GET";
    const body = options.body ? JSON.parse(options.body) : undefined;

    if (url.pathname === "/rest/v1/entries" && method === "PATCH") {
      patchBody = body;
      return jsonResponse(200, [{ id: 717, user_id: userId, ...body }]);
    }

    if (url.pathname === "/rest/v1/entry_tags" && method === "GET") {
      return jsonResponse(200, []);
    }

    throw new Error(`Unexpected fetch call: ${method} ${url.pathname}`);
  };

  try {
    const { default: handler } = await importFresh(
      "../../api/entries.js",
      "patch-brainstorm-summary-with-raw-text",
    );
    const token = createTestJwt({ sub: userId });
    const res = createRes();
    await handler(
      createReq({
        method: "PATCH",
        headers: { authorization: `Bearer ${token}` },
        query: { id: "717" },
        body: {
          description,
          raw_text: transcript,
          title: "Canonical Brainstorm Transcript",
          summary: "Finished brainstorm summary.",
          content: "Clean finished brainstorm note.",
        },
      }),
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(patchBody?.raw_text, transcript);
    assert.equal(patchBody?.title, "Canonical Brainstorm Transcript");
    assert.equal(patchBody?.summary, "Finished brainstorm summary.");
    assert.equal(patchBody?.content, "Clean finished brainstorm note.");
  } finally {
    global.fetch = originalFetch;
    process.env.EXPO_PUBLIC_SUPABASE_URL = originalEnv.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      originalEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  }
});

test("POST /api/entries unwraps raw structured JSON description before persisting", async () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";

  const userId = "11111111-1111-4111-8111-111111111111";
  const structuredJson = `{
  "title": "Personal Knowledge App Brainstorming",
  "summary": "Developing a concept for a short-form 'day in the life' video for a personal knowledge app.",
  "description": "# Conversation Summary
A user brainstormed ideas for a short-form 'day in the life' video for a personal knowledge app.
## Goal
- Create a short-form video showcasing a team member's day.
## Outputs & Decisions
- Video format: lighthearted, short, and bite-sized."
}`;
  let createdEntryBody = null;

  global.fetch = async (input, options = {}) => {
    const url = new URL(String(input));
    const method = options.method || "GET";
    const body = options.body ? JSON.parse(options.body) : undefined;

    if (url.pathname === "/rest/v1/entries" && method === "POST") {
      const row = body?.[0] ?? {};
      createdEntryBody = row;
      return jsonResponse(201, [{ id: 717, ...row }]);
    }

    if (url.pathname === "/rest/v1/entry_tags" && method === "DELETE") {
      return jsonResponse(204, null);
    }

    if (url.pathname === "/rest/v1/entry_tags" && method === "GET") {
      return jsonResponse(200, []);
    }

    if (url.pathname === "/rest/v1/tags" && method === "DELETE") {
      return jsonResponse(204, null);
    }

    throw new Error(`Unexpected fetch call: ${method} ${url.pathname}`);
  };

  try {
    const { default: handler } = await importFresh(
      "../../api/entries.js",
      "post-raw-structured-json",
    );
    const token = createTestJwt({ sub: userId });
    const res = createRes();
    await handler(
      createReq({
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: {
          description: structuredJson,
          category: "note",
          tags: [],
        },
      }),
      res,
    );

    assert.equal(res.statusCode, 201);
    assert.equal(
      createdEntryBody?.title,
      "Personal Knowledge App Brainstorming",
    );
    assert.equal(
      createdEntryBody?.summary,
      "Developing a concept for a short-form 'day in the life' video for a personal knowledge app.",
    );
    assert.match(createdEntryBody?.raw_text, /^# Conversation Summary/);
    assert.equal(
      createdEntryBody?.content,
      "Developing a concept for a short-form 'day in the life' video for a personal knowledge app.",
    );
    assert.doesNotMatch(createdEntryBody?.title, /^\{/);
    assert.doesNotMatch(createdEntryBody?.summary, /^\{/);
    assert.doesNotMatch(createdEntryBody?.content, /^\{/);
  } finally {
    global.fetch = originalFetch;
    process.env.EXPO_PUBLIC_SUPABASE_URL = originalEnv.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      originalEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  }
});

test("PATCH /api/entries lets content override description-derived content", async () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";

  const userId = "11111111-1111-4111-8111-111111111111";
  const description = "# Conversation Summary\nOne sentence overview.";
  const content = "Cleaned content from the structured API response.";
  let patchBody = null;

  global.fetch = async (input, options = {}) => {
    const url = new URL(String(input));
    const method = options.method || "GET";
    const body = options.body ? JSON.parse(options.body) : undefined;

    if (url.pathname === "/rest/v1/entries" && method === "PATCH") {
      patchBody = body;
      return jsonResponse(200, [
        {
          id: 616,
          user_id: userId,
          category: "note",
          ...body,
        },
      ]);
    }

    if (url.pathname === "/rest/v1/entry_tags" && method === "GET") {
      return jsonResponse(200, []);
    }

    throw new Error(`Unexpected fetch call: ${method} ${url.pathname}`);
  };

  try {
    const { default: handler } = await importFresh(
      "../../api/entries.js",
      "patch-structured-overrides",
    );
    const token = createTestJwt({ sub: userId });
    const res = createRes();
    await handler(
      createReq({
        method: "PATCH",
        headers: { authorization: `Bearer ${token}` },
        query: { id: "616" },
        body: {
          description,
          title: "Structured Title",
          summary: "Structured summary.",
          content,
        },
      }),
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(patchBody?.raw_text, description);
    assert.equal(patchBody?.title, "Structured Title");
    assert.equal(patchBody?.summary, "Structured summary.");
    assert.equal(patchBody?.content, content);
    assert.equal(jsonBody(res)?.content, content);
  } finally {
    global.fetch = originalFetch;
    process.env.EXPO_PUBLIC_SUPABASE_URL = originalEnv.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      originalEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  }
});

test("PATCH /api/entries unwraps raw structured JSON description before persisting", async () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";

  const userId = "11111111-1111-4111-8111-111111111111";
  const structuredJson = `{
  "title": "Personal Knowledge App Brainstorming",
  "summary": "Developing a concept for a short-form 'day in the life' video for a personal knowledge app.",
  "description": "# Conversation Summary
A user brainstormed ideas for a short-form 'day in the life' video for a personal knowledge app."
}`;
  let patchBody = null;

  global.fetch = async (input, options = {}) => {
    const url = new URL(String(input));
    const method = options.method || "GET";
    const body = options.body ? JSON.parse(options.body) : undefined;

    if (url.pathname === "/rest/v1/entries" && method === "PATCH") {
      patchBody = body;
      return jsonResponse(200, [
        {
          id: 818,
          user_id: userId,
          category: "note",
          ...body,
        },
      ]);
    }

    if (url.pathname === "/rest/v1/entry_tags" && method === "GET") {
      return jsonResponse(200, []);
    }

    throw new Error(`Unexpected fetch call: ${method} ${url.pathname}`);
  };

  try {
    const { default: handler } = await importFresh(
      "../../api/entries.js",
      "patch-raw-structured-json",
    );
    const token = createTestJwt({ sub: userId });
    const res = createRes();
    await handler(
      createReq({
        method: "PATCH",
        headers: { authorization: `Bearer ${token}` },
        query: { id: "818" },
        body: {
          description: structuredJson,
        },
      }),
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(patchBody?.title, "Personal Knowledge App Brainstorming");
    assert.equal(
      patchBody?.summary,
      "Developing a concept for a short-form 'day in the life' video for a personal knowledge app.",
    );
    assert.match(patchBody?.raw_text, /^# Conversation Summary/);
    assert.notEqual(patchBody?.content, structuredJson);
    assert.doesNotMatch(patchBody?.title, /^\{/);
    assert.doesNotMatch(patchBody?.summary, /^\{/);
  } finally {
    global.fetch = originalFetch;
    process.env.EXPO_PUBLIC_SUPABASE_URL = originalEnv.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      originalEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  }
});
