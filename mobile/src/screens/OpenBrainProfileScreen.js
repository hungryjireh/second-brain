import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { apiRequest } from '../api';
import OpenBrainThoughtCard from '../components/OpenBrainThoughtCard';
import styles from './OpenBrainProfileScreen.styles';

export default function OpenBrainProfileScreen({ token, route }) {
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
      {loading ? <Text style={styles.muted}>Loading profile...</Text> : null}
      {!loading && error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !error && profile ? (
        <>
          <View style={styles.headerCard}>
            <Text style={styles.username}>@{profile.username}</Text>
            <Text style={styles.streak}>Streak: {Number.isInteger(profile.streak_count) ? profile.streak_count : 0}</Text>
            {!profile.is_self ? (
              <Pressable style={styles.followButton} onPress={toggleFollow} disabled={followBusy}>
                <Text style={styles.followButtonText}>{profile.is_following ? 'Unfollow' : 'Follow'}</Text>
              </Pressable>
            ) : null}
          </View>
          <FlatList
            data={thoughts}
            keyExtractor={item => String(item.id)}
            renderItem={({ item }) => (
              <OpenBrainThoughtCard text={item.text} date={new Date(item.created_at).toLocaleString()} />
            )}
          />
        </>
      ) : null}
    </View>
  );
}
