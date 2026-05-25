import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import MarkdownBody from "../components/MarkdownBody";
import SecondBrainConversationList from "../components/SecondBrainConversationList";
import { apiRequest } from "../api";
import { confirmAction } from "../utils/confirmAction";
import { formatPublishedDateTime } from "../utils/dateTimeUtils";
import {
  getLinkedBrainstormSessionId,
  readBrainstormSession,
} from "../utils/brainstormSessions";
import { normalizeTagValue, parseTagInput } from "../utils/secondBrainTagUtils";
import {
  parseBrainstormTranscriptFromEntry,
  parseImportedConversationFromEntry,
} from "../utils/secondBrainConversationParsers";
import { theme } from "../theme";
import styles from "./SecondBrainScreen.styles";

function parseBrainstormConversationFromSession(session) {
  if (!session || typeof session !== "object") return null;
  if (!Array.isArray(session.messages) || session.messages.length === 0)
    return null;

  const messages = session.messages
    .map((msg) => {
      const sender = msg?.role === "assistant" ? "assistant" : "human";
      const text = String(msg?.content ?? "").trim();
      if (!text) return null;
      return { sender, text, fileUrls: [] };
    })
    .filter(Boolean);

  if (messages.length === 0) return null;
  return { messages };
}

const CATEGORY_TAG_STYLES = {
  reminder: {
    bg: theme.colors.reminderTagBg,
    color: theme.colors.reminderTagText,
    label: "Reminder",
  },
  todo: {
    bg: theme.colors.todoDim,
    color: theme.colors.todoTagText,
    label: "TODO",
  },
  thought: {
    bg: theme.colors.thoughtDim,
    color: theme.colors.thoughtTagText,
    label: "Thought",
  },
  note: {
    bg: theme.colors.noteDim,
    color: theme.colors.noteTagText,
    label: "Note",
  },
};

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

function formatEntryTimestamp(value) {
  if (value === null || value === undefined || value === "") return "";
  const parsedDate =
    typeof value === "number" ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "";
  return formatPublishedDateTime(parsedDate);
}

function formatEntryRelativeTimestamp(value) {
  if (value === null || value === undefined || value === "") return "";
  const parsedDate =
    typeof value === "number" ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "";

  const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });

  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  const dayKey = dayKeyFormatter.format(parsedDate);
  const todayKey = dayKeyFormatter.format(now);
  const yesterdayKey = dayKeyFormatter.format(yesterday);
  const time = timeFormatter.format(parsedDate);

  if (dayKey === todayKey) return `Today · ${time}`;
  if (dayKey === yesterdayKey) return `Yesterday · ${time}`;
  return `${shortDateFormatter.format(parsedDate)} · ${time}`;
}

export default function SecondBrainEntryDetailsScreen({
  route,
  navigation,
  token: tokenFromProps,
}) {
  const entryFromRoute = route?.params?.entry ?? null;
  const entryId = route?.params?.entryId ?? entryFromRoute?.id ?? null;
  const token = tokenFromProps ?? null;
  const [entry, setEntry] = useState(entryFromRoute);
  const [brainstormConversation, setBrainstormConversation] = useState(null);
  const [isActionDrawerOpen, setIsActionDrawerOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagDraft, setNewTagDraft] = useState("");
  const [isSavingTag, setIsSavingTag] = useState(false);
  const [tagError, setTagError] = useState("");
  const importedConversation = useMemo(
    () => parseImportedConversationFromEntry(entry),
    [entry?.raw_text],
  );
  const brainstormTranscriptConversation = useMemo(
    () => parseBrainstormTranscriptFromEntry(entry),
    [entry?.description, entry?.raw_text],
  );
  const displayedConversation =
    importedConversation ||
    brainstormConversation ||
    brainstormTranscriptConversation;
  const categoryTag =
    CATEGORY_TAG_STYLES[entry?.category] ?? CATEGORY_TAG_STYLES.note;
  const title = entry?.title || entry?.content || "Untitled";
  const summary =
    entry?.content === null ? entry?.summary || "" : entry?.content || "";
  const body = entry?.description || entry?.raw_text || entry?.content || "";
  const createdLabel = formatEntryTimestamp(entry?.created_at);
  const updatedLabel = formatEntryRelativeTimestamp(entry?.updated_at);
  const reminderLabel = formatEntryTimestamp(entry?.remind_at);
  const parsedEntryTags = useMemo(
    () =>
      parseTagInput(
        Array.isArray(entry?.tags) ? entry.tags.join(",") : String(""),
      ),
    [entry?.tags],
  );
  const archiveLabel =
    entry?.category === "reminder"
      ? entry?.is_archived
        ? "Undo Done"
        : "Mark Done"
      : entry?.is_archived
        ? "Unarchive"
        : "Archive";
  useEffect(() => {
    setEntry(entryFromRoute);
  }, [entryFromRoute]);

  useLayoutEffect(() => {
    if (!navigation?.setOptions) return;
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open entry actions"
          onPress={() => {
            if (isActionDrawerOpen) {
              closeActionDrawer();
              return;
            }
            openActionDrawer();
          }}
          disabled={isBusy}
          style={styles.mobileActionTrigger}
        >
          <Feather
            name="more-vertical"
            size={18}
            style={styles.mobileActionTriggerIcon}
          />
        </Pressable>
      ),
    });
  }, [isActionDrawerOpen, isBusy, navigation]);

  useEffect(() => {
    async function loadEntryById() {
      if (!entryId || !token) return;
      if (entry?.id === entryId) return;
      try {
        const data = await apiRequest("/entries?limit=60", { token });
        const list = Array.isArray(data?.entries)
          ? data.entries
          : Array.isArray(data)
            ? data
            : [];
        const nextEntry = list.find(
          (item) => String(item?.id) === String(entryId),
        );
        if (nextEntry) setEntry(nextEntry);
      } catch {
        // Keep existing entry state when fetch fails.
      }
    }
    loadEntryById();
  }, [entry?.id, entryId, token]);

  useEffect(() => {
    let cancelled = false;
    async function loadBrainstormConversation() {
      if (!entry?.id || importedConversation) {
        if (!cancelled) setBrainstormConversation(null);
        return;
      }
      try {
        const sessionId = await getLinkedBrainstormSessionId(entry.id);
        if (!sessionId) {
          if (!cancelled) setBrainstormConversation(null);
          return;
        }
        const session = await readBrainstormSession(sessionId);
        if (cancelled) return;
        setBrainstormConversation(
          parseBrainstormConversationFromSession(session),
        );
      } catch {
        if (!cancelled) setBrainstormConversation(null);
      }
    }
    loadBrainstormConversation();
    return () => {
      cancelled = true;
    };
  }, [entry?.id, importedConversation]);

  function closeActionDrawer(onClosed) {
    setIsActionDrawerOpen(false);
    onClosed?.();
  }

  function openActionDrawer() {
    setIsActionDrawerOpen(true);
  }

  function handleEditEntry() {
    closeActionDrawer();
    if (navigation?.replace) {
      navigation.replace("SecondBrainEditEntry", { entryId, entry });
      return;
    }
    navigation?.navigate?.("SecondBrainEditEntry", { entryId, entry });
  }

  function handleContinueBrainstorming() {
    closeActionDrawer();
    navigation?.navigate?.("SecondBrainBrainstorm", { seedEntry: entry });
  }

  async function handleToggleArchive() {
    if (!entry?.id || !token || isBusy) return;
    closeActionDrawer();
    if (!entry?.is_archived) {
      const confirmed = await confirmArchiveEntry(entry);
      if (!confirmed) return;
    }
    setIsBusy(true);
    try {
      const updated = await apiRequest(`/entries?id=${entry.id}`, {
        method: "PATCH",
        token,
        body: { is_archived: !entry.is_archived },
      });
      setEntry(updated);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDeleteEntry() {
    if (!entry?.id || !token || isBusy) return;
    closeActionDrawer();
    const confirmed = await confirmDeleteEntry();
    if (!confirmed) return;
    setIsBusy(true);
    try {
      await apiRequest(`/entries?id=${entry.id}`, { method: "DELETE", token });
      if (navigation?.canGoBack?.()) navigation.goBack();
      else navigation?.navigate?.("SecondBrain");
    } finally {
      setIsBusy(false);
    }
  }

  function openAddTagInput() {
    setIsAddingTag(true);
    setTagError("");
  }

  function cancelAddTagInput() {
    setIsAddingTag(false);
    setNewTagDraft("");
    setTagError("");
  }

  async function handleAddTag() {
    if (!entry?.id || !token || isSavingTag || isBusy) return;
    const nextTag = normalizeTagValue(newTagDraft);
    if (!nextTag) {
      setTagError("Type a tag first.");
      return;
    }

    const mergedTags = parseTagInput([...parsedEntryTags, nextTag].join(","));
    if (mergedTags.length === parsedEntryTags.length) {
      setTagError("Tag already exists.");
      return;
    }

    setTagError("");
    setIsSavingTag(true);
    try {
      const updated = await apiRequest(`/entries?id=${entry.id}`, {
        method: "PATCH",
        token,
        body: { tags: mergedTags },
      });
      setEntry((prev) => ({
        ...(prev ?? {}),
        ...(updated && typeof updated === "object" ? updated : {}),
        tags: mergedTags,
      }));
      cancelAddTagInput();
    } catch (err) {
      setTagError(err?.message || "Failed to add tag.");
    } finally {
      setIsSavingTag(false);
    }
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.entryPanel,
          { maxWidth: "100%", maxHeight: "100%", flex: 1 },
          styles.entryDetailsPanelNoBackground,
        ]}
      >
        {isActionDrawerOpen ? (
          <>
            <Pressable
              testID="entry-actions-dismiss-overlay"
              style={styles.entryActionDismissOverlay}
              onPress={() => closeActionDrawer()}
            />
            <View
              testID="entry-actions-dropdown"
              style={[
                styles.mobileActionDrawer,
                styles.mobileActionDrawerPortal,
                { top: 8, right: 12 },
              ]}
            >
              <Pressable
                style={styles.mobileActionDrawerItem}
                onPress={handleEditEntry}
                disabled={isBusy}
              >
                <Text style={styles.mobileActionDrawerText}>Edit</Text>
              </Pressable>
              <Pressable
                style={styles.mobileActionDrawerItem}
                onPress={handleToggleArchive}
                disabled={isBusy}
              >
                <Text style={styles.mobileActionDrawerText}>
                  {archiveLabel}
                </Text>
              </Pressable>
              <Pressable
                style={styles.mobileActionDrawerItem}
                onPress={handleContinueBrainstorming}
                disabled={isBusy}
              >
                <Text style={styles.mobileActionDrawerText}>
                  Continue Brainstorming
                </Text>
              </Pressable>
              <Pressable
                style={styles.mobileActionDrawerItem}
                onPress={handleDeleteEntry}
                disabled={isBusy}
              >
                <Text
                  style={[
                    styles.mobileActionDrawerText,
                    styles.mobileActionDrawerDeleteText,
                  ]}
                >
                  Delete
                </Text>
              </Pressable>
            </View>
          </>
        ) : null}
        <View style={styles.entryCategoryMetaRow}>
          <View
            testID="entry-category-pill"
            style={[styles.tagPill, { backgroundColor: categoryTag.bg }]}
          >
            <Text style={[styles.tagPillText, { color: categoryTag.color }]}>
              {categoryTag.label}
            </Text>
          </View>
          {updatedLabel ? (
            <Text style={styles.entryLastUpdatedText}>{updatedLabel}</Text>
          ) : null}
        </View>
        <View
          testID="entry-title-row"
          style={[styles.entryPanelTitleRow, styles.entryPanelTitleRowLarge]}
        >
          <Text style={styles.entryPanelTitle}>{title}</Text>
        </View>
        <Text style={styles.entryPanelSummary}>{summary}</Text>
        {createdLabel ? (
          <View style={styles.metaInfoRow}>
            <Text style={styles.metaText}>{`Created ${createdLabel}`}</Text>
          </View>
        ) : null}
        {entry?.category === "reminder" && reminderLabel ? (
          <View style={styles.metaInfoRow}>
            <View style={styles.reminderMetaPill}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Feather name="clock" size={12} color={theme.colors.brand} />
                <Text style={styles.reminderMetaText}> {reminderLabel}</Text>
              </View>
            </View>
          </View>
        ) : null}
        <View style={styles.entryPanelTags}>
          {parsedEntryTags.map((tagName) => (
            <View
              key={tagName}
              style={[styles.itemTagPill, styles.entryDetailsTagPill]}
            >
              <Text style={styles.itemTagText}>#{tagName}</Text>
            </View>
          ))}
          {isAddingTag ? (
            <View style={styles.entryDetailsAddTagInputWrap}>
              <View style={styles.tagInputRow}>
                <TextInput
                  accessibilityLabel="Tag input"
                  value={newTagDraft}
                  onChangeText={(value) => {
                    setNewTagDraft(value);
                    setTagError("");
                  }}
                  style={[styles.editField, styles.tagInput]}
                  placeholder="Type a tag"
                  placeholderTextColor={theme.colors.textSecondary}
                />
                <Pressable
                  style={styles.secondaryButton}
                  onPress={handleAddTag}
                  disabled={isSavingTag || isBusy}
                >
                  <Text style={styles.secondaryButtonText}>
                    {isSavingTag ? "Adding..." : "Add"}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={cancelAddTagInput}
                  disabled={isSavingTag}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
              </View>
              {tagError ? (
                <Text
                  style={[styles.tagCountText, { color: theme.colors.danger }]}
                >
                  {tagError}
                </Text>
              ) : null}
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add tag"
              onPress={openAddTagInput}
              style={[styles.itemTagPill, styles.entryDetailsAddTagPill]}
            >
              <Text style={[styles.itemTagText, styles.entryDetailsAddTagText]}>
                + tag
              </Text>
            </Pressable>
          )}
        </View>
        <View style={[styles.entryPanelBodyWrap, { flex: 1 }]}>
          {displayedConversation ? (
            <SecondBrainConversationList
              messages={displayedConversation.messages}
              styles={styles}
              style={styles.entryPanelBodyScroll}
              contentContainerStyle={[
                styles.entryPanelBodyContent,
                styles.conversationWrap,
              ]}
              showWebHiddenMessageNotice
              maxWebRenderedMessages={200}
              hiddenMessageNoticeStyle={styles.entryPanelSummary}
            />
          ) : (
            <ScrollView
              style={styles.entryPanelBodyScroll}
              contentContainerStyle={styles.entryPanelBodyContent}
            >
              <MarkdownBody text={body} styles={styles} />
            </ScrollView>
          )}
        </View>
      </View>
    </View>
  );
}
