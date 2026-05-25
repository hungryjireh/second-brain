import test from "node:test";
import assert from "node:assert/strict";

import { rateLimit, withIpRateLimit } from "../../lib/rate-limit.js";

test("rateLimit allows up to limit and blocks the next request", () => {
  const scope = `unit-limit-${Date.now()}-a`;
  const first = rateLimit({
    key: scope,
    limit: 2,
    windowMs: 60_000,
    currentTimeMs: 1_000,
  });
  const second = rateLimit({
    key: scope,
    limit: 2,
    windowMs: 60_000,
    currentTimeMs: 1_001,
  });
  const third = rateLimit({
    key: scope,
    limit: 2,
    windowMs: 60_000,
    currentTimeMs: 1_002,
  });

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
  assert.ok(third.retryAfterMs > 0);
});

test("rateLimit allows requests again after window expiry", () => {
  const scope = `unit-expiry-${Date.now()}-b`;
  const blocked = [];

  blocked.push(
    rateLimit({
      key: scope,
      limit: 1,
      windowMs: 100,
      currentTimeMs: 1_000,
    }),
  );
  blocked.push(
    rateLimit({
      key: scope,
      limit: 1,
      windowMs: 100,
      currentTimeMs: 1_050,
    }),
  );
  const afterExpiry = rateLimit({
    key: scope,
    limit: 1,
    windowMs: 100,
    currentTimeMs: 1_100,
  });

  assert.equal(blocked[0].allowed, true);
  assert.equal(blocked[1].allowed, false);
  assert.equal(afterExpiry.allowed, true);
});

test("withIpRateLimit uses x-forwarded-for first IP", () => {
  const scope = `unit-ip-${Date.now()}-c`;
  const req = {
    headers: { "x-forwarded-for": "198.51.100.8, 10.0.0.1" },
  };
  const first = withIpRateLimit(req, { scope, limit: 1, windowMs: 60_000 });
  const second = withIpRateLimit(req, { scope, limit: 1, windowMs: 60_000 });

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, false);
});

test("withIpRateLimit falls back to x-real-ip then unknown", () => {
  const scopeReal = `unit-real-ip-${Date.now()}-d`;
  const reqRealIp = { headers: { "x-real-ip": "203.0.113.77" } };
  const realFirst = withIpRateLimit(reqRealIp, {
    scope: scopeReal,
    limit: 1,
    windowMs: 60_000,
  });
  const realSecond = withIpRateLimit(reqRealIp, {
    scope: scopeReal,
    limit: 1,
    windowMs: 60_000,
  });

  assert.equal(realFirst.allowed, true);
  assert.equal(realSecond.allowed, false);

  const scopeUnknown = `unit-unknown-ip-${Date.now()}-e`;
  const reqUnknown = { headers: {} };
  const unknownFirst = withIpRateLimit(reqUnknown, {
    scope: scopeUnknown,
    limit: 1,
    windowMs: 60_000,
  });
  const unknownSecond = withIpRateLimit(reqUnknown, {
    scope: scopeUnknown,
    limit: 1,
    windowMs: 60_000,
  });

  assert.equal(unknownFirst.allowed, true);
  assert.equal(unknownSecond.allowed, false);
});

test("rateLimit returns retryAfterMs boundary based on oldest entry", () => {
  const scope = `unit-retry-after-${Date.now()}-f`;
  rateLimit({
    key: scope,
    limit: 2,
    windowMs: 100,
    currentTimeMs: 1_000,
  });
  rateLimit({
    key: scope,
    limit: 2,
    windowMs: 100,
    currentTimeMs: 1_050,
  });

  const blocked = rateLimit({
    key: scope,
    limit: 2,
    windowMs: 100,
    currentTimeMs: 1_075,
  });

  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterMs, 25);
});

test("rateLimit treats exact expiry timestamp as available", () => {
  const scope = `unit-expiry-boundary-${Date.now()}-g`;
  rateLimit({
    key: scope,
    limit: 1,
    windowMs: 50,
    currentTimeMs: 2_000,
  });

  const atBoundary = rateLimit({
    key: scope,
    limit: 1,
    windowMs: 50,
    currentTimeMs: 2_050,
  });

  assert.equal(atBoundary.allowed, true);
  assert.equal(atBoundary.retryAfterMs, 0);
});

test("withIpRateLimit ignores empty x-forwarded-for and uses x-real-ip", () => {
  const scope = `unit-empty-forwarded-${Date.now()}-h`;
  const req = {
    headers: {
      "x-forwarded-for": "   ",
      "x-real-ip": "198.51.100.120",
    },
  };

  const first = withIpRateLimit(req, { scope, limit: 1, windowMs: 60_000 });
  const second = withIpRateLimit(req, { scope, limit: 1, windowMs: 60_000 });
  assert.equal(first.allowed, true);
  assert.equal(second.allowed, false);
});

test("withIpRateLimit trims leading whitespace in x-forwarded-for", () => {
  const scope = `unit-forwarded-trim-${Date.now()}-i`;
  const reqA = {
    headers: {
      "x-forwarded-for": "  203.0.113.9, 10.1.1.1",
    },
  };
  const reqB = {
    headers: {
      "x-forwarded-for": "203.0.113.9, 10.2.2.2",
    },
  };

  const first = withIpRateLimit(reqA, { scope, limit: 1, windowMs: 60_000 });
  const second = withIpRateLimit(reqB, { scope, limit: 1, windowMs: 60_000 });
  assert.equal(first.allowed, true);
  assert.equal(second.allowed, false);
});
