import { insertLaunchSignup } from '../lib/db.js';

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function isValidEmail(value) {
  const email = String(value || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const source = String(req.body?.source || 'landing-page').trim().slice(0, 64);

  if (!name || !email) {
    return json(res, 400, { error: 'name and email are required' });
  }

  if (!isValidEmail(email)) {
    return json(res, 400, { error: 'Please enter a valid email address' });
  }

  try {
    const signup = await insertLaunchSignup({ name, email, source: source || 'landing-page' });
    return json(res, 201, { ok: true, signup });
  } catch (err) {
    if (err?.status === 409) {
      return json(res, 200, { ok: true, alreadySignedUp: true });
    }
    return json(res, 500, { error: err.message || 'Failed to save signup' });
  }
}
