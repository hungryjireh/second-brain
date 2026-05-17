export function rankUsernameMatch(username, query) {
  const source = String(username || '').toLowerCase();
  const needle = String(query || '').toLowerCase();
  if (!source || !needle) return Number.NEGATIVE_INFINITY;
  if (source === needle) return 1000;
  if (source.startsWith(needle)) return 800 - (source.length - needle.length);
  if (source.includes(needle)) return 600 - source.indexOf(needle);

  let score = 0;
  let cursor = 0;
  let streakBonus = 0;
  for (let i = 0; i < needle.length; i += 1) {
    const ch = needle[i];
    const found = source.indexOf(ch, cursor);
    if (found === -1) return Number.NEGATIVE_INFINITY;
    score += 20;
    if (found === cursor) streakBonus += 10;
    cursor = found + 1;
  }

  const gapPenalty = Math.max(0, source.length - needle.length);
  return score + streakBonus - gapPenalty;
}

export function sortUsersByQuery(users, query) {
  return [...users]
    .map(user => ({ user, score: rankUsernameMatch(user?.username, query) }))
    .filter(item => item.score > Number.NEGATIVE_INFINITY)
    .sort((a, b) => b.score - a.score)
    .map(item => item.user);
}
