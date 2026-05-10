import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { apiRequest } from '../api';
import OpenBrainThoughtCard from '../components/OpenBrainThoughtCard';
import OpenBrainBottomNav from '../components/OpenBrainBottomNav';
import styles from './OpenBrainProfileScreen.styles';

function initialsFromName(name) {
  const cleaned = String(name || '').trim();
  if (!cleaned) return '?';
  return cleaned.slice(0, 1).toUpperCase();
}

function mutedTint(seed = '') {
  const palette = ['#514876', '#495072', '#5a465f', '#425467', '#5c4f46', '#4f4f70'];
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

export default function OpenBrainProfileScreen({ token, route, navigation }) {
  const username = route.params?.username;
  const [profile, setProfile] = useState(null);
  const [thoughts, setThoughts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = username ? `?username=${encodeURIComponent(username)}` : '';
      const profileRes = await apiRequest(`/open-brain/profile${query}`, { token });
      const loadedProfile = profileRes.profile;
      setProfile(loadedProfile);

      const thoughtRes = await apiRequest(`/open-brain/public-thoughts?user_id=${encodeURIComponent(loadedProfile.id)}`, { token });
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
      }
    } catch {
      setProfile(prev => (prev ? { ...prev, is_following: currentlyFollowing } : prev));
    } finally {
      setFollowBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={!loading && !error && profile ? thoughts : []}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={(
          <>
            {loading ? <Text style={styles.muted}>Loading profile...</Text> : null}
            {!loading && error ? <Text style={styles.error}>{error}</Text> : null}
            {!loading && !error && profile ? (
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
                    <Text style={styles.streak}>🔥 streak {Number.isInteger(profile.streak_count) ? profile.streak_count : 0}</Text>
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
            {!loading && !error && profile && thoughts.length === 0 ? (
              <Text style={styles.empty}>No public thoughts yet.</Text>
            ) : null}
          </>
        )}
        renderItem={({ item }) => (
          <OpenBrainThoughtCard text={item.text} date={formatThoughtDate(item.created_at)} largeBody />
        )}
      />
      <OpenBrainBottomNav navigation={navigation} currentRoute="OpenBrainProfile" />
    </View>
  );
}
