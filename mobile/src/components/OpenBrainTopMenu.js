import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import styles from './OpenBrainTopMenu.styles';
import { apiRequest } from '../api';
import { theme } from '../theme';

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

export default function OpenBrainTopMenu({ navigation, token }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState({ users: [], thoughts: [] });
  const [didSearch, setDidSearch] = useState(false);

  async function handleSearch() {
    const value = query.trim().replace(/^@+/, '');
    if (!value || loading) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest(`/open-brain/search?q=${encodeURIComponent(value)}`, { token });
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

  function closeSearch() {
    setIsSearchOpen(false);
    setQuery('');
    setError('');
    setDidSearch(false);
    setResults({ users: [], thoughts: [] });
  }

  function openProfile(username) {
    if (!username) return;
    closeSearch();
    navigation.navigate('OpenBrainProfile', { username });
  }

  function openSeeMore() {
    const value = query.trim().replace(/^@+/, '');
    if (!value) return;
    closeSearch();
    navigation.navigate('OpenBrainSearch', { query: value });
  }

  const hasSearched = didSearch && !loading;
  const hasResults = results.users.length > 0 || results.thoughts.length > 0;

  return (
    <View style={styles.outer}>
      <View style={styles.wrap}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.navigate('Apps')}
          accessibilityRole="button"
          accessibilityLabel="Back to Apps"
        >
          <Text style={styles.backLabel}>←</Text>
        </Pressable>
        <Pressable
          style={styles.logoButton}
          onPress={() => navigation.navigate('OpenBrainFeed')}
          accessibilityRole="button"
          accessibilityLabel="Go to feed"
        >
          <Text style={styles.logoText}>
            open<Text style={styles.logoAccent}>brain</Text>
          </Text>
        </Pressable>
        <Pressable
          style={styles.searchButton}
          onPress={() => {
            setIsSearchOpen(true);
            setError('');
          }}
          accessibilityRole="button"
          accessibilityLabel="Search users"
        >
          <Text style={styles.searchLabel}>⌕</Text>
        </Pressable>
      </View>
      <Modal
        visible={isSearchOpen}
        transparent
        animationType="fade"
        onRequestClose={closeSearch}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeSearch}>
          <Pressable style={styles.dropdownModal} onPress={() => {}}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput}
              placeholder="Search users or thoughts"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <Pressable
              style={[styles.submitButton, (loading || !query.trim()) && styles.submitButtonDisabled]}
              onPress={handleSearch}
              disabled={loading || !query.trim()}
            >
              <Text style={styles.submitLabel}>{loading ? '...' : 'Search'}</Text>
            </Pressable>
            {!!error ? <Text style={styles.errorText}>{error}</Text> : null}
            {!error && hasSearched && !hasResults ? (
              <Text style={styles.emptyText}>No matching users or thoughts.</Text>
            ) : null}
            <ScrollView style={styles.resultsWrap} keyboardShouldPersistTaps="handled">
              {results.users.length > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Users</Text>
                  {results.users.map(user => (
                    <Pressable
                      key={user.id}
                      style={styles.resultRow}
                      onPress={() => openProfile(user.username)}
                    >
                      <Text style={styles.resultPrimary}>@{user.username}</Text>
                      <Text style={styles.resultSecondary}>
                        {Number.isInteger(user.streak_count) ? `${user.streak_count} day streak` : 'open profile'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {results.thoughts.length > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Thoughts</Text>
                  {results.thoughts.map(thought => (
                    <Pressable
                      key={thought.id}
                      style={styles.resultRow}
                      onPress={() => openProfile(thought?.profile?.username)}
                    >
                      <Text style={styles.resultPrimary}>
                        {(thought?.text || '').replace(/\s+/g, ' ').slice(0, 100) || 'View thought'}
                      </Text>
                      <Text style={styles.resultSecondary}>
                        {thought?.profile?.username ? `by @${thought.profile.username}` : 'open profile'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </ScrollView>
            <Pressable style={styles.seeMorePressable} onPress={openSeeMore} disabled={!query.trim()}>
              <Text style={styles.seeMoreLabel}>See More</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

