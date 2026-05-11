const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const EXPLICIT_SHARE_BASE = process.env.EXPO_PUBLIC_SHARE_BASE_URL || process.env.EXPO_PUBLIC_WEB_URL || '';

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
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
