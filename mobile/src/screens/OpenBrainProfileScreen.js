import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Pressable, Share, Text, View } from 'react-native';
import { apiRequest, invalidateApiCache, sendFollowNotification } from '../api';
import { CACHE_TTL_MS } from '../constants/cache';
import { buildSharedThoughtUrl } from '../share';
import OpenBrainThoughtCard from '../components/OpenBrainThoughtCard';
import OpenBrainBottomNav from '../components/OpenBrainBottomNav';
import OpenBrainTopMenu from '../components/OpenBrainTopMenu';
import styles from './OpenBrainProfileScreen.styles';

function initialsFromName(name) {
  const cleaned = String(name || '').trim();
  if (!cleaned) return '?';
  return cleaned.slice(0, 1).toUpperCase();
}

function mutedTint(seed = '') {
  const palette = ['#1ea37d', '#1f9f7a', '#20a784', '#239a76'];
  const total = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[total % palette.length];
}

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

async function shareThought(thought, username) {
  const text = String(thought?.text || '').trim();
  if (!text) return;
  const author = username ? `@${username}` : 'Someone';
  const sharedUrl = buildSharedThoughtUrl(thought?.share_slug);
  const message = sharedUrl
    ? `${author} shared a thought:\n\n${text}\n\n${sharedUrl}`
    : `${author} shared a thought:\n\n${text}`;
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
    if (!profile || profile.is_self || followBusy) return;
    const currentlyFollowing = Boolean(profile.is_following);
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
        pathPrefixes: ['/open-brain/feed'],
      });
      Alert.alert('Added to SecondBrain', 'Thought saved to your SecondBrain.');
    } catch (err) {
      Alert.alert('Add to SecondBrain', err.message || 'Unable to save thought.');
    }
  }, [token]);

  const keyExtractor = useCallback(item => (item.type === 'section' ? item.id : String(item.thought.id)), []);

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
        addToSecondBrainPayload={item.thought}
        onShare={() => shareThought(item.thought, profile?.username)}
        onAddToSecondBrain={addToSecondBrain}
      />
    );
  }, [addToSecondBrain, profile?.username]);

  return (
    <View style={styles.container}>
      <OpenBrainTopMenu navigation={navigation} token={token} />
      {loading ? (
        <View style={styles.statusState}>
          <Text style={styles.muted}>Loading profile...</Text>
        </View>
      ) : null}
      <FlatList
        data={thoughtDisplayItems}
        style={styles.list}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={(
          <>
            {!!error ? <Text style={styles.error}>{error}</Text> : null}
            {!error && profile ? (
              <View style={styles.headerCard}>
                <View style={styles.profileRow}>
                  {profile.avatar_url ? (
                    <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatarFallback, { backgroundColor: mutedTint(profile.username) }]}>
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
                  {!profile.is_self ? (
                    <Pressable
                      style={[styles.followButton, profile.is_following ? styles.followingButton : styles.followActiveButton, followBusy && { opacity: 0.55 }]}
                      onPress={toggleFollow}
                      disabled={followBusy}
                    >
                      <Text style={styles.followButtonText}>{profile.is_following ? 'unfollow' : 'follow'}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}
            {!error && profile && thoughts.length === 0 ? (
              <Text style={styles.empty}>No public thoughts yet.</Text>
            ) : null}
          </>
        )}
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
