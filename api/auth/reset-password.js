import { requestSupabasePasswordReset } from '../../lib/auth.js';

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) {
    return json(res, 400, { error: 'email is required' });
  }

  try {
    const redirectBase = process.env.WEBAPP_ORIGIN || process.env.APP_ORIGIN || '';
    const redirectTo = redirectBase ? `${redirectBase.replace(/\/$/, '')}/login` : undefined;
    await requestSupabasePasswordReset({ email, redirectTo });
    return json(res, 200, { ok: true });
  } catch (err) {
    if (err?.status === 429) {
      return json(res, 429, { error: 'Too many requests. Please try again in a minute.' });
    }
    return json(res, 500, { error: err.message || 'password reset failed' });
  }
}
