import { useCallback, useMemo, useState } from "react";
import {
  executeOpenBrainSearch,
  normalizeOpenBrainSearchInput,
  runGuardedOpenBrainSearch,
} from "../utils/openBrainSearch";

export function useOpenBrainSearch({
  token,
  apiRequest,
  cacheTtlMs,
  sortUsersByQuery,
  initialQuery = "",
  fallbackErrorMessage = "Search failed.",
}) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [didSearch, setDidSearch] = useState(false);
  const [results, setResults] = useState({ users: [], thoughts: [] });

  const runSearch = useCallback(
    async (nextQuery = query) =>
      runGuardedOpenBrainSearch({
        query: nextQuery,
        loading,
        setLoading,
        setError,
        fallbackErrorMessage,
        onSearch: async (value) => {
          const searchResult = await executeOpenBrainSearch({
            query: value,
            token,
            apiRequest,
            cacheTtlMs,
            sortUsersByQuery,
          });
          if (!searchResult) return null;
          setDidSearch(true);
          setResults({
            users: searchResult.users,
            thoughts: searchResult.thoughts,
          });
          return searchResult;
        },
      }),
    [
      apiRequest,
      cacheTtlMs,
      fallbackErrorMessage,
      loading,
      query,
      sortUsersByQuery,
      token,
    ],
  );

  const resetSearch = useCallback(() => {
    setQuery("");
    setError("");
    setDidSearch(false);
    setResults({ users: [], thoughts: [] });
  }, []);

  const normalizedQuery = useMemo(
    () => normalizeOpenBrainSearchInput(query),
    [query],
  );

  return {
    query,
    setQuery,
    loading,
    error,
    didSearch,
    results,
    setResults,
    normalizedQuery,
    runSearch,
    resetSearch,
  };
}
