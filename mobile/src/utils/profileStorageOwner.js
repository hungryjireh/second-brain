import { decodeJwtPayload } from './jwt';

export function resolveStorageOwnerSegmentFromToken(token) {
  const payload = decodeJwtPayload(token);
  const rawUserId = String(payload?.sub || payload?.user_id || payload?.id || '').trim();
  const safeUserId = rawUserId.replace(/[^a-zA-Z0-9_-]/g, '');
  return safeUserId || '';
}
