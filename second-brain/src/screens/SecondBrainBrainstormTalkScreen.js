import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import styles from "./SecondBrainBrainstormTalkScreen.styles";
import secondBrainScreenStyles from "./SecondBrainScreen.styles";
import SecondBrainVoiceCaptureLayout from "../components/SecondBrainVoiceCaptureLayout";
import SecondBrainConversationList from "../components/SecondBrainConversationList";
import SecondBrainMicrophoneButton from "../components/SecondBrainMicrophoneButton";
import { apiRequest } from "../api";
import { parseBrainstormConversationFromSession } from "../utils/secondBrainConversationRendering";
import { parseStructuredEntryPayload } from "../utils/secondBrainStructuredEntryPayload";
import { buildBrainstormHistory } from "../utils/brainstormPrompting";
import {
  BRAINSTORM_SESSION_MODES,
  createBrainstormSession,
  getLinkedBrainstormSessionId,
  linkEntryToBrainstormSession,
  normalizeBrainstormSession,
  readBrainstormSession,
  toBrainstormTranscript,
  writeBrainstormSession,
} from "../utils/brainstormSessions";
import {
  BRAINSTORM_TALK_STREAMING_ENABLED,
  playBrainstormTalkAudio,
  requestBrainstormTalkStreamTurn,
  stopBrainstormTalkPlayback,
  synthesizeBrainstormTalkAudio,
  transcribeBrainstormTalkAudio,
} from "../services/unrealSpeechService";
import useBrainstormTalkStreaming from "../hooks/useBrainstormTalkStreaming";
import { createBrainstormTalkStreamingTransport } from "../services/brainstormTalkStreamingTransport";

const TALK_STATE = {
  IDLE: "idle",
  LISTENING: "listening",
  PAUSED: "paused",
  TRANSCRIBING: "transcribing",
  WAITING_LLM: "waiting-llm",
  SPEAKING: "speaking",
  ERROR: "error",
};
const VOICE_RECORDING_PRESET =
  RecordingPresets.LOW_QUALITY ?? RecordingPresets.HIGH_QUALITY;
const TALK_CONTROLS_STACK_HEIGHT = 320;
const EMPTY_TRANSCRIPT_ERROR =
  "I couldn't hear any words. Please speak again and then press Pause & transcribe.";
const STREAMING_PREFETCH_MIN_WORDS = 8;

function prefixedWipTitle(title) {
  const clean = String(title || "").trim();
  if (!clean) return "[BRAINSTORMING] Untitled";
  if (clean.startsWith("[BRAINSTORMING]")) return clean;
  return `[BRAINSTORMING] ${clean}`;
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

function canStartListening(stateValue) {
  return (
    stateValue !== TALK_STATE.TRANSCRIBING &&
    stateValue !== TALK_STATE.WAITING_LLM
  );
}

export default function SecondBrainBrainstormTalkScreen({
  route,
  navigation,
  token,
}) {
  const FINALIZING_MIN_VISIBLE_MS = 450;
  const insets = useSafeAreaInsets();
  const existingSessionId = route?.params?.sessionId || "";
  const seedEntry = route?.params?.seedEntry || null;
  const [session, setSession] = useState(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [talkState, setTalkState] = useState(TALK_STATE.IDLE);
  const [finalizingEnd, setFinalizingEnd] = useState(false);
  const [error, setError] = useState("");
  const [pendingUserTranscript, setPendingUserTranscript] = useState("");
  const pendingUserTranscriptRef = useRef("");
  const sessionRef = useRef(null);
  const talkStateRef = useRef(TALK_STATE.IDLE);
  const finalizedRef = useRef(false);
  const initialMessageCountRef = useRef(0);
  const finalizeInFlightRef = useRef({ ended: false, wipSaved: false });
  const micPermissionGrantedRef = useRef(false);
  const audioRecordingModeEnabledRef = useRef(false);
  const audioRecorder = useAudioRecorder(VOICE_RECORDING_PRESET);
  const recorderState = useAudioRecorderState(audioRecorder);
  const recording = Boolean(recorderState?.isRecording);
  const conversationListRef = useRef(null);
  const listViewportHeightRef = useRef(0);
  const listContentHeightRef = useRef(0);
  const micSlideY = useRef(new Animated.Value(0)).current;
  const speculativeDraftReplyRef = useRef("");
  const speculativeDraftSourceRef = useRef("");
  const streamingTransportRef = useRef(null);
  if (!streamingTransportRef.current) {
    streamingTransportRef.current = createBrainstormTalkStreamingTransport();
  }

  const conversationMessages = useMemo(
    () => parseBrainstormConversationFromSession(session)?.messages || [],
    [session],
  );
  const shouldHideIntro = Boolean(
    String(pendingUserTranscript || "").trim() || conversationMessages.length,
  );
  const isWeb = Platform.OS === "web";
  const controlsBottomPadding =
    TALK_CONTROLS_STACK_HEIGHT + Math.max(insets.bottom, 0) + keyboardOffset;
  const messagesBottomPadding = controlsBottomPadding + 24;

  function scrollConversationToBottom() {
    conversationListRef.current?.scrollToEnd?.({ animated: false });
  }

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
          mode: BRAINSTORM_SESSION_MODES.TALK,
        });
      }
      nextSession = normalizeBrainstormSession({
        ...nextSession,
        mode: BRAINSTORM_SESSION_MODES.TALK,
      });
      if (nextSession?.id) {
        await writeBrainstormSession(nextSession);
      }
      if (cancelled) return;
      initialMessageCountRef.current = Array.isArray(nextSession?.messages)
        ? nextSession.messages.length
        : 0;
      setSession(nextSession);
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [existingSessionId, seedEntry?.id]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    talkStateRef.current = talkState;
  }, [talkState]);

  useEffect(() => {
    pendingUserTranscriptRef.current = pendingUserTranscript;
  }, [pendingUserTranscript]);

  useEffect(() => {
    Animated.timing(micSlideY, {
      toValue: shouldHideIntro ? 32 : 0,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [micSlideY, shouldHideIntro]);

  useEffect(() => {
    if (!finalizingEnd) return undefined;
    requestAnimationFrame(() => {
      scrollConversationToBottom();
    });
    return undefined;
  }, [conversationMessages.length, finalizingEnd]);

  useEffect(() => {
    if (!conversationMessages.length) return;
    const lastMessage = conversationMessages[conversationMessages.length - 1];
    if (lastMessage?.role !== "assistant") return;
    requestAnimationFrame(() => {
      scrollConversationToBottom();
    });
  }, [conversationMessages]);

  async function persistSession(next) {
    const normalized = normalizeBrainstormSession(next);
    setSession(normalized);
    await writeBrainstormSession(normalized);
    return normalized;
  }

  async function ensureRecordingModeEnabled() {
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });
    audioRecordingModeEnabledRef.current = true;
  }

  async function disableRecordingMode() {
    if (!audioRecordingModeEnabledRef.current) return;
    await setAudioModeAsync({ allowsRecording: false });
    audioRecordingModeEnabledRef.current = false;
  }

  async function startListening() {
    if (!canStartListening(talkState)) return;
    if (recording) return;
    if (isWeb) {
      setError(
        "Brainstorm talk voice capture is available on native app only.",
      );
      setTalkState(TALK_STATE.ERROR);
      return;
    }
    if (talkState === TALK_STATE.SPEAKING) {
      await stopBrainstormTalkPlayback();
    }
    await stopStreamingTransport();
    setError("");
    try {
      if (!micPermissionGrantedRef.current) {
        const permission = await requestRecordingPermissionsAsync();
        if (!permission.granted) {
          throw new Error("Microphone permission is required.");
        }
        micPermissionGrantedRef.current = true;
      }
      await ensureRecordingModeEnabled();
      await audioRecorder.prepareToRecordAsync(VOICE_RECORDING_PRESET);
      await audioRecorder.record();
      await startStreamingTransport(sessionRef.current || session);
      setTalkState(TALK_STATE.LISTENING);
    } catch (err) {
      setError(String(err?.message || "Unable to start listening."));
      setTalkState(TALK_STATE.ERROR);
    }
  }

  function appendPendingTranscriptChunk(chunk) {
    const normalizedChunk = String(chunk || "").trim();
    const currentTranscript = pendingUserTranscriptRef.current;
    if (!normalizedChunk) return currentTranscript;
    const nextTranscript = currentTranscript
      ? `${currentTranscript} ${normalizedChunk}`
      : normalizedChunk;
    setPendingUserTranscript(nextTranscript);
    return nextTranscript;
  }

  function clearPendingTranscript() {
    setPendingUserTranscript("");
    speculativeDraftReplyRef.current = "";
    speculativeDraftSourceRef.current = "";
    resetStreamingProgress();
  }

  async function maybePrefetchStreamingDraft(partialText, pendingSession) {
    if (!BRAINSTORM_TALK_STREAMING_ENABLED) return;
    const normalizedPartialText = String(partialText || "").trim();
    if (!normalizedPartialText) return;
    const history = buildBrainstormHistory(pendingSession.messages, {
      excludeLast: true,
    });
    try {
      const result = await requestBrainstormTalkStreamTurn({
        token,
        partialText: normalizedPartialText,
        history,
        commitTurn: false,
      });
      if (result?.deferred) return;
      const draftReply = String(result?.draftReply || "").trim();
      if (!draftReply) return;
      speculativeDraftReplyRef.current = draftReply;
      speculativeDraftSourceRef.current = normalizedPartialText;
    } catch {
      // Best-effort draft warmup for streaming path.
    }
  }

  async function handlePartialTranscriptUpdate(partialText, baseSession) {
    const normalized = String(partialText || "").trim();
    if (!normalized) return;
    const pendingSession = buildPendingUserSession(normalized, baseSession);
    await maybePrefetchStreamingDraft(normalized, pendingSession);
  }

  const {
    ingestResolvedTranscript,
    resetStreamingProgress,
    startStreamingTransport,
    stopStreamingTransport,
  } = useBrainstormTalkStreaming({
    enabled: BRAINSTORM_TALK_STREAMING_ENABLED,
    minimumWords: STREAMING_PREFETCH_MIN_WORDS,
    onStablePartial: handlePartialTranscriptUpdate,
    transport: streamingTransportRef.current,
  });

  function buildPendingUserSession(content, baseSession) {
    const createdAt = new Date().toISOString();
    const userMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content,
      createdAt,
    };
    return {
      ...baseSession,
      mode: BRAINSTORM_SESSION_MODES.TALK,
      messages: [...(baseSession.messages || []), userMessage],
      updatedAt: createdAt,
      lifecycle: "active",
      finalizeGuards: {
        ended: false,
        wipSaved: false,
      },
    };
  }

  async function appendAssistantMessage(content, baseSession) {
    const createdAt = new Date().toISOString();
    const assistantMessage = {
      id: `${Date.now()}-assistant`,
      role: "assistant",
      content,
      createdAt,
    };
    const nextSession = {
      ...baseSession,
      messages: [...(baseSession.messages || []), assistantMessage],
      updatedAt: createdAt,
    };
    return persistSession(nextSession);
  }

  async function finalizeSession({ mode, sessionOverride }) {
    const activeSession = normalizeBrainstormSession(
      sessionOverride || sessionRef.current || session,
    );
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
        const history = buildBrainstormHistory(activeSession.messages);
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
        if (parsedDescription) descriptionToSave = parsedDescription;
        generatedEntryFields = {
          title: parsedFinalize.title,
          summary: parsedFinalize.summary,
          content: parsedFinalize.content,
        };
      } catch {
        // Fall back to transcript when summary generation fails.
      }
    }

    const nextSession = {
      ...activeSession,
      mode: BRAINSTORM_SESSION_MODES.TALK,
      lifecycle: isEnd ? "ended" : "wip-saved",
      updatedAt: new Date().toISOString(),
      hasEndedSummary: Boolean(activeSession?.hasEndedSummary || isEnd),
      finalizeGuards: {
        ended: Boolean(activeSession?.finalizeGuards?.ended || isEnd),
        wipSaved: Boolean(activeSession?.finalizeGuards?.wipSaved || !isEnd),
      },
    };
    finalizedRef.current = true;
    const savedSession = await persistSession(nextSession);

    const payload = {
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
      tags: ["brainstorm", "brainstorm-conversation"],
    };

    const hasExistingEntryId =
      savedSession.entryId !== null && savedSession.entryId !== undefined;

    if (hasExistingEntryId) {
      const updated = await apiRequest(`/entries?id=${savedSession.entryId}`, {
        method: "PATCH",
        token,
        body: payload,
      });
      if (!isEnd) {
        await apiRequest(`/entries?id=${savedSession.entryId}`, {
          method: "PATCH",
          token,
          body: {
            title: prefixedWipTitle(updated?.title),
          },
        });
      }
      await linkEntryToBrainstormSession(savedSession.entryId, savedSession.id);
      return;
    }

    const created = await apiRequest("/entries", {
      method: "POST",
      token,
      body: payload,
    });
    if (!created?.id) return;
    const linkedSession = {
      ...savedSession,
      entryId: created.id,
    };
    await persistSession(linkedSession);
    if (!isEnd) {
      await apiRequest(`/entries?id=${created.id}`, {
        method: "PATCH",
        token,
        body: { title: prefixedWipTitle(created?.title) },
      });
    }
    await linkEntryToBrainstormSession(created.id, linkedSession.id);
  }

  async function runTalkTurnWithText(content, baseSession) {
    const pendingSession = buildPendingUserSession(content, baseSession);
    const userPersistPromise = Promise.resolve().then(() =>
      persistSession(pendingSession),
    );
    setTalkState(TALK_STATE.WAITING_LLM);

    const history = buildBrainstormHistory(pendingSession.messages, {
      excludeLast: true,
    });
    const normalizedContent = String(content || "").trim();
    const shouldUseSpeculativeDraft =
      BRAINSTORM_TALK_STREAMING_ENABLED &&
      speculativeDraftSourceRef.current === normalizedContent &&
      speculativeDraftReplyRef.current;
    const response = shouldUseSpeculativeDraft
      ? { reply: speculativeDraftReplyRef.current }
      : await apiRequest("/brainstorm", {
          method: "POST",
          token,
          body: { message: content, history },
        });
    await userPersistPromise;
    const assistantText = String(
      response?.reply || "Let's keep exploring this idea.",
    ).trim();
    speculativeDraftReplyRef.current = "";
    speculativeDraftSourceRef.current = "";
    const synthesisPromise = synthesizeBrainstormTalkAudio({
      token,
      text: assistantText,
    });
    const assistantPersistPromise = appendAssistantMessage(
      assistantText,
      pendingSession,
    );

    setTalkState(TALK_STATE.SPEAKING);
    try {
      const audio = await synthesisPromise;
      await playBrainstormTalkAudio(audio);
    } finally {
      setTalkState(TALK_STATE.IDLE);
    }
    const nextSession = await assistantPersistPromise;
    return nextSession;
  }

  async function submitPendingTranscriptTurn({
    allowWhileTranscribing = false,
    contentOverride = "",
  } = {}) {
    if (!allowWhileTranscribing && talkStateRef.current !== TALK_STATE.PAUSED) {
      return;
    }
    const pendingContent = String(
      contentOverride || pendingUserTranscriptRef.current || "",
    ).trim();
    if (!pendingContent) {
      setTalkState(TALK_STATE.IDLE);
      return;
    }
    const activeSession = sessionRef.current || session;
    if (!activeSession) return;
    try {
      await runTalkTurnWithText(pendingContent, activeSession);
      clearPendingTranscript();
    } catch (err) {
      setError(
        String(err?.message || "Unable to complete brainstorm talk turn."),
      );
      setTalkState(TALK_STATE.ERROR);
    }
  }

  async function pauseListeningAndTranscribe() {
    if (!recording) return;
    setTalkState(TALK_STATE.TRANSCRIBING);
    try {
      await stopStreamingTransport();
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) throw new Error("Failed to read recording");
      const transcript = await transcribeBrainstormTalkAudio({
        token,
        audioUri: uri,
        extension: "m4a",
      });
      if (!String(transcript || "").trim()) {
        throw new Error(EMPTY_TRANSCRIPT_ERROR);
      }
      const activeSession = sessionRef.current || session;
      if (!activeSession) {
        throw new Error("Unable to load brainstorm session.");
      }
      const pendingTranscript = appendPendingTranscriptChunk(transcript);
      await ingestResolvedTranscript(pendingTranscript, activeSession);
      setTalkState(TALK_STATE.PAUSED);
      await submitPendingTranscriptTurn({
        allowWhileTranscribing: true,
        contentOverride: pendingTranscript,
      });
    } catch (err) {
      setError(String(err?.message || "Unable to transcribe voice input."));
      setTalkState(TALK_STATE.ERROR);
    }
  }

  async function handleMicrophoneButtonPress() {
    if (recording) {
      await pauseListeningAndTranscribe();
      return;
    }
    await startListening();
  }

  async function handleEndPress() {
    if (finalizingEnd || finalizeInFlightRef.current.ended) return;
    const activeSession = sessionRef.current || session;
    if (!activeSession) return;
    await stopStreamingTransport();
    setError("");
    setFinalizingEnd(true);
    finalizedRef.current = true;
    const finalizeVisibleAt = Date.now();
    try {
      await finalizeSession({ mode: "end", sessionOverride: activeSession });
      const finalizeElapsedMs = Date.now() - finalizeVisibleAt;
      if (finalizeElapsedMs < FINALIZING_MIN_VISIBLE_MS) {
        await new Promise((resolve) => {
          setTimeout(resolve, FINALIZING_MIN_VISIBLE_MS - finalizeElapsedMs);
        });
      }
      navigateBackToSecondBrain();
    } catch (err) {
      finalizedRef.current = false;
      setError(String(err?.message || "Unable to end brainstorm talk."));
    } finally {
      setFinalizingEnd(false);
    }
  }

  function navigateBackToSecondBrain() {
    const canGoBackFn = navigation?.canGoBack;
    if (typeof canGoBackFn !== "function" || canGoBackFn()) {
      navigation?.goBack?.();
      return;
    }
    navigation?.navigate?.("SecondBrain");
  }

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

  useEffect(() => {
    return () => {
      stopBrainstormTalkPlayback().catch(() => {});
      stopStreamingTransport().catch(() => {});
      disableRecordingMode().catch(() => {});
      const latestSession = sessionRef.current;
      if (!latestSession || finalizedRef.current) return;
      if (latestSession.lifecycle !== "active") return;
      const initialMessageCount = initialMessageCountRef.current || 0;
      const currentMessageCount = Array.isArray(latestSession.messages)
        ? latestSession.messages.length
        : 0;
      if (currentMessageCount <= initialMessageCount) return;
      finalizeSession({ mode: "wip", sessionOverride: latestSession }).catch(
        () => {},
      );
    };
  }, []);

  const micButtonDisabled = finalizingEnd || !canStartListening(talkState);
  const guidanceText = recording
    ? "Press Pause & transcribe when you finish speaking."
    : talkState === TALK_STATE.TRANSCRIBING ||
        talkState === TALK_STATE.WAITING_LLM
      ? "Processing your voice and preparing a response..."
      : "Speak naturally. We will transcribe your thoughts and brainstorm with you in real time.";

  return (
    <SecondBrainVoiceCaptureLayout
      insetsTop={insets.top}
      screenTitle="Brainstorm talk"
      heading="Talk through your ideas"
      description={guidanceText}
      bodyStyle={styles.layoutBody}
      hideIntro={shouldHideIntro}
      onBackPress={navigateBackToSecondBrain}
    >
      <KeyboardAvoidingView
        style={styles.talkArea}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        enabled={Platform.OS !== "web"}
      >
        <View style={styles.container}>
          {conversationMessages.length ? (
            <SecondBrainConversationList
              listRef={conversationListRef}
              onListLayout={(event) => {
                listViewportHeightRef.current =
                  event?.nativeEvent?.layout?.height || 0;
                if (finalizingEnd) {
                  requestAnimationFrame(() => {
                    scrollConversationToBottom();
                  });
                }
              }}
              onListContentSizeChange={(_, contentHeight) => {
                listContentHeightRef.current = contentHeight || 0;
                if (finalizingEnd) {
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
                    accessibilityLabel="Finalizing brainstorm talk"
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
            />
          ) : null}
          <Animated.View
            style={[
              styles.controlsWrap,
              {
                bottom: Math.max(insets.bottom, 0) + keyboardOffset,
              },
              { transform: [{ translateY: micSlideY }] },
            ]}
          >
            <SecondBrainMicrophoneButton
              containerStyle={styles.micWrap}
              onPress={handleMicrophoneButtonPress}
              disabled={micButtonDisabled}
              active={recording}
              activeIconName="square"
              accessibilityLabel={
                recording
                  ? "Pause & transcribe"
                  : talkState === TALK_STATE.PAUSED
                    ? "Continue listening"
                    : "Listen"
              }
            />
            {conversationMessages.length ? (
              <Pressable
                style={[
                  styles.endButton,
                  finalizingEnd ? styles.endButtonDisabled : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel="End brainstorm talk"
                onPress={handleEndPress}
                disabled={finalizingEnd}
              >
                {finalizingEnd ? (
                  <View style={styles.endButtonBusyWrap}>
                    <ActivityIndicator
                      style={styles.endButtonBusyIndicator}
                      size="small"
                      color={secondBrainScreenStyles.typebarButtonText.color}
                    />
                    <Text style={styles.endButtonText}>Ending...</Text>
                  </View>
                ) : (
                  <Text style={styles.endButtonText}>End</Text>
                )}
              </Pressable>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SecondBrainVoiceCaptureLayout>
  );
}
