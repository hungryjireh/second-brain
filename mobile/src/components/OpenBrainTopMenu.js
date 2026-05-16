import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import styles from './OpenBrainTopMenu.styles';
import { apiRequest, sendFollowNotification } from '../api';
import { CACHE_TTL_MS } from '../constants/cache';
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

function coerceBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0' || normalized === '') return false;
  }
  return false;
}

function formatRelativeTime(value) {
  if (!value) return '';
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return '';
  const deltaSeconds = Math.max(0, Math.floor((Date.now() - timestamp.getTime()) / 1000));
  if (deltaSeconds < 60) return 'just now';
  if (deltaSeconds < 3600) return `${Math.floor(deltaSeconds / 60)}m ago`;
  if (deltaSeconds < 86400) return `${Math.floor(deltaSeconds / 3600)}h ago`;
  if (deltaSeconds < 604800) return `${Math.floor(deltaSeconds / 86400)}d ago`;
  return `${Math.floor(deltaSeconds / 604800)}w ago`;
}

export default function OpenBrainTopMenu({ navigation, token }) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width <= 420;
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
  const [followBusyUserId, setFollowBusyUserId] = useState('');

  const fetchNotifications = useCallback(async () => {
    if (!token || notificationsLoading) return;
    setNotificationsLoading(true);
    setNotificationsError('');
    try {
      const data = await apiRequest('/open-brain/notifications', { token, cache: { ttlMs: CACHE_TTL_MS.NOTIFICATIONS } });
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
    } catch (err) {
      setNotificationsError(err.message || 'Failed to load notifications.');
    } finally {
      setNotificationsLoading(false);
    }
  }, [notificationsLoading, token]);

  async function handleSearch() {
    const value = query.trim().replace(/^@+/, '');
    if (!value || loading) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest(`/open-brain/search?q=${encodeURIComponent(value)}`, {
        token,
        cache: { ttlMs: CACHE_TTL_MS.SEARCH },
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

  async function toggleFollowFromSearch(user) {
    const targetUserId = user?.id;
    if (!token || !targetUserId || followBusyUserId) return;
    const isSelf = coerceBoolean(user?.is_self);
    if (isSelf) return;
    const currentlyFollowing = coerceBoolean(user?.is_following);
    setFollowBusyUserId(targetUserId);
    setResults(current => ({
      ...current,
      users: (current.users || []).map(item => (
        item?.id === targetUserId ? { ...item, is_following: !currentlyFollowing } : item
      )),
    }));
    try {
      if (currentlyFollowing) {
        await apiRequest(`/open-brain/follows?following_id=${encodeURIComponent(targetUserId)}`, { method: 'DELETE', token });
      } else {
        await apiRequest('/open-brain/follows', { method: 'POST', token, body: { following_id: targetUserId } });
        await sendFollowNotification(token, targetUserId);
      }
    } catch {
      setResults(current => ({
        ...current,
        users: (current.users || []).map(item => (
          item?.id === targetUserId ? { ...item, is_following: currentlyFollowing } : item
        )),
      }));
    } finally {
      setFollowBusyUserId('');
    }
  }

  function closeSearch() {
    setIsSearchOpen(false);
    setQuery('');
    setError('');
    setDidSearch(false);
    setFollowBusyUserId('');
    setResults({ users: [], thoughts: [] });
  }

  function closeNotifications() {
    setIsNotificationsOpen(false);
  }

  async function openNotifications() {
    setIsNotificationsOpen(true);
    await fetchNotifications();
  }

  useEffect(() => {
    if (!token) {
      setNotifications([]);
      setNotificationsError('');
      setNotificationsLoading(false);
      return;
    }
    fetchNotifications();
  }, [fetchNotifications, token]);

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
      const isSelf = coerceBoolean(user?.is_self);
      const isFollowing = coerceBoolean(user?.is_following);
      const followBusy = followBusyUserId === user?.id;
      return (
        <View style={styles.resultRow}>
          <Pressable style={styles.userInfoPressable} onPress={() => openProfile(user.username)}>
            <Text style={styles.resultPrimary}>@{user.username}</Text>
            <Text style={styles.resultSecondary}>
              {Number.isInteger(user.streak_count) ? `${user.streak_count} day streak` : 'open profile'}
            </Text>
          </Pressable>
          {!isSelf ? (
            <Pressable
              style={[
                styles.followButton,
                isFollowing ? styles.followButtonFollowing : styles.followButtonActive,
                followBusy && { opacity: 0.55 },
              ]}
              onPress={() => toggleFollowFromSearch(user)}
              disabled={followBusy || !token}
            >
              <Text style={styles.followButtonText}>{isFollowing ? 'Unfollow' : 'Follow'}</Text>
            </Pressable>
          ) : null}
        </View>
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
  }, [followBusyUserId, openProfile, token]);

  return (
    <View style={styles.outer}>
      <View style={styles.wrap}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.replace('Apps')}
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
            <Feather name="bell" size={19} color={theme.colors.accent} />
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
            <Feather name="search" size={19} color={theme.colors.accent} />
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
                  {notifications.map(item => {
                    const unread = !item?.read_at;
                    const timestamp = formatRelativeTime(item?.created_at || item?.inserted_at || item?.updated_at);
                    const username = item?.profiles?.username || item?.actor_id || '';
                    const isFollowType = item?.type === 'follow';
                    return (
                      <Pressable
                        key={item.id}
                        style={styles.notificationsRow}
                        onPress={() => {
                          if (unread) markNotificationAsRead(item.id);
                        }}
                      >
                        <View style={styles.notificationsMain}>
                          {unread ? <View style={styles.notificationsUnreadDot} /> : null}
                          <Text style={styles.notificationsMessage} numberOfLines={2}>
                            {username ? (
                              <Text style={styles.notificationsLink} onPress={() => openProfile(username)}>
                                @{username}
                              </Text>
                            ) : (
                              'Someone'
                            )}
                            {isFollowType ? ' is now following your thoughts' : ` sent a ${item?.type || 'notification'}`}
                          </Text>
                        </View>
                        {!!timestamp ? <Text style={styles.notificationsTime}>{timestamp}</Text> : null}
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
              style={[
                styles.submitButton,
                isSmallScreen && styles.submitButtonFullWidth,
                (loading || !query.trim()) && styles.submitButtonDisabled,
              ]}
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
