import { insertLaunchSignup } from "../lib/db.js";
import { json } from "../lib/open-brain/helpers.js";
import { rateLimit, withIpRateLimit } from "../lib/rate-limit.js";

const SIGNUP_IP_RATE_LIMIT = {
  scope: "launch-signups-ip",
  limit: 20,
  windowMs: 60 * 1000,
};

const SIGNUP_EMAIL_RATE_LIMIT_LIMIT = 5;
const SIGNUP_EMAIL_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function isValidEmail(value) {
  const email = String(value || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")
    return json(res, 405, { error: "Method not allowed" });

  const ipLimit = withIpRateLimit(req, SIGNUP_IP_RATE_LIMIT);
  if (!ipLimit.allowed) {
    const retryAfterSeconds = Math.ceil(ipLimit.retryAfterMs / 1000);
    return json(res, 429, {
      error: "Too many requests. Please try again shortly.",
      retryAfterSeconds,
    });
  }

  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  const source = String(req.body?.source || "landing-page")
    .trim()
    .slice(0, 64);

  if (!name || !email) {
    return json(res, 400, { error: "name and email are required" });
  }

  if (!isValidEmail(email)) {
    return json(res, 400, { error: "Please enter a valid email address" });
  }

  const emailLimit = rateLimit({
    key: `launch-signups-email:${email}`,
    limit: SIGNUP_EMAIL_RATE_LIMIT_LIMIT,
    windowMs: SIGNUP_EMAIL_RATE_LIMIT_WINDOW_MS,
  });
  if (!emailLimit.allowed) {
    const retryAfterSeconds = Math.ceil(emailLimit.retryAfterMs / 1000);
    return json(res, 429, {
      error: "Too many signup attempts for this email. Please try again later.",
      retryAfterSeconds,
    });
  }

  try {
    const signup = await insertLaunchSignup({
      name,
      email,
      source: source || "landing-page",
    });
    return json(res, 201, { ok: true, signup });
  } catch (err) {
    if (err?.status === 409) {
      return json(res, 200, { ok: true, alreadySignedUp: true });
    }
    return json(res, 500, { error: err.message || "Failed to save signup" });
  }
}
