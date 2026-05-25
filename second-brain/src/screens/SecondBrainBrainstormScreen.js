import { useEffect, useMemo, useRef, useState } from "react";
import {
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
import SecondBrainEntryPageLayout from "../components/SecondBrainEntryPageLayout";
import SecondBrainTypebar from "../components/SecondBrainTypebar";
import { parseBrainstormTranscriptFromText } from "../utils/secondBrainConversationParsers";
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

function normalizeSessionMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .flatMap((message, index) => {
      const legacySender =
        message?.sender === "human" || message?.sender === "user"
          ? "user"
          : message?.sender === "assistant"
            ? "assistant"
            : "";
      const role =
        message?.role === "assistant"
          ? "assistant"
          : message?.role === "user"
            ? "user"
            : legacySender || "user";
      const content = String(message?.content ?? message?.text ?? "").trim();
      if (!content) return [];
      const createdAt =
        typeof message?.createdAt === "string" && message.createdAt.trim()
          ? message.createdAt
          : new Date().toISOString();
      const transcript = parseBrainstormTranscriptFromText(content);
      if (transcript?.messages?.length) {
        return transcript.messages.map((chunk, transcriptIndex) => ({
          id: `${createdAt}-${role}-${index}-${transcriptIndex}`,
          role: chunk.sender === "assistant" ? "assistant" : "user",
          content: chunk.text,
          createdAt,
        }));
      }
      const id =
        typeof message?.id === "string" && message.id.trim()
          ? message.id
          : `${createdAt}-${role}-${index}`;
      return [{ id, role, content, createdAt }];
    })
    .filter(Boolean);
}

function normalizeSession(session) {
  if (!session || typeof session !== "object") return session;
  return {
    ...session,
    messages: normalizeSessionMessages(session.messages),
  };
}

export default function SecondBrainBrainstormScreen({
  route,
  navigation,
  token,
}) {
  const insets = useSafeAreaInsets();
  const COMPOSER_MIN_HEIGHT = 38;
  const COMPOSER_MAX_HEIGHT = 160;
  const existingSessionId = route?.params?.sessionId || "";
  const seedEntry = route?.params?.seedEntry || null;
  const [session, setSession] = useState(null);
  const [draft, setDraft] = useState("");
  const [isTypebarExpanded, setIsTypebarExpanded] = useState(true);
  const [inputHeight, setInputHeight] = useState(COMPOSER_MIN_HEIGHT);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const finalizedRef = useRef(false);
  const sendInFlightRef = useRef(false);
  const finalizeInFlightRef = useRef({
    ended: false,
    wipSaved: false,
  });
  const sessionRef = useRef(null);
  const initialMessageCountRef = useRef(null);

  const messages = useMemo(() => session?.messages || [], [session?.messages]);
  const conversationMessages = useMemo(
    () =>
      messages.map((item) => ({
        id: item.id,
        sender: item.role === "assistant" ? "assistant" : "human",
        text: item.content,
        fileUrls: [],
      })),
    [messages],
  );
  const isWeb = Platform.OS === "web";
  const typebarBottom = 10 + Math.max(insets.bottom, 0) + keyboardOffset;
  const typebarHeight = Math.max(inputHeight + 12, 48);
  const messagesBottomPadding = typebarBottom + typebarHeight + 24;

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      let nextSession = null;
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
      if (!nextSession) {
        nextSession = await createBrainstormSession({
          entryId: seedEntry?.id,
          seedText:
            seedEntry?.raw_text ||
            seedEntry?.description ||
            seedEntry?.content ||
            "",
        });
      }
      const normalizedSession = normalizeSession(nextSession);
      if (!cancelled) {
        initialMessageCountRef.current = Array.isArray(
          normalizedSession?.messages,
        )
          ? normalizedSession.messages.length
          : 0;
        setSession(normalizedSession);
      }

      if (normalizedSession?.id) {
        await writeBrainstormSession(normalizedSession);
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

  async function finalizeSession({ mode, sessionOverride }) {
    const activeSession = sessionOverride || sessionRef.current || session;
    if (!activeSession) return;
    const isEnd = mode === "end";
    const guardKey = isEnd ? "ended" : "wipSaved";
    if (
      activeSession?.finalizeGuards?.[guardKey] ||
      finalizeInFlightRef.current[guardKey]
    ) {
      return;
    }
    finalizeInFlightRef.current[guardKey] = true;

    const transcript = toBrainstormTranscript(activeSession.messages);
    if (!transcript.trim()) return;

    const nextSession = {
      ...activeSession,
      lifecycle: isEnd ? "ended" : "wip-saved",
      updatedAt: new Date().toISOString(),
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
          description: transcript,
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
        description: transcript,
        tags: ["brainstorm"],
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

  async function sendMessage() {
    if (sendInFlightRef.current) return;
    const content = draft.trim();
    if (!content || !session || busy) return;
    sendInFlightRef.current = true;
    setError("");

    if (content === "/end") {
      setBusy(true);
      try {
        await finalizeSession({ mode: "end" });
        navigation?.goBack?.();
      } catch (err) {
        setError(String(err?.message || "Unable to end brainstorm."));
      } finally {
        setBusy(false);
        sendInFlightRef.current = false;
      }
      return;
    }

    const createdAt = new Date().toISOString();
    const userMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content,
      createdAt,
    };
    const pendingSession = {
      ...session,
      messages: [...messages, userMessage],
      updatedAt: createdAt,
      lifecycle: "active",
      // Session resumed with new user activity should allow a fresh finalize.
      finalizeGuards: {
        ended: false,
        wipSaved: false,
      },
    };

    setDraft("");
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
    <SecondBrainEntryPageLayout panelStyle={styles.fullScreenPanel}>
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
          onChangeDraft={(value) => {
            if (busy) return;
            setDraft(value);
          }}
          onSubmitDraft={sendMessage}
          closeOpenActionDrawer={noop}
          setTypebarFocused={noop}
          isTypebarExpanded={isTypebarExpanded}
          setIsTypebarExpanded={setIsTypebarExpanded}
          isSmallScreen={false}
          inputHeight={inputHeight}
          setInputHeight={(nextValue) => {
            setInputHeight((prev) => {
              const rawNext =
                typeof nextValue === "function" ? nextValue(prev) : nextValue;
              const safeNext = Number(rawNext);
              if (!Number.isFinite(safeNext)) return prev;
              const clamped = Math.max(
                COMPOSER_MIN_HEIGHT,
                Math.min(COMPOSER_MAX_HEIGHT, Math.ceil(safeNext)),
              );
              return prev === clamped ? prev : clamped;
            });
          }}
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
              messages={conversationMessages}
              styles={secondBrainScreenStyles}
              style={styles.messagesList}
              contentContainerStyle={[
                styles.messagesWrap,
                { paddingBottom: messagesBottomPadding },
                secondBrainScreenStyles.conversationWrap,
              ]}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        </SecondBrainTypebar>
      </KeyboardAvoidingView>
    </SecondBrainEntryPageLayout>
  );
}
