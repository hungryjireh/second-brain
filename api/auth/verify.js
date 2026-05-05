import { createAuthJwt, hashMagicToken } from '../../lib/auth.js';
import { getValidMagicLinkByHash, markMagicLinkUsed } from '../../lib/db.js';

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const token = String(req.query?.token || '').trim();
  if (!token) return json(res, 400, { error: 'token is required' });

  const now = Math.floor(Date.now() / 1000);
  const tokenHash = hashMagicToken(token);

  try {
    const magicLink = await getValidMagicLinkByHash(tokenHash, now);
    if (!magicLink) return json(res, 401, { error: 'invalid or expired token' });

    await markMagicLinkUsed(magicLink.id, now);
    const authToken = createAuthJwt({
      sub: magicLink.email,
      email: magicLink.email,
    });
    return json(res, 200, { token: authToken });
  } catch (err) {
    console.error('[GET /api/auth/verify]', err);
    return json(res, 500, { error: err.message });
  }
}
