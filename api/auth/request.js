import { insertMagicLink } from '../../lib/db.js';
import {
  createMagicToken,
  hashMagicToken,
  MAGIC_LINK_TTL_SECONDS,
} from '../../lib/auth.js';

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function getBaseUrl(req) {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${protocol}://${host}`;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(res, 400, { error: 'valid email is required' });
  }

  const token = createMagicToken();
  const tokenHash = hashMagicToken(token);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + MAGIC_LINK_TTL_SECONDS;

  try {
    await insertMagicLink({
      email,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    const baseUrl = getBaseUrl(req);
    const verifyUrl = `${baseUrl}/api/auth/verify?token=${encodeURIComponent(token)}`;
    return json(res, 200, {
      ok: true,
      message: 'Magic link created',
      verifyUrl,
      expiresAt,
    });
  } catch (err) {
    console.error('[POST /api/auth/request]', err);
    return json(res, 500, { error: err.message });
  }
}
