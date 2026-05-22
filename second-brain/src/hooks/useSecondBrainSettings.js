import { useCallback, useEffect, useState } from "react";
import { Alert, Platform } from "react-native";
import * as Clipboard from "expo-clipboard";
import { apiRequest, getRefreshToken } from "../api";
import { CACHE_TTL_MS } from "../constants/cache";
import { sortEntriesByUpdatedAt } from "../utils/secondBrainEntryUtils";

const DEFAULT_TIMEZONE =
  Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Singapore";

function isValidLlmShareUrl(value) {
  try {
    const parsed = new URL(String(value || "").trim());
    const host = parsed.hostname.toLowerCase();
    const isAllowedHost =
      host === "chatgpt.com" ||
      host === "chat.openai.com" ||
      host === "claude.ai";
    if (!isAllowedHost) return false;
    return parsed.pathname.startsWith("/share/");
  } catch {
    return false;
  }
}

function buildChatGptShareImportErrorMessage(errorMessage) {
  const message = String(errorMessage || "").trim();
  if (
    message.toLowerCase() ===
    "timed out while loading the chatgpt shared conversation"
  ) {
    return (
      "Timed out while loading the ChatGPT shared conversation. " +
      "Please retry the import in SecondBrain."
    );
  }

  return `Failed to import from URL: ${message || "Unknown error"}`;
}

export function useSecondBrainSettings({
  token,
  setEntries,
  setCreatingEntries,
}) {
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
  const [importError, setImportError] = useState("");

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
    setImportError("");
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
      const refreshToken = await getRefreshToken();
      const data = await apiRequest("/telegram/link-key", {
        method: "POST",
        token,
        body: { refreshToken },
      });
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

  const startCreatingImportEntry = useCallback(() => {
    const creatingId = `import-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setCreatingEntries((prev) => [
      ...prev,
      { id: creatingId, title: "conversations" },
    ]);
    return creatingId;
  }, [setCreatingEntries]);

  const endCreatingImportEntry = useCallback(
    (creatingId) => {
      setCreatingEntries((prev) =>
        prev.filter((item) => item.id !== creatingId),
      );
    },
    [setCreatingEntries],
  );

  const handleImportConversationFile = useCallback(
    async (file) => {
      if (!file || importingConversations) return;

      const creatingId = startCreatingImportEntry();
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
        endCreatingImportEntry(creatingId);
      }
    },
    [
      endCreatingImportEntry,
      importingConversations,
      setEntries,
      startCreatingImportEntry,
      token,
    ],
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
      setImportError("");
      setSettingsOpen(false);
      await handleImportConversationFile(file);
      input.value = "";
    };
    input.click();
  }, [handleImportConversationFile, importingConversations]);

  const handleImportChatGptShareUrl = useCallback(async () => {
    if (importingConversations) return;

    if (Platform.OS !== "web") {
      Alert.alert(
        "Import LLM Conversation History",
        "Importing via URL is currently available on web.",
      );
      return;
    }

    const promptFn = globalThis?.prompt;
    if (typeof promptFn !== "function") {
      Alert.alert(
        "Import LLM Conversation History",
        "Prompt is unavailable in this browser context.",
      );
      return;
    }

    const input = promptFn("Paste a ChatGPT or Claude public share URL");
    const chatUrl = String(input || "").trim();
    if (!chatUrl) return;
    if (!isValidLlmShareUrl(chatUrl)) {
      setImportError(
        "Please enter a valid ChatGPT or Claude share URL (https://chatgpt.com/share/... or https://claude.ai/share/...).",
      );
      return;
    }

    setImportError("");
    const creatingId = startCreatingImportEntry();
    setSettingsOpen(false);
    setImportingConversations(true);
    try {
      const response = await apiRequest("/import-llm-share", {
        method: "POST",
        token,
        body: { chat_url: chatUrl },
      });

      const created = Array.isArray(response?.created) ? response.created : [];
      if (created.length === 0) {
        Alert.alert(
          "Import LLM Conversation History",
          "No valid conversation messages were found in that shared link.",
        );
        return;
      }

      setEntries((prev) => sortEntriesByUpdatedAt([...created, ...prev]));
      Alert.alert(
        "Import LLM Conversation History",
        `Imported ${created.length} conversation${created.length === 1 ? "" : "s"}.`,
      );
    } catch (err) {
      setImportError(buildChatGptShareImportErrorMessage(err?.message));
    } finally {
      setImportingConversations(false);
      endCreatingImportEntry(creatingId);
    }
  }, [
    endCreatingImportEntry,
    importingConversations,
    setEntries,
    startCreatingImportEntry,
    token,
  ]);

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
    importError,
    openSettings,
    closeSettings,
    saveSettings,
    generateTelegramLinkKey,
    copyTelegramLinkKey,
    handleOpenImportDialog,
    handleImportChatGptShareUrl,
    handleTimezoneChange,
    setSettingsOpen,
  };
}
