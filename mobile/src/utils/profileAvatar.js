const AVATAR_PALETTE = ['#1ea37d', '#1f9f7a', '#20a784', '#239a76'];

export function initialsFromName(name) {
  const cleaned = String(name || '').trim();
  if (!cleaned) return '?';
  return cleaned.slice(0, 1).toUpperCase();
}

export function mutedTint(seed = '') {
  const total = Array.from(String(seed || '')).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_PALETTE[total % AVATAR_PALETTE.length];
}
