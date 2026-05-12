import { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
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
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
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

  function closeNotifications() {
    setIsNotificationsOpen(false);
  }

  async function openNotifications() {
    setIsNotificationsOpen(true);
    if (!token || notificationsLoading) return;
    setNotificationsLoading(true);
    setNotificationsError('');
    try {
      const data = await apiRequest('/open-brain/notifications', { token });
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
    } catch (err) {
      setNotificationsError(err.message || 'Failed to load notifications.');
    } finally {
      setNotificationsLoading(false);
    }
  }

  async function markNotificationAsRead(id) {
    if (!token || !id) return;
    try {
      const data = await apiRequest('/open-brain/notifications', {
        method: 'PATCH',
        token,
        body: { id },
      });
      const nextReadAt = data?.notification?.read_at || new Date().toISOString();
      setNotifications(current =>
        current.map(item => (item.id === id ? { ...item, read_at: nextReadAt } : item))
      );
    } catch {
      // Notifications remain visible even if mark-as-read fails.
    }
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
  const unreadCount = notifications.filter(item => !item?.read_at).length;
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
  const renderSearchResultItem = useCallback(({ item }) => {
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
          {(thought?.text || '').replace(/\s+/g, ' ').slice(0, 100) || 'View thought'}
        </Text>
        <Text style={styles.resultSecondary}>
          {thought?.profile?.username ? `by @${thought.profile.username}` : 'open profile'}
        </Text>
      </Pressable>
    );
  }, [openProfile]);

  return (
    <View style={styles.outer}>
      <View style={styles.wrap}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.navigate('Apps')}
          accessibilityRole="button"
          accessibilityLabel="Back to Apps"
        >
          <Feather name="arrow-left" size={20} color={theme.colors.textSecondary} />
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
        <View style={styles.rightActions}>
          <Pressable
            style={styles.notificationButton}
            onPress={openNotifications}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Feather name="bell" size={19} color="#7ec8ff" />
            {unreadCount > 0 ? (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 99 ? '99+' : String(unreadCount)}
                </Text>
              </View>
            ) : null}
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
            <Feather name="search" size={19} color="#7ec8ff" />
          </Pressable>
        </View>
      </View>
      <Modal
        visible={isNotificationsOpen}
        transparent
        animationType="fade"
        onRequestClose={closeNotifications}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeNotifications}>
          <Pressable style={styles.dropdownModal} onPress={() => {}}>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Notifications</Text>
              {notificationsLoading ? <Text style={styles.emptyText}>Loading...</Text> : null}
              {!!notificationsError ? <Text style={styles.errorText}>{notificationsError}</Text> : null}
              {!notificationsLoading && !notificationsError && notifications.length === 0 ? (
                <Text style={styles.emptyText}>No notifications yet.</Text>
              ) : null}
              {!notificationsLoading && !notificationsError && notifications.length > 0 ? (
                <View style={styles.notificationsTable}>
                  <View style={styles.notificationsHeaderRow}>
                    <Text style={styles.notificationsHeaderCellActor}>Actor</Text>
                    <Text style={styles.notificationsHeaderCellType}>Type</Text>
                    <Text style={styles.notificationsHeaderCellStatus}>Status</Text>
                  </View>
                  {notifications.map(item => {
                    const unread = !item?.read_at;
                    return (
                      <Pressable
                        key={item.id}
                        style={styles.notificationsRow}
                        onPress={() => {
                          if (unread) markNotificationAsRead(item.id);
                        }}
                      >
                        <Text style={styles.notificationsActor} numberOfLines={1}>
                          {item?.actor_id || 'Unknown'}
                        </Text>
                        <Text style={styles.notificationsType} numberOfLines={1}>
                          {item?.type || 'notification'}
                        </Text>
                        <Text style={[styles.notificationsStatus, unread && styles.notificationsStatusUnread]}>
                          {unread ? 'Unread' : 'Read'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
            <FlatList
              data={searchRows}
              style={styles.resultsWrap}
              keyExtractor={keyExtractor}
              renderItem={renderSearchResultItem}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={12}
              maxToRenderPerBatch={8}
              updateCellsBatchingPeriod={50}
              windowSize={7}
              removeClippedSubviews
            />
            <Pressable style={styles.seeMorePressable} onPress={openSeeMore} disabled={!query.trim()}>
              <Text style={styles.seeMoreLabel}>See More</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
