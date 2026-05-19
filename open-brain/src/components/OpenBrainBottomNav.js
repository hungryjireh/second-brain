import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiRequest } from "../api";
import { CACHE_TTL_MS } from "../constants/cache";
import { useOpenBrainComposer } from "../hooks/useOpenBrainComposer";
import {
  OPEN_BRAIN_MAX_CHARS,
  randomFrom,
  THOUGHT_FALLBACK_PROMPTS,
} from "../utils/openBrainComposer";
import OpenBrainThoughtComposer from "./OpenBrainThoughtComposer";
import styles from "./OpenBrainBottomNav.styles";

const BUTTONS = [
  { key: "OpenBrainFeed", label: "Home" },
  { key: "OpenBrainProfile", label: "Profile" },
  { key: "OpenBrainSettings", label: "Settings" },
];

export default function OpenBrainBottomNav({
  navigation,
  currentRoute,
  token,
  onDraftPostSuccess,
}) {
  const insets = useSafeAreaInsets();
  const [isDraftOpen, setIsDraftOpen] = useState(false);

  const {
    draft,
    setDraft,
    visibility,
    setVisibility,
    hasPostedToday,
    postedHeading,
    streakCount,
    saveCount,
    prompt,
    setPrompt,
    saving,
    error,
    setError,
    todayLabel,
    timeLabel,
    loadComposerState,
    postThought,
  } = useOpenBrainComposer({
    token,
    apiRequest,
    cacheProfileTtlMs: CACHE_TTL_MS.PROFILE,
    cacheThoughtsTtlMs: CACHE_TTL_MS.FEED,
    fallbackSaveErrorMessage: "Unable to save thought.",
    onPostSuccess: onDraftPostSuccess,
  });

  useEffect(() => {
    if (!isDraftOpen || !token) return;
    let cancelled = false;
    loadComposerState().catch((err) => {
      if (cancelled) return;
      if (
        String(err.message).toLowerCase().includes("404") ||
        String(err.message).toLowerCase().includes("not found")
      ) {
        navigation?.replace("CreateOpenBrainProfile");
        return;
      }
      setError(err.message || "Unable to load draft card.");
    });
    return () => {
      cancelled = true;
    };
  }, [isDraftOpen, loadComposerState, navigation, setError, token]);

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <Pressable
        style={[
          styles.floatingDraftButton,
          isDraftOpen && styles.floatingDraftButtonActive,
        ]}
        onPress={() => setIsDraftOpen((current) => !current)}
        accessibilityRole="button"
        accessibilityLabel={
          isDraftOpen ? "Close draft popup" : "Open draft popup"
        }
      >
        <Text style={styles.draftIcon}>✎</Text>
      </Pressable>
      <View style={styles.row}>
        {BUTTONS.map((button) => {
          const active = button.key === currentRoute;
          return (
            <Pressable
              key={button.key}
              style={[styles.button, active && styles.buttonActive]}
              onPress={() => navigation?.navigate(button.key)}
              accessibilityRole="button"
            >
              {active ? <View style={styles.activeDot} /> : null}
              <Text style={[styles.label, active && styles.labelActive]}>
                {button.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Modal
        visible={isDraftOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsDraftOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={30} tint="dark" style={styles.modalBlur} />
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsDraftOpen(false)}
          />
          <View style={styles.modalCardWrap}>
            <OpenBrainThoughtComposer
              value={draft}
              onChangeText={(text) =>
                setDraft(text.slice(0, OPEN_BRAIN_MAX_CHARS))
              }
              placeholder="Write your thought for today..."
              buttonLabel={saving ? "Saving..." : hasPostedToday ? "✓" : "Done"}
              onSubmit={postThought}
              disabled={saving || !draft.trim()}
              multiline
              maxLength={OPEN_BRAIN_MAX_CHARS}
              showRemaining={false}
              dateLabel={todayLabel}
              timeLabel={timeLabel}
              streakCount={streakCount}
              saveCount={saveCount}
              heading={
                hasPostedToday
                  ? postedHeading || "What's on your mind?"
                  : "What's on your mind?"
              }
              prompt={prompt}
              onRefreshPrompt={() =>
                setPrompt((current) =>
                  randomFrom(THOUGHT_FALLBACK_PROMPTS, current),
                )
              }
              canRefreshPrompt={THOUGHT_FALLBACK_PROMPTS.length > 1}
              visibility={visibility}
              onToggleVisibility={() =>
                setVisibility((current) =>
                  current === "public" ? "private" : "public",
                )
              }
              isPosted={hasPostedToday}
              error={error}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
