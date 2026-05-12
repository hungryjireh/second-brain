import { useState } from 'react';
import { View, Text } from 'react-native';
import { apiRequest } from '../api';
import { CACHE_TTL_MS } from '../constants/cache';
import OpenBrainBottomNav from '../components/OpenBrainBottomNav';
import OpenBrainTopMenu from '../components/OpenBrainTopMenu';
import OpenBrainThoughtCard from '../components/OpenBrainThoughtCard';
import OpenBrainThoughtComposer from '../components/OpenBrainThoughtComposer';
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

export default function SharedThoughtScreen({ navigation }) {
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
      const data = await apiRequest(`/open-brain/shared-thought?slug=${encodeURIComponent(slug.trim())}`, {
        cache: { ttlMs: CACHE_TTL_MS.SHARED_THOUGHT },
      });
      setPayload(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <OpenBrainTopMenu navigation={navigation} />
      <View style={styles.content}>
        <Text style={styles.title}>Open shared thought</Text>
        <OpenBrainThoughtComposer
          value={slug}
          onChangeText={setSlug}
          placeholder="share slug"
          buttonLabel={loading ? 'Loading...' : 'Load thought'}
          onSubmit={load}
          disabled={loading || !slug.trim()}
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
        {payload?.thought ? (
          <OpenBrainThoughtCard
            text={payload.thought.text}
            bottomMeta={`by @${payload.author?.username || 'anonymous'}`}
            topMeta={formatPublished(payload.thought.created_at)}
            largeBody
          />
        ) : null}
      </View>
      <OpenBrainBottomNav navigation={navigation} currentRoute="SharedThought" />
    </View>
  );
}
