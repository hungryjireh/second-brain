import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SecondBrainQueuedEntriesPanel from "../components/SecondBrainQueuedEntriesPanel";
import { theme } from "../theme";
import styles from "./SecondBrainScreen.styles";
import { resolveStorageOwnerSegmentFromToken } from "../utils/jwt";

const OFFLINE_STORAGE_PREFIX = "secondBrainOffline:";

function resolveQueueId(action, index) {
  return typeof action?.queue_id === "string" && action.queue_id.trim()
    ? action.queue_id
    : `queued-${index + 1}`;
}

function mapQueuedEntries(queue) {
  if (!Array.isArray(queue)) return [];
  return queue.map((action, index) => {
    const queueId = resolveQueueId(action, index);
    const description =
      typeof action?.description === "string" ? action.description : "";
    const summary =
      action?.type === "create"
        ? description
        : action?.type === "archive"
          ? `Archive entry ${String(action?.id || "")}`.trim()
          : action?.type === "delete"
            ? `Delete entry ${String(action?.id || "")}`.trim()
            : "Queued change";
    return {
      queueId,
      type: action?.type || "unknown",
      description,
      summary,
      editable: action?.type === "create",
    };
  });
}

export default function SecondBrainQueuedEditsScreen({
  token: tokenFromProps,
}) {
  const token = tokenFromProps ?? "";
  const [loading, setLoading] = useState(true);
  const [queuedEntries, setQueuedEntries] = useState([]);
  const [savingQueueEntryId, setSavingQueueEntryId] = useState("");
  const [queueError, setQueueError] = useState("");

  const ownerSegment = resolveStorageOwnerSegmentFromToken(token);
  const storageKey = `${OFFLINE_STORAGE_PREFIX}${
    ownerSegment || String(token || "").trim()
  }`;
  const legacyStorageKey = `${OFFLINE_STORAGE_PREFIX}${String(token || "").trim()}`;

  const migrateLegacyOfflineStateIfNeeded = useCallback(async () => {
    if (!ownerSegment || storageKey === legacyStorageKey) return;
    try {
      const [currentRaw, legacyRaw] = await Promise.all([
        AsyncStorage.getItem(storageKey),
        AsyncStorage.getItem(legacyStorageKey),
      ]);
      if (currentRaw || !legacyRaw) return;
      await AsyncStorage.setItem(storageKey, legacyRaw);
      await AsyncStorage.removeItem(legacyStorageKey);
    } catch {
      // Migration is best-effort and should not block queued-entry UI.
    }
  }, [legacyStorageKey, ownerSegment, storageKey]);

  const loadQueuedEntries = useCallback(async () => {
    setLoading(true);
    setQueueError("");
    try {
      await migrateLegacyOfflineStateIfNeeded();
      const raw = await AsyncStorage.getItem(storageKey);
      if (!raw) {
        setQueuedEntries([]);
        return;
      }
      const parsed = JSON.parse(raw);
      const queue = Array.isArray(parsed?.queue) ? parsed.queue : [];
      setQueuedEntries(mapQueuedEntries(queue));
    } catch {
      setQueueError("Unable to load queued changes.");
      setQueuedEntries([]);
    } finally {
      setLoading(false);
    }
  }, [migrateLegacyOfflineStateIfNeeded, storageKey]);

  useEffect(() => {
    loadQueuedEntries();
  }, [loadQueuedEntries]);

  const handleSaveQueuedEntry = useCallback(
    async ({ queueId, description }) => {
      const normalizedDescription = String(description || "").trim();
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

      setSavingQueueEntryId(queueId);
      setQueueError("");
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        const parsed = raw ? JSON.parse(raw) : {};
        const queue = Array.isArray(parsed?.queue) ? parsed.queue : [];
        const targetIndex = queue.findIndex(
          (action, index) => resolveQueueId(action, index) === queueId,
        );

        if (targetIndex < 0) {
          return {
            ok: false,
            error: { code: "not_found", message: "Queue entry was not found." },
          };
        }
        if (queue[targetIndex]?.type !== "create") {
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
          ...nextQueue[targetIndex],
          description: normalizedDescription,
        };

        await AsyncStorage.setItem(
          storageKey,
          JSON.stringify({
            ...(parsed && typeof parsed === "object" ? parsed : {}),
            queue: nextQueue,
          }),
        );

        setQueuedEntries(mapQueuedEntries(nextQueue));
        return { ok: true };
      } catch {
        return {
          ok: false,
          error: {
            code: "save_failed",
            message: "Unable to save queued entry.",
          },
        };
      } finally {
        setSavingQueueEntryId("");
      }
    },
    [storageKey],
  );

  const handleDeleteQueuedEntry = useCallback(
    async (queueId) => {
      setSavingQueueEntryId(queueId);
      setQueueError("");
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        const parsed = raw ? JSON.parse(raw) : {};
        const queue = Array.isArray(parsed?.queue) ? parsed.queue : [];
        const nextQueue = queue.filter(
          (action, index) => resolveQueueId(action, index) !== queueId,
        );

        if (nextQueue.length === queue.length) {
          return {
            ok: false,
            error: { code: "not_found", message: "Queue entry was not found." },
          };
        }

        await AsyncStorage.setItem(
          storageKey,
          JSON.stringify({
            ...(parsed && typeof parsed === "object" ? parsed : {}),
            queue: nextQueue,
          }),
        );

        setQueuedEntries(mapQueuedEntries(nextQueue));
        return { ok: true };
      } catch {
        return {
          ok: false,
          error: {
            code: "delete_failed",
            message: "Unable to delete queued entry.",
          },
        };
      } finally {
        setSavingQueueEntryId("");
      }
    },
    [storageKey],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.editLabel}>Queued edits</Text>
      <Text style={styles.editHelpText}>
        Review and edit queued offline changes before sync.
      </Text>
      <ScrollView
        style={styles.editScroll}
        contentContainerStyle={styles.queuedEditsEntriesScrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={styles.queuedLoadingWrap}>
            <ActivityIndicator color={theme.colors.brand} />
          </View>
        ) : queuedEntries.length > 0 ? (
          <SecondBrainQueuedEntriesPanel
            styles={styles}
            queuedEntries={queuedEntries}
            savingQueueEntryId={savingQueueEntryId}
            queueError={queueError}
            onSaveQueuedEntry={handleSaveQueuedEntry}
            onDeleteQueuedEntry={handleDeleteQueuedEntry}
          />
        ) : (
          <Text style={styles.listEmptyText}>No queued changes to edit.</Text>
        )}
      </ScrollView>
    </View>
  );
}
