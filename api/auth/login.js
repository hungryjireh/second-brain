import {
  createAuthJwt,
  signInSupabaseWithPassword,
  verifyPlainCredential,
} from '../../lib/auth.js';

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const username = String(req.body?.username || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const identifier = email || username;

  if (!identifier || !password) {
    return json(res, 400, { error: 'username and password are required' });
  }

  try {
    const envUsername = String(process.env.AUTH_USERNAME || '');
    const envPassword = String(process.env.AUTH_PASSWORD || '');

    // Local credential login (AUTH_USERNAME/AUTH_PASSWORD) for dashboard access.
    if (
      envUsername
      && envPassword
      && verifyPlainCredential(identifier, envUsername)
      && verifyPlainCredential(password, envPassword)
    ) {
      const token = createAuthJwt({
        sub: envUsername,
        username: envUsername,
      });
      return json(res, 200, { token });
    }

    // Supabase password auth requires email as identifier.
    const loginEmail = email || (username.includes('@') ? username.toLowerCase() : '');
    if (!loginEmail) {
      return json(res, 401, { error: 'invalid credentials' });
    }

    const session = await signInSupabaseWithPassword({ email: loginEmail, password });
    const token = session?.access_token;
    if (!token) {
      return json(res, 500, { error: 'Supabase session did not return an access token' });
    }
    return json(res, 200, { token });
  } catch (err) {
    const status = err.status === 400 || err.status === 401 ? 401 : 500;
    return json(res, status, { error: err.message || 'login failed' });
  }
}
