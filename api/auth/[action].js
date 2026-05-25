import {
  createAuthJwt,
  refreshSupabaseSession,
  requestSupabasePasswordReset,
  signInSupabaseWithPassword,
  verifyPlainCredential,
} from "../../lib/auth.js";
import { json } from "../../lib/open-brain/helpers.js";
import { rateLimit, withIpRateLimit } from "../../lib/rate-limit.js";

const AUTH_IP_RATE_LIMIT = {
  scope: "auth-ip",
  limit: 30,
  windowMs: 60 * 1000,
};

const LOGIN_ID_RATE_LIMIT_LIMIT = 10;
const LOGIN_ID_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

function applyAuthRateLimit(req) {
  const ipLimit = withIpRateLimit(req, AUTH_IP_RATE_LIMIT);
  if (!ipLimit.allowed) {
    const retryAfterSeconds = Math.ceil(ipLimit.retryAfterMs / 1000);
    return {
      blocked: true,
      status: 429,
      body: {
        error: "Too many requests. Please try again shortly.",
        retryAfterSeconds,
      },
    };
  }
  return { blocked: false };
}

function applyLoginIdentifierRateLimit(identifier) {
  const normalized = identifier.trim().toLowerCase();
  const result = rateLimit({
    key: `auth-id:${normalized}`,
    limit: LOGIN_ID_RATE_LIMIT_LIMIT,
    windowMs: LOGIN_ID_RATE_LIMIT_WINDOW_MS,
  });
  if (!result.allowed) {
    const retryAfterSeconds = Math.ceil(result.retryAfterMs / 1000);
    return {
      blocked: true,
      status: 429,
      body: {
        error:
          "Too many login attempts for this account. Please try again later.",
        retryAfterSeconds,
      },
    };
  }
  return { blocked: false };
}

async function login(req, res) {
  const username = String(req.body?.username || "").trim();
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  const password = String(req.body?.password || "");
  const identifier = email || username;

  if (!identifier || !password) {
    return json(res, 400, { error: "username and password are required" });
  }

  const identifierRateLimit = applyLoginIdentifierRateLimit(identifier);
  if (identifierRateLimit.blocked) {
    return json(res, identifierRateLimit.status, identifierRateLimit.body);
  }

  try {
    const envUsername = String(process.env.AUTH_USERNAME || "");
    const envPassword = String(process.env.AUTH_PASSWORD || "");

    if (
      envUsername &&
      envPassword &&
      verifyPlainCredential(identifier, envUsername) &&
      verifyPlainCredential(password, envPassword)
    ) {
      const token = createAuthJwt({
        sub: envUsername,
        username: envUsername,
      });
      return json(res, 200, { token });
    }

    const loginEmail =
      email || (username.includes("@") ? username.toLowerCase() : "");
    if (!loginEmail) {
      return json(res, 401, { error: "invalid credentials" });
    }

    const session = await signInSupabaseWithPassword({
      email: loginEmail,
      password,
    });
    const token = session?.access_token;
    if (!token) {
      return json(res, 500, {
        error: "Supabase session did not return an access token",
      });
    }
    return json(res, 200, {
      token,
      refreshToken: String(session?.refresh_token || ""),
    });
  } catch (err) {
    const status = err.status === 400 || err.status === 401 ? 401 : 500;
    return json(res, status, { error: err.message || "login failed" });
  }
}

async function refresh(req, res) {
  const refreshToken = String(req.body?.refreshToken || "");
  if (!refreshToken) {
    return json(res, 400, { error: "refreshToken is required" });
  }

  try {
    const session = await refreshSupabaseSession({ refreshToken });
    const token = String(session?.access_token || "");
    if (!token) {
      return json(res, 500, {
        error: "Supabase session did not return an access token",
      });
    }
    return json(res, 200, {
      token,
      refreshToken: String(session?.refresh_token || refreshToken),
    });
  } catch (err) {
    const status = err.status === 400 || err.status === 401 ? 401 : 500;
    return json(res, status, {
      error: err.message || "session refresh failed",
    });
  }
}

async function resetPassword(req, res) {
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  if (!email) {
    return json(res, 400, { error: "email is required" });
  }

  try {
    const redirectBase =
      process.env.WEBAPP_ORIGIN || process.env.APP_ORIGIN || "";
    const redirectTo = redirectBase
      ? `${redirectBase.replace(/\/$/, "")}/login`
      : undefined;
    await requestSupabasePasswordReset({ email, redirectTo });
    return json(res, 200, { ok: true });
  } catch (err) {
    if (err?.status === 429) {
      return json(res, 429, {
        error: "Too many requests. Please try again in a minute.",
      });
    }
    return json(res, 500, { error: err.message || "password reset failed" });
  }
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")
    return json(res, 405, { error: "Method not allowed" });

  const authRateLimit = applyAuthRateLimit(req);
  if (authRateLimit.blocked) {
    return json(res, authRateLimit.status, authRateLimit.body);
  }

  const action = String(req.query?.action || "")
    .trim()
    .toLowerCase();
  if (action === "login") return login(req, res);
  if (action === "refresh") return refresh(req, res);
  if (action === "reset-password") return resetPassword(req, res);
  return json(res, 404, { error: "Not found" });
}
