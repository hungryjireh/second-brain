import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import OpenBrainTopMenu from '../components/OpenBrainTopMenu';
import { apiRequest } from '../api';
import styles from './OpenBrainSearchScreen.styles';

function fuzzyScoreUsername(username, query) {
  const source = String(username || '').toLowerCase();
  const needle = String(query || '').toLowerCase();
  if (!source || !needle) return Number.NEGATIVE_INFINITY;
  if (source === needle) return 1000;
  if (source.startsWith(needle)) return 800 - (source.length - needle.length);
  if (source.includes(needle)) return 600 - source.indexOf(needle);

  let score = 0;
  let cursor = 0;
  let streakBonus = 0;
  for (let i = 0; i < needle.length; i += 1) {
    const ch = needle[i];
    const found = source.indexOf(ch, cursor);
    if (found === -1) return Number.NEGATIVE_INFINITY;
    score += 20;
    if (found === cursor) streakBonus += 10;
    cursor = found + 1;
  }

  const gapPenalty = Math.max(0, source.length - needle.length);
  return score + streakBonus - gapPenalty;
}

function fuzzySortUsers(users, query) {
  return [...users]
    .map(user => ({ user, score: fuzzyScoreUsername(user?.username, query) }))
    .filter(item => item.score > Number.NEGATIVE_INFINITY)
    .sort((a, b) => b.score - a.score)
    .map(item => item.user);
}

export default function OpenBrainSearchScreen({ token, navigation, route }) {
  const initialQuery = useMemo(() => String(route?.params?.query || ''), [route?.params?.query]);
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [didSearch, setDidSearch] = useState(false);
  const [results, setResults] = useState({ users: [], thoughts: [] });

  async function runSearch(nextQuery) {
    const value = String(nextQuery || '').trim().replace(/^@+/, '');
    if (!value || loading) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest(`/open-brain/search?q=${encodeURIComponent(value)}`, {
        token,
        cache: { ttlMs: 15000 },
      });
      setDidSearch(true);
      const rawUsers = Array.isArray(data?.users) ? data.users : [];
      setResults({
        users: fuzzySortUsers(rawUsers, value),
        thoughts: Array.isArray(data?.thoughts) ? data.thoughts : [],
      });
    } catch (err) {
      setError(err.message || 'Search failed.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialQuery.trim()) runSearch(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const openProfile = useCallback(username => {
    if (!username) return;
    navigation.navigate('OpenBrainProfile', { username });
  }, [navigation]);

  const hasResults = results.users.length > 0 || results.thoughts.length > 0;
  const searchRows = useMemo(() => {
    const rows = [];
    if (results.users.length > 0) {
      rows.push({ type: 'section', key: 'section-users', label: 'Users' });
      results.users.forEach(user => rows.push({ type: 'user', key: `user-${user.id}`, user }));
    }
    if (results.thoughts.length > 0) {
      rows.push({ type: 'section', key: 'section-thoughts', label: 'Thoughts' });
      results.thoughts.forEach(thought => rows.push({ type: 'thought', key: `thought-${thought.id}`, thought }));
    }
    return rows;
  }, [results]);
  const keyExtractor = useCallback(item => item.key, []);
  const renderResultItem = useCallback(({ item }) => {
    if (item.type === 'section') {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{item.label}</Text>
        </View>
      );
    }
    if (item.type === 'user') {
      const user = item.user;
      return (
        <Pressable style={styles.resultRow} onPress={() => openProfile(user.username)}>
          <Text style={styles.resultPrimary}>@{user.username}</Text>
          <Text style={styles.resultSecondary}>
            {Number.isInteger(user.streak_count) ? `${user.streak_count} day streak` : 'open profile'}
          </Text>
        </Pressable>
      );
    }
    const thought = item.thought;
    return (
      <Pressable style={styles.resultRow} onPress={() => openProfile(thought?.profile?.username)}>
        <Text style={styles.resultPrimary}>
          {(thought?.text || '').replace(/\s+/g, ' ').slice(0, 160) || 'View thought'}
        </Text>
        <Text style={styles.resultSecondary}>
          {thought?.profile?.username ? `by @${thought.profile.username}` : 'open profile'}
        </Text>
      </Pressable>
    );
  }, [openProfile]);

  return (
    <View style={styles.screen}>
      <OpenBrainTopMenu navigation={navigation} token={token} />
      <View style={styles.content}>
        <Text style={styles.title}>Search</Text>
        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            placeholder="Search users or thoughts"
            placeholderTextColor="#9097a3"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => runSearch(query)}
          />
          <Pressable
            style={[styles.submitButton, (loading || !query.trim()) && styles.submitButtonDisabled]}
            onPress={() => runSearch(query)}
            disabled={loading || !query.trim()}
          >
            <Text style={styles.submitLabel}>{loading ? '...' : 'Search'}</Text>
          </Pressable>
        </View>

        {!!error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!error && didSearch && !hasResults && !loading ? (
          <Text style={styles.emptyText}>No matching users or thoughts.</Text>
        ) : null}

        {loading ? <ActivityIndicator style={styles.loading} /> : null}

        <FlatList
          data={searchRows}
          style={styles.resultsWrap}
          keyExtractor={keyExtractor}
          renderItem={renderResultItem}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={12}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={50}
          windowSize={7}
          removeClippedSubviews
        />
      </View>
    </View>
  );
}
