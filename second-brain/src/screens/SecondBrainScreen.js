import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Platform,
  Keyboard,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  apiRequest,
  buildApiUrl,
  createAuthHeaders,
  isLikelyOfflineError,
} from "../api";
import SecondBrainFlatList from "../components/SecondBrainFlatList";
import SecondBrainTypebar from "../components/SecondBrainTypebar";
import SecondBrainFilterDropdown from "../components/SecondBrainFilterDropdown";
import SecondBrainStatsGrid from "../components/SecondBrainStatsGrid";
import SecondBrainOfflineBanner from "../components/SecondBrainOfflineBanner";
import styles, { SWIPE_ACTION_WIDTH } from "./SecondBrainScreen.styles";
import { confirmAction } from "../utils/confirmAction";
import { sortEntriesByUpdatedAt } from "../utils/secondBrainEntryUtils";
import { useSecondBrainEntries } from "../hooks/useSecondBrainEntries";
import { useVoiceCapture } from "../hooks/useVoiceCapture";
import { useSecondBrainEntryFiltering } from "../hooks/useSecondBrainEntryFiltering";
import { useSecondBrainGroupedRows } from "../hooks/useSecondBrainGroupedRows";
import { useSecondBrainSettings } from "../hooks/useSecondBrainSettings";

const TYPEBAR_MIN_HEIGHT = 38;
const SMALL_SCREEN_FILTER_BREAKPOINT = 640;

async function confirmArchiveEntry(entry) {
  const isReminder = entry?.category === "reminder";
  const promptTitle = isReminder ? "Mark done?" : "Archive entry?";
  const confirmLabel = isReminder ? "Mark Done" : "Archive";
  return confirmAction({
    title: promptTitle,
    message: "This will move the entry to Archived/Done.",
    confirmLabel,
  });
}

async function confirmDeleteEntry() {
  return confirmAction({
    title: "Delete entry?",
    message: "This action cannot be undone.",
    confirmLabel: "Delete",
  });
}

function formatCreatingTitle(description) {
  const firstLine = String(description || "")
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) return "entry";
  return firstLine.slice(0, 80);
}

export { sortEntriesByUpdatedAt } from "../utils/secondBrainEntryUtils";

export default function SecondBrainScreen({ token, navigation, onLogout }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isSmallScreen = width <= SMALL_SCREEN_FILTER_BREAKPOINT;
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [openActionDrawerId, setOpenActionDrawerId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const [activePriorityLevel, setActivePriorityLevel] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingEntries, setCreatingEntries] = useState([]);
  const [openSwipeId, setOpenSwipeId] = useState(null);
  const [actionTooltip, setActionTooltip] = useState("");
  const [typebarFocused, setTypebarFocused] = useState(false);
  const [isTypebarExpanded, setIsTypebarExpanded] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const {
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
    loadEntries,
    loadMoreEntries,
    toggleArchive,
    deleteEntry,
    applyOfflineCreateFallback,
  } = useSecondBrainEntries({ token, onError: setError });
  const {
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
  } = useSecondBrainSettings({
    token,
    setEntries,
    setCreatingEntries,
  });
  const filterDropdownOpenedAtMsRef = useRef(0);
  const handleVoiceEntryCreated = useCallback(
    (entry) => {
      setEntries((prev) => sortEntriesByUpdatedAt([entry, ...prev]));
    },
    [setEntries],
  );
  const handleVoiceReloadEntries = useCallback(async () => {
    await loadEntries({ bypassCache: true });
  }, [loadEntries]);
  const handlePullToRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await loadEntries({ bypassCache: true });
    } finally {
      setPullRefreshing(false);
    }
  }, [loadEntries]);
  const handleOfflineSync = useCallback(async () => {
    if (syncInProgress) return;
    setSyncInProgress(true);
    setError("");
    try {
      await loadEntries({ bypassCache: true });
    } finally {
      setSyncInProgress(false);
    }
  }, [loadEntries, syncInProgress]);
  const {
    voiceBusy,
    voiceStarting,
    voiceElapsedMs,
    voiceMaxDurationMs,
    recording,
    startVoiceCapture,
    stopVoiceCaptureAndSubmit,
    cancelVoiceCapture,
  } = useVoiceCapture({
    token,
    onError: setError,
    onVoiceEntryCreated: handleVoiceEntryCreated,
    onReloadEntries: handleVoiceReloadEntries,
    onSubmissionStart: (submissionId) => {
      setCreatingEntries((prev) => [...prev, { id: submissionId, title: "" }]);
    },
    onSubmissionEnd: (submissionId) => {
      setCreatingEntries((prev) =>
        prev.filter((item) => item.id !== submissionId),
      );
    },
  });
  const typebarBottom = 10 + Math.max(insets.bottom, 0) + keyboardOffset;
  const listBottomPadding = typebarBottom + TYPEBAR_MIN_HEIGHT + 20;
  const isWeb = Platform.OS === "web";
  const isNativeOfflineMode = !isWeb && offlineMode;
  const displayError = error.startsWith("Offline mode:") ? "" : error;
  const hasDraftText = draft.trim().length > 0;
  const hideTypebarSideActions =
    isTypebarExpanded &&
    (typebarFocused || (isWeb && hasDraftText)) &&
    !recording;
  const isVoiceCaptureActive = recording || voiceStarting;

  useEffect(() => {
    loadEntries({ bypassCache: true });
  }, [token]);
  useEffect(() => {
    if (!navigation?.addListener) return undefined;
    const unsubscribe = navigation.addListener("focus", () => {
      loadEntries({ bypassCache: true });
    });
    return unsubscribe;
  }, [navigation, token]);

  useEffect(() => {
    if (isSmallScreen) {
      setIsFilterDropdownOpen(false);
      return;
    }
    setIsFilterDropdownOpen(true);
  }, [isSmallScreen]);

  useEffect(() => {
    if (isWeb) return undefined;

    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const handleKeyboardShow = (event) => {
      const keyboardHeight = event?.endCoordinates?.height ?? 0;
      const nextOffset = Math.max(
        0,
        keyboardHeight - Math.max(insets.bottom, 0),
      );
      setKeyboardOffset(nextOffset);
    };
    const handleKeyboardHide = () => {
      setKeyboardOffset(0);
    };
    const showSub = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideSub = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [insets.bottom, isWeb]);

  async function createEntry() {
    const description = draft.trim();
    if (!description) return;
    if (description === "/brainstorm") {
      if (isNativeOfflineMode) {
        setError("Brainstorm is unavailable while offline.");
        return;
      }
      setDraft("");
      setIsTypebarExpanded(false);
      navigation.navigate("SecondBrainBrainstorm");
      return;
    }
    if (description === "/brainstorm-talk") {
      if (isNativeOfflineMode) {
        setError("Brainstorm talk is unavailable while offline.");
        return;
      }
      setDraft("");
      setIsTypebarExpanded(false);
      navigation.navigate("SecondBrainBrainstormTalk");
      return;
    }
    const creatingId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const creatingTitle = formatCreatingTitle(description);
    setCreatingEntries((prev) => [
      ...prev,
      { id: creatingId, title: creatingTitle },
    ]);
    setDraft("");
    setIsTypebarExpanded(false);
    try {
      await apiRequest("/entries", {
        method: "POST",
        token,
        body: { description },
      });
      await loadEntries({ bypassCache: true });
    } catch (err) {
      if (isLikelyOfflineError(err)) {
        await applyOfflineCreateFallback(description);
        return;
      }
      setDraft((prev) => (prev.trim() ? prev : description));
      setError(err.message);
    } finally {
      setCreatingEntries((prev) =>
        prev.filter((item) => item.id !== creatingId),
      );
    }
  }

  const toggleArchiveWithConfirmation = useCallback(
    async (entry) => {
      if (!entry?.is_archived) {
        const confirmed = await confirmArchiveEntry(entry);
        if (!confirmed) return;
      }
      await toggleArchive(entry);
    },
    [toggleArchive],
  );

  const requestDelete = useCallback(
    async (entryId) => {
      setOpenSwipeId(entryId);
      const confirmed = await confirmDeleteEntry();
      if (!confirmed) return;
      deleteEntry(entryId);
    },
    [deleteEntry],
  );

  const downloadIcs = useCallback(
    async (entryId) => {
      try {
        const response = await fetch(
          `${buildApiUrl("/ics")}?id=${encodeURIComponent(entryId)}`,
          {
            headers: createAuthHeaders(token),
          },
        );
        if (!response.ok) {
          let serverMessage = "";
          try {
            const raw = await response.text();
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                serverMessage = String(
                  parsed?.error || parsed?.message || "",
                ).trim();
              } catch {
                serverMessage = raw.trim();
              }
            }
          } catch {
            // Ignore response body parsing errors and fall back to status code.
          }
          const normalizedMessage =
            serverMessage || `Request failed (${response.status})`;
          throw new Error(normalizedMessage);
        }

        const fileName = `second-brain-reminder-${entryId}.ics`;
        if (Platform.OS === "web") {
          const blob = await response.blob();
          const isMobileBrowser = /Android|iPhone|iPad|iPod/i.test(
            navigator.userAgent || "",
          );
          const shareFn = navigator.share?.bind(navigator);
          const canShareFn = navigator.canShare?.bind(navigator);

          if (isMobileBrowser && shareFn && typeof File !== "undefined") {
            const file = new File([blob], fileName, {
              type: "text/calendar;charset=utf-8",
            });
            if (!canShareFn || canShareFn({ files: [file] })) {
              await shareFn({
                title: "Reminder",
                files: [file],
              });
              return;
            }
          }

          const downloadUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = downloadUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
          return;
        }

        const icsContent = await response.text();
        const file = new File(Paths.cache, fileName);
        file.write(icsContent);
        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
          throw new Error("Sharing is not available on this device");
        }
        await Sharing.shareAsync(file.uri, {
          mimeType: "text/calendar",
          dialogTitle: "Share reminder",
          UTI: "public.calendar-event",
        });
      } catch (err) {
        setError(err.message);
      }
    },
    [token],
  );

  const startEdit = useCallback(
    (entry) => {
      navigation.navigate("SecondBrainEditEntry", {
        entryId: entry?.id,
        entry,
      });
    },
    [navigation],
  );

  const openEntry = useCallback(
    (entry) => {
      navigation.navigate("SecondBrainEntryDetails", {
        entryId: entry?.id,
        entry,
      });
    },
    [navigation],
  );

  const handleActionDrawerChange = useCallback((entryId, isOpen) => {
    setOpenActionDrawerId((current) => {
      if (isOpen) return entryId;
      if (current === entryId) return null;
      return current;
    });
  }, []);
  const openVoiceCaptureScreen = useCallback(() => {
    navigation.navigate("SecondBrainVoiceCapture");
  }, [navigation]);
  const keyExtractor = useCallback((item) => item.key, []);
  const renderCell = useCallback(
    ({ item, children, style, ...rest }) => {
      const isRaised = item?.entry?.id === openActionDrawerId;
      return (
        <View
          {...rest}
          style={[
            style,
            styles.listCell,
            isRaised ? styles.listCellRaised : null,
          ]}
        >
          {children}
        </View>
      );
    },
    [openActionDrawerId],
  );
  const {
    visibleEntries,
    tagUsageCounts,
    globalTags,
    hasActiveFilters,
    activeFilterCount,
  } = useSecondBrainEntryFiltering({
    entries,
    activeCategory,
    activePriorityLevel,
    activeTag,
    searchQuery,
    showArchived,
    userTags,
    userTagsLoaded,
  });
  const groupedRows = useSecondBrainGroupedRows({
    entries: visibleEntries,
    timezone,
  });
  const clearFilters = useCallback(() => {
    setActiveCategory("");
    setActivePriorityLevel("");
    setActiveTag("");
    setSearchQuery("");
    setShowArchived(false);
  }, []);
  const closeOpenActionDrawer = useCallback(() => {
    let didClose = false;
    setOpenActionDrawerId((current) => {
      if (current !== null) {
        didClose = true;
        return null;
      }
      return current;
    });
    return didClose;
  }, []);
  const setFilterDropdownOpenedAtMs = useCallback((value) => {
    filterDropdownOpenedAtMsRef.current = value;
  }, []);
  const typebarProps = {
    styles,
    bottom: typebarBottom,
    draft,
    onChangeDraft: setDraft,
    onSubmitDraft: createEntry,
    closeOpenActionDrawer,
    setTypebarFocused,
    isTypebarExpanded,
    setIsTypebarExpanded,
    isSmallScreen,
    hideTypebarSideActions,
    actionTooltip,
    setActionTooltip,
    recording,
    isVoiceCaptureActive,
    voiceBusy,
    voiceStarting,
    loadingTelegramLinkKey,
    offlineMode: isNativeOfflineMode,
    onMicPress: openVoiceCaptureScreen,
    startVoiceCapture,
    stopVoiceCaptureAndSubmit,
    cancelVoiceCapture,
    voiceElapsedMs,
    voiceMaxDurationMs,
    openSettings,
    settingsOpen,
    closeSettings,
    timezoneDraft,
    handleTimezoneChange,
    timezoneError,
    generateTelegramLinkKey,
    telegramLinkKey,
    copyTelegramLinkKey,
    telegramCopyStatus,
    telegramLinkError,
    importingConversations,
    importError,
    handleOpenImportDialog,
    handleImportChatGptShareUrl,
    savingSettings,
    saveSettings,
    onLogout,
    keepSettingsVisible: true,
  };
  const filterDropdownProps = {
    styles,
    isSmallScreen,
    isFilterDropdownOpen,
    setIsFilterDropdownOpen,
    filterDropdownOpenedAtMs: filterDropdownOpenedAtMsRef.current,
    setFilterDropdownOpenedAtMs,
    closeOpenActionDrawer,
    showArchived,
    setShowArchived,
    hasActiveFilters,
    activeFilterCount,
    clearFilters,
    activePriorityLevel,
    setActivePriorityLevel,
    activeTag,
    setActiveTag,
    globalTags,
    tagUsageCounts,
    searchQuery,
    setSearchQuery,
    creatingEntries,
    offlineBanner: isNativeOfflineMode ? (
      <View style={styles.offlineBannerWrap} testID="offline-tools">
        <SecondBrainOfflineBanner
          styles={styles}
          offlineQueueSize={offlineQueueSize}
          onBannerPress={() => navigation.navigate("SecondBrainQueuedEdits")}
          onSyncPress={handleOfflineSync}
          syncInProgress={syncInProgress}
        />
      </View>
    ) : null,
    errorBanner: displayError ? (
      <Text style={styles.error}>{displayError}</Text>
    ) : importError ? (
      <Text style={styles.error}>{importError}</Text>
    ) : null,
  };

  return (
    <View style={styles.container}>
      <SecondBrainTypebar {...typebarProps}>
        <SecondBrainStatsGrid
          styles={styles}
          isSmallScreen={isSmallScreen}
          activeCategory={activeCategory}
          counts={categoryCounts}
          closeOpenActionDrawer={closeOpenActionDrawer}
          setActiveCategory={setActiveCategory}
        />

        <View>
          <SecondBrainFilterDropdown {...filterDropdownProps} />
        </View>

        <SecondBrainFlatList
          groupedRows={groupedRows}
          openActionDrawerId={openActionDrawerId}
          styles={styles}
          loadingEntries={loadingEntries}
          onRefresh={handlePullToRefresh}
          listBottomPadding={listBottomPadding}
          keyExtractor={keyExtractor}
          renderCell={renderCell}
          hasActiveFilters={hasActiveFilters}
          closeOpenActionDrawer={closeOpenActionDrawer}
          busyId={busyId}
          openSwipeId={openSwipeId}
          setOpenSwipeId={setOpenSwipeId}
          requestDelete={requestDelete}
          openEntry={openEntry}
          startEdit={startEdit}
          toggleArchiveWithConfirmation={toggleArchiveWithConfirmation}
          downloadIcs={downloadIcs}
          handleActionDrawerChange={handleActionDrawerChange}
          swipeActionWidth={SWIPE_ACTION_WIDTH}
          closeAnyActionDrawer={closeOpenActionDrawer}
          pullRefreshing={pullRefreshing}
          onEndReached={loadMoreEntries}
          loadingMoreEntries={loadingMoreEntries}
          hasMoreEntries={hasMoreEntries}
        />
      </SecondBrainTypebar>
    </View>
  );
}
