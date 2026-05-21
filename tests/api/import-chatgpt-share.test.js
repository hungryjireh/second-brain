import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { chromium } from "playwright-extra";

function createReq({ method = "GET", body = {}, headers = {} } = {}) {
  return { method, body, headers, query: {} };
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

async function importFresh(path, tag) {
  return import(`${path}?t=${Date.now()}-${tag}`);
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

test("POST /api/import-chatgpt-share imports a shared conversation URL", async () => {
  const original = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    fetch: global.fetch,
  };

  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon-key";
  process.env.JWT_SECRET = "test-jwt-secret";
  const authToken = createTestJwt({
    id: "11111111-1111-4111-8111-111111111111",
  });

  const shareUrl =
    "https://chatgpt.com/share/6a0d4e8c-5ce0-83ec-baae-fac16aeb19db";
  const sampleHtml = `
    <html>
      <head><title>Sample Share</title></head>
      <body>
        "create_time",1779256972.371769
        "update_time",1779256975.248884
        <a href="${shareUrl}">share</a>
        <div data-message-author-role="user" data-message-id="m1"><p>Hello</p></div>
        <div data-message-author-role="assistant" data-message-id="m2"><p>Hi there</p></div>
      </body>
    </html>
  `;

  let createdEntryBody = null;
  const originalChromiumLaunch = chromium.launch;

  chromium.launch = async () => ({
    newContext: async () => ({
      newPage: async () => ({
        route: async () => {},
        goto: async () => {},
        waitForSelector: async () => {},
        content: async () => sampleHtml,
      }),
    }),
    close: async () => {},
  });

  global.fetch = async (input, init = {}) => {
    let url;
    if (typeof input === "string") {
      url = new URL(input);
    } else if (input instanceof URL) {
      url = input;
    } else {
      url = new URL(input.url);
    }
    const method = init.method || "GET";

    if (url.hostname === "chatgpt.com") {
      return new Response(sampleHtml, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    }

    if (url.pathname === "/rest/v1/entries" && method === "POST") {
      createdEntryBody = init.body ? JSON.parse(init.body) : null;
      return new Response(
        JSON.stringify([
          {
            id: 7,
            user_id: "11111111-1111-4111-8111-111111111111",
            category: "note",
            title: "Sample Share",
            summary: "Hello",
            raw_text: createdEntryBody?.[0]?.raw_text ?? "",
            created_at: 1779256972,
            updated_at: 1779256975,
          },
        ]),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (url.pathname === "/rest/v1/entry_tags" && method === "DELETE") {
      return new Response(null, { status: 204 });
    }

    if (url.pathname === "/rest/v1/tags" && method === "POST") {
      return new Response("", { status: 201 });
    }

    if (url.pathname === "/rest/v1/tags" && method === "GET") {
      return new Response(
        JSON.stringify([
          { id: 1, name: "imported", normalized_name: "imported" },
          { id: 2, name: "claude", normalized_name: "claude" },
        ]),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (url.pathname === "/rest/v1/entry_tags" && method === "POST") {
      return new Response("", { status: 201 });
    }

    if (url.pathname === "/rest/v1/entry_tags" && method === "GET") {
      return new Response(
        JSON.stringify([
          { tags: { name: "claude", normalized_name: "claude" } },
          { tags: { name: "imported", normalized_name: "imported" } },
        ]),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (url.pathname === "/rest/v1/tags" && method === "DELETE") {
      return new Response(null, { status: 204 });
    }

    throw new Error(
      `Unexpected fetch call: ${method} ${url.hostname}${url.pathname}`,
    );
  };

  const { default: handler } = await importFresh(
    "../../api/import-chatgpt-share.js",
    "import-chatgpt-share-success",
  );

  const req = createReq({
    method: "POST",
    headers: { authorization: `Bearer ${authToken}` },
    body: { chat_url: shareUrl },
  });
  const res = createRes();

  try {
    await handler(req, res);
  } finally {
    chromium.launch = originalChromiumLaunch;
    process.env.EXPO_PUBLIC_SUPABASE_URL = original.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      original.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    global.fetch = original.fetch;
  }

  assert.equal(res.statusCode, 201);
  assert.equal(Array.isArray(createdEntryBody), true);
  assert.equal(createdEntryBody[0].category, "note");
  assert.equal(createdEntryBody[0].title, "Sample Share");

  const payload = jsonBody(res);
  assert.equal(payload.source_url, shareUrl);
  assert.equal(Array.isArray(payload.extracted_conversations), true);
  assert.equal(payload.extracted_conversations.length, 1);
  assert.equal(Array.isArray(payload.created), true);
  assert.equal(payload.created.length, 1);
});

test("POST /api/import-chatgpt-share validates chat_url", async () => {
  const { default: handler } = await importFresh(
    "../../api/import-chatgpt-share.js",
    "import-chatgpt-share-invalid-url",
  );

  const req = createReq({
    method: "POST",
    headers: {
      authorization: `Bearer ${createTestJwt({ id: "11111111-1111-4111-8111-111111111111" })}`,
    },
    body: { chat_url: "https://example.com/abc" },
  });
  const res = createRes();

  const originalFetch = global.fetch;
  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon-key";

  global.fetch = async () => {
    throw new Error("No network call expected for invalid URL");
  };

  try {
    await handler(req, res);
  } finally {
    global.fetch = originalFetch;
  }

  assert.equal(res.statusCode, 400);
  assert.equal(
    jsonBody(res).error,
    "chat_url must be a valid ChatGPT public share URL",
  );
});
