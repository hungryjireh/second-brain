import { useCallback, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, isLikelyOfflineError } from "../api";
import { CACHE_TTL_MS } from "../constants/cache";
import { normalizeTagValue } from "../utils/secondBrainTagUtils";
import { sortEntriesByUpdatedAt } from "../utils/secondBrainEntryUtils";

const OFFLINE_STORAGE_PREFIX = "secondBrainOffline:";
const OFFLINE_QUEUE_VERSION = 1;

export function useSecondBrainEntries({ token, onError }) {
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [userTags, setUserTags] = useState([]);
  const [userTagsLoaded, setUserTagsLoaded] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const [offlineQueueSize, setOfflineQueueSize] = useState(0);

  const buildOfflineStorageKey = useCallback(() => {
    return `${OFFLINE_STORAGE_PREFIX}${String(token || "").trim()}`;
  }, [token]);

  const readOfflineState = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(buildOfflineStorageKey());
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch {
      return null;
    }
  }, [buildOfflineStorageKey]);

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
      } catch {
        // Offline persistence is best-effort.
      }
    },
    [buildOfflineStorageKey],
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
        queue: [...existingQueue, action],
      });
    },
    [readOfflineState, userTags, writeOfflineState],
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
        setOfflineMode(false);
        await flushOfflineQueue();
        const [data, tagsData] = await Promise.all([
          apiRequest("/entries?limit=60", {
            token,
            cache: { ttlMs: CACHE_TTL_MS.FEED, bypass: bypassCache },
          }),
          apiRequest("/tags", {
            token,
            cache: { ttlMs: CACHE_TTL_MS.SETTINGS, bypass: bypassCache },
          }),
        ]);
        const list = Array.isArray(data.entries)
          ? data.entries
          : Array.isArray(data)
            ? data
            : [];
        const sortedEntries = sortEntriesByUpdatedAt(list);
        setEntries(sortedEntries);

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
          const snapshot = await readOfflineState();
          if (Array.isArray(snapshot?.entries) && snapshot.entries.length > 0) {
            setEntries(sortEntriesByUpdatedAt(snapshot.entries));
            setUserTags(
              Array.isArray(snapshot.userTags) ? snapshot.userTags : [],
            );
            setUserTagsLoaded(true);
            setOfflineQueueSize(
              Array.isArray(snapshot.queue) ? snapshot.queue.length : 0,
            );
            setOfflineMode(true);
            onError("Offline mode: showing saved entries.");
            return;
          }
        }
        onError(err.message);
      } finally {
        setLoadingEntries(false);
      }
    },
    [
      flushOfflineQueue,
      onError,
      persistCurrentOfflineState,
      readOfflineState,
      token,
    ],
  );

  const toggleArchive = useCallback(
    async (entry) => {
      setBusyId(entry.id);
      try {
        setOfflineMode(false);
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
        setOfflineMode(false);
        await apiRequest(`/entries?id=${entryId}`, { method: "DELETE", token });
        const nextEntries = entries.filter((item) => item.id !== entryId);
        setEntries(nextEntries);
        await persistCurrentOfflineState(nextEntries, userTags);
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
      const localId = `offline-${Date.now()}`;
      const optimisticEntry = {
        id: localId,
        description,
        category: "note",
        is_archived: false,
        created_at: Math.floor(Date.now() / 1000),
      };
      const nextEntries = [optimisticEntry, ...entries];
      const sortedEntries = sortEntriesByUpdatedAt(nextEntries);
      setEntries(sortedEntries);
      setOfflineMode(true);
      onError("Offline mode: changes will sync automatically.");
      await enqueueOfflineAction(
        {
          type: "create",
          description: optimisticEntry.description,
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
    userTags,
    userTagsLoaded,
    busyId,
    offlineMode,
    offlineQueueSize,
    loadEntries,
    toggleArchive,
    deleteEntry,
    applyOfflineCreateFallback,
  };
}
