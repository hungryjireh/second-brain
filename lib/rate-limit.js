const buckets = new Map();

function nowMs() {
  return Date.now();
}

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    const first = forwardedFor.split(",")[0];
    return first ? first.trim() : "unknown";
  }
  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) return realIp.trim();
  return "unknown";
}

function compactExpired(bucket, currentTimeMs) {
  while (bucket.length > 0 && bucket[0] <= currentTimeMs) {
    bucket.shift();
  }
}

export function rateLimit({ key, limit, windowMs, currentTimeMs = nowMs() }) {
  const bucket = buckets.get(key) ?? [];
  compactExpired(bucket, currentTimeMs);

  if (bucket.length >= limit) {
    const retryAfterMs = Math.max(bucket[0] - currentTimeMs, 0);
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs,
    };
  }

  bucket.push(currentTimeMs + windowMs);
  buckets.set(key, bucket);
  return {
    allowed: true,
    remaining: Math.max(limit - bucket.length, 0),
    retryAfterMs: 0,
  };
}

export function withIpRateLimit(req, config) {
  const ip = getClientIp(req);
  return rateLimit({
    key: `${config.scope}:${ip}`,
    limit: config.limit,
    windowMs: config.windowMs,
  });
}
