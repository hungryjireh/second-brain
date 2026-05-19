import { refreshSupabaseSession } from "../../lib/auth.js";
import { json } from "../../lib/open-brain/helpers.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")
    return json(res, 405, { error: "Method not allowed" });

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
