import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, Share, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { apiRequest, invalidateApiCache, readCachedApiData, sendFollowNotification } from '../api';
import { CACHE_TTL_MS } from '../constants/cache';
import { buildThoughtSharePayload } from '../share';
import OpenBrainBottomNav from '../components/OpenBrainBottomNav';
import OpenBrainTopMenu from '../components/OpenBrainTopMenu';
import OpenBrainThoughtCard from '../components/OpenBrainThoughtCard';
import OpenBrainThoughtComposer from '../components/OpenBrainThoughtComposer';
import styles from './OpenBrainFeedScreenStyles';

const MAX_CHARS = 5000;
const THOUGHT_FALLBACK_PROMPTS = [
  'What stayed with you today?',
  'What are you noticing about yourself?',
  'What felt true for a second?',
  'Write your thought for today...',
];
const THANK_YOU_PROMPTS = [
  "What's on your mind?",
  'thank you for sharing',
  'that belongs to today now',
];

function formatDateTimeLabel(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeLabel = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `${dateLabel} ${timeLabel}`;
}

function formatTodayLabel(date) {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  return `${dayName} ${day} ${month}`;
}

function formatTimeLabel(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function randomFrom(list, current = '') {
  if (!Array.isArray(list) || list.length === 0) return '';
  if (list.length === 1) return list[0];
  let next = current;
  while (next === current) {
    next = list[Math.floor(Math.random() * list.length)];
  }
  return next;
}

async function shareThought(thought) {
  const payload = buildThoughtSharePayload(thought);
  if (!payload) return;
  await Share.share(payload);
}

function isSameLocalDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

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
  const [draft, setDraft] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [hasPostedToday, setHasPostedToday] = useState(false);
  const [postedHeading, setPostedHeading] = useState('');
  const [streakCount, setStreakCount] = useState(0);
  const [saveCount, setSaveCount] = useState(0);
  const [prompt, setPrompt] = useState(() => randomFrom(THOUGHT_FALLBACK_PROMPTS));
  const [saving, setSaving] = useState(false);
  const [composerError, setComposerError] = useState('');
  const feedRef = useRef(feed);
  const reactingKeyRef = useRef(reactingKey);
  const followBusyUserIdRef = useRef(followBusyUserId);

  useEffect(() => {
    feedRef.current = feed;
  }, [feed]);

  useEffect(() => {
    reactingKeyRef.current = reactingKey;
  }, [reactingKey]);

  useEffect(() => {
    followBusyUserIdRef.current = followBusyUserId;
  }, [followBusyUserId]);

  const todayLabel = useMemo(() => formatTodayLabel(new Date()), []);
  const timeLabel = useMemo(() => formatTimeLabel(), []);

  const activeList = useMemo(() => (tab === 'following' ? feed.following : feed.everyone), [tab, feed]);
  const displayItems = useMemo(() => {
    const today = new Date();
    const todaysThoughts = [];
    const pastThoughts = [];

    activeList.forEach(item => {
      const created = new Date(item.created_at);
      if (!Number.isNaN(created.getTime()) && isSameLocalDay(created, today)) {
        todaysThoughts.push(item);
      } else {
        pastThoughts.push(item);
      }
    });

    const items = [];
    if (todaysThoughts.length > 0) {
      items.push({ type: 'section', id: 'section-today', title: "Today's Thoughts" });
      todaysThoughts.forEach(item => items.push({
        type: 'thought',
        item,
        dateLabel: formatDateTimeLabel(item.created_at),
      }));
    }
    if (pastThoughts.length > 0) {
      items.push({ type: 'section', id: 'section-past', title: 'Past Thoughts' });
      pastThoughts.forEach(item => items.push({
        type: 'thought',
        item,
        dateLabel: formatDateTimeLabel(item.created_at),
      }));
    }

    return items;
  }, [activeList]);
  const isEmptyState = !loading && !error && displayItems.length === 0;
  const isListEmpty = loading || isEmptyState;

  const loadComposerData = useCallback(async () => {
    const [profileData, thoughtData] = await Promise.all([
      apiRequest('/open-brain/profile', { token, cache: { ttlMs: CACHE_TTL_MS.PROFILE } }),
      apiRequest('/open-brain/thoughts', { token, cache: { ttlMs: CACHE_TTL_MS.FEED } }),
    ]);
    setStreakCount(Number.isInteger(profileData?.profile?.streak_count) ? profileData.profile.streak_count : 0);
    setSaveCount(Number.isInteger(profileData?.profile?.save_count) ? profileData.profile.save_count : 0);
    if (thoughtData?.has_posted_today && thoughtData?.thought) {
      const postedText = typeof thoughtData.thought?.content?.text === 'string' ? thoughtData.thought.content.text : '';
      setDraft(postedText);
      setVisibility(thoughtData.thought?.visibility === 'private' ? 'private' : 'public');
      setHasPostedToday(true);
      setPostedHeading(randomFrom(THANK_YOU_PROMPTS));
    } else {
      setHasPostedToday(false);
    }
  }, [token]);

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
      if (isFollowing) {
        await apiRequest(`/open-brain/follows?following_id=${encodeURIComponent(targetUserId)}`, { method: 'DELETE', token });
      } else {
        await apiRequest('/open-brain/follows', { method: 'POST', token, body: { following_id: targetUserId } });
        await sendFollowNotification(token, targetUserId);
      }
    } catch (err) {
      setFeed(previousFeed);
      setError(err.message || 'Unable to update follow status.');
    } finally {
      setFollowBusyUserId('');
    }
  }, [token]);

  async function postThought() {
    if (!draft.trim() || saving || hasPostedToday) return;
    try {
      setSaving(true);
      setComposerError('');
      const data = await apiRequest('/open-brain/thoughts', { method: 'POST', token, body: { thought: draft.trim(), visibility } });
      setHasPostedToday(true);
      setPostedHeading(randomFrom(THANK_YOU_PROMPTS));
      setStreakCount(Number.isInteger(data?.profile?.streak_count) ? data.profile.streak_count : streakCount);
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
    } catch (err) {
      setComposerError(err.message || 'Unable to save thought.');
    } finally {
      setSaving(false);
    }
  }

  const addToSecondBrain = useCallback(async thought => {
    const thoughtText = String(thought?.text || '').trim();
    if (!thoughtText) return;
    const thoughtId = thought?.id;
    const username = String(thought?.profile?.username || thought?.username || 'unknown').trim() || 'unknown';
    const description = `Thought taken from @${username}:\n\n${thoughtText}`;
    try {
      await apiRequest('/entries', {
        method: 'POST',
        token,
        body: { description, category: 'thought', tags: ['openbrain'] },
      });
      if (thoughtId) {
        await apiRequest('/open-brain/add-to-second-brain-click', {
          method: 'POST',
          token,
          body: { thought_id: thoughtId },
        });
        setFeed(current => updateThoughtAcrossFeed(current, thoughtId, entry => ({
          ...entry,
          viewer_has_added_to_second_brain: true,
        })));
      }
      await invalidateApiCache({
        token,
        exactPaths: thought?.user_id
          ? [
              '/open-brain/feed',
              `/open-brain/public-thoughts?user_id=${encodeURIComponent(thought.user_id)}`,
            ]
          : ['/open-brain/feed'],
        pathPrefixes: ['/open-brain/profile', '/entries'],
      });
      Alert.alert('Added to SecondBrain', 'Thought saved to your SecondBrain.');
    } catch (err) {
      Alert.alert('Add to SecondBrain', err.message || 'Unable to save thought.');
    }
  }, [token]);

  const openProfile = useCallback(
    safeUsername => navigation.navigate('OpenBrainProfile', { username: safeUsername }),
    [navigation]
  );

  const keyExtractor = useCallback(item => (item.type === 'section' ? item.id : String(item.item.id)), []);

  const renderItem = useCallback(({ item }) => {
    if (item.type === 'section') {
      return (
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>{item.title}</Text>
          <View style={styles.sectionHeaderLine} />
        </View>
      );
    }
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
        <FlatList
          data={loading ? [] : displayItems}
          keyExtractor={keyExtractor}
          contentContainerStyle={[styles.list, isListEmpty && styles.listEmpty]}
          renderItem={renderItem}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          updateCellsBatchingPeriod={50}
          windowSize={7}
          removeClippedSubviews
          ListEmptyComponent={loading ? (
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
              onChangeText={text => setDraft(text.slice(0, MAX_CHARS))}
              placeholder="Write your thought for today..."
              buttonLabel={saving ? 'Saving...' : hasPostedToday ? '✓' : 'Done'}
              onSubmit={postThought}
              disabled={saving || !draft.trim()}
              multiline
              maxLength={MAX_CHARS}
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
