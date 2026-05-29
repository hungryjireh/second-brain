import { transcribeFromBuffer } from "./whisper.js";

const DEFAULT_UNREAL_SPEECH_BASE_URL = "https://api.v7.unrealspeech.com";
const DEFAULT_UNREAL_SPEECH_TIMEOUT_MS = 20000;

class UnrealSpeechError extends Error {
  constructor(message, { status = 500, code = "unreal_speech_error" } = {}) {
    super(message);
    this.name = "UnrealSpeechError";
    this.status = status;
    this.code = code;
  }
}

function resolveTimeout(timeoutMs) {
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    return DEFAULT_UNREAL_SPEECH_TIMEOUT_MS;
  }
  return timeoutMs;
}

function resolveUnrealSpeechApiKey() {
  const apiKey = String(process.env.UNREAL_SPEECH_API_KEY || "").trim();
  if (!apiKey) {
    throw new UnrealSpeechError("Unreal Speech API key is not configured", {
      status: 503,
      code: "unreal_speech_missing_api_key",
    });
  }
  return apiKey;
}

function resolveUnrealSpeechBaseUrl() {
  const configured = String(process.env.UNREAL_SPEECH_BASE_URL || "").trim();
  return configured || DEFAULT_UNREAL_SPEECH_BASE_URL;
}

function encodeArrayBufferToBase64(buffer) {
  return Buffer.from(buffer).toString("base64");
}

async function fetchWithTimeout(url, options = {}, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    resolveTimeout(timeoutMs),
  );
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new UnrealSpeechError("Unreal Speech request timed out", {
        status: 504,
        code: "unreal_speech_timeout",
      });
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function parseJsonOrText(response) {
  const contentType = String(response.headers.get("content-type") || "");
  if (contentType.toLowerCase().includes("application/json")) {
    return response.json().catch(() => ({}));
  }
  const text = await response.text();
  return { text };
}

function parseTranscriptionFromPayload(payload) {
  if (!payload || typeof payload !== "object") return "";
  const candidates = [payload.transcript, payload.transcription, payload.text];
  for (const candidate of candidates) {
    const value = String(candidate || "").trim();
    if (value) return value;
  }
  return "";
}

export async function synthesizeWithUnrealSpeech({
  text,
  voiceId = "Scarlett",
  bitrate = "192k",
  speed = 0,
  pitch = 1,
  timeoutMs = DEFAULT_UNREAL_SPEECH_TIMEOUT_MS,
} = {}) {
  const normalizedText = String(text || "").trim();
  if (!normalizedText) {
    throw new UnrealSpeechError("text is required for synthesis", {
      status: 400,
      code: "unreal_speech_missing_text",
    });
  }

  const apiKey = resolveUnrealSpeechApiKey();
  const baseUrl = resolveUnrealSpeechBaseUrl();
  const response = await fetchWithTimeout(
    `${baseUrl}/stream`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        Text: normalizedText,
        VoiceId: String(voiceId || "Scarlett"),
        Bitrate: String(bitrate || "192k"),
        Speed: String(speed),
        Pitch: String(pitch),
      }),
    },
    timeoutMs,
  );

  if (!response.ok) {
    const payload = await parseJsonOrText(response);
    throw new UnrealSpeechError(
      String(
        payload?.error || payload?.message || "Unreal Speech synthesis failed",
      ),
      {
        status: response.status,
        code: "unreal_speech_tts_failed",
      },
    );
  }

  const audioBuffer = await response.arrayBuffer();
  if (!audioBuffer || audioBuffer.byteLength === 0) {
    throw new UnrealSpeechError(
      "Unreal Speech synthesis returned empty audio",
      {
        status: 502,
        code: "unreal_speech_tts_empty",
      },
    );
  }

  return {
    audioBase64: encodeArrayBufferToBase64(audioBuffer),
    mimeType: "audio/mpeg",
  };
}

export async function transcribeWithUnrealSpeech({
  audioBase64,
  extension = "m4a",
  timeoutMs = DEFAULT_UNREAL_SPEECH_TIMEOUT_MS,
} = {}) {
  const normalizedAudio = String(audioBase64 || "").trim();
  if (!normalizedAudio) {
    throw new UnrealSpeechError("audio_base64 is required for transcription", {
      status: 400,
      code: "unreal_speech_missing_audio",
    });
  }

  const configuredSttUrl = String(
    process.env.UNREAL_SPEECH_STT_URL || "",
  ).trim();
  if (configuredSttUrl) {
    const apiKey = resolveUnrealSpeechApiKey();
    const response = await fetchWithTimeout(
      configuredSttUrl,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audio_base64: normalizedAudio,
          extension: String(extension || "m4a"),
        }),
      },
      timeoutMs,
    );

    const payload = await parseJsonOrText(response);
    if (!response.ok) {
      throw new UnrealSpeechError(
        String(
          payload?.error ||
            payload?.message ||
            "Unreal Speech transcription failed",
        ),
        {
          status: response.status,
          code: "unreal_speech_stt_failed",
        },
      );
    }
    const transcript = parseTranscriptionFromPayload(payload);
    if (!transcript) {
      throw new UnrealSpeechError(
        "Unreal Speech transcription returned empty text",
        {
          status: 502,
          code: "unreal_speech_stt_empty",
        },
      );
    }
    return transcript;
  }

  const audioBuffer = Buffer.from(normalizedAudio, "base64");
  const transcript = await transcribeFromBuffer(audioBuffer, extension);
  if (!transcript) {
    throw new UnrealSpeechError("Transcription failed", {
      status: 422,
      code: "unreal_speech_stt_empty",
    });
  }
  return transcript;
}

export { UnrealSpeechError };
