import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

export const AUTH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
export const TELEGRAM_LINK_TOKEN_TTL_SECONDS = 60 * 10;
export const TELEGRAM_SESSION_TOKEN_PURPOSE = 'telegram_session';

function base64urlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64urlDecode(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(normalized + padding, 'base64').toString('utf8');
}

function signPart(input, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(input)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function ensureJwtSecret() {
  if (!JWT_SECRET) {
    throw new Error('Missing JWT_SECRET. Add it to environment variables.');
  }
  return JWT_SECRET;
}

export function createAuthJwt(payload, expiresInSeconds = AUTH_TOKEN_TTL_SECONDS) {
  const secret = ensureJwtSecret();
  const header = { alg: 'HS256', typ: 'JWT' };
  const iat = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat };
  if (Number.isFinite(expiresInSeconds) && expiresInSeconds > 0) {
    body.exp = iat + expiresInSeconds;
  }

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedBody = base64urlEncode(JSON.stringify(body));
  const signingInput = `${encodedHeader}.${encodedBody}`;
  const signature = signPart(signingInput, secret);

  return `${signingInput}.${signature}`;
}

export function verifyAuthJwt(token) {
  const secret = ensureJwtSecret();
  const parts = token?.split('.');
  if (!parts || parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [encodedHeader, encodedBody, signature] = parts;
  const expectedSignature = signPart(`${encodedHeader}.${encodedBody}`, secret);
  const expectedBuffer = Buffer.from(expectedSignature);
  const actualBuffer = Buffer.from(signature);

  if (
    expectedBuffer.length !== actualBuffer.length
    || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    throw new Error('Invalid token signature');
  }

  const payload = JSON.parse(base64urlDecode(encodedBody));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }
  return payload;
}

export function getBearerToken(req) {
  const auth = req.headers.authorization || req.headers.Authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice('Bearer '.length).trim();
}

export function verifyPlainCredential(input, expected) {
  const inputBuffer = Buffer.from(String(input), 'utf8');
  const expectedBuffer = Buffer.from(String(expected), 'utf8');

  if (inputBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(inputBuffer, expectedBuffer);
}

function ensureSupabaseAuthEnv() {
  if (!SUPABASE_URL) {
    throw new Error('Missing SUPABASE_URL. Add it to environment variables.');
  }
  if (!SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Missing SUPABASE_PUBLISHABLE_KEY. Add it to environment variables.');
  }
}

export async function signInSupabaseWithPassword({ email, password }) {
  ensureSupabaseAuthEnv();
  const authUrl = new URL('/auth/v1/token', SUPABASE_URL);
  authUrl.searchParams.set('grant_type', 'password');

  const res = await fetch(authUrl, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const raw = await res.text();
  const data = raw ? JSON.parse(raw) : null;
  if (!res.ok) {
    const message = data?.msg || data?.error_description || data?.error || 'invalid credentials';
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  return data;
}

export async function verifySupabaseAccessToken(token) {
  ensureSupabaseAuthEnv();
  const userUrl = new URL('/auth/v1/user', SUPABASE_URL);
  const res = await fetch(userUrl, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    },
  });

  const raw = await res.text();
  const data = raw ? JSON.parse(raw) : null;
  if (!res.ok) {
    const message = data?.msg || data?.error_description || data?.error || 'unauthorized';
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  return data;
}

export async function verifyAuthToken(token) {
  try {
    return verifyAuthJwt(token);
  } catch {
    return verifySupabaseAccessToken(token);
  }
}

const UUID_V4ISH_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function resolveAuthUserId(authUser) {
  const candidate = authUser?.id || authUser?.sub;
  if (!candidate) return null;
  return UUID_V4ISH_REGEX.test(candidate) ? candidate : null;
}

export function createTelegramLinkKey(userId, authToken) {
  if (!authToken) {
    throw new Error('Missing auth token for Telegram link key');
  }
  const telegramSessionToken = createAuthJwt({ sub: userId, purpose: TELEGRAM_SESSION_TOKEN_PURPOSE }, null);
  return createAuthJwt(
    { sub: userId, purpose: 'telegram_link', sat: telegramSessionToken },
    TELEGRAM_LINK_TOKEN_TTL_SECONDS
  );
}

export function verifyTelegramLinkKey(token) {
  const payload = verifyAuthJwt(token);
  if (payload?.purpose !== 'telegram_link') {
    throw new Error('Invalid Telegram link key');
  }
  const userId = resolveAuthUserId(payload);
  if (!userId) {
    throw new Error('Invalid Telegram link key payload');
  }
  const authToken = typeof payload?.sat === 'string' ? payload.sat : '';
  if (!authToken) {
    throw new Error('Invalid Telegram link key payload');
  }
  return { userId, authToken };
}
