import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { File, Paths } from "expo-file-system";
import { apiRequest, buildApiUrl, createAuthHeaders } from "../api";

const DEFAULT_REQUEST_TIMEOUT_MS = 20000;
const PLAYBACK_POLL_INTERVAL_MS = 120;
const PLAYBACK_MAX_WAIT_MS = 120000;
export const BRAINSTORM_TALK_STREAMING_ENABLED =
  String(process.env.EXPO_PUBLIC_BRAINSTORM_TALK_STREAMING_V1 || "").trim() ===
  "1";

let activePlayer = null;
let activeAudioFile = null;

function normalizeErrorMessage(error, fallback) {
  const message = String(error?.message || "").trim();
  if (message) return message;
  return fallback;
}

function normalizeTimeoutMs(timeoutMs) {
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    return DEFAULT_REQUEST_TIMEOUT_MS;
  }
  return timeoutMs;
}

function resolveAudioExtension(mimeType) {
  const normalized = String(mimeType || "")
    .trim()
    .toLowerCase();
  if (normalized.includes("wav")) return "wav";
  if (normalized.includes("ogg")) return "ogg";
  return "mp3";
}

function decodeBase64ToBytes(base64Value) {
  const normalized = String(base64Value || "").trim();
  if (!normalized) return new Uint8Array();
  const decoded =
    typeof globalThis.atob === "function"
      ? globalThis.atob(normalized)
      : typeof Buffer !== "undefined"
        ? Buffer.from(normalized, "base64").toString("binary")
        : "";
  if (!decoded) {
    throw new Error("Unable to decode synthesized audio payload.");
  }
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }
  return bytes;
}

async function waitForPlaybackToFinish(player) {
  return new Promise((resolve) => {
    const startedAtMs = Date.now();
    const intervalId = setInterval(() => {
      const elapsedMs = Date.now() - startedAtMs;
      const timedOut = elapsedMs >= PLAYBACK_MAX_WAIT_MS;
      const finished = !player?.playing && Number(player?.currentTime || 0) > 0;
      if (timedOut || finished) {
        clearInterval(intervalId);
        resolve();
      }
    }, PLAYBACK_POLL_INTERVAL_MS);
  });
}

export async function transcribeBrainstormTalkAudio({
  token,
  audioUri,
  extension = "m4a",
  timeoutMs,
}) {
  const normalizedAudioUri = String(audioUri || "").trim();
  if (!normalizedAudioUri) {
    throw new Error("Missing audio payload for transcription.");
  }
  try {
    const audioFile = new File(normalizedAudioUri);
    const audioBytes = await audioFile.arrayBuffer();
    if (!audioBytes || audioBytes.byteLength === 0) {
      throw new Error("Failed to read recording");
    }
    const query = new URLSearchParams({
      action: "transcribe-raw",
      extension: String(extension || "m4a"),
      timeout_ms: String(normalizeTimeoutMs(timeoutMs)),
    });
    const response = await fetch(
      buildApiUrl(`/brainstorm?${query.toString()}`),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          ...createAuthHeaders(token),
        },
        body: audioBytes,
      },
    );

    const raw = await response.text();
    let payload = {};
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      payload = {};
    }
    if (!response.ok) {
      throw new Error(String(payload?.error || "Failed to transcribe audio"));
    }
    const transcript = String(payload?.transcript || "").trim();
    if (!transcript) {
      throw new Error("Transcription returned empty text.");
    }
    return transcript;
  } catch (error) {
    throw new Error(
      normalizeErrorMessage(
        error,
        "Unable to transcribe voice input right now.",
      ),
      { cause: error },
    );
  }
}

export async function synthesizeBrainstormTalkAudio({
  token,
  text,
  voiceId = "Sierra",
  timeoutMs,
}) {
  const normalizedText = String(text || "").trim();
  if (!normalizedText) {
    throw new Error("Missing assistant text for synthesis.");
  }
  try {
    const response = await apiRequest("/brainstorm?action=synthesize", {
      method: "POST",
      token,
      body: {
        text: normalizedText,
        voice_id: voiceId,
        timeout_ms: normalizeTimeoutMs(timeoutMs),
      },
    });
    const audioBase64 = String(response?.audioBase64 || "").trim();
    if (!audioBase64) {
      throw new Error("Synthesis returned empty audio.");
    }
    return {
      audioBase64,
      mimeType: response?.mimeType || "audio/mpeg",
    };
  } catch (error) {
    throw new Error(
      normalizeErrorMessage(
        error,
        "Unable to synthesize assistant response right now.",
      ),
      { cause: error },
    );
  }
}

export async function requestBrainstormTalkStreamTurn({
  token,
  partialText,
  history = [],
  commitTurn = false,
  minimumWordsForDraft = 8,
}) {
  const normalizedPartialText = String(partialText || "").trim();
  if (!normalizedPartialText) {
    throw new Error("Missing partial transcript text.");
  }
  try {
    const response = await apiRequest("/brainstorm?action=stream-turn", {
      method: "POST",
      token,
      body: {
        partial_text: normalizedPartialText,
        history,
        commit_turn: commitTurn,
        minimum_words_for_draft: minimumWordsForDraft,
      },
    });
    return {
      draftReply: String(response?.draftReply || "").trim(),
      deferred: Boolean(response?.deferred),
      wordCount: Number(response?.wordCount) || 0,
      minimumWordsForDraft: Number(response?.minimumWordsForDraft) || 0,
      committed: Boolean(response?.committed),
    };
  } catch (error) {
    throw new Error(
      normalizeErrorMessage(
        error,
        "Unable to process brainstorming stream turn right now.",
      ),
      { cause: error },
    );
  }
}

export async function stopBrainstormTalkPlayback() {
  try {
    activePlayer?.pause?.();
    activePlayer?.remove?.();
  } catch {
    // Best-effort cleanup only.
  } finally {
    activePlayer = null;
  }

  if (activeAudioFile) {
    try {
      activeAudioFile.delete();
    } catch {
      // Ignore temp-file cleanup failures.
    } finally {
      activeAudioFile = null;
    }
  }
}

export async function playBrainstormTalkAudio({
  audioBase64,
  mimeType = "audio/mpeg",
}) {
  const normalizedAudio = String(audioBase64 || "").trim();
  if (!normalizedAudio) {
    throw new Error("Missing audio payload for playback.");
  }

  await stopBrainstormTalkPlayback();

  try {
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    });
  } catch {
    // If audio mode setup fails, playback may still work on some platforms.
  }

  const extension = resolveAudioExtension(mimeType);
  const fileName = `brainstorm-talk-${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`;
  const audioFile = new File(Paths.cache, fileName);
  audioFile.create({ overwrite: true, intermediates: true });
  audioFile.write(decodeBase64ToBytes(normalizedAudio));
  activeAudioFile = audioFile;

  const player = createAudioPlayer(audioFile.uri);
  activePlayer = player;
  try {
    player.play();
    await waitForPlaybackToFinish(player);
  } finally {
    await stopBrainstormTalkPlayback();
  }
}
