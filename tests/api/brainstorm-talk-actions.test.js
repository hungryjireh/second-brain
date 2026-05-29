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

test("brainstorm transcribe forwards audio_uri to configured STT endpoint", async () => {
  const originalApiKey = process.env.UNREAL_SPEECH_API_KEY;
  const originalSttUrl = process.env.UNREAL_SPEECH_STT_URL;
  const originalFetch = global.fetch;

  process.env.UNREAL_SPEECH_API_KEY = "test-api-key";
  process.env.UNREAL_SPEECH_STT_URL = "https://stt.example.com/transcribe";

  const fetchCalls = [];
  global.fetch = async (url, options = {}) => {
    fetchCalls.push({ url, options });
    return {
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({ transcript: "hello from uri" }),
      text: async () => "",
    };
  };

  try {
    const { default: handler } = await importFresh(
      "../../api/brainstorm.js",
      "transcribe-audio-uri",
    );
    const token = createTestJwt({
      sub: "11111111-1111-4111-8111-111111111111",
    });
    const res = createRes();

    await handler(
      createReq({
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        query: { action: "transcribe" },
        body: {
          audio_uri: "file:///tmp/audio.m4a",
          extension: "m4a",
        },
      }),
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(jsonBody(res), { transcript: "hello from uri" });
    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0].url, "https://stt.example.com/transcribe");
    assert.match(String(fetchCalls[0].options?.body || ""), /"audio_uri"/);
    assert.doesNotMatch(
      String(fetchCalls[0].options?.body || ""),
      /"audio_base64"/,
    );
  } finally {
    process.env.UNREAL_SPEECH_API_KEY = originalApiKey;
    process.env.UNREAL_SPEECH_STT_URL = originalSttUrl;
    global.fetch = originalFetch;
  }
});

test("brainstorm transcribe still accepts audio_base64 fallback", async () => {
  const originalApiKey = process.env.UNREAL_SPEECH_API_KEY;
  const originalSttUrl = process.env.UNREAL_SPEECH_STT_URL;
  const originalFetch = global.fetch;

  process.env.UNREAL_SPEECH_API_KEY = "test-api-key";
  process.env.UNREAL_SPEECH_STT_URL = "https://stt.example.com/transcribe";

  const fetchCalls = [];
  global.fetch = async (url, options = {}) => {
    fetchCalls.push({ url, options });
    return {
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({ transcript: "hello from base64" }),
      text: async () => "",
    };
  };

  try {
    const { default: handler } = await importFresh(
      "../../api/brainstorm.js",
      "transcribe-audio-base64",
    );
    const token = createTestJwt({
      sub: "11111111-1111-4111-8111-111111111111",
    });
    const res = createRes();

    await handler(
      createReq({
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        query: { action: "transcribe" },
        body: {
          audio_base64: "ZmFrZQ==",
          extension: "m4a",
        },
      }),
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(jsonBody(res), { transcript: "hello from base64" });
    assert.equal(fetchCalls.length, 1);
    assert.match(String(fetchCalls[0].options?.body || ""), /"audio_base64"/);
  } finally {
    process.env.UNREAL_SPEECH_API_KEY = originalApiKey;
    process.env.UNREAL_SPEECH_STT_URL = originalSttUrl;
    global.fetch = originalFetch;
  }
});
