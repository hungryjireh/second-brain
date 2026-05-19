export function normalizeOpenBrainSearchInput(value) {
  return String(value || "")
    .trim()
    .replace(/^@+/, "");
}

export function buildOpenBrainSearchRows(results) {
  const users = Array.isArray(results?.users) ? results.users : [];
  const thoughts = Array.isArray(results?.thoughts) ? results.thoughts : [];
  const rows = [];

  if (users.length > 0) {
    rows.push({ type: "section", key: "section-users", label: "Users" });
    users.forEach((user) =>
      rows.push({ type: "user", key: `user-${user.id}`, user }),
    );
  }

  if (thoughts.length > 0) {
    rows.push({ type: "section", key: "section-thoughts", label: "Thoughts" });
    thoughts.forEach((thought) =>
      rows.push({ type: "thought", key: `thought-${thought.id}`, thought }),
    );
  }

  return rows;
}

export async function executeOpenBrainSearch({
  query,
  token,
  apiRequest,
  cacheTtlMs,
  sortUsersByQuery,
}) {
  const normalizedValue = normalizeOpenBrainSearchInput(query);
  if (!normalizedValue) return null;

  const data = await apiRequest(
    `/open-brain/search?q=${encodeURIComponent(normalizedValue)}`,
    {
      token,
      cache: { ttlMs: cacheTtlMs },
    },
  );
  const rawUsers = Array.isArray(data?.users) ? data.users : [];

  return {
    query: normalizedValue,
    users: sortUsersByQuery(rawUsers, normalizedValue),
    thoughts: Array.isArray(data?.thoughts) ? data.thoughts : [],
  };
}

export async function runGuardedOpenBrainSearch({
  query,
  loading,
  setLoading,
  setError,
  onSearch,
  fallbackErrorMessage,
}) {
  const normalizedValue = normalizeOpenBrainSearchInput(query);
  if (!normalizedValue || loading) return null;

  setLoading(true);
  setError("");
  try {
    return await onSearch(normalizedValue);
  } catch (err) {
    setError(err?.message || fallbackErrorMessage);
    return null;
  } finally {
    setLoading(false);
  }
}
