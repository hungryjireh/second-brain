import { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
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

export default function SharedThoughtScreen({ navigation, route, token }) {
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState(null);
  const slugFromRoute = String(route?.params?.slug || '').trim();

  async function load(nextSlug = slug) {
    const normalizedSlug = String(nextSlug || '').trim();
    if (!normalizedSlug) return;
    setLoading(true);
    setError('');
    setPayload(null);
    try {
      const data = await apiRequest(`/open-brain/shared-thought?slug=${encodeURIComponent(normalizedSlug)}`, {
        cache: { ttlMs: CACHE_TTL_MS.SHARED_THOUGHT },
      });
      setPayload(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!slugFromRoute) return;
    setSlug(slugFromRoute);
    load(slugFromRoute);
  }, [slugFromRoute]);

  function openAuthorProfile() {
    const username = payload?.author?.username;
    if (!username) return;
    if (navigation?.navigate) {
      if (!token) {
        navigation.navigate('Login');
        return;
      }
      navigation.navigate('OpenBrainProfile', { username });
      return;
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
      window.location.href = `${window.location.origin}/open-brain/u/${encodeURIComponent(username)}`;
    }
  }

  return (
    <View style={styles.container}>
      <OpenBrainTopMenu navigation={navigation} />
      <View style={styles.content}>
        {!slugFromRoute ? (
          <OpenBrainThoughtComposer
            value={slug}
            onChangeText={setSlug}
            placeholder="share slug"
            buttonLabel={loading ? 'Loading...' : 'Load thought'}
            onSubmit={load}
            disabled={loading || !slug.trim()}
          />
        ) : null}
        {!!error && <Text style={styles.error}>{error}</Text>}
        {payload?.thought ? (
          <View style={styles.thoughtViewport}>
            <ScrollView
              style={styles.thoughtScroll}
              contentContainerStyle={styles.thoughtScrollContent}
              showsVerticalScrollIndicator
            >
              <OpenBrainThoughtCard
                text={payload.thought.text}
                authorPrefix="by"
                authorLabel={`@${payload.author?.username || 'anonymous'}`}
                onAuthorPress={payload?.author?.username ? openAuthorProfile : undefined}
                topMeta={formatPublished(payload.thought.created_at)}
                feedBody
                largeBody
              />
            </ScrollView>
          </View>
        ) : null}
      </View>
      <OpenBrainBottomNav navigation={navigation} currentRoute="SharedThought" />
    </View>
  );
}
