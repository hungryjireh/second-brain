function decodeJwtPayload(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2 || !parts[1]) return null;
    const base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64Url.padEnd(base64Url.length + ((4 - (base64Url.length % 4)) % 4), '=');
    const decoded =
      typeof globalThis.atob === 'function'
        ? globalThis.atob(padded)
        : typeof Buffer !== 'undefined'
          ? Buffer.from(padded, 'base64').toString('utf8')
          : '';
    if (!decoded) return null;
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function resolveStorageOwnerSegmentFromToken(token) {
  const payload = decodeJwtPayload(token);
  const rawUserId = String(payload?.sub || payload?.user_id || payload?.id || '').trim();
  const safeUserId = rawUserId.replace(/[^a-zA-Z0-9_-]/g, '');
  return safeUserId || '';
}
