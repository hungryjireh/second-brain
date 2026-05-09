import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, FlatList, TextInput } from 'react-native';
import { apiRequest } from '../api';
import { theme } from '../theme';
import styles from './OpenBrainScreen.styles';

export default function OpenBrainScreen({ token, navigation }) {
  const [tab, setTab] = useState('following');
  const [feed, setFeed] = useState({ following: [], everyone: [] });
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const ensureProfile = useCallback(async () => {
    try {
      await apiRequest('/open-brain/profile', { token });
      return true;
    } catch (err) {
      if (String(err.message).toLowerCase().includes('404') || String(err.message).toLowerCase().includes('not found')) {
        navigation.replace('CreateOpenBrainProfile');
        return false;
      }
      throw err;
    }
  }, [navigation, token]);

  const loadFeed = useCallback(async () => {
    try {
      setError('');
      const hasProfile = await ensureProfile();
      if (!hasProfile) return;
      const data = await apiRequest('/open-brain/feed', { token });
      setFeed({ following: data.following || [], everyone: data.everyone || [] });
    } catch (err) {
      setError(err.message);
    }
  }, [ensureProfile, token]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  async function postThought() {
    if (!draft.trim()) return;
    try {
      await apiRequest('/open-brain/thoughts', { method: 'POST', token, body: { thought: draft.trim(), visibility: 'public' } });
      setDraft('');
      await loadFeed();
    } catch (err) {
      setError(err.message);
    }
  }

  const items = tab === 'following' ? feed.following : feed.everyone;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>OpenBrain</Text>
      <View style={styles.topActions}>
        <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('OpenBrainProfile')}>
          <Text style={styles.secondaryButtonText}>My profile</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('SharedThought')}>
          <Text style={styles.secondaryButtonText}>Shared thought</Text>
        </Pressable>
      </View>
      <TextInput value={draft} onChangeText={setDraft} placeholder="One thought for today..." placeholderTextColor={theme.colors.textSecondary} style={styles.input} multiline maxLength={280} />
      <Pressable style={styles.button} onPress={postThought}><Text style={styles.buttonText}>Post thought</Text></Pressable>
      <View style={styles.tabs}>
        <Pressable onPress={() => setTab('following')} style={[styles.tab, tab === 'following' && styles.tabActive]}><Text style={styles.tabText}>Following</Text></Pressable>
        <Pressable onPress={() => setTab('everyone')} style={[styles.tab, tab === 'everyone' && styles.tabActive]}><Text style={styles.tabText}>Everyone</Text></Pressable>
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={items}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => item.profile?.username && navigation.navigate('OpenBrainProfile', { username: item.profile.username })}>
            <Text style={styles.meta}>@{item.profile?.username || 'unknown'}</Text>
            <Text style={styles.body}>{item.text || ''}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
