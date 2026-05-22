import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from "react-native";
import styles from "./SecondBrainBrainstormScreen.styles";
import secondBrainScreenStyles from "./SecondBrainScreen.styles";
import { apiRequest } from "../api";
import SecondBrainEntryPageLayout from "../components/SecondBrainEntryPageLayout";
import SecondBrainTypebar from "../components/SecondBrainTypebar";
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

export default function SecondBrainBrainstormScreen({
  route,
  navigation,
  token,
}) {
  const COMPOSER_MIN_HEIGHT = 42;
  const COMPOSER_MAX_HEIGHT = 160;
  const existingSessionId = route?.params?.sessionId || "";
  const seedEntry = route?.params?.seedEntry || null;
  const [session, setSession] = useState(null);
  const [draft, setDraft] = useState("");
  const [inputHeight, setInputHeight] = useState(COMPOSER_MIN_HEIGHT);
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
      if (!cancelled) {
        initialMessageCountRef.current = Array.isArray(nextSession?.messages)
          ? nextSession.messages.length
          : 0;
        setSession(nextSession);
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

    const created = await apiRequest("/entries", {
      method: "POST",
      token,
      body: {
        description: transcript,
        tags: ["brainstorm"],
      },
    });

    if (!isEnd && created?.id) {
      await apiRequest(`/entries?id=${created.id}`, {
        method: "PATCH",
        token,
        body: {
          title: prefixedWipTitle(created?.title),
        },
      });
    }

    if (created?.id) {
      await linkEntryToBrainstormSession(created.id, nextSession.id);
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

  return (
    <SecondBrainEntryPageLayout panelStyle={styles.fullScreenPanel}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        enabled={Platform.OS !== "web"}
      >
        <SecondBrainTypebar
          styles={secondBrainScreenStyles}
          bottom={10}
          placeholder="Share your thought, or type /end"
          draft={draft}
          onChangeDraft={(value) => {
            if (busy) return;
            setDraft(value);
          }}
          onSubmitDraft={sendMessage}
          closeOpenActionDrawer={noop}
          setTypebarFocused={noop}
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
        >
          <View style={styles.container}>
            <FlatList
              style={styles.messagesList}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesWrap}
              renderItem={({ item }) => {
                const isUser = item.role === "user";
                return (
                  <View
                    style={[
                      styles.messageRow,
                      isUser ? styles.userRow : styles.assistantRow,
                    ]}
                  >
                    <View
                      style={[
                        styles.bubble,
                        isUser ? styles.userBubble : styles.assistantBubble,
                      ]}
                    >
                      <Text style={styles.roleLabel}>
                        {isUser ? "You" : "Assistant"}
                      </Text>
                      <Text style={styles.messageText}>{item.content}</Text>
                    </View>
                  </View>
                );
              }}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        </SecondBrainTypebar>
      </KeyboardAvoidingView>
    </SecondBrainEntryPageLayout>
  );
}
