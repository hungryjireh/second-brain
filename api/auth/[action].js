import {
  createAuthJwt,
  refreshSupabaseSession,
  requestSupabasePasswordReset,
  signInSupabaseWithPassword,
  verifyPlainCredential,
} from "../../lib/auth.js";
import { json } from "../../lib/open-brain/helpers.js";

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

  const action = String(req.query?.action || "")
    .trim()
    .toLowerCase();
  if (action === "login") return login(req, res);
  if (action === "refresh") return refresh(req, res);
  if (action === "reset-password") return resetPassword(req, res);
  return json(res, 404, { error: "Not found" });
}
