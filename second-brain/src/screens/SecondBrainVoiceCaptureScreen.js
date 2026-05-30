import { useEffect, useMemo, useRef, useState } from "react";
import { Text } from "react-native";
import { useVoiceCapture } from "../hooks/useVoiceCapture";
import SecondBrainMicrophoneButton from "../components/SecondBrainMicrophoneButton";
import SecondBrainVoiceCaptureLayout from "../components/SecondBrainVoiceCaptureLayout";
import { formatElapsedTime } from "../utils/dateTimeUtils";
import styles from "./SecondBrainVoiceCaptureScreen.styles";

export default function SecondBrainVoiceCaptureScreen({ token, navigation }) {
  const [error, setError] = useState("");
  const shouldGoBackAfterSubmitRef = useRef(false);
  const isRecordingRef = useRef(false);
  const isVoiceBusyRef = useRef(false);
  const cancelVoiceCaptureRef = useRef(null);

  const {
    voiceBusy,
    voiceStarting,
    voiceElapsedMs,
    voiceMaxDurationMs,
    recording,
    startVoiceCapture,
    stopVoiceCaptureAndSubmit,
    cancelVoiceCapture,
  } = useVoiceCapture({
    token,
    onError: setError,
    onVoiceEntryCreated: () => {
      shouldGoBackAfterSubmitRef.current = true;
    },
    onReloadEntries: async () => {
      shouldGoBackAfterSubmitRef.current = true;
    },
  });

  const isButtonDisabled = voiceBusy || voiceStarting;
  const timerLabel = useMemo(
    () =>
      `${formatElapsedTime(voiceElapsedMs)}/${formatElapsedTime(voiceMaxDurationMs)}`,
    [voiceElapsedMs, voiceMaxDurationMs],
  );

  useEffect(() => {
    isRecordingRef.current = Boolean(recording);
    isVoiceBusyRef.current = Boolean(voiceBusy);
    cancelVoiceCaptureRef.current = cancelVoiceCapture;
  }, [cancelVoiceCapture, recording, voiceBusy]);

  useEffect(
    () => () => {
      if (!isRecordingRef.current || isVoiceBusyRef.current) return;
      cancelVoiceCaptureRef.current?.().catch(() => {});
    },
    [],
  );

  function navigateBackToSecondBrain() {
    const canGoBackFn = navigation?.canGoBack;
    if (typeof canGoBackFn !== "function" || canGoBackFn()) {
      navigation?.goBack?.();
      return;
    }
    navigation?.navigate?.("SecondBrain");
  }

  async function handleMicPress() {
    if (recording) {
      shouldGoBackAfterSubmitRef.current = false;
      await stopVoiceCaptureAndSubmit();
      if (shouldGoBackAfterSubmitRef.current) {
        navigateBackToSecondBrain();
      }
      return;
    }
    startVoiceCapture();
  }

  return (
    <SecondBrainVoiceCaptureLayout
      hideTopRow
      heading={recording ? "Tap to stop and submit" : "Tap to start recording"}
      description="Your voice will be transcribed and automatically sorted into entries"
      headingStyle={styles.heading}
      descriptionStyle={styles.description}
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {recording ? <Text style={styles.timer}>{timerLabel}</Text> : null}

      <SecondBrainMicrophoneButton
        containerStyle={styles.micWrap}
        onPress={handleMicPress}
        disabled={isButtonDisabled}
        active={recording}
        loading={voiceStarting}
        activeIconName="square"
        accessibilityLabel={
          recording
            ? "Stop and submit voice note"
            : voiceStarting
              ? "Preparing voice recorder"
              : "Record voice note"
        }
      />
    </SecondBrainVoiceCaptureLayout>
  );
}
