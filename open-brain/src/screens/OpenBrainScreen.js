import { useEffect } from "react";
import { Text, View } from "react-native";
import { apiRequest } from "../api";
import { CACHE_TTL_MS } from "../constants/cache";
import OpenBrainThoughtComposer from "../components/OpenBrainThoughtComposer";
import OpenBrainBottomNav from "../components/OpenBrainBottomNav";
import OpenBrainTopMenu from "../components/OpenBrainTopMenu";
import { useOpenBrainComposer } from "../hooks/useOpenBrainComposer";
import {
  OPEN_BRAIN_MAX_CHARS,
  randomFrom,
  THOUGHT_FALLBACK_PROMPTS,
} from "../utils/openBrainComposer";
import styles from "./OpenBrainScreen.styles";

export default function OpenBrainScreen({ token, navigation }) {
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
    cacheThoughtsTtlMs: CACHE_TTL_MS.THOUGHTS,
    allowThoughtFetchFailure: true,
  });

  useEffect(() => {
    loadComposerState().catch((err) => {
      if (
        String(err.message).toLowerCase().includes("404") ||
        String(err.message).toLowerCase().includes("not found")
      ) {
        navigation.replace("CreateOpenBrainProfile");
        return;
      }
      setError(err.message);
    });
  }, [loadComposerState, navigation, setError]);

  return (
    <View style={styles.container}>
      <OpenBrainTopMenu navigation={navigation} token={token} />
      <View style={styles.composerWrap}>
        <OpenBrainThoughtComposer
          value={draft}
          onChangeText={(text) => setDraft(text.slice(0, OPEN_BRAIN_MAX_CHARS))}
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
      {error ? (
        <View style={styles.inlineErrorWrap}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}
      <OpenBrainBottomNav navigation={navigation} currentRoute="OpenBrain" />
    </View>
  );
}
