import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function createReq({
  method = "GET",
  headers = {},
  body = {},
  query = {},
} = {}) {
  return { method, headers, body, query };
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
    json(payload) {
      this.setHeader("content-type", "application/json; charset=utf-8");
      this.body = JSON.stringify(payload);
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

test("API wrapper files point to the expected refactored modules", () => {
  const wiring = [
    ["../../api/bot.js", "../lib/api/telegram/webhook.js"],
    ["../../api/voice.js", "../lib/api/second-brain/voice.js"],
    ["../../api/tags.js", "../lib/api/second-brain/tags.js"],
    [
      "../../api/open-brain/[route].js",
      "../../lib/api/open-brain/route-dispatcher.js",
    ],
  ];

  for (const [apiPath, expectedImport] of wiring) {
    const source = fs.readFileSync(new URL(apiPath, import.meta.url), "utf8");
    assert.match(
      source,
      new RegExp(
        `from ["']${expectedImport.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`,
      ),
    );
  }
});

test("tags wrapper accepts OPTIONS preflight", async () => {
  const { default: handler } = await importFresh(
    "../../api/tags.js",
    "tags-options",
  );

  const res = createRes();
  await handler(createReq({ method: "OPTIONS" }), res);

  assert.equal(res.statusCode, 204);
});

test("open-brain route wrapper returns 404 for unknown route", async () => {
  const { default: handler } = await importFresh(
    "../../api/open-brain/[route].js",
    "open-brain-unknown-route",
  );

  const res = createRes();
  await handler(createReq({ method: "GET", query: { route: "unknown" } }), res);

  assert.equal(res.statusCode, 404);
  assert.deepEqual(jsonBody(res), { error: "Not found" });
});

test("open-brain route wrapper forwards to shared-thought handler", async () => {
  const { default: handler } = await importFresh(
    "../../api/open-brain/[route].js",
    "open-brain-shared-thought",
  );

  const res = createRes();
  await handler(
    createReq({
      method: "GET",
      query: { route: "shared-thought" },
    }),
    res,
  );

  assert.equal(res.statusCode, 400);
  assert.deepEqual(jsonBody(res), { error: "slug is required" });
});
