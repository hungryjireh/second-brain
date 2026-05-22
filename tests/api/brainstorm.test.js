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

test("brainstorm handler returns 405 for non-POST requests", async () => {
  const { default: handler } = await importFresh(
    "../../api/brainstorm.js",
    "method",
  );
  const res = createRes();
  await handler(createReq({ method: "GET" }), res);
  assert.equal(res.statusCode, 405);
  assert.deepEqual(jsonBody(res), { error: "Method not allowed" });
});

test("brainstorm handler returns 401 when bearer token is missing", async () => {
  const { default: handler } = await importFresh(
    "../../api/brainstorm.js",
    "missing-token",
  );
  const res = createRes();
  await handler(createReq({ method: "POST", body: { message: "hello" } }), res);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(jsonBody(res), { error: "missing bearer token" });
});

test("brainstorm handler returns 400 when message is missing", async () => {
  const { default: handler } = await importFresh(
    "../../api/brainstorm.js",
    "missing-message",
  );
  const token = createTestJwt({
    sub: "11111111-1111-4111-8111-111111111111",
  });
  const res = createRes();
  await handler(
    createReq({
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: {},
    }),
    res,
  );
  assert.equal(res.statusCode, 400);
  assert.deepEqual(jsonBody(res), { error: "message is required" });
});
