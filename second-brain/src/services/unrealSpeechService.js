import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { File, Paths } from "expo-file-system";
import { apiRequest } from "../api";

const DEFAULT_REQUEST_TIMEOUT_MS = 20000;
const PLAYBACK_POLL_INTERVAL_MS = 120;
const PLAYBACK_MAX_WAIT_MS = 120000;

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
  audioBase64,
  extension = "m4a",
  timeoutMs,
}) {
  const normalizedAudio = String(audioBase64 || "").trim();
  if (!normalizedAudio) {
    throw new Error("Missing audio payload for transcription.");
  }
  try {
    const response = await apiRequest("/brainstorm?action=transcribe", {
      method: "POST",
      token,
      body: {
        audio_base64: normalizedAudio,
        extension,
        timeout_ms: normalizeTimeoutMs(timeoutMs),
      },
    });
    const transcript = String(response?.transcript || "").trim();
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
    );
  }
}

export async function synthesizeBrainstormTalkAudio({
  token,
  text,
  voiceId = "Scarlett",
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
  audioFile.write(normalizedAudio, { encoding: "base64" });
  activeAudioFile = audioFile;

  const player = createAudioPlayer(audioFile.uri, {
    keepAudioSessionActive: true,
  });
  activePlayer = player;
  player.play();
  await waitForPlaybackToFinish(player);
}
