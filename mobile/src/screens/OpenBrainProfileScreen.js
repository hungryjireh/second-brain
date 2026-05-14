import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Pressable, Share, Text, View } from 'react-native';
import { apiRequest, invalidateApiCache, sendFollowNotification } from '../api';
import { CACHE_TTL_MS } from '../constants/cache';
import { buildSharedThoughtUrl } from '../share';
import OpenBrainThoughtCard from '../components/OpenBrainThoughtCard';
import OpenBrainBottomNav from '../components/OpenBrainBottomNav';
import OpenBrainTopMenu from '../components/OpenBrainTopMenu';
import { initialsFromName } from '../utils/profileAvatar';
import { theme } from '../theme';
import styles from './OpenBrainProfileScreen.styles';

function formatThoughtDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isSameLocalDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function coerceBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0' || normalized === '') return false;
  }
  return false;
}

async function shareThought(thought, username) {
  const text = String(thought?.text || '').trim();
  if (!text) return;
  const sharedUrl = buildSharedThoughtUrl(thought?.share_slug);
  const message = sharedUrl || text;
  await Share.share({
    message,
    ...(sharedUrl ? { url: sharedUrl } : {}),
  });
}

export default function OpenBrainProfileScreen({ token, route, navigation }) {
  const username = route.params?.username;
  const [profile, setProfile] = useState(null);
  const [thoughts, setThoughts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);
  const thoughtDisplayItems = useMemo(() => {
    if (error || !profile) return [];

    const today = new Date();
    const todaysThoughts = [];
    const otherThoughts = [];

    thoughts.forEach(thought => {
      const created = new Date(thought.created_at);
      if (!Number.isNaN(created.getTime()) && isSameLocalDay(created, today)) {
        todaysThoughts.push(thought);
        return;
      }
      otherThoughts.push(thought);
    });

    const items = [];
    if (todaysThoughts.length > 0) {
      items.push({ type: 'section', id: 'section-today', title: "Today's Thoughts" });
      todaysThoughts.forEach(thought => items.push({
        type: 'thought',
        thought,
        dateLabel: formatThoughtDate(thought.created_at),
      }));
    }
    if (otherThoughts.length > 0) {
      items.push({ type: 'section', id: 'section-other', title: 'Past Thoughts' });
      otherThoughts.forEach(thought => items.push({
        type: 'thought',
        thought,
        dateLabel: formatThoughtDate(thought.created_at),
      }));
    }
    return items;
  }, [error, profile, thoughts]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = username ? `?username=${encodeURIComponent(username)}` : '';
      const profileRes = await apiRequest(`/open-brain/profile${query}`, { token, cache: { ttlMs: CACHE_TTL_MS.PROFILE } });
      const loadedProfile = profileRes.profile;
      setProfile(loadedProfile);

      const thoughtRes = await apiRequest(`/open-brain/public-thoughts?user_id=${encodeURIComponent(loadedProfile.id)}`, {
        token,
        cache: { ttlMs: CACHE_TTL_MS.FEED },
      });
      setThoughts(Array.isArray(thoughtRes.thoughts) ? thoughtRes.thoughts : []);
    } catch (err) {
      setError(err.message);
      setProfile(null);
      setThoughts([]);
    } finally {
      setLoading(false);
    }
  }, [token, username]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleFollow() {
    if (!profile || coerceBoolean(profile.is_self) || followBusy) return;
    const currentlyFollowing = coerceBoolean(profile.is_following);
    setFollowBusy(true);
    setProfile(prev => (prev ? { ...prev, is_following: !currentlyFollowing } : prev));
    try {
      if (currentlyFollowing) {
        await apiRequest(`/open-brain/follows?following_id=${encodeURIComponent(profile.id)}`, { method: 'DELETE', token });
      } else {
        await apiRequest('/open-brain/follows', { method: 'POST', token, body: { following_id: profile.id } });
        await sendFollowNotification(token, profile.id);
      }
    } catch {
      setProfile(prev => (prev ? { ...prev, is_following: currentlyFollowing } : prev));
    } finally {
      setFollowBusy(false);
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
        setThoughts(current => current.map(item => (
          item?.id === thoughtId
            ? { ...item, viewer_has_added_to_second_brain: true }
            : item
        )));
      }
      await invalidateApiCache({
        token,
        exactPaths: profile?.id ? [`/open-brain/public-thoughts?user_id=${encodeURIComponent(profile.id)}`] : [],
        pathPrefixes: ['/open-brain/feed', '/open-brain/profile', '/entries'],
      });
      Alert.alert('Added to SecondBrain', 'Thought saved to your SecondBrain.');
    } catch (err) {
      Alert.alert('Add to SecondBrain', err.message || 'Unable to save thought.');
    }
  }, [token]);

  const keyExtractor = useCallback(item => (item.type === 'section' ? item.id : String(item.thought.id)), []);
  const isSelf = coerceBoolean(profile?.is_self);
  const isFollowing = coerceBoolean(profile?.is_following);

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
        text={item.thought.text}
        date={item.dateLabel}
        feedBody
        transparentCard
        inlineActionWithDate
        addToSecondBrainPayload={item.thought}
        onShare={() => shareThought(item.thought, profile?.username)}
        onAddToSecondBrain={addToSecondBrain}
      />
    );
  }, [addToSecondBrain, profile?.username]);

  return (
    <View style={styles.container}>
      <OpenBrainTopMenu navigation={navigation} token={token} />
      <View style={styles.fixedHeader}>
        {!!error ? <Text style={styles.error}>{error}</Text> : null}
        {!error && profile ? (
          <View style={styles.headerCard}>
            <View style={styles.profileRow}>
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: theme.colors.accent }]}>
                  <Text style={styles.avatarFallbackText}>{initialsFromName(profile.username)}</Text>
                </View>
              )}
              <View style={styles.profileText}>
                <Text style={styles.username}>@{profile.username}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.streakPill}>
                    <Text style={styles.streakPillText}>🔥 streak {Number.isInteger(profile.streak_count) ? profile.streak_count : 0}</Text>
                  </View>
                  <Text style={styles.thoughtCount}>
                    {thoughts.length} {thoughts.length === 1 ? 'thought' : 'thoughts'}
                  </Text>
                </View>
              </View>
              {!isSelf ? (
                <Pressable
                  style={[styles.followButton, isFollowing ? styles.followingButton : styles.followActiveButton, followBusy && { opacity: 0.55 }]}
                  onPress={toggleFollow}
                  disabled={followBusy}
                >
                  <Text style={[styles.followButtonText, isFollowing && styles.followButtonTextFollowing]}>
                    {isFollowing ? 'unfollow' : 'follow'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
        {!error && !profile && !loading ? (
          <View style={styles.headerCard}>
            <View style={styles.profileRow}>
              <View style={styles.avatarPlaceholder} />
              <View style={styles.profileText}>
                <View style={styles.usernamePlaceholder} />
                <View style={styles.metaRow}>
                  <View style={styles.streakPlaceholder} />
                  <View style={styles.thoughtCountPlaceholder} />
                </View>
              </View>
            </View>
          </View>
        ) : null}
      </View>
      <FlatList
        data={thoughtDisplayItems}
        style={styles.list}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!error && loading && !profile ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.muted}>Loading profile...</Text>
          </View>
        ) : !error && profile && thoughts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.empty}>No public thoughts yet.</Text>
          </View>
        ) : null}
        renderItem={renderItem}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        updateCellsBatchingPeriod={50}
        windowSize={7}
        removeClippedSubviews
      />
      <OpenBrainBottomNav navigation={navigation} currentRoute="OpenBrainProfile" />
    </View>
  );
}
