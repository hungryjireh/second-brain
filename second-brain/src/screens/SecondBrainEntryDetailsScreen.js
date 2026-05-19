import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import MarkdownBody from "../components/MarkdownBody";
import SecondBrainEntryPageLayout from "../components/SecondBrainEntryPageLayout";
import { apiRequest } from "../api";
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
        }))
        .filter((msg) => msg.text),
    };
  } catch {
    return null;
  }
}

const MAX_WEB_RENDERED_MESSAGES = 200;

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
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);
  const actionTriggerRef = useRef(null);
  const inlineActionsAnim = useRef(new Animated.Value(0)).current;
  const deleteConfirmTimeoutRef = useRef(null);
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
  const title = entry?.title || entry?.content || "Untitled";
  const summary = entry?.summary || entry?.content || "";
  const body = entry?.description || entry?.raw_text || entry?.content || "";
  const archiveLabel =
    entry?.category === "reminder"
      ? entry?.is_archived
        ? "Undo Done"
        : "Mark Done"
      : entry?.is_archived
        ? "Unarchive"
        : "Archive";
  const showInlineActions = isInlineActionsMounted;

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

  useEffect(
    () => () => {
      if (deleteConfirmTimeoutRef.current)
        clearTimeout(deleteConfirmTimeoutRef.current);
    },
    [],
  );

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

  async function handleToggleArchive() {
    if (!entry?.id || !token || isBusy) return;
    closeActionDrawer();
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
    if (!isDeleteConfirm) {
      setIsDeleteConfirm(true);
      if (deleteConfirmTimeoutRef.current)
        clearTimeout(deleteConfirmTimeoutRef.current);
      deleteConfirmTimeoutRef.current = setTimeout(() => {
        setIsDeleteConfirm(false);
        deleteConfirmTimeoutRef.current = null;
      }, 2500);
      return;
    }
    if (deleteConfirmTimeoutRef.current) {
      clearTimeout(deleteConfirmTimeoutRef.current);
      deleteConfirmTimeoutRef.current = null;
    }
    setIsDeleteConfirm(false);
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
      <View style={styles.entryPanelTitleRow}>
        {showInlineActions ? (
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
              onPress={handleDeleteEntry}
              disabled={isBusy}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  styles.mobileActionDrawerDeleteText,
                ]}
              >
                {isDeleteConfirm ? "Confirm Delete" : "Delete"}
              </Text>
            </Pressable>
          </Animated.View>
        ) : (
          <>
            <Text style={styles.entryPanelTitle}>{title}</Text>
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
          </>
        )}
      </View>
      <Text style={styles.entryPanelSummary}>{summary}</Text>
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
                      <MarkdownBody text={msg.text} styles={styles} />
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
