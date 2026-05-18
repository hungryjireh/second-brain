import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { apiRequest, sendFollowNotification } from '../api';
import { CACHE_TTL_MS } from '../constants/cache';
import OpenBrainThoughtCard from '../components/OpenBrainThoughtCard';
import OpenBrainBottomNav from '../components/OpenBrainBottomNav';
import OpenBrainSectionedThoughtList from '../components/OpenBrainSectionedThoughtList';
import OpenBrainTopMenu from '../components/OpenBrainTopMenu';
import styles from './OpenBrainProfileScreen.styles';
import ProfileAvatar from '../components/ProfileAvatar';
import {
  addThoughtToSecondBrainWithAlert,
  buildThoughtSectionRows,
  groupThoughtsByDay,
  shareThought,
} from '../utils/secondBrainHelper';
import { formatPublishedDateTime } from '../utils/dateUtils';
import { executeOpenBrainFollowToggle } from '../utils/openBrainFollow';

export default function OpenBrainProfileScreen({ token, route, navigation }) {
  const username = route.params?.username;
  const [profile, setProfile] = useState(null);
  const [thoughts, setThoughts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);
  const thoughtDisplayItems = useMemo(() => {
    if (error || !profile) return [];
    const { todayItems, pastItems } = groupThoughtsByDay(thoughts, formatPublishedDateTime);
    return buildThoughtSectionRows({
      todayItems,
      pastItems,
      pastSectionId: 'section-other',
    });
  }, [error, profile, thoughts]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = username ? `?username=${encodeURIComponent(username)}` : '';
      const profileCacheScope = String(username || 'self').trim().toLowerCase();
      const profileRes = await apiRequest(`/open-brain/profile${query}`, {
        token,
        cache: {
          ttlMs: CACHE_TTL_MS.PROFILE_PAGE,
          key: `open-brain-profile-page:${profileCacheScope}:profile`,
        },
      });
      const loadedProfile = profileRes.profile;
      setProfile(loadedProfile);

      const thoughtRes = await apiRequest(`/open-brain/public-thoughts?user_id=${encodeURIComponent(loadedProfile.id)}`, {
        token,
        cache: {
          ttlMs: CACHE_TTL_MS.PROFILE_PAGE,
          key: `open-brain-profile-page:${profileCacheScope}:thoughts`,
        },
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
    if (!profile || profile.is_self === true || followBusy) return;
    const currentlyFollowing = profile.is_following === true;
    setFollowBusy(true);
    setProfile(prev => (prev ? { ...prev, is_following: !currentlyFollowing } : prev));
    try {
      await executeOpenBrainFollowToggle({
        token,
        targetUserId: profile.id,
        isFollowing: currentlyFollowing,
        apiRequest,
        sendFollowNotification,
      });
    } catch {
      setProfile(prev => (prev ? { ...prev, is_following: currentlyFollowing } : prev));
    } finally {
      setFollowBusy(false);
    }
  }

  const addToSecondBrain = useCallback(async thought => {
    await addThoughtToSecondBrainWithAlert({
      token,
      thought,
      onThoughtMarkedAdded: async thoughtId => {
        setThoughts(current => current.map(item => (
          item?.id === thoughtId
            ? { ...item, viewer_has_added_to_second_brain: true }
            : item
        )));
      },
      exactPaths: profile?.id ? [`/open-brain/public-thoughts?user_id=${encodeURIComponent(profile.id)}`] : [],
      pathPrefixes: ['/open-brain/feed', '/open-brain/profile', '/entries'],
    });
  }, [token]);

  const keyExtractor = useCallback(item => (item.type === 'section' ? item.id : String(item.thought.id)), []);
  const isSelf = profile?.is_self === true;
  const isFollowing = profile?.is_following === true;

  const renderThoughtItem = useCallback(({ item }) => {
    return (
      <OpenBrainThoughtCard
        text={item.thought.text}
        date={item.dateLabel}
        feedBody
        transparentCard
        inlineActionWithDate
        addToSecondBrainPayload={item.thought}
        onShare={() => shareThought(item.thought)}
        onAddToSecondBrain={addToSecondBrain}
      />
    );
  }, [addToSecondBrain]);

  return (
    <View style={styles.container}>
      <OpenBrainTopMenu navigation={navigation} token={token} />
      <View style={styles.fixedHeader}>
        {!!error ? <Text style={styles.error}>{error}</Text> : null}
        {!error && profile ? (
          <View style={styles.headerCard}>
            <View style={styles.profileRow}>
              <ProfileAvatar
                profile={profile}
                avatarUrl={profile.avatar_url}
                username={profile.username}
                token={token}
                imageStyle={styles.avatar}
                fallbackStyle={styles.avatarFallback}
                textStyle={styles.avatarFallbackText}
              />
              <View style={styles.profileText}>
                <Text style={styles.username}>@{profile.username}</Text>
                {!!String(profile.bio || '').trim() && (
                  <Text style={styles.bio}>{String(profile.bio).trim()}</Text>
                )}
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
      <OpenBrainSectionedThoughtList
        data={thoughtDisplayItems}
        style={styles.list}
        keyExtractor={keyExtractor}
        renderThoughtItem={renderThoughtItem}
        contentContainerStyle={styles.listContent}
        listEmptyComponent={!error && loading && !profile ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.muted}>Loading profile...</Text>
          </View>
        ) : !error && profile && thoughts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.empty}>No public thoughts yet.</Text>
          </View>
        ) : null}
      />
      <OpenBrainBottomNav navigation={navigation} currentRoute="OpenBrainProfile" />
    </View>
  );
}
