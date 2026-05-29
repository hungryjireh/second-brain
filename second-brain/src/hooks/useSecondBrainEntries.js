import { useCallback, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, isLikelyOfflineError } from "../api";
import { CACHE_TTL_MS } from "../constants/cache";
import { normalizeTagValue } from "../utils/secondBrainTagUtils";
import { sortEntriesByUpdatedAt } from "../utils/secondBrainEntryUtils";
import { resolveStorageOwnerSegmentFromToken } from "../utils/jwt";

const OFFLINE_STORAGE_PREFIX = "secondBrainOffline:";
const OFFLINE_QUEUE_VERSION = 1;
const DEFAULT_CATEGORY_COUNTS = {
  reminder: 0,
  todo: 0,
  thought: 0,
  note: 0,
};

function countActiveEntriesByCategory(entries) {
  if (!Array.isArray(entries)) return DEFAULT_CATEGORY_COUNTS;
  return entries.reduce(
    (acc, entry) => {
      if (entry?.is_archived) return acc;
      if (entry?.category === "reminder") acc.reminder += 1;
      if (entry?.category === "todo") acc.todo += 1;
      if (entry?.category === "thought") acc.thought += 1;
      if (entry?.category === "note") acc.note += 1;
      return acc;
    },
    { reminder: 0, todo: 0, thought: 0, note: 0 },
  );
}

export function useSecondBrainEntries({ token, onError }) {
  const [entries, setEntries] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState(DEFAULT_CATEGORY_COUNTS);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [loadingMoreEntries, setLoadingMoreEntries] = useState(false);
  const [hasMoreEntries, setHasMoreEntries] = useState(false);
  const [nextEntriesCursor, setNextEntriesCursor] = useState(null);
  const [userTags, setUserTags] = useState([]);
  const [userTagsLoaded, setUserTagsLoaded] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const [offlineQueueSize, setOfflineQueueSize] = useState(0);
  const [queuedEntries, setQueuedEntries] = useState([]);

  const mapQueuedEntries = useCallback((queue) => {
    if (!Array.isArray(queue)) return [];
    return queue.map((action, index) => {
      const queueId =
        typeof action?.queue_id === "string" && action.queue_id.trim()
          ? action.queue_id
          : `queued-${index + 1}`;
      const rawDescription =
        typeof action?.description === "string" ? action.description : "";
      const summary =
        action?.type === "create"
          ? rawDescription
          : action?.type === "archive"
            ? `Archive entry ${String(action?.id || "")}`.trim()
            : action?.type === "delete"
              ? `Delete entry ${String(action?.id || "")}`.trim()
              : "Queued change";
      return {
        queueId,
        type: action?.type || "unknown",
        summary,
        description: rawDescription,
        editable: action?.type === "create",
      };
    });
  }, []);

  const buildOfflineStorageKey = useCallback(() => {
    const ownerSegment = resolveStorageOwnerSegmentFromToken(token);
    if (ownerSegment) {
      return `${OFFLINE_STORAGE_PREFIX}${ownerSegment}`;
    }
    return `${OFFLINE_STORAGE_PREFIX}${String(token || "").trim()}`;
  }, [token]);

  const buildLegacyOfflineStorageKey = useCallback(() => {
    return `${OFFLINE_STORAGE_PREFIX}${String(token || "").trim()}`;
  }, [token]);

  const migrateLegacyOfflineStateIfNeeded = useCallback(async () => {
    const ownerSegment = resolveStorageOwnerSegmentFromToken(token);
    if (!ownerSegment) return;
    const currentKey = buildOfflineStorageKey();
    const legacyKey = buildLegacyOfflineStorageKey();
    if (currentKey === legacyKey) return;
    try {
      const [currentRaw, legacyRaw] = await Promise.all([
        AsyncStorage.getItem(currentKey),
        AsyncStorage.getItem(legacyKey),
      ]);
      if (currentRaw || !legacyRaw) return;
      await AsyncStorage.setItem(currentKey, legacyRaw);
      await AsyncStorage.removeItem(legacyKey);
    } catch {
      // Migration is best-effort and should never block runtime behavior.
    }
  }, [buildLegacyOfflineStorageKey, buildOfflineStorageKey, token]);

  const readOfflineState = useCallback(async () => {
    try {
      await migrateLegacyOfflineStateIfNeeded();
      const raw = await AsyncStorage.getItem(buildOfflineStorageKey());
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch {
      return null;
    }
  }, [buildOfflineStorageKey, migrateLegacyOfflineStateIfNeeded]);

  const writeOfflineState = useCallback(
    async (nextState) => {
      try {
        const queue = Array.isArray(nextState.queue) ? nextState.queue : [];
        await AsyncStorage.setItem(
          buildOfflineStorageKey(),
          JSON.stringify({
            version: OFFLINE_QUEUE_VERSION,
            entries: Array.isArray(nextState.entries) ? nextState.entries : [],
            userTags: Array.isArray(nextState.userTags)
              ? nextState.userTags
              : [],
            queue,
          }),
        );
        setOfflineQueueSize(queue.length);
        setQueuedEntries(mapQueuedEntries(queue));
      } catch {
        // Offline persistence is best-effort.
      }
    },
    [buildOfflineStorageKey, mapQueuedEntries],
  );

  const persistCurrentOfflineState = useCallback(
    async (nextEntries, nextUserTags) => {
      const snapshot = await readOfflineState();
      await writeOfflineState({
        entries: nextEntries,
        userTags: nextUserTags,
        queue: snapshot?.queue || [],
      });
    },
    [readOfflineState, writeOfflineState],
  );

  const enqueueOfflineAction = useCallback(
    async (action, snapshotEntries) => {
      const snapshot = await readOfflineState();
      const existingQueue = Array.isArray(snapshot?.queue)
        ? snapshot.queue
        : [];
      await writeOfflineState({
        entries: snapshotEntries,
        userTags,
        queue: [
          ...existingQueue,
          {
            ...action,
            queue_id:
              typeof action?.queue_id === "string" && action.queue_id.trim()
                ? action.queue_id
                : `q-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            queued_at: Date.now(),
          },
        ],
      });
    },
    [readOfflineState, userTags, writeOfflineState],
  );

  const updateQueuedEntry = useCallback(
    async ({ queueId, description }) => {
      const normalizedQueueId = String(queueId || "").trim();
      const normalizedDescription = String(description || "").trim();
      if (!normalizedQueueId) {
        return {
          ok: false,
          error: {
            code: "invalid_queue_id",
            message: "Queue entry not found.",
          },
        };
      }
      if (!normalizedDescription) {
        return {
          ok: false,
          error: {
            code: "invalid_description",
            field: "description",
            message: "Description is required.",
          },
        };
      }
      const snapshot = await readOfflineState();
      const queue = Array.isArray(snapshot?.queue) ? snapshot.queue : [];
      const targetIndex = queue.findIndex(
        (action) => action?.queue_id === normalizedQueueId,
      );
      if (targetIndex < 0) {
        return {
          ok: false,
          error: { code: "not_found", message: "Queue entry was not found." },
        };
      }
      const targetAction = queue[targetIndex];
      if (targetAction?.type !== "create") {
        return {
          ok: false,
          error: {
            code: "immutable_entry",
            message: "Only queued create entries can be edited.",
          },
        };
      }

      const nextQueue = [...queue];
      nextQueue[targetIndex] = {
        ...targetAction,
        description: normalizedDescription,
      };
      await writeOfflineState({
        entries: Array.isArray(snapshot?.entries) ? snapshot.entries : entries,
        userTags: Array.isArray(snapshot?.userTags)
          ? snapshot.userTags
          : userTags,
        queue: nextQueue,
      });
      return {
        ok: true,
        queuedEntries: mapQueuedEntries(nextQueue),
      };
    },
    [entries, mapQueuedEntries, readOfflineState, userTags, writeOfflineState],
  );

  const flushOfflineQueue = useCallback(async () => {
    const snapshot = await readOfflineState();
    const queue = Array.isArray(snapshot?.queue) ? snapshot.queue : [];
    const cachedEntries = Array.isArray(snapshot?.entries)
      ? snapshot.entries
      : entries;
    const cachedUserTags = Array.isArray(snapshot?.userTags)
      ? snapshot.userTags
      : userTags;
    setOfflineQueueSize(queue.length);
    if (!queue.length) return;

    const pending = [];
    for (const action of queue) {
      try {
        if (action?.type === "create") {
          await apiRequest("/entries", {
            method: "POST",
            token,
            body: { description: action.description },
          });
          continue;
        }
        if (action?.type === "archive") {
          await apiRequest(`/entries?id=${action.id}`, {
            method: "PATCH",
            token,
            body: { is_archived: action.is_archived },
          });
          continue;
        }
        if (action?.type === "delete") {
          await apiRequest(`/entries?id=${action.id}`, {
            method: "DELETE",
            token,
          });
          continue;
        }
      } catch (err) {
        pending.push(action);
        if (isLikelyOfflineError(err)) setOfflineMode(true);
      }
    }

    await writeOfflineState({
      entries: cachedEntries,
      userTags: cachedUserTags,
      queue: pending,
    });
  }, [entries, readOfflineState, token, userTags, writeOfflineState]);

  const loadEntries = useCallback(
    async ({ bypassCache = false } = {}) => {
      setLoadingEntries(true);
      try {
        onError("");
        await flushOfflineQueue();
        const [data, statsData, tagsData] = await Promise.all([
          apiRequest("/entries?limit=60", {
            token,
            cache: {
              ttlMs: CACHE_TTL_MS.FEED,
              bypass: bypassCache,
              staleOnError: !bypassCache,
            },
          }),
          apiRequest("/entries?limit=1&include_stats=true", {
            token,
            cache: {
              ttlMs: CACHE_TTL_MS.FEED,
              bypass: bypassCache,
              staleOnError: !bypassCache,
            },
          }),
          apiRequest("/tags", {
            token,
            cache: {
              ttlMs: CACHE_TTL_MS.SETTINGS,
              bypass: bypassCache,
              staleOnError: !bypassCache,
            },
          }),
        ]);
        const list = Array.isArray(data.entries)
          ? data.entries
          : Array.isArray(data)
            ? data
            : [];
        const sortedEntries = sortEntriesByUpdatedAt(list);
        setEntries(sortedEntries);
        setHasMoreEntries(Boolean(data?.page?.has_more));
        setNextEntriesCursor(
          typeof data?.page?.next_cursor === "string"
            ? data.page.next_cursor
            : null,
        );
        const stats = statsData?.stats;
        setCategoryCounts({
          reminder:
            typeof stats?.reminder === "number" ? stats.reminder : 0,
          todo: typeof stats?.todo === "number" ? stats.todo : 0,
          thought: typeof stats?.thought === "number" ? stats.thought : 0,
          note: typeof stats?.note === "number" ? stats.note : 0,
        });

        const normalizedUserTags = (
          Array.isArray(tagsData?.tags) ? tagsData.tags : []
        )
          .map((tag) => normalizeTagValue(tag))
          .filter(Boolean);
        const nextUserTags = Array.from(new Set(normalizedUserTags)).sort(
          (a, b) => a.localeCompare(b, "en", { sensitivity: "base" }),
        );
        setUserTags(nextUserTags);
        setUserTagsLoaded(true);
        await persistCurrentOfflineState(sortedEntries, nextUserTags);
        setOfflineMode(false);
      } catch (err) {
        if (isLikelyOfflineError(err)) {
          setOfflineMode(true);
          const snapshot = await readOfflineState();
          if (Array.isArray(snapshot?.entries) && snapshot.entries.length > 0) {
            const fallbackEntries = sortEntriesByUpdatedAt(snapshot.entries);
            setEntries(fallbackEntries);
            setCategoryCounts(countActiveEntriesByCategory(fallbackEntries));
            setUserTags(
              Array.isArray(snapshot.userTags) ? snapshot.userTags : [],
            );
            setUserTagsLoaded(true);
            setOfflineQueueSize(
              Array.isArray(snapshot.queue) ? snapshot.queue.length : 0,
            );
            setQueuedEntries(
              mapQueuedEntries(
                Array.isArray(snapshot.queue) ? snapshot.queue : [],
              ),
            );
            setOfflineMode(true);
            onError("Offline mode: showing saved entries.");
            return;
          }
          onError("Offline mode: unable to load saved entries.");
          return;
        }
        onError(err.message);
      } finally {
        setLoadingEntries(false);
      }
    },
    [
      flushOfflineQueue,
      mapQueuedEntries,
      onError,
      persistCurrentOfflineState,
      readOfflineState,
      token,
    ],
  );

  const loadMoreEntries = useCallback(async () => {
    if (loadingEntries || loadingMoreEntries || !hasMoreEntries) return;
    if (!nextEntriesCursor) return;

    setLoadingMoreEntries(true);
    try {
      const data = await apiRequest(
        `/entries?limit=60&cursor=${encodeURIComponent(nextEntriesCursor)}`,
        {
          token,
          cache: {
            ttlMs: CACHE_TTL_MS.FEED,
            bypass: true,
            staleOnError: false,
          },
        },
      );
      const list = Array.isArray(data?.entries)
        ? data.entries
        : Array.isArray(data)
          ? data
          : [];
      if (list.length === 0) {
        setHasMoreEntries(false);
        setNextEntriesCursor(null);
        return;
      }

      const nextEntries = sortEntriesByUpdatedAt(
        [
          ...entries,
          ...list.filter(
            (incoming) =>
              !entries.some((existing) => existing.id === incoming.id),
          ),
        ],
      );
      setEntries(nextEntries);
      setHasMoreEntries(Boolean(data?.page?.has_more));
      setNextEntriesCursor(
        typeof data?.page?.next_cursor === "string"
          ? data.page.next_cursor
          : null,
      );
      await persistCurrentOfflineState(nextEntries, userTags);
    } catch (err) {
      if (!isLikelyOfflineError(err)) onError(err.message);
    } finally {
      setLoadingMoreEntries(false);
    }
  }, [
    entries,
    hasMoreEntries,
    loadingEntries,
    loadingMoreEntries,
    nextEntriesCursor,
    onError,
    persistCurrentOfflineState,
    token,
    userTags,
  ]);

  const toggleArchive = useCallback(
    async (entry) => {
      setBusyId(entry.id);
      try {
        const updated = await apiRequest(`/entries?id=${entry.id}`, {
          method: "PATCH",
          token,
          body: { is_archived: !entry.is_archived },
        });
        const nextEntries = entries.map((item) =>
          item.id === entry.id ? updated : item,
        );
        const sortedEntries = sortEntriesByUpdatedAt(nextEntries);
        setEntries(sortedEntries);
        await persistCurrentOfflineState(sortedEntries, userTags);
        setOfflineMode(false);
      } catch (err) {
        if (isLikelyOfflineError(err)) {
          const nextEntries = entries.map((item) =>
            item.id === entry.id
              ? { ...item, is_archived: !item.is_archived }
              : item,
          );
          const sortedEntries = sortEntriesByUpdatedAt(nextEntries);
          setEntries(sortedEntries);
          setOfflineMode(true);
          onError("Offline mode: changes will sync automatically.");
          await enqueueOfflineAction(
            {
              type: "archive",
              id: entry.id,
              is_archived: !entry.is_archived,
            },
            sortedEntries,
          );
          await persistCurrentOfflineState(sortedEntries, userTags);
          return;
        }
        onError(err.message);
      } finally {
        setBusyId(null);
      }
    },
    [
      enqueueOfflineAction,
      entries,
      onError,
      persistCurrentOfflineState,
      token,
      userTags,
    ],
  );

  const deleteEntry = useCallback(
    async (entryId) => {
      setBusyId(entryId);
      try {
        await apiRequest(`/entries?id=${entryId}`, { method: "DELETE", token });
        const nextEntries = entries.filter((item) => item.id !== entryId);
        setEntries(nextEntries);
        await persistCurrentOfflineState(nextEntries, userTags);
        setOfflineMode(false);
      } catch (err) {
        if (isLikelyOfflineError(err)) {
          const nextEntries = entries.filter((item) => item.id !== entryId);
          setEntries(nextEntries);
          setOfflineMode(true);
          onError("Offline mode: changes will sync automatically.");
          await enqueueOfflineAction(
            { type: "delete", id: entryId },
            nextEntries,
          );
          await persistCurrentOfflineState(nextEntries, userTags);
          return;
        }
        onError(err.message);
      } finally {
        setBusyId(null);
      }
    },
    [
      enqueueOfflineAction,
      entries,
      onError,
      persistCurrentOfflineState,
      token,
      userTags,
    ],
  );

  const applyOfflineCreateFallback = useCallback(
    async (description) => {
      const sortedEntries = sortEntriesByUpdatedAt(entries);
      setEntries(sortedEntries);
      setOfflineMode(true);
      onError("Offline mode: changes will sync automatically.");
      await enqueueOfflineAction(
        {
          type: "create",
          description,
        },
        sortedEntries,
      );
      await persistCurrentOfflineState(sortedEntries, userTags);
    },
    [
      enqueueOfflineAction,
      entries,
      onError,
      persistCurrentOfflineState,
      userTags,
    ],
  );

  return {
    entries,
    setEntries,
    loadingEntries,
    loadingMoreEntries,
    hasMoreEntries,
    categoryCounts,
    userTags,
    userTagsLoaded,
    busyId,
    offlineMode,
    offlineQueueSize,
    queuedEntries,
    loadEntries,
    loadMoreEntries,
    toggleArchive,
    deleteEntry,
    applyOfflineCreateFallback,
    updateQueuedEntry,
  };
}
