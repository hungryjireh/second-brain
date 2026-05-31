import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { apiRequest, sendFollowNotification } from "../api";
import { CACHE_TTL_MS } from "../constants/cache";
import {
  addThoughtToSecondBrainWithAlert,
  buildThoughtSectionRows,
  groupThoughtsByDay,
  shareThought,
} from "../utils/openBrainHelper";
import { formatShortDateTime } from "../utils/dateUtils";
import OpenBrainBottomNav from "../components/OpenBrainBottomNav";
import OpenBrainSectionedThoughtList from "../components/OpenBrainSectionedThoughtList";
import OpenBrainTopMenu from "../components/OpenBrainTopMenu";
import OpenBrainThoughtCard from "../components/OpenBrainThoughtCard";
import { executeOpenBrainFollowToggle } from "../utils/openBrainFollow";
import styles from "./OpenBrainFeedScreenStyles";

function updateThoughtAcrossFeed(feed, thoughtId, updater) {
  const updateList = (list) => {
    const index = list.findIndex((item) => item?.id === thoughtId);
    if (index < 0) return list;
    const next = list.slice();
    next[index] = updater(next[index]);
    return next;
  };

  return {
    following: updateList(feed.following || []),
    everyone: updateList(feed.everyone || []),
  };
}

function updateUserAcrossFeed(feed, userId, updater) {
  const updateList = (list) => {
    let didChange = false;
    const next = list.map((item) => {
      if (item?.user_id === userId || item?.profile?.id === userId) {
        didChange = true;
        return updater(item);
      }
      return item;
    });
    return didChange ? next : list;
  };

  return {
    following: updateList(feed.following || []),
    everyone: updateList(feed.everyone || []),
  };
}

function appendUniqueThoughts(existingList, nextList) {
  const merged = [...(existingList || [])];
  const seen = new Set(merged.map((item) => item?.id).filter(Boolean));
  for (const item of nextList || []) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }
  return merged;
}

function buildFeedPagePath({ tab, before }) {
  const safeTab = tab === "everyone" ? "everyone" : "following";
  const safeBefore = String(before || "").trim();
  if (!safeBefore) return `/open-brain/feed?tab=${encodeURIComponent(safeTab)}`;
  return `/open-brain/feed?tab=${encodeURIComponent(safeTab)}&before=${encodeURIComponent(safeBefore)}`;
}

export const __testables = {
  updateThoughtAcrossFeed,
  updateUserAcrossFeed,
  appendUniqueThoughts,
  buildFeedPagePath,
  normalizeFeedPagePayload,
};

function normalizeFeedPayload(data) {
  const payload =
    data?.feed && typeof data.feed === "object" ? data.feed : data;
  return {
    following: Array.isArray(payload?.following) ? payload.following : [],
    everyone: Array.isArray(payload?.everyone) ? payload.everyone : [],
  };
}

function normalizeFeedPagePayload(data) {
  const page = data?.page && typeof data.page === "object" ? data.page : {};
  const followingPage =
    page.following && typeof page.following === "object" ? page.following : {};
  const everyonePage =
    page.everyone && typeof page.everyone === "object" ? page.everyone : {};
  return {
    following: {
      hasMore: followingPage.has_more === true,
      nextCursor:
        typeof followingPage.next_cursor === "string"
          ? followingPage.next_cursor
          : null,
    },
    everyone: {
      hasMore: everyonePage.has_more === true,
      nextCursor:
        typeof everyonePage.next_cursor === "string"
          ? everyonePage.next_cursor
          : null,
    },
  };
}

export default function OpenBrainFeedScreen({ token, navigation }) {
  const [tab, setTab] = useState("following");
  const [feed, setFeed] = useState({ following: [], everyone: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reactingKey, setReactingKey] = useState("");
  const [followBusyUserId, setFollowBusyUserId] = useState("");
  const [feedPage, setFeedPage] = useState({
    following: { hasMore: false, nextCursor: null },
    everyone: { hasMore: false, nextCursor: null },
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const feedRef = useRef(feed);
  const feedPageRef = useRef(feedPage);
  const tabRef = useRef(tab);
  const loadingMoreRef = useRef(loadingMore);
  const reactingKeyRef = useRef(reactingKey);
  const followBusyUserIdRef = useRef(followBusyUserId);

  useEffect(() => {
    feedRef.current = feed;
  }, [feed]);
  useEffect(() => {
    feedPageRef.current = feedPage;
  }, [feedPage]);
  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);
  useEffect(() => {
    loadingMoreRef.current = loadingMore;
  }, [loadingMore]);

  useEffect(() => {
    reactingKeyRef.current = reactingKey;
  }, [reactingKey]);

  useEffect(() => {
    followBusyUserIdRef.current = followBusyUserId;
  }, [followBusyUserId]);

  const activeList = useMemo(
    () => (tab === "following" ? feed.following : feed.everyone),
    [tab, feed],
  );
  const displayItems = useMemo(() => {
    const { todayItems, pastItems } = groupThoughtsByDay(
      activeList,
      formatShortDateTime,
    );
    return buildThoughtSectionRows({
      todayItems,
      pastItems,
      pastSectionId: "section-past",
      mapThoughtItem: ({ thought, dateLabel }) => ({
        item: thought,
        dateLabel,
      }),
    });
  }, [activeList]);
  const isEmptyState = !loading && !error && displayItems.length === 0;
  const isListEmpty = loading || isEmptyState;

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/open-brain/feed", {
        token,
        cache: { ttlMs: CACHE_TTL_MS.FEED },
      });
      setFeed(normalizeFeedPayload(data));
      setFeedPage(normalizeFeedPagePayload(data));
    } catch (err) {
      setError(err.message || "Unable to load feed.");
      setFeed({ following: [], everyone: [] });
      setFeedPage({
        following: { hasMore: false, nextCursor: null },
        everyone: { hasMore: false, nextCursor: null },
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleReact = useCallback(
    async (thoughtId, type, active) => {
      if (!thoughtId || !type || reactingKeyRef.current) return;
      const key = `${thoughtId}-${type}`;
      setReactingKey(key);
      const previousFeed = feedRef.current;
      setFeed((current) =>
        updateThoughtAcrossFeed(current, thoughtId, (thought) => {
          const mine = { ...(thought?.reactions?.mine || {}) };
          const counts = { ...(thought?.reactions || {}) };
          const currentCount = Number(counts[type] || 0);
          if (active) {
            mine[type] = false;
            counts[type] = Math.max(0, currentCount - 1);
          } else {
            mine[type] = true;
            counts[type] = currentCount + 1;
          }
          return {
            ...thought,
            reactions: {
              ...counts,
              mine,
            },
          };
        }),
      );
      try {
        if (active) {
          await apiRequest(
            `/open-brain/feed?thought_id=${encodeURIComponent(thoughtId)}&type=${encodeURIComponent(type)}`,
            { method: "DELETE", token },
          );
        } else {
          await apiRequest("/open-brain/feed", {
            method: "POST",
            token,
            body: { thought_id: thoughtId, type },
          });
        }
      } catch (err) {
        setFeed(previousFeed);
        setError(err.message || "Unable to update reaction.");
      } finally {
        setReactingKey("");
      }
    },
    [token],
  );

  const handleToggleFollow = useCallback(
    async (targetUserId, isFollowing) => {
      if (!targetUserId || followBusyUserIdRef.current) return;
      setFollowBusyUserId(targetUserId);
      const previousFeed = feedRef.current;
      setFeed((current) =>
        updateUserAcrossFeed(current, targetUserId, (thought) => ({
          ...thought,
          profile: thought?.profile
            ? { ...thought.profile, is_following: !isFollowing }
            : thought?.profile,
        })),
      );
      try {
        await executeOpenBrainFollowToggle({
          token,
          targetUserId,
          isFollowing,
          apiRequest,
          sendFollowNotification,
        });
      } catch (err) {
        setFeed(previousFeed);
        setError(err.message || "Unable to update follow status.");
      } finally {
        setFollowBusyUserId("");
      }
    },
    [token],
  );

  const addToSecondBrain = useCallback(
    async (thought) => {
      await addThoughtToSecondBrainWithAlert({
        token,
        thought,
        onThoughtMarkedAdded: async (thoughtId) => {
          setFeed((current) =>
            updateThoughtAcrossFeed(current, thoughtId, (entry) => ({
              ...entry,
              viewer_has_added_to_second_brain: true,
            })),
          );
        },
        exactPaths: thought?.user_id
          ? [
              "/open-brain/feed",
              `/open-brain/public-thoughts?user_id=${encodeURIComponent(thought.user_id)}`,
            ]
          : ["/open-brain/feed"],
        pathPrefixes: ["/open-brain/profile", "/entries"],
      });
    },
    [token],
  );

  const openProfile = useCallback(
    (safeUsername) =>
      navigation.navigate("OpenBrainProfile", { username: safeUsername }),
    [navigation],
  );

  const keyExtractor = useCallback(
    (item) => (item.type === "section" ? item.id : String(item.item.id)),
    [],
  );

  const renderThoughtItem = useCallback(
    ({ item }) => {
      const isFollowBusy = Boolean(
        followBusyUserId && followBusyUserId === item.item.user_id,
      );
      const reactionBusyType = reactingKey.startsWith(`${item.item.id}-`)
        ? reactingKey.slice(`${item.item.id}-`.length)
        : "";
      return (
        <OpenBrainThoughtCard
          item={item.item}
          token={token}
          date={item.dateLabel}
          onReact={handleReact}
          onShare={shareThought}
          onAddToSecondBrain={addToSecondBrain}
          reactionBusyType={reactionBusyType}
          onToggleFollow={handleToggleFollow}
          isFollowBusy={isFollowBusy}
          onOpenProfile={openProfile}
        />
      );
    },
    [
      addToSecondBrain,
      followBusyUserId,
      handleReact,
      handleToggleFollow,
      openProfile,
      reactingKey,
    ],
  );

  const handleDraftPostSuccess = useCallback(
    async (data) => {
      const createdThought = data?.thought;
      if (createdThought && typeof createdThought === "object") {
        setFeed((current) => ({
          ...current,
          following: [createdThought, ...(current.following || [])],
          everyone: [createdThought, ...(current.everyone || [])],
        }));
        return;
      }
      await loadFeed();
    },
    [loadFeed],
  );

  const loadMore = useCallback(async () => {
    if (loading || loadingMoreRef.current) return;
    const activeTab = tabRef.current === "everyone" ? "everyone" : "following";
    const page = feedPageRef.current?.[activeTab];
    const nextCursor =
      typeof page?.nextCursor === "string" ? page.nextCursor : "";
    const hasMore = page?.hasMore === true;
    if (!hasMore || !nextCursor) return;

    setLoadingMore(true);
    setError("");
    try {
      const data = await apiRequest(
        buildFeedPagePath({ tab: activeTab, before: nextCursor }),
        { token },
      );
      const nextFeed = normalizeFeedPayload(data);
      const nextPage = normalizeFeedPagePayload(data);
      setFeed((current) => {
        if (activeTab === "everyone") {
          return {
            ...current,
            everyone: appendUniqueThoughts(current.everyone, nextFeed.everyone),
          };
        }
        return {
          ...current,
          following: appendUniqueThoughts(
            current.following,
            nextFeed.following,
          ),
        };
      });
      setFeedPage((current) => ({
        ...current,
        [activeTab]: nextPage[activeTab],
      }));
    } catch (err) {
      setError(err.message || "Unable to load more thoughts.");
    } finally {
      setLoadingMore(false);
    }
  }, [loading, token]);

  const listFooterComponent = useMemo(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.emptyState}>
        <ActivityIndicator />
      </View>
    );
  }, [loadingMore]);

  return (
    <View style={styles.container}>
      <OpenBrainTopMenu
        navigation={navigation}
        token={token}
        showBackButton={false}
      />
      <View style={styles.content}>
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, tab === "following" && styles.tabActive]}
            onPress={() => setTab("following")}
          >
            <Text
              style={[
                styles.tabLabel,
                tab === "following" && styles.tabLabelActive,
              ]}
            >
              following
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, tab === "everyone" && styles.tabActive]}
            onPress={() => setTab("everyone")}
          >
            <Text
              style={[
                styles.tabLabel,
                tab === "everyone" && styles.tabLabelActive,
              ]}
            >
              everyone
            </Text>
          </Pressable>
        </View>
        {!loading && error ? <Text style={styles.error}>{error}</Text> : null}
        <OpenBrainSectionedThoughtList
          data={loading ? [] : displayItems}
          keyExtractor={keyExtractor}
          renderThoughtItem={renderThoughtItem}
          onEndReached={loadMore}
          listFooterComponent={listFooterComponent}
          contentContainerStyle={[styles.list, isListEmpty && styles.listEmpty]}
          listEmptyComponent={
            loading ? (
              <View style={styles.emptyState}>
                <Text style={styles.meta}>Loading feed...</Text>
              </View>
            ) : isEmptyState ? (
              <View style={styles.emptyState}>
                <Text style={styles.meta}>No human is thinking right now</Text>
              </View>
            ) : null
          }
        />
      </View>
      <OpenBrainBottomNav
        navigation={navigation}
        currentRoute="OpenBrainFeed"
        token={token}
        onDraftPostSuccess={handleDraftPostSuccess}
      />
    </View>
  );
}
