import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { apiRequest } from '../api';
import OpenBrainBottomNav from '../components/OpenBrainBottomNav';
import OpenBrainThoughtCard from '../components/OpenBrainThoughtCard';
import OpenBrainThoughtComposer from '../components/OpenBrainThoughtComposer';
import { theme } from '../theme';

const MAX_CHARS = 280;
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
  const [prompt, setPrompt] = useState(() => randomFrom(THOUGHT_FALLBACK_PROMPTS));
  const [saving, setSaving] = useState(false);
  const [composerError, setComposerError] = useState('');

  const todayLabel = useMemo(() => formatTodayLabel(new Date()), []);
  const timeLabel = useMemo(() => formatTimeLabel(), []);

  const activeList = useMemo(() => (tab === 'following' ? feed.following : feed.everyone), [tab, feed]);

  const loadComposerData = useCallback(async () => {
    const [profileData, thoughtData] = await Promise.all([
      apiRequest('/open-brain/profile', { token }),
      apiRequest('/open-brain/thoughts', { token }),
    ]);
    setStreakCount(Number.isInteger(profileData?.profile?.streak_count) ? profileData.profile.streak_count : 0);
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
    try {
      const data = await apiRequest('/open-brain/feed', { token });
      const payload = data?.feed && typeof data.feed === 'object' ? data.feed : data;
      setFeed({
        following: Array.isArray(payload?.following) ? payload.following : [],
        everyone: Array.isArray(payload?.everyone) ? payload.everyone : [],
      });
    } catch (err) {
      setError(err.message || 'Unable to load feed.');
      setFeed({ following: [], everyone: [] });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          style={[styles.draftButton, isDraftOpen && styles.draftButtonActive]}
          onPress={() => setIsDraftOpen(current => !current)}
          accessibilityRole="button"
          accessibilityLabel={isDraftOpen ? 'Close draft card' : 'Open draft card'}
        >
          <Text style={styles.draftIcon}>✎</Text>
        </Pressable>
      ),
    });
  }, [isDraftOpen, navigation]);

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

  async function handleReact(thoughtId, type, active) {
    if (!thoughtId || !type || reactingKey) return;
    const key = `${thoughtId}-${type}`;
    setReactingKey(key);
    try {
      if (active) {
        await apiRequest(`/open-brain/feed?thought_id=${encodeURIComponent(thoughtId)}&type=${encodeURIComponent(type)}`, { method: 'DELETE', token });
      } else {
        await apiRequest('/open-brain/feed', { method: 'POST', token, body: { thought_id: thoughtId, type } });
      }
      await loadFeed();
    } finally {
      setReactingKey('');
    }
  }

  async function handleToggleFollow(targetUserId, isFollowing) {
    if (!targetUserId || followBusyUserId) return;
    setFollowBusyUserId(targetUserId);
    try {
      if (isFollowing) {
        await apiRequest(`/open-brain/follows?following_id=${encodeURIComponent(targetUserId)}`, { method: 'DELETE', token });
      } else {
        await apiRequest('/open-brain/follows', { method: 'POST', token, body: { following_id: targetUserId } });
      }
      await loadFeed();
    } finally {
      setFollowBusyUserId('');
    }
  }

  async function postThought() {
    if (!draft.trim() || saving || hasPostedToday) return;
    try {
      setSaving(true);
      setComposerError('');
      const data = await apiRequest('/open-brain/thoughts', { method: 'POST', token, body: { thought: draft.trim(), visibility } });
      setHasPostedToday(true);
      setPostedHeading(randomFrom(THANK_YOU_PROMPTS));
      setStreakCount(Number.isInteger(data?.profile?.streak_count) ? data.profile.streak_count : streakCount);
      await loadFeed();
    } catch (err) {
      setComposerError(err.message || 'Unable to save thought.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {isDraftOpen ? (
          <View style={styles.draftCardWrap}>
            <OpenBrainThoughtComposer
              value={draft}
              onChangeText={text => setDraft(text.slice(0, MAX_CHARS))}
              placeholder="Write your thought for today..."
              buttonLabel={saving ? 'Saving...' : hasPostedToday ? '✓' : 'Done'}
              onSubmit={postThought}
              disabled={saving || !draft.trim()}
              multiline
              maxLength={MAX_CHARS}
              dateLabel={todayLabel}
              timeLabel={timeLabel}
              streakCount={streakCount}
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
        ) : null}
        <View style={styles.tabs}>
          <Pressable style={[styles.tab, tab === 'following' && styles.tabActive]} onPress={() => setTab('following')}>
            <Text style={[styles.tabLabel, tab === 'following' && styles.tabLabelActive]}>following</Text>
          </Pressable>
          <Pressable style={[styles.tab, tab === 'everyone' && styles.tabActive]} onPress={() => setTab('everyone')}>
            <Text style={[styles.tabLabel, tab === 'everyone' && styles.tabLabelActive]}>everyone</Text>
          </Pressable>
        </View>
        {loading ? <Text style={styles.meta}>Loading feed...</Text> : null}
        {!loading && error ? <Text style={styles.error}>{error}</Text> : null}
        <FlatList
          data={loading ? [] : activeList}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <OpenBrainThoughtCard
              item={item}
              date={formatDateTimeLabel(item.created_at)}
              onReact={handleReact}
              reactingKey={reactingKey}
              onToggleFollow={handleToggleFollow}
              followBusyUserId={followBusyUserId}
              onOpenProfile={safeUsername => navigation.navigate('OpenBrainProfile', { username: safeUsername })}
            />
          )}
          ListEmptyComponent={!loading && !error ? <Text style={styles.meta}>No posts yet today.</Text> : null}
        />
      </View>
      <OpenBrainBottomNav navigation={navigation} currentRoute="OpenBrainFeed" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgSurface,
  },
  content: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 12,
  },
  draftButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: theme.colors.border,
    borderWidth: 1,
    backgroundColor: theme.colors.bgBase,
    marginRight: 16,
  },
  draftButtonActive: {
    borderColor: theme.colors.brand,
    backgroundColor: theme.colors.brandDim,
  },
  draftIcon: {
    color: theme.colors.textPrimary,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 18,
    lineHeight: 18,
  },
  draftCardWrap: {
    marginBottom: 12,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 9,
    backgroundColor: theme.colors.bgBase,
  },
  tabActive: {
    borderColor: theme.colors.brand,
    backgroundColor: theme.colors.bgRaised,
  },
  tabLabel: {
    color: theme.colors.textSecondary,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
  },
  tabLabelActive: {
    color: theme.colors.textPrimary,
  },
  list: {
    paddingBottom: 130,
  },
  meta: {
    color: theme.colors.textSecondary,
    fontFamily: 'DMSans_400Regular',
    marginBottom: 12,
  },
  error: {
    color: theme.colors.danger,
    fontFamily: 'DMSans_400Regular',
    marginBottom: 12,
  },
});
