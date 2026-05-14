const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const EXPLICIT_SHARE_BASE = process.env.EXPO_PUBLIC_SHARE_BASE_URL || process.env.EXPO_PUBLIC_WEB_URL || '';

function isLocalHostName(hostname) {
  const host = String(hostname || '').toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

function normalizeTransportSecurity(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (!raw.startsWith('http://')) return raw;
  try {
    const url = new URL(raw);
    if (isLocalHostName(url.hostname)) return raw;
  } catch {
    return raw;
  }
  return raw.replace(/^http:\/\//i, 'https://');
}

function trimTrailingSlash(value) {
  return normalizeTransportSecurity(value).replace(/\/+$/, '');
}

function deriveShareBaseUrl() {
  const explicit = trimTrailingSlash(EXPLICIT_SHARE_BASE);
  if (explicit) return explicit;
  return trimTrailingSlash(API_BASE.replace(/\/api\/?$/, ''));
}

export function buildSharedThoughtUrl(shareSlug) {
  const slug = String(shareSlug || '').trim();
  if (!slug) return '';
  const baseUrl = deriveShareBaseUrl();
  if (!baseUrl) return '';
  return `${baseUrl}/shared-thought/${encodeURIComponent(slug)}`;
}

export function buildThoughtSharePayload(thought) {
  const text = String(thought?.text || '').trim();
  if (!text) return null;
  const sharedUrl = buildSharedThoughtUrl(thought?.share_slug);
  if (sharedUrl) return { url: sharedUrl };
  return { message: text };
}
