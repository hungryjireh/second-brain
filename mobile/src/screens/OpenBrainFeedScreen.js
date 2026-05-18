import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { apiRequest, readCachedApiData, sendFollowNotification } from '../api';
import { CACHE_TTL_MS } from '../constants/cache';
import {
  addThoughtToSecondBrainWithAlert,
  buildThoughtSectionRows,
  groupThoughtsByDay,
  shareThought,
} from '../utils/secondBrainHelper';
import { formatShortDateTime } from '../utils/dateUtils';
import OpenBrainBottomNav from '../components/OpenBrainBottomNav';
import OpenBrainSectionedThoughtList from '../components/OpenBrainSectionedThoughtList';
import OpenBrainTopMenu from '../components/OpenBrainTopMenu';
import OpenBrainThoughtCard from '../components/OpenBrainThoughtCard';
import OpenBrainThoughtComposer from '../components/OpenBrainThoughtComposer';
import { useOpenBrainComposer } from '../hooks/useOpenBrainComposer';
import {
  OPEN_BRAIN_MAX_CHARS,
  randomFrom,
  THOUGHT_FALLBACK_PROMPTS,
} from '../utils/openBrainComposer';
import { executeOpenBrainFollowToggle } from '../utils/openBrainFollow';
import styles from './OpenBrainFeedScreenStyles';

function updateThoughtAcrossFeed(feed, thoughtId, updater) {
  const updateList = list => list.map(item => (item?.id === thoughtId ? updater(item) : item));
  return {
    following: updateList(feed.following || []),
    everyone: updateList(feed.everyone || []),
  };
}

function updateUserAcrossFeed(feed, userId, updater) {
  const updateList = list => list.map(item => (
    item?.user_id === userId || item?.profile?.id === userId ? updater(item) : item
  ));
  return {
    following: updateList(feed.following || []),
    everyone: updateList(feed.everyone || []),
  };
}

function normalizeFeedPayload(data) {
  const payload = data?.feed && typeof data.feed === 'object' ? data.feed : data;
  return {
    following: Array.isArray(payload?.following) ? payload.following : [],
    everyone: Array.isArray(payload?.everyone) ? payload.everyone : [],
  };
}

export default function OpenBrainFeedScreen({ token, navigation }) {
  const [tab, setTab] = useState('following');
  const [feed, setFeed] = useState({ following: [], everyone: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reactingKey, setReactingKey] = useState('');
  const [followBusyUserId, setFollowBusyUserId] = useState('');
  const [isDraftOpen, setIsDraftOpen] = useState(false);
  const feedRef = useRef(feed);
  const reactingKeyRef = useRef(reactingKey);
  const followBusyUserIdRef = useRef(followBusyUserId);

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
    error: composerError,
    setError: setComposerError,
    todayLabel,
    timeLabel,
    loadComposerState: loadComposerData,
    postThought,
  } = useOpenBrainComposer({
    token,
    apiRequest,
    cacheProfileTtlMs: CACHE_TTL_MS.PROFILE,
    cacheThoughtsTtlMs: CACHE_TTL_MS.FEED,
    fallbackSaveErrorMessage: 'Unable to save thought.',
    onPostSuccess: async data => {
      const createdThought = data?.thought;
      if (createdThought && typeof createdThought === 'object') {
        setFeed(current => ({
          ...current,
          following: [createdThought, ...(current.following || [])],
          everyone: [createdThought, ...(current.everyone || [])],
        }));
      } else {
        await loadFeed();
      }
    },
  });

  useEffect(() => {
    feedRef.current = feed;
  }, [feed]);

  useEffect(() => {
    reactingKeyRef.current = reactingKey;
  }, [reactingKey]);

  useEffect(() => {
    followBusyUserIdRef.current = followBusyUserId;
  }, [followBusyUserId]);

  const activeList = useMemo(() => (tab === 'following' ? feed.following : feed.everyone), [tab, feed]);
  const displayItems = useMemo(() => {
    const { todayItems, pastItems } = groupThoughtsByDay(activeList, formatShortDateTime);
    return buildThoughtSectionRows({
      todayItems,
      pastItems,
      pastSectionId: 'section-past',
      mapThoughtItem: ({ thought, dateLabel }) => ({ item: thought, dateLabel }),
    });
  }, [activeList]);
  const isEmptyState = !loading && !error && displayItems.length === 0;
  const isListEmpty = loading || isEmptyState;

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError('');

    let hydratedFromCache = false;
    const cachedData = await readCachedApiData('/open-brain/feed', { token });
    if (cachedData) {
      setFeed(normalizeFeedPayload(cachedData));
      setLoading(false);
      hydratedFromCache = true;
    }

    try {
      const data = await apiRequest('/open-brain/feed', { token, cache: { ttlMs: CACHE_TTL_MS.FEED } });
      setFeed(normalizeFeedPayload(data));
    } catch (err) {
      if (!hydratedFromCache) {
        setError(err.message || 'Unable to load feed.');
        setFeed({ following: [], everyone: [] });
      }
    } finally {
      if (!hydratedFromCache) {
        setLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    if (!isDraftOpen) return;
    let cancelled = false;
    loadComposerData().catch(err => {
      if (cancelled) return;
      if (String(err.message).toLowerCase().includes('404') || String(err.message).toLowerCase().includes('not found')) {
        navigation.replace('CreateOpenBrainProfile');
        return;
      }
      setComposerError(err.message || 'Unable to load draft card.');
    });
    return () => {
      cancelled = true;
    };
  }, [isDraftOpen, loadComposerData, navigation]);

  const handleReact = useCallback(async (thoughtId, type, active) => {
    if (!thoughtId || !type || reactingKeyRef.current) return;
    const key = `${thoughtId}-${type}`;
    setReactingKey(key);
    const previousFeed = feedRef.current;
    setFeed(current => updateThoughtAcrossFeed(current, thoughtId, thought => {
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
    }));
    try {
      if (active) {
        await apiRequest(`/open-brain/feed?thought_id=${encodeURIComponent(thoughtId)}&type=${encodeURIComponent(type)}`, { method: 'DELETE', token });
      } else {
        await apiRequest('/open-brain/feed', { method: 'POST', token, body: { thought_id: thoughtId, type } });
      }
    } catch (err) {
      setFeed(previousFeed);
      setError(err.message || 'Unable to update reaction.');
    } finally {
      setReactingKey('');
    }
  }, [token]);

  const handleToggleFollow = useCallback(async (targetUserId, isFollowing) => {
    if (!targetUserId || followBusyUserIdRef.current) return;
    setFollowBusyUserId(targetUserId);
    const previousFeed = feedRef.current;
    setFeed(current => updateUserAcrossFeed(current, targetUserId, thought => ({
      ...thought,
      profile: thought?.profile ? { ...thought.profile, is_following: !isFollowing } : thought?.profile,
    })));
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
      setError(err.message || 'Unable to update follow status.');
    } finally {
      setFollowBusyUserId('');
    }
  }, [token]);

  const addToSecondBrain = useCallback(async thought => {
    await addThoughtToSecondBrainWithAlert({
      token,
      thought,
      onThoughtMarkedAdded: async thoughtId => {
        setFeed(current => updateThoughtAcrossFeed(current, thoughtId, entry => ({
          ...entry,
          viewer_has_added_to_second_brain: true,
        })));
      },
      exactPaths: thought?.user_id
        ? [
            '/open-brain/feed',
            `/open-brain/public-thoughts?user_id=${encodeURIComponent(thought.user_id)}`,
          ]
        : ['/open-brain/feed'],
      pathPrefixes: ['/open-brain/profile', '/entries'],
    });
  }, [token]);

  const openProfile = useCallback(
    safeUsername => navigation.navigate('OpenBrainProfile', { username: safeUsername }),
    [navigation]
  );

  const keyExtractor = useCallback(item => (item.type === 'section' ? item.id : String(item.item.id)), []);

  const renderThoughtItem = useCallback(({ item }) => {
    return (
      <OpenBrainThoughtCard
        item={item.item}
        token={token}
        date={item.dateLabel}
        onReact={handleReact}
        onShare={shareThought}
        onAddToSecondBrain={addToSecondBrain}
        reactingKey={reactingKey}
        onToggleFollow={handleToggleFollow}
        followBusyUserId={followBusyUserId}
        onOpenProfile={openProfile}
      />
    );
  }, [addToSecondBrain, followBusyUserId, handleReact, handleToggleFollow, openProfile, reactingKey]);

  return (
    <View style={styles.container}>
      <OpenBrainTopMenu navigation={navigation} token={token} />
      <View style={styles.content}>
        <View style={styles.tabs}>
          <Pressable style={[styles.tab, tab === 'following' && styles.tabActive]} onPress={() => setTab('following')}>
            <Text style={[styles.tabLabel, tab === 'following' && styles.tabLabelActive]}>following</Text>
          </Pressable>
          <Pressable style={[styles.tab, tab === 'everyone' && styles.tabActive]} onPress={() => setTab('everyone')}>
            <Text style={[styles.tabLabel, tab === 'everyone' && styles.tabLabelActive]}>everyone</Text>
          </Pressable>
        </View>
        {!loading && error ? <Text style={styles.error}>{error}</Text> : null}
        <OpenBrainSectionedThoughtList
          data={loading ? [] : displayItems}
          keyExtractor={keyExtractor}
          renderThoughtItem={renderThoughtItem}
          contentContainerStyle={[styles.list, isListEmpty && styles.listEmpty]}
          listEmptyComponent={loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.meta}>Loading feed...</Text>
            </View>
          ) : isEmptyState ? (
            <View style={styles.emptyState}>
              <Text style={styles.meta}>No human is thinking right now</Text>
            </View>
          ) : null}
        />
      </View>
      <Pressable
        style={[styles.floatingDraftButton, isDraftOpen && styles.floatingDraftButtonActive]}
        onPress={() => setIsDraftOpen(current => !current)}
        accessibilityRole="button"
        accessibilityLabel={isDraftOpen ? 'Close draft popup' : 'Open draft popup'}
      >
        <Text style={styles.draftIcon}>✎</Text>
      </Pressable>
      <Modal visible={isDraftOpen} animationType="fade" transparent onRequestClose={() => setIsDraftOpen(false)}>
        <View style={styles.modalOverlay}>
          <BlurView intensity={30} tint="dark" style={styles.modalBlur} />
          <Pressable style={styles.modalBackdrop} onPress={() => setIsDraftOpen(false)} />
          <View style={styles.modalCardWrap}>
            <OpenBrainThoughtComposer
              value={draft}
              onChangeText={text => setDraft(text.slice(0, OPEN_BRAIN_MAX_CHARS))}
              placeholder="Write your thought for today..."
              buttonLabel={saving ? 'Saving...' : hasPostedToday ? '✓' : 'Done'}
              onSubmit={postThought}
              disabled={saving || !draft.trim()}
              multiline
              maxLength={OPEN_BRAIN_MAX_CHARS}
              showRemaining={false}
              dateLabel={todayLabel}
              timeLabel={timeLabel}
              streakCount={streakCount}
              saveCount={saveCount}
              heading={hasPostedToday ? (postedHeading || "What's on your mind?") : "What's on your mind?"}
              prompt={prompt}
              onRefreshPrompt={() => setPrompt(current => randomFrom(THOUGHT_FALLBACK_PROMPTS, current))}
              canRefreshPrompt={THOUGHT_FALLBACK_PROMPTS.length > 1}
              visibility={visibility}
              onToggleVisibility={() => setVisibility(current => (current === 'public' ? 'private' : 'public'))}
              isPosted={hasPostedToday}
              error={composerError}
            />
          </View>
        </View>
      </Modal>
      <OpenBrainBottomNav navigation={navigation} currentRoute="OpenBrainFeed" />
    </View>
  );
}
