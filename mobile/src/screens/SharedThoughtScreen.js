import { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { apiRequest } from '../api';
import { theme } from '../theme';
import styles from './SharedThoughtScreen.styles';

function formatPublished(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function SharedThoughtScreen() {
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState(null);

  async function load() {
    if (!slug.trim()) return;
    setLoading(true);
    setError('');
    setPayload(null);
    try {
      const data = await apiRequest(`/open-brain/shared-thought?slug=${encodeURIComponent(slug.trim())}`);
      setPayload(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Open shared thought</Text>
      <TextInput value={slug} onChangeText={setSlug} placeholder="share slug" placeholderTextColor={theme.colors.textSecondary} style={styles.input} autoCapitalize="none" />
      <Pressable style={styles.button} onPress={load} disabled={loading || !slug.trim()}>
        <Text style={styles.buttonText}>{loading ? 'Loading...' : 'Load thought'}</Text>
      </Pressable>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {payload?.thought ? (
        <View style={styles.card}>
          <Text style={styles.body}>{payload.thought.text}</Text>
          <Text style={styles.meta}>by @{payload.author?.username || 'anonymous'}</Text>
          <Text style={styles.meta}>{formatPublished(payload.thought.created_at)}</Text>
        </View>
      ) : null}
    </View>
  );
}
