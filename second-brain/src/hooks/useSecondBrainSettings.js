import { useCallback, useEffect, useState } from "react";
import { Alert, Platform } from "react-native";
import * as Clipboard from "expo-clipboard";
import { apiRequest } from "../api";
import { CACHE_TTL_MS } from "../constants/cache";
import { sortEntriesByUpdatedAt } from "../utils/secondBrainEntryUtils";

const DEFAULT_TIMEZONE =
  Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Singapore";

export function useSecondBrainSettings({ token, setEntries }) {
  const [importingConversations, setImportingConversations] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [timezoneDraft, setTimezoneDraft] = useState(DEFAULT_TIMEZONE);
  const [timezoneError, setTimezoneError] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [telegramLinkKey, setTelegramLinkKey] = useState("");
  const [loadingTelegramLinkKey, setLoadingTelegramLinkKey] = useState(false);
  const [telegramLinkError, setTelegramLinkError] = useState("");
  const [telegramCopyStatus, setTelegramCopyStatus] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await apiRequest("/settings", {
          token,
          cache: { ttlMs: CACHE_TTL_MS.SETTINGS },
        });
        if (data?.timezone) {
          setTimezone(data.timezone);
          setTimezoneDraft(data.timezone);
        }
      } catch (err) {
        setTimezoneError(err.message);
      }
    }
    loadSettings();
  }, [token]);

  const openSettings = useCallback(() => {
    setTimezoneDraft(timezone);
    setTimezoneError("");
    setTelegramLinkKey("");
    setTelegramLinkError("");
    setTelegramCopyStatus("");
    setSettingsOpen(true);
  }, [timezone]);

  const closeSettings = useCallback(() => {
    if (savingSettings) return;
    setSettingsOpen(false);
  }, [savingSettings]);

  const saveSettings = useCallback(async () => {
    if (savingSettings) return;
    const timezoneToSave = String(timezoneDraft || "").trim();
    if (!timezoneToSave) {
      setTimezoneError("Timezone is required.");
      return;
    }
    setSavingSettings(true);
    setTimezoneError("");
    try {
      const updated = await apiRequest("/settings", {
        method: "PATCH",
        token,
        body: { timezone: timezoneToSave },
      });
      if (updated?.timezone) {
        setTimezone(updated.timezone);
        setTimezoneDraft(updated.timezone);
      }
      setSettingsOpen(false);
    } catch (err) {
      setTimezoneError(err.message);
    } finally {
      setSavingSettings(false);
    }
  }, [savingSettings, timezoneDraft, token]);

  const generateTelegramLinkKey = useCallback(async () => {
    if (loadingTelegramLinkKey) return;
    setLoadingTelegramLinkKey(true);
    setTelegramLinkError("");
    setTelegramCopyStatus("");
    try {
      const data = await apiRequest("/telegram/link-key", { token });
      setTelegramLinkKey(data?.key || "");
    } catch (err) {
      setTelegramLinkError(err.message);
    } finally {
      setLoadingTelegramLinkKey(false);
    }
  }, [loadingTelegramLinkKey, token]);

  const copyTelegramLinkKey = useCallback(async () => {
    if (!telegramLinkKey) return;
    try {
      await Clipboard.setStringAsync(telegramLinkKey);
      setTelegramCopyStatus("Copied");
    } catch {
      setTelegramCopyStatus("Copy failed");
    }
  }, [telegramLinkKey]);

  const handleImportConversationFile = useCallback(
    async (file) => {
      if (!file || importingConversations) return;

      setImportingConversations(true);
      try {
        const raw = await file.text();
        const parsed = JSON.parse(raw);
        const conversations = Array.isArray(parsed) ? parsed : [parsed];
        const response = await apiRequest("/entries", {
          method: "POST",
          token,
          body: {
            import_format: "llm_conversations",
            conversations,
          },
        });

        const created = Array.isArray(response?.created)
          ? response.created
          : [];
        if (created.length === 0) {
          Alert.alert(
            "Import LLM conversations",
            "No valid conversations were found in the uploaded JSON.",
          );
          return;
        }

        setEntries((prev) => sortEntriesByUpdatedAt([...created, ...prev]));
        Alert.alert(
          "Import LLM conversations",
          `Imported ${created.length} conversation${created.length === 1 ? "" : "s"}.`,
        );
      } catch (err) {
        Alert.alert(
          "Import LLM conversations",
          `Failed to import JSON: ${err.message}`,
        );
      } finally {
        setImportingConversations(false);
      }
    },
    [importingConversations, setEntries, token],
  );

  const handleOpenImportDialog = useCallback(() => {
    if (importingConversations) return;

    if (Platform.OS !== "web") {
      Alert.alert(
        "Import LLM conversations",
        "Uploading JSON is currently available on web.",
      );
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async (event) => {
      const file = event?.target?.files?.[0];
      if (!file) return;
      await handleImportConversationFile(file);
      input.value = "";
    };
    input.click();
  }, [handleImportConversationFile, importingConversations]);

  const handleTimezoneChange = useCallback((nextTimezone) => {
    setTimezoneDraft(nextTimezone);
    setTimezoneError("");
  }, []);

  return {
    importingConversations,
    settingsOpen,
    timezone,
    timezoneDraft,
    timezoneError,
    savingSettings,
    telegramLinkKey,
    loadingTelegramLinkKey,
    telegramLinkError,
    telegramCopyStatus,
    openSettings,
    closeSettings,
    saveSettings,
    generateTelegramLinkKey,
    copyTelegramLinkKey,
    handleOpenImportDialog,
    handleTimezoneChange,
    setSettingsOpen,
  };
}
