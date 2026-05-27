import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styles from "./SecondBrainBrainstormScreen.styles";
import secondBrainScreenStyles from "./SecondBrainScreen.styles";
import SecondBrainConversationList from "../components/SecondBrainConversationList";
import { apiRequest } from "../api";
import SecondBrainTypebar from "../components/SecondBrainTypebar";
import { parseBrainstormConversationFromSession } from "../utils/secondBrainConversationRendering";
import { parseStructuredEntryPayload } from "../utils/secondBrainStructuredEntryPayload";
import { repairLegacyTruncatedAssistantMessages } from "../utils/secondBrainConversationParsers";
import {
  createBrainstormSession,
  getLinkedBrainstormSessionId,
  linkEntryToBrainstormSession,
  readBrainstormSession,
  toBrainstormTranscript,
  writeBrainstormSession,
} from "../utils/brainstormSessions";

function prefixedWipTitle(title) {
  const clean = String(title || "").trim();
  if (!clean) return "[BRAINSTORMING] Untitled";
  if (clean.startsWith("[BRAINSTORMING]")) return clean;
  return `[BRAINSTORMING] ${clean}`;
}

function getSeedEntryText(seedEntry) {
  if (!seedEntry || typeof seedEntry !== "object") return "";
  return String(seedEntry.raw_text || seedEntry.description || "").trim();
}

function buildInitialBrainstormPrompt(seedEntry) {
  const seedText = getSeedEntryText(seedEntry);
  if (!seedText) return "";
  return `i want to brainstorm about: ${seedText}`;
}

function buildEndFinalizePrompt() {
  return [
    "Summarise this conversation between a human and an AI and generate structured entry fields.",
    'Return ONLY valid JSON with this exact shape: {"description":"...","title":"...","summary":"...","content":"..."}',
    "",
    "description must be a markdown string in this exact structure:",
    "# Conversation Summary\\nOne sentence overview.\\n\\n## Goal\\n- ...\\n\\n## Outputs & Decisions\\n- ...\\n\\n## To Revisit\\n- ...\\n\\n## Context to Remember\\n- ...",
    "",
    "Field rules:",
    "- Keep it concise and specific.",
    "- If a section has nothing to report, write: - None.",
    "- title: 3-8 words, specific, no markdown.",
    "- summary: one concise sentence, no markdown.",
    "- content: concise cleaned note in plain text, preserving important context and decisions.",
    "- description: use \\n for newlines, no code blocks, valid JSON string.",
  ].join("\n");
}

function parseEndFinalizeFromReply(replyText) {
  const fallback = {
    description: "",
    title: "",
    summary: "",
    content: "",
  };
  if (!replyText) return fallback;

  return parseStructuredEntryPayload(replyText) || fallback;
}

function looksLikeStructuredFinalizeResponse(text) {
  const value = String(text || "").toLowerCase();
  if (!value.trim()) return false;
  return (
    value.includes("```") ||
    value.includes('"title"') ||
    value.includes('"summary"') ||
    value.includes('"content"') ||
    value.includes('"description"')
  );
}

function getSubmittedDraftValue(overrideContent, draft) {
  if (typeof overrideContent === "string") return overrideContent;
  const submittedEventText = overrideContent?.nativeEvent?.text;
  if (typeof submittedEventText === "string") return submittedEventText;
  if (typeof draft === "string") return draft;
  return "";
}

export default function SecondBrainBrainstormScreen({
  route,
  navigation,
  token,
}) {
  const FINALIZING_MIN_VISIBLE_MS = 450;
  const insets = useSafeAreaInsets();
  const COMPOSER_MIN_HEIGHT = 38;
  const existingSessionId = route?.params?.sessionId || "";
  const seedEntry = route?.params?.seedEntry || null;
  const [session, setSession] = useState(null);
  const [draft, setDraft] = useState("");
  const [isTypebarExpanded, setIsTypebarExpanded] = useState(true);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [finalizingEnd, setFinalizingEnd] = useState(false);
  const [error, setError] = useState("");
  const [isTypebarFocused, setIsTypebarFocused] = useState(false);
  const draftRef = useRef("");
  const finalizedRef = useRef(false);
  const sendInFlightRef = useRef(false);
  const finalizeInFlightRef = useRef({
    ended: false,
    wipSaved: false,
  });
  const sessionRef = useRef(null);
  const initialMessageCountRef = useRef(null);
  const conversationListRef = useRef(null);
  const listViewportHeightRef = useRef(0);
  const listContentHeightRef = useRef(0);

  const messages = useMemo(() => session?.messages || [], [session?.messages]);
  const conversationMessages = useMemo(
    () => parseBrainstormConversationFromSession(session)?.messages || [],
    [session],
  );
  const isWeb = Platform.OS === "web";
  const typebarBottom = 10 + Math.max(insets.bottom, 0) + keyboardOffset;
  const typebarHeight = Math.max(COMPOSER_MIN_HEIGHT + 12, 48);
  const messagesBottomPadding = typebarBottom + typebarHeight + 24;

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      let nextSession = null;
      let shouldAutoSendSeedPrompt = false;
      let seedPrompt = "";
      if (existingSessionId) {
        nextSession = await readBrainstormSession(existingSessionId);
      }
      if (!nextSession && seedEntry?.id) {
        const linkedSessionId = await getLinkedBrainstormSessionId(
          seedEntry.id,
        );
        if (linkedSessionId) {
          nextSession = await readBrainstormSession(linkedSessionId);
        }
      }
      nextSession = repairLegacyTruncatedAssistantMessages(
        nextSession,
        seedEntry,
      );
      if (!nextSession) {
        nextSession = await createBrainstormSession({
          entryId: seedEntry?.id,
          seedText: "",
        });
        seedPrompt = buildInitialBrainstormPrompt(seedEntry);
        shouldAutoSendSeedPrompt = Boolean(seedPrompt);
      }
      if (!cancelled) {
        initialMessageCountRef.current = Array.isArray(nextSession?.messages)
          ? nextSession.messages.length
          : 0;
        setSession(nextSession);
      }

      if (nextSession?.id) {
        await writeBrainstormSession(nextSession);
      }

      if (!cancelled && shouldAutoSendSeedPrompt && nextSession) {
        await sendMessage(seedPrompt, nextSession);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [
    existingSessionId,
    seedEntry?.content,
    seedEntry?.description,
    seedEntry?.id,
    seedEntry?.raw_text,
  ]);

  async function persistSession(next) {
    setSession(next);
    await writeBrainstormSession(next);
  }

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  function scrollConversationToBottom() {
    const contentHeight = listContentHeightRef.current;
    const viewportHeight = listViewportHeightRef.current;
    if (!contentHeight || !viewportHeight) {
      conversationListRef.current?.scrollToEnd?.({ animated: false });
      return;
    }
    const targetOffset = Math.max(0, contentHeight - viewportHeight);
    if (typeof conversationListRef.current?.scrollToOffset === "function") {
      conversationListRef.current.scrollToOffset({
        offset: targetOffset,
        animated: false,
      });
      return;
    }
    conversationListRef.current?.scrollTo?.({
      y: targetOffset,
      animated: false,
    });
  }

  function scrollConversationToLatestAssistantTail() {
    const assistantMessageExists = messages.some(
      (message) => message?.role === "assistant",
    );
    if (!assistantMessageExists) return;
    scrollConversationToBottom();
  }

  useEffect(() => {
    if (!isTypebarFocused) return undefined;
    const assistantMessageExists = messages.some(
      (message) => message?.role === "assistant",
    );
    if (!assistantMessageExists) return undefined;

    const timeouts = [setTimeout(scrollConversationToLatestAssistantTail, 0)];

    return () => {
      timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    };
  }, [isTypebarFocused, keyboardOffset, messages]);

  useEffect(() => {
    if (!finalizingEnd) return undefined;
    const timeouts = [
      setTimeout(scrollConversationToBottom, 0),
      setTimeout(scrollConversationToBottom, 120),
    ];
    return () => {
      timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    };
  }, [conversationMessages.length, finalizingEnd, keyboardOffset]);

  async function finalizeSession({ mode, sessionOverride }) {
    const activeSession = sessionOverride || sessionRef.current || session;
    if (!activeSession) return;
    const isEnd = mode === "end";
    const guardKey = isEnd ? "ended" : "wipSaved";
    if (
      (!isEnd && activeSession?.finalizeGuards?.[guardKey]) ||
      finalizeInFlightRef.current[guardKey]
    ) {
      return;
    }
    finalizeInFlightRef.current[guardKey] = true;

    const transcript = toBrainstormTranscript(activeSession.messages);
    if (!transcript.trim()) return;
    let descriptionToSave = transcript;
    let generatedEntryFields = {
      title: "",
      summary: "",
      content: "",
    };

    if (isEnd) {
      try {
        const history = (activeSession.messages || []).map((item) => ({
          role: item.role === "assistant" ? "assistant" : "user",
          content: item.content,
        }));
        const endResponse = await apiRequest("/brainstorm", {
          method: "POST",
          token,
          body: {
            message: buildEndFinalizePrompt(),
            history,
          },
        });
        const parsedFinalize = parseEndFinalizeFromReply(endResponse?.reply);
        const parsedDescription = String(
          parsedFinalize?.description || "",
        ).trim();
        if (parsedDescription) {
          descriptionToSave = parsedDescription;
        } else {
          const plainSummary = String(endResponse?.reply || "").trim();
          const looksLikeMarkdownSummary = /^#{1,6}\s/m.test(plainSummary);
          if (
            plainSummary &&
            !looksLikeStructuredFinalizeResponse(plainSummary) &&
            looksLikeMarkdownSummary
          ) {
            descriptionToSave = plainSummary;
          }
        }
        generatedEntryFields = {
          title: parsedFinalize.title,
          summary: parsedFinalize.summary,
          content: parsedFinalize.content,
        };
      } catch {
        // Fall back to transcript if summary generation fails.
      }
    }

    const nextSession = {
      ...activeSession,
      lifecycle: isEnd ? "ended" : "wip-saved",
      updatedAt: new Date().toISOString(),
      hasEndedSummary: Boolean(activeSession?.hasEndedSummary || isEnd),
      finalizeGuards: {
        ended: Boolean(activeSession?.finalizeGuards?.ended || isEnd),
        wipSaved: Boolean(activeSession?.finalizeGuards?.wipSaved || !isEnd),
      },
    };

    finalizedRef.current = true;
    await persistSession(nextSession);

    const hasExistingEntryId =
      nextSession?.entryId !== null && nextSession?.entryId !== undefined;

    if (hasExistingEntryId) {
      const updated = await apiRequest(`/entries?id=${nextSession.entryId}`, {
        method: "PATCH",
        token,
        body: {
          description: descriptionToSave,
          raw_text: transcript,
          ...(isEnd && generatedEntryFields.title
            ? { title: generatedEntryFields.title }
            : {}),
          ...(isEnd && generatedEntryFields.summary
            ? { summary: generatedEntryFields.summary }
            : {}),
          ...(isEnd && generatedEntryFields.content
            ? { content: generatedEntryFields.content }
            : isEnd && descriptionToSave
              ? { content: descriptionToSave }
              : {}),
        },
      });
      if (!isEnd) {
        await apiRequest(`/entries?id=${nextSession.entryId}`, {
          method: "PATCH",
          token,
          body: {
            title: prefixedWipTitle(updated?.title),
          },
        });
      }
      await linkEntryToBrainstormSession(nextSession.entryId, nextSession.id);
      return;
    }

    const created = await apiRequest("/entries", {
      method: "POST",
      token,
      body: {
        description: descriptionToSave,
        raw_text: transcript,
        tags: ["brainstorm"],
        ...(isEnd && generatedEntryFields.title
          ? { title: generatedEntryFields.title }
          : {}),
        ...(isEnd && generatedEntryFields.summary
          ? { summary: generatedEntryFields.summary }
          : {}),
        ...(isEnd && generatedEntryFields.content
          ? { content: generatedEntryFields.content }
          : isEnd && descriptionToSave
            ? { content: descriptionToSave }
            : {}),
      },
    });
    if (created?.id) {
      const savedSession = {
        ...nextSession,
        entryId: created.id,
      };
      await persistSession(savedSession);
      if (!isEnd) {
        await apiRequest(`/entries?id=${created.id}`, {
          method: "PATCH",
          token,
          body: {
            title: prefixedWipTitle(created?.title),
          },
        });
      }
      await linkEntryToBrainstormSession(created.id, savedSession.id);
    }
  }

  async function sendMessage(overrideContent, baseSessionOverride) {
    const content = getSubmittedDraftValue(
      overrideContent,
      draftRef.current,
    ).trim();
    const baseSession = baseSessionOverride || session;
    const isEndCommand = /^\/end(?:\s+.*)?$/i.test(content);
    if (!content || !baseSession) return;

    if (isEndCommand) {
      if (finalizingEnd || finalizeInFlightRef.current.ended) return;
      const hadSendInFlight = sendInFlightRef.current;
      const hadBusy = busy;
      if (!hadSendInFlight) {
        sendInFlightRef.current = true;
      }
      setError("");
      const finalizeVisibleAt = Date.now();
      setBusy(true);
      setFinalizingEnd(true);
      finalizedRef.current = true;
      try {
        const finalizePromise = finalizeSession({ mode: "end" });
        await finalizePromise;
        const finalizeElapsedMs = Date.now() - finalizeVisibleAt;
        if (finalizeElapsedMs < FINALIZING_MIN_VISIBLE_MS) {
          await new Promise((resolve) => {
            setTimeout(resolve, FINALIZING_MIN_VISIBLE_MS - finalizeElapsedMs);
          });
        }
        navigation?.goBack?.();
      } catch (err) {
        finalizedRef.current = false;
        setError(String(err?.message || "Unable to end brainstorm."));
      } finally {
        setFinalizingEnd(false);
        if (!hadBusy) {
          setBusy(false);
        }
        if (!hadSendInFlight) {
          sendInFlightRef.current = false;
        }
      }
      return;
    }

    if (sendInFlightRef.current || busy) return;
    sendInFlightRef.current = true;
    setError("");

    const createdAt = new Date().toISOString();
    const userMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content,
      createdAt,
    };
    const pendingSession = {
      ...baseSession,
      messages: [...(baseSession.messages || []), userMessage],
      updatedAt: createdAt,
      lifecycle: "active",
      // Session resumed with new user activity should allow a fresh finalize.
      finalizeGuards: {
        ended: false,
        wipSaved: false,
      },
    };

    if (!overrideContent) {
      draftRef.current = "";
      setDraft("");
    }
    setBusy(true);

    try {
      await persistSession(pendingSession);
      const history = pendingSession.messages.slice(0, -1).map((item) => ({
        role: item.role,
        content: item.content,
      }));
      const response = await apiRequest("/brainstorm", {
        method: "POST",
        token,
        body: {
          message: content,
          history,
        },
      });
      const assistantMessage = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: String(
          response?.reply || "Let's keep exploring this idea.",
        ).trim(),
        createdAt: new Date().toISOString(),
      };
      const next = {
        ...pendingSession,
        messages: [...pendingSession.messages, assistantMessage],
        updatedAt: assistantMessage.createdAt,
      };
      await persistSession(next);
    } catch (err) {
      setError(String(err?.message || "Unable to fetch assistant response."));
    } finally {
      setBusy(false);
      sendInFlightRef.current = false;
    }
  }

  function noop() {}

  useEffect(() => {
    return () => {
      const latestSession = sessionRef.current;
      if (!latestSession || finalizedRef.current) return;
      if (latestSession.lifecycle !== "active") return;
      const initialMessageCount =
        typeof initialMessageCountRef.current === "number"
          ? initialMessageCountRef.current
          : 0;
      const currentMessageCount = Array.isArray(latestSession.messages)
        ? latestSession.messages.length
        : 0;
      if (currentMessageCount <= initialMessageCount) return;
      finalizeSession({ mode: "wip", sessionOverride: latestSession }).catch(
        () => {},
      );
    };
  }, []);

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

  return (
    <View style={secondBrainScreenStyles.container}>
      <View
        style={[
          secondBrainScreenStyles.entryPanel,
          { maxWidth: "100%", maxHeight: "100%", flex: 1 },
          styles.fullScreenPanel,
        ]}
      >
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          enabled={Platform.OS !== "web"}
        >
          <SecondBrainTypebar
            styles={secondBrainScreenStyles}
            bottom={typebarBottom}
            placeholder="Share your thought, or type /end"
            draft={draft}
            submitDisabled={finalizingEnd}
            onChangeDraft={(value) => {
              draftRef.current = value;
              setDraft(value);
            }}
            onSubmitDraft={sendMessage}
            closeOpenActionDrawer={noop}
            setTypebarFocused={(focused) => {
              setIsTypebarFocused(focused);
              if (focused) {
                requestAnimationFrame(() => {
                  scrollConversationToLatestAssistantTail();
                });
              }
            }}
            isTypebarExpanded={isTypebarExpanded}
            setIsTypebarExpanded={setIsTypebarExpanded}
            isSmallScreen={false}
            hideTypebarSideActions
            actionTooltip=""
            setActionTooltip={noop}
            recording={false}
            isVoiceCaptureActive={false}
            voiceBusy={busy}
            voiceStarting={false}
            loadingTelegramLinkKey={false}
            startVoiceCapture={noop}
            stopVoiceCaptureAndSubmit={noop}
            cancelVoiceCapture={noop}
            voiceElapsedMs={0}
            voiceMaxDurationMs={0}
            openSettings={noop}
            settingsOpen={false}
            closeSettings={noop}
            timezoneDraft=""
            handleTimezoneChange={noop}
            timezoneError=""
            generateTelegramLinkKey={noop}
            telegramLinkKey=""
            copyTelegramLinkKey={noop}
            telegramCopyStatus=""
            telegramLinkError=""
            importingConversations={false}
            importError=""
            handleOpenImportDialog={noop}
            handleImportChatGptShareUrl={noop}
            savingSettings={false}
            saveSettings={noop}
            onLogout={noop}
            alwaysExpanded
          >
            <View style={styles.container}>
              <SecondBrainConversationList
                listRef={conversationListRef}
                onListLayout={(event) => {
                  listViewportHeightRef.current =
                    event?.nativeEvent?.layout?.height || 0;
                  if (isTypebarFocused || finalizingEnd) {
                    requestAnimationFrame(() => {
                      scrollConversationToBottom();
                    });
                  }
                }}
                onListContentSizeChange={(_, contentHeight) => {
                  listContentHeightRef.current = contentHeight || 0;
                  if (isTypebarFocused || finalizingEnd) {
                    requestAnimationFrame(() => {
                      scrollConversationToBottom();
                    });
                  }
                }}
                messages={conversationMessages}
                styles={secondBrainScreenStyles}
                style={styles.messagesList}
                contentContainerStyle={[
                  styles.messagesWrap,
                  { paddingBottom: messagesBottomPadding },
                  secondBrainScreenStyles.conversationWrap,
                ]}
                footer={
                  finalizingEnd ? (
                    <View
                      style={styles.finalizingWrap}
                      accessibilityLabel="Finalizing brainstorm"
                    >
                      <ActivityIndicator size="small" />
                      <Text style={styles.finalizingText}>Finalizing...</Text>
                    </View>
                  ) : null
                }
                showWebHiddenMessageNotice
                maxWebRenderedMessages={200}
                hiddenMessageNoticeStyle={
                  secondBrainScreenStyles.entryPanelSummary
                }
                renderInline
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          </SecondBrainTypebar>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}
