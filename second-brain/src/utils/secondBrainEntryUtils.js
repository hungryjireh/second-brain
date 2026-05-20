function getEntrySortUnix(entry) {
  const updatedAt = entry?.updated_at;
  if (Number.isFinite(updatedAt)) return updatedAt;
  const createdAt = entry?.created_at;
  if (Number.isFinite(createdAt)) return createdAt;
  return 0;
}

export function sortEntriesByUpdatedAt(entries) {
  return [...entries].sort((a, b) => {
    const delta = getEntrySortUnix(b) - getEntrySortUnix(a);
    if (delta !== 0) return delta;
    return (b?.id ?? 0) - (a?.id ?? 0);
  });
}

export function groupByDate(entries) {
  const groups = {};
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const weekStart = todayStart - 6 * 86400000;

  for (const entry of entries) {
    const ts = getEntrySortUnix(entry) * 1000;
    let group;
    if (ts >= todayStart) group = "Today";
    else if (ts >= todayStart - 86400000) group = "Yesterday";
    else if (ts >= weekStart) group = "Earlier this week";
    else group = "Older";

    if (!groups[group]) groups[group] = [];
    groups[group].push(entry);
  }

  return groups;
}
