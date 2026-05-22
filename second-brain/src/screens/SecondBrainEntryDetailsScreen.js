import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import MarkdownBody from "../components/MarkdownBody";
import SecondBrainEntryPageLayout from "../components/SecondBrainEntryPageLayout";
import { apiRequest } from "../api";
import { confirmAction } from "../utils/confirmAction";
import { formatPublishedDateTime } from "../utils/dateTimeUtils";
import { theme } from "../theme";
import styles from "./SecondBrainScreen.styles";

function parseImportedConversationFromEntry(entry) {
  const rawText = String(entry?.raw_text ?? "").trim();
  if (!rawText.startsWith("{")) return null;

  try {
    const parsed = JSON.parse(rawText);
    if (parsed?._format !== "chat_conversation_v1") return null;
    if (!Array.isArray(parsed.messages) || parsed.messages.length === 0)
      return null;
    return {
      messages: parsed.messages
        .map((msg) => ({
          sender: msg?.sender === "human" ? "human" : "assistant",
          text: String(msg?.text ?? "").trim(),
          fileUrls: Array.isArray(msg?.files)
            ? msg.files
                .map((file) => String(file?.url ?? "").trim())
                .filter(Boolean)
            : [],
        }))
        .filter((msg) => msg.text),
    };
  } catch {
    return null;
  }
}

const MAX_WEB_RENDERED_MESSAGES = 200;
const SMALL_SCREEN_BREAKPOINT = 720;
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

export default function SecondBrainEntryDetailsScreen({
  route,
  navigation,
  token: tokenFromProps,
}) {
  const entryFromRoute = route?.params?.entry ?? null;
  const entryId = route?.params?.entryId ?? entryFromRoute?.id ?? null;
  const token = tokenFromProps ?? null;
  const [entry, setEntry] = useState(entryFromRoute);
  const [isActionDrawerOpen, setIsActionDrawerOpen] = useState(false);
  const [isInlineActionsMounted, setIsInlineActionsMounted] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const actionTriggerRef = useRef(null);
  const inlineActionsAnim = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const importedConversation = useMemo(
    () => parseImportedConversationFromEntry(entry),
    [entry?.raw_text],
  );
  const isWeb = Platform.OS === "web";
  const renderedMessages = useMemo(() => {
    if (!importedConversation?.messages) return [];
    if (
      !isWeb ||
      importedConversation.messages.length <= MAX_WEB_RENDERED_MESSAGES
    )
      return importedConversation.messages;
    return importedConversation.messages.slice(0, MAX_WEB_RENDERED_MESSAGES);
  }, [importedConversation, isWeb]);
  const hasHiddenMessages = Boolean(
    isWeb && importedConversation?.messages?.length > renderedMessages.length,
  );
  const categoryTag =
    CATEGORY_TAG_STYLES[entry?.category] ?? CATEGORY_TAG_STYLES.note;
  const title = entry?.title || entry?.content || "Untitled";
  const summary =
    entry?.content === null ? entry?.summary || "" : entry?.content || "";
  const body = entry?.description || entry?.raw_text || entry?.content || "";
  const createdLabel = formatEntryTimestamp(entry?.created_at);
  const updatedLabel = formatEntryTimestamp(entry?.updated_at);
  const reminderLabel = formatEntryTimestamp(entry?.remind_at);
  const archiveLabel =
    entry?.category === "reminder"
      ? entry?.is_archived
        ? "Undo Done"
        : "Mark Done"
      : entry?.is_archived
        ? "Unarchive"
        : "Archive";
  const isSmallScreen = width < SMALL_SCREEN_BREAKPOINT;
  const showInlineActions = isInlineActionsMounted;
  const shouldReplaceTitleWithActions = isSmallScreen && showInlineActions;
  const shouldShowInlineActionsBesideTitle =
    !isSmallScreen && showInlineActions;

  useEffect(() => {
    setEntry(entryFromRoute);
  }, [entryFromRoute]);

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

  function closeActionDrawer(onClosed) {
    if (!isInlineActionsMounted) {
      setIsActionDrawerOpen(false);
      onClosed?.();
      return;
    }
    setIsActionDrawerOpen(false);
    Animated.timing(inlineActionsAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setIsInlineActionsMounted(false);
      onClosed?.();
    });
  }

  function openActionDrawer() {
    if (isInlineActionsMounted) return;
    setIsActionDrawerOpen(true);
    inlineActionsAnim.setValue(0);
    setIsInlineActionsMounted(true);
    Animated.timing(inlineActionsAnim, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
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

  return (
    <SecondBrainEntryPageLayout>
      {isActionDrawerOpen ? (
        <Pressable
          testID="entry-actions-dismiss-overlay"
          style={styles.entryActionDismissOverlay}
          onPress={() => closeActionDrawer()}
        />
      ) : null}
      <View
        testID="entry-category-pill"
        style={[styles.tagPill, { backgroundColor: categoryTag.bg }]}
      >
        <Text style={[styles.tagPillText, { color: categoryTag.color }]}>
          {categoryTag.label}
        </Text>
      </View>
      <View
        testID="entry-title-row"
        style={[
          styles.entryPanelTitleRow,
          !isSmallScreen && styles.entryPanelTitleRowLarge,
        ]}
      >
        {shouldReplaceTitleWithActions ? (
          <Animated.View
            style={[
              styles.mobileInlineActionsRow,
              {
                opacity: inlineActionsAnim,
                transform: [
                  {
                    translateX: inlineActionsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [16, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Pressable
              style={styles.secondaryButton}
              onPress={handleEditEntry}
              disabled={isBusy}
            >
              <Text style={styles.secondaryButtonText}>Edit</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={handleToggleArchive}
              disabled={isBusy}
            >
              <Text style={styles.secondaryButtonText}>{archiveLabel}</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={handleContinueBrainstorming}
              disabled={isBusy}
            >
              <Text style={styles.secondaryButtonText}>
                Continue Brainstorming
              </Text>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={handleDeleteEntry}
              disabled={isBusy}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  styles.mobileActionDrawerDeleteText,
                ]}
              >
                Delete
              </Text>
            </Pressable>
          </Animated.View>
        ) : (
          <>
            <Text style={styles.entryPanelTitle}>{title}</Text>
            {shouldShowInlineActionsBesideTitle ? (
              <Animated.View
                testID="entry-inline-actions-large"
                style={[
                  styles.mobileInlineActionsRow,
                  styles.entryPanelInlineActionsLarge,
                  {
                    opacity: inlineActionsAnim,
                    transform: [
                      {
                        translateX: inlineActionsAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [16, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Pressable
                  style={styles.secondaryButton}
                  onPress={handleEditEntry}
                  disabled={isBusy}
                >
                  <Text style={styles.secondaryButtonText}>Edit</Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={handleToggleArchive}
                  disabled={isBusy}
                >
                  <Text style={styles.secondaryButtonText}>{archiveLabel}</Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={handleContinueBrainstorming}
                  disabled={isBusy}
                >
                  <Text style={styles.secondaryButtonText}>
                    Continue Brainstorming
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={handleDeleteEntry}
                  disabled={isBusy}
                >
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      styles.mobileActionDrawerDeleteText,
                    ]}
                  >
                    Delete
                  </Text>
                </Pressable>
              </Animated.View>
            ) : (
              <View style={styles.mobileActionDrawerWrap}>
                <Pressable
                  ref={actionTriggerRef}
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
                  {isBusy ? (
                    <Text style={styles.mobileActionTriggerText}>...</Text>
                  ) : (
                    <Text style={styles.mobileActionTriggerText}>...</Text>
                  )}
                </Pressable>
              </View>
            )}
          </>
        )}
      </View>
      <Text style={styles.entryPanelSummary}>{summary}</Text>
      {createdLabel || updatedLabel ? (
        <View style={styles.metaInfoRow}>
          {createdLabel ? (
            <Text style={styles.metaText}>{`Created ${createdLabel}`}</Text>
          ) : null}
          {createdLabel && updatedLabel ? (
            <Text style={styles.metaDot}>•</Text>
          ) : null}
          {updatedLabel ? (
            <Text style={styles.metaText}>{`Updated ${updatedLabel}`}</Text>
          ) : null}
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
      {Array.isArray(entry?.tags) && entry.tags.length > 0 ? (
        <View style={styles.entryPanelTags}>
          {entry.tags.map((tagName) => (
            <View key={tagName} style={styles.itemTagPill}>
              <Text style={styles.itemTagText}>#{tagName}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <View style={[styles.entryPanelBodyWrap, { flex: 1 }]}>
        <ScrollView
          style={styles.entryPanelBodyScroll}
          contentContainerStyle={styles.entryPanelBodyContent}
        >
          {importedConversation ? (
            <View style={styles.conversationWrap}>
              {renderedMessages.map((msg, idx) => {
                const fromHuman = msg.sender === "human";
                return (
                  <View
                    key={`${msg.sender}-${idx}`}
                    style={[
                      styles.conversationRow,
                      fromHuman
                        ? styles.conversationRowHuman
                        : styles.conversationRowAssistant,
                    ]}
                  >
                    <View
                      style={[
                        styles.conversationBubble,
                        fromHuman
                          ? styles.conversationBubbleHuman
                          : styles.conversationBubbleAssistant,
                      ]}
                    >
                      <Text style={styles.conversationSender}>
                        {fromHuman ? "You" : "Assistant"}
                      </Text>
                      <MarkdownBody
                        text={msg.text}
                        fileUrls={msg.fileUrls}
                        styles={styles}
                      />
                    </View>
                  </View>
                );
              })}
              {hasHiddenMessages ? (
                <Text style={styles.entryPanelSummary}>
                  {`Showing first ${MAX_WEB_RENDERED_MESSAGES} messages on web for performance.`}
                </Text>
              ) : null}
            </View>
          ) : (
            <MarkdownBody text={body} styles={styles} />
          )}
        </ScrollView>
      </View>
    </SecondBrainEntryPageLayout>
  );
}
