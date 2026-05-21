import assert from "node:assert/strict";
import test from "node:test";

import {
  isChatGptShareUrl,
  patchWebGLFingerprint,
} from "../../lib/scrape-chatgpt-share-url.js";

test("isChatGptShareUrl validates ChatGPT share URLs", () => {
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
  assert.equal(isChatGptShareUrl("https://chatgpt.com/c/abc"), false);
  assert.equal(isChatGptShareUrl("https://example.com/share/abc"), false);
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
