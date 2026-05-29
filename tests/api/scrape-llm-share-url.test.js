import assert from "node:assert/strict";
import test from "node:test";

import {
  getShareUrlProvider,
  isLlmShareUrl,
  isChatGptShareUrl,
  patchWebGLFingerprint,
} from "../../lib/api/second-brain/scrape-llm-share-url.js";

test("isChatGptShareUrl validates ChatGPT and Claude share URLs", () => {
  assert.equal(
    isChatGptShareUrl(
      "https://chatgpt.com/share/6a0db525-3a40-83ec-aed6-2917e4c81963",
    ),
    true,
  );
  assert.equal(
    isChatGptShareUrl(
      "https://www.chatgpt.com/share/6a0db525-3a40-83ec-baae-fac16aeb19db",
    ),
    true,
  );
  assert.equal(
    isChatGptShareUrl(
      "https://claude.ai/share/52cc8fea-93d2-4aa6-a820-e2b592558077",
    ),
    true,
  );
  assert.equal(isChatGptShareUrl("https://chatgpt.com/c/abc"), false);
  assert.equal(isChatGptShareUrl("https://example.com/share/abc"), false);
});

test("getShareUrlProvider returns provider for supported share links", () => {
  assert.equal(
    getShareUrlProvider(
      "https://chatgpt.com/share/6a0db525-3a40-83ec-aed6-2917e4c81963",
    ),
    "chatgpt",
  );
  assert.equal(
    getShareUrlProvider(
      "https://claude.ai/share/52cc8fea-93d2-4aa6-a820-e2b592558077",
    ),
    "claude",
  );
  assert.equal(getShareUrlProvider("https://example.com/share/abc"), null);
});

test("isLlmShareUrl validates supported provider share URLs", () => {
  assert.equal(
    isLlmShareUrl(
      "https://chatgpt.com/share/6a0db525-3a40-83ec-aed6-2917e4c81963",
    ),
    true,
  );
  assert.equal(
    isLlmShareUrl(
      "https://claude.ai/share/52cc8fea-93d2-4aa6-a820-e2b592558077",
    ),
    true,
  );
  assert.equal(isLlmShareUrl("https://example.com/share/abc"), false);
});

test("isChatGptShareUrl remains a compatibility alias of isLlmShareUrl", () => {
  const urls = [
    "https://chatgpt.com/share/abc",
    "https://claude.ai/share/52cc8fea-93d2-4aa6-a820-e2b592558077",
    "https://example.com/share/abc",
    "not-a-url",
  ];

  for (const url of urls) {
    assert.equal(isChatGptShareUrl(url), isLlmShareUrl(url));
  }
});

test("patchWebGLFingerprint is safe when WebGL constructors are missing", () => {
  const scope = {};

  assert.doesNotThrow(() => {
    patchWebGLFingerprint(scope, "Vendor", "Renderer");
  });
});

test("patchWebGLFingerprint overrides unmasked vendor and renderer parameters", () => {
  class FakeWebGLRenderingContext {
    getParameter(param) {
      return `orig-${param}`;
    }
  }

  class FakeWebGL2RenderingContext {
    getParameter(param) {
      return `orig2-${param}`;
    }
  }

  const scope = {
    WebGLRenderingContext: FakeWebGLRenderingContext,
    WebGL2RenderingContext: FakeWebGL2RenderingContext,
  };

  patchWebGLFingerprint(scope, "ACME Vendor", "ACME Renderer");

  const webgl1 = new FakeWebGLRenderingContext();
  const webgl2 = new FakeWebGL2RenderingContext();

  assert.equal(webgl1.getParameter(37445), "ACME Vendor");
  assert.equal(webgl1.getParameter(37446), "ACME Renderer");
  assert.equal(webgl1.getParameter(1), "orig-1");

  assert.equal(webgl2.getParameter(37445), "ACME Vendor");
  assert.equal(webgl2.getParameter(37446), "ACME Renderer");
  assert.equal(webgl2.getParameter(2), "orig2-2");
});
