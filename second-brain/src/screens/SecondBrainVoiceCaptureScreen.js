import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVoiceCapture } from "../hooks/useVoiceCapture";
import { formatElapsedTime } from "../utils/dateTimeUtils";
import styles from "./SecondBrainVoiceCaptureScreen.styles";

export default function SecondBrainVoiceCaptureScreen({ token, navigation }) {
  const insets = useSafeAreaInsets();
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

  async function handleMicPress() {
    if (recording) {
      shouldGoBackAfterSubmitRef.current = false;
      await stopVoiceCaptureAndSubmit();
      if (shouldGoBackAfterSubmitRef.current) {
        navigation.goBack();
      }
      return;
    }
    startVoiceCapture();
  }

  async function handleBackPress() {
    if (recording && !voiceBusy) {
      await cancelVoiceCapture();
    }
    navigation.goBack();
  }

  return (
    <View style={styles.container}>
      <View style={[styles.topRow, { marginTop: Math.max(insets.top, 8) + 4 }]}>
        <Pressable
          style={styles.backButton}
          onPress={handleBackPress}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Feather name="chevron-left" size={28} style={styles.backIcon} />
        </Pressable>
        <Text style={styles.title}>Voice capture</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.heading}>
          {recording ? "Tap to stop and submit" : "Tap to start recording"}
        </Text>
        <Text style={styles.subtitle}>
          Your voice will be transcribed and automatically sorted into entries
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {recording ? <Text style={styles.timer}>{timerLabel}</Text> : null}

        <View style={styles.micWrap}>
          <View style={styles.micGlowOuter} />
          <View style={styles.micGlowInner} />
          <Pressable
            style={[
              styles.micButton,
              recording && styles.micButtonRecording,
              isButtonDisabled && styles.micButtonDisabled,
            ]}
            onPress={handleMicPress}
            disabled={isButtonDisabled}
            accessibilityRole="button"
            accessibilityLabel={
              recording
                ? "Stop and submit voice note"
                : voiceStarting
                  ? "Preparing voice recorder"
                  : "Record voice note"
            }
          >
            <Feather
              name={voiceStarting ? "loader" : recording ? "square" : "mic"}
              size={44}
              style={styles.micIcon}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
