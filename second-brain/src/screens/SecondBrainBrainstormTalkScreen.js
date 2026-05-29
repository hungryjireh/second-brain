import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { File } from "expo-file-system";
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
  playBrainstormTalkAudio,
  stopBrainstormTalkPlayback,
  synthesizeBrainstormTalkAudio,
  transcribeBrainstormTalkAudio,
} from "../services/unrealSpeechService";

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
const FINALIZING_MIN_VISIBLE_MS = 450;
const TALK_CONTROLS_STACK_HEIGHT = 320;
const PAUSE_AUTO_SUBMIT_DELAY_MS = 1200;

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

function formatTalkStateLabel(stateValue) {
  switch (stateValue) {
    case TALK_STATE.LISTENING:
      return "Listening";
    case TALK_STATE.PAUSED:
      return "Paused";
    case TALK_STATE.TRANSCRIBING:
      return "Transcribing";
    case TALK_STATE.WAITING_LLM:
      return "Thinking";
    case TALK_STATE.SPEAKING:
      return "Speaking";
    case TALK_STATE.ERROR:
      return "Error";
    case TALK_STATE.IDLE:
    default:
      return "Idle";
  }
}

export default function SecondBrainBrainstormTalkScreen({
  route,
  navigation,
  token,
}) {
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
  const pendingAutoSubmitTimeoutRef = useRef(null);
  const audioRecorder = useAudioRecorder(VOICE_RECORDING_PRESET);
  const recorderState = useAudioRecorderState(audioRecorder);
  const recording = Boolean(recorderState?.isRecording);
  const conversationListRef = useRef(null);
  const listViewportHeightRef = useRef(0);
  const listContentHeightRef = useRef(0);

  const conversationMessages = useMemo(
    () => parseBrainstormConversationFromSession(session)?.messages || [],
    [session],
  );
  const isWeb = Platform.OS === "web";
  const controlsBottomPadding =
    TALK_CONTROLS_STACK_HEIGHT + Math.max(insets.bottom, 0) + keyboardOffset;
  const messagesBottomPadding = controlsBottomPadding + 24;

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

  async function persistSession(next) {
    const normalized = normalizeBrainstormSession(next);
    setSession(normalized);
    await writeBrainstormSession(normalized);
    return normalized;
  }

  async function ensureRecordingModeEnabled() {
    if (audioRecordingModeEnabledRef.current) return;
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
    if (pendingAutoSubmitTimeoutRef.current) {
      clearTimeout(pendingAutoSubmitTimeoutRef.current);
      pendingAutoSubmitTimeoutRef.current = null;
    }
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
  }

  async function appendUserMessage(content, baseSession) {
    const createdAt = new Date().toISOString();
    const userMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content,
      createdAt,
    };
    const pendingSession = {
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
    return persistSession(pendingSession);
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
    const pendingSession = await appendUserMessage(content, baseSession);
    setTalkState(TALK_STATE.WAITING_LLM);

    const history = buildBrainstormHistory(pendingSession.messages, {
      excludeLast: true,
    });
    const response = await apiRequest("/brainstorm", {
      method: "POST",
      token,
      body: { message: content, history },
    });
    const assistantText = String(
      response?.reply || "Let's keep exploring this idea.",
    ).trim();
    const nextSession = await appendAssistantMessage(
      assistantText,
      pendingSession,
    );

    setTalkState(TALK_STATE.SPEAKING);
    try {
      const audio = await synthesizeBrainstormTalkAudio({
        token,
        text: assistantText,
      });
      await playBrainstormTalkAudio(audio);
    } finally {
      setTalkState(TALK_STATE.IDLE);
    }
    return nextSession;
  }

  async function submitTextOrCommand(contentText) {
    const content = String(contentText || "").trim();
    const activeSession = sessionRef.current || session;
    if (!content || !activeSession) return;

    setError("");

    const isEndCommand = /^\/end(?:\s+.*)?$/i.test(content);
    if (isEndCommand) {
      if (pendingAutoSubmitTimeoutRef.current) {
        clearTimeout(pendingAutoSubmitTimeoutRef.current);
        pendingAutoSubmitTimeoutRef.current = null;
      }
      const pendingTranscript = String(pendingUserTranscriptRef.current || "");
      if (pendingTranscript.trim()) {
        await appendUserMessage(pendingTranscript, activeSession);
        clearPendingTranscript();
      }
      if (finalizingEnd || finalizeInFlightRef.current.ended) return;
      const startedAt = Date.now();
      setFinalizingEnd(true);
      finalizedRef.current = true;
      try {
        await finalizeSession({ mode: "end" });
        const elapsed = Date.now() - startedAt;
        if (elapsed < FINALIZING_MIN_VISIBLE_MS) {
          await new Promise((resolve) => {
            setTimeout(resolve, FINALIZING_MIN_VISIBLE_MS - elapsed);
          });
        }
        const canGoBackFn = navigation?.canGoBack;
        if (typeof canGoBackFn !== "function" || canGoBackFn()) {
          navigation?.goBack?.();
        } else {
          navigation?.navigate?.("SecondBrain");
        }
      } catch (err) {
        finalizedRef.current = false;
        setError(String(err?.message || "Unable to end brainstorm talk."));
        setTalkState(TALK_STATE.ERROR);
      } finally {
        setFinalizingEnd(false);
      }
      return;
    }

    try {
      clearPendingTranscript();
      await runTalkTurnWithText(content, activeSession);
    } catch (err) {
      setError(
        String(err?.message || "Unable to complete brainstorm talk turn."),
      );
      setTalkState(TALK_STATE.ERROR);
    }
  }

  async function submitPendingTranscriptTurn() {
    if (recording || talkStateRef.current !== TALK_STATE.PAUSED) return;
    const pendingContent = String(
      pendingUserTranscriptRef.current || "",
    ).trim();
    if (!pendingContent) {
      setTalkState(TALK_STATE.IDLE);
      return;
    }
    const activeSession = sessionRef.current || session;
    if (!activeSession) return;
    clearPendingTranscript();
    try {
      await runTalkTurnWithText(pendingContent, activeSession);
    } catch (err) {
      setError(
        String(err?.message || "Unable to complete brainstorm talk turn."),
      );
      setTalkState(TALK_STATE.ERROR);
    }
  }

  function queuePendingTranscriptSubmit() {
    if (pendingAutoSubmitTimeoutRef.current) {
      clearTimeout(pendingAutoSubmitTimeoutRef.current);
    }
    pendingAutoSubmitTimeoutRef.current = setTimeout(() => {
      pendingAutoSubmitTimeoutRef.current = null;
      submitPendingTranscriptTurn().catch(() => {});
    }, PAUSE_AUTO_SUBMIT_DELAY_MS);
  }

  async function pauseListeningAndTranscribe() {
    if (!recording) return;
    setTalkState(TALK_STATE.TRANSCRIBING);
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) throw new Error("Failed to read recording");
      const recordedAudio = new File(uri);
      const audioBase64 = await recordedAudio.base64();
      const transcript = await transcribeBrainstormTalkAudio({
        token,
        audioBase64,
        extension: "m4a",
      });
      appendPendingTranscriptChunk(transcript);
      setTalkState(TALK_STATE.PAUSED);
      queuePendingTranscriptSubmit();
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
      disableRecordingMode().catch(() => {});
      if (pendingAutoSubmitTimeoutRef.current) {
        clearTimeout(pendingAutoSubmitTimeoutRef.current);
      }
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

  const talkStateLabel = formatTalkStateLabel(talkState);
  const micButtonDisabled = finalizingEnd || !canStartListening(talkState);

  return (
    <SecondBrainVoiceCaptureLayout
      insetsTop={insets.top}
      screenTitle="Brainstorm talk"
      heading="Talk through your ideas"
      description="Speak naturally. We will transcribe your thoughts and brainstorm with you in real time."
      onBackPress={navigateBackToSecondBrain}
      bodyStyle={styles.layoutBody}
      headingStyle={styles.layoutHeading}
      descriptionStyle={styles.layoutDescription}
    >
      <KeyboardAvoidingView
        style={styles.talkArea}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        enabled={Platform.OS !== "web"}
      >
        <View style={styles.container}>
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
            hiddenMessageNoticeStyle={secondBrainScreenStyles.entryPanelSummary}
            renderInline
          />
          <View style={styles.controlsWrap}>
            <SecondBrainMicrophoneButton
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
            <Text style={styles.stateText}>{talkStateLabel}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="End brainstorm talk"
              onPress={() => submitTextOrCommand("/end")}
              disabled={finalizingEnd}
              style={[
                styles.controlButton,
                styles.primaryControlButton,
                finalizingEnd && styles.controlButtonDisabled,
              ]}
            >
              <Text style={styles.primaryControlButtonText}>End</Text>
            </Pressable>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </SecondBrainVoiceCaptureLayout>
  );
}
