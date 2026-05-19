import { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { apiRequest } from "../api";
import { CACHE_TTL_MS } from "../constants/cache";
import OpenBrainBottomNav from "../components/OpenBrainBottomNav";
import OpenBrainTopMenu from "../components/OpenBrainTopMenu";
import OpenBrainThoughtCard from "../components/OpenBrainThoughtCard";
import OpenBrainThoughtComposer from "../components/OpenBrainThoughtComposer";
import { formatPublishedDateTime } from "../utils/dateUtils";
import {
  isRequiredFieldPresent,
  normalizeRequiredField,
} from "../utils/formFields";
import styles from "./SharedThoughtScreen.styles";

export default function SharedThoughtScreen({ navigation, route, token }) {
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);
  const slugFromRoute = normalizeRequiredField(route?.params?.slug);
  const canLoadSlug = isRequiredFieldPresent(slug);

  async function load(nextSlug = slug) {
    const normalizedSlug = normalizeRequiredField(nextSlug);
    if (!normalizedSlug) return;
    setLoading(true);
    setError("");
    setPayload(null);
    try {
      const data = await apiRequest(
        `/open-brain/shared-thought?slug=${encodeURIComponent(normalizedSlug)}`,
        {
          cache: { ttlMs: CACHE_TTL_MS.SHARED_THOUGHT },
        },
      );
      setPayload(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!slugFromRoute) return;
    setSlug(slugFromRoute);
    load(slugFromRoute);
  }, [slugFromRoute]);

  function openAuthorProfile() {
    const username = payload?.author?.username;
    if (!username) return;
    if (navigation?.navigate) {
      if (!token) {
        navigation.navigate("Login");
        return;
      }
      navigation.navigate("OpenBrainProfile", { username });
      return;
    }
    if (typeof window !== "undefined" && window.location?.origin) {
      window.location.href = `${window.location.origin}/open-brain/u/${encodeURIComponent(username)}`;
    }
  }

  const sharedThoughtItem = payload?.thought
    ? {
        id:
          payload.thought.id ||
          payload.thought.slug ||
          slugFromRoute ||
          "shared-thought",
        text: payload.thought.text || "",
        created_at: payload.thought.created_at,
        user_id:
          payload.author?.id ||
          payload.author?.user_id ||
          payload.author?.username ||
          "shared-author",
        profile: {
          username: payload.author?.username || "anonymous",
          avatar_url: payload.author?.avatar_url || "",
          streak_count: payload.author?.streak_count,
          save_count: payload.author?.save_count,
          is_self: false,
          is_following: false,
        },
      }
    : null;

  return (
    <View style={styles.container}>
      <OpenBrainTopMenu navigation={navigation} />
      <View style={styles.content}>
        {!slugFromRoute ? (
          <OpenBrainThoughtComposer
            value={slug}
            onChangeText={setSlug}
            placeholder="share slug"
            buttonLabel={loading ? "Loading..." : "Load thought"}
            onSubmit={load}
            disabled={loading || !canLoadSlug}
          />
        ) : null}
        {!!error && <Text style={styles.error}>{error}</Text>}
        {payload?.thought ? (
          <View style={styles.thoughtViewport}>
            <ScrollView
              style={styles.thoughtScroll}
              contentContainerStyle={styles.thoughtScrollContent}
              showsVerticalScrollIndicator
            >
              <View style={styles.thoughtCardWrap}>
                <OpenBrainThoughtCard
                  item={sharedThoughtItem}
                  token={token}
                  onOpenProfile={
                    payload?.author?.username ? openAuthorProfile : undefined
                  }
                  date={formatPublishedDateTime(payload.thought.created_at)}
                />
              </View>
            </ScrollView>
          </View>
        ) : null}
      </View>
      <OpenBrainBottomNav
        navigation={navigation}
        currentRoute="SharedThought"
      />
    </View>
  );
}
