import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { File } from "expo-file-system";
import { apiRequest } from "../api";

const MAX_VOICE_NOTE_DURATION_SECONDS = 2 * 60;
const VOICE_RECORDING_PRESET =
  RecordingPresets.LOW_QUALITY ?? RecordingPresets.HIGH_QUALITY;

export function useVoiceCapture({
  token,
  onError,
  onVoiceEntryCreated,
  onReloadEntries,
  onSubmissionStart,
  onSubmissionEnd,
}) {
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceStarting, setVoiceStarting] = useState(false);
  const [voiceCaptureStartedAtMs, setVoiceCaptureStartedAtMs] = useState(null);
  const [voiceElapsedMs, setVoiceElapsedMs] = useState(0);
  const hasMicrophonePermissionRef = useRef(false);
  const audioRecordingModeEnabledRef = useRef(false);
  const audioRecorder = useAudioRecorder(VOICE_RECORDING_PRESET);
  const recorderState = useAudioRecorderState(audioRecorder);
  const recording = recorderState?.isRecording;

  useEffect(() => {
    if (recording && voiceStarting) {
      setVoiceStarting(false);
    }
  }, [recording, voiceStarting]);

  useEffect(() => {
    if (!recording) {
      setVoiceCaptureStartedAtMs(null);
      setVoiceElapsedMs(0);
      return undefined;
    }

    if (voiceCaptureStartedAtMs === null) {
      const now = Date.now();
      setVoiceCaptureStartedAtMs(now);
      setVoiceElapsedMs(0);
      return undefined;
    }

    const updateElapsed = () => {
      setVoiceElapsedMs(Date.now() - voiceCaptureStartedAtMs);
    };
    updateElapsed();
    const intervalId = setInterval(updateElapsed, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [recording, voiceCaptureStartedAtMs]);

  async function startVoiceCapture() {
    if (voiceBusy || voiceStarting || recording) return;
    if (Platform.OS === "web") {
      onError("Voice capture is available on native app only.");
      setVoiceStarting(false);
      return;
    }
    setVoiceStarting(true);
    try {
      onError("");
      if (!hasMicrophonePermissionRef.current) {
        const permission = await requestRecordingPermissionsAsync();
        if (!permission.granted) {
          onError("Microphone permission is required.");
          setVoiceStarting(false);
          return;
        }
        hasMicrophonePermissionRef.current = true;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      audioRecordingModeEnabledRef.current = true;
      await audioRecorder.prepareToRecordAsync(VOICE_RECORDING_PRESET);
      await audioRecorder.record();
    } catch (err) {
      onError(err.message);
      setVoiceStarting(false);
    }
  }

  async function stopVoiceCaptureAndSubmit() {
    if (!recording || voiceBusy) return;
    const submissionId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setVoiceBusy(true);
    onSubmissionStart?.(submissionId);
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) throw new Error("Failed to read recording");

      const recordedAudio = new File(uri);
      const audioBase64 = await recordedAudio.base64();
      if (!audioBase64) {
        throw new Error("Failed to encode recording");
      }

      const response = await apiRequest("/voice", {
        method: "POST",
        token,
        body: {
          audio_base64: audioBase64,
          extension: "m4a",
          duration_seconds:
            Math.max(
              voiceElapsedMs,
              voiceCaptureStartedAtMs === null
                ? 0
                : Date.now() - voiceCaptureStartedAtMs,
            ) / 1000,
        },
      });
      if (response?.entry) {
        onVoiceEntryCreated?.(response.entry);
      } else {
        await onReloadEntries?.();
      }
    } catch (err) {
      onError(err.message);
    } finally {
      setVoiceBusy(false);
      onSubmissionEnd?.(submissionId);
      try {
        await setAudioModeAsync({ allowsRecording: false });
        audioRecordingModeEnabledRef.current = false;
      } catch {
        // Ignore audio mode reset failures.
      }
    }
  }

  async function cancelVoiceCapture() {
    if (!recording || voiceBusy) return;
    setVoiceBusy(true);
    try {
      await audioRecorder.stop();
    } catch (err) {
      onError(err.message);
    } finally {
      setVoiceBusy(false);
      try {
        await setAudioModeAsync({ allowsRecording: false });
        audioRecordingModeEnabledRef.current = false;
      } catch {
        // Ignore audio mode reset failures.
      }
    }
  }

  return {
    voiceBusy,
    voiceStarting,
    voiceElapsedMs,
    voiceMaxDurationMs: MAX_VOICE_NOTE_DURATION_SECONDS * 1000,
    recording,
    startVoiceCapture,
    stopVoiceCaptureAndSubmit,
    cancelVoiceCapture,
  };
}
