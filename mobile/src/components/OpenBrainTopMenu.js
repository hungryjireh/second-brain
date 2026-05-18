import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styles from './OpenBrainTopMenu.styles';
import { apiRequest, sendFollowNotification } from '../api';
import { CACHE_TTL_MS } from '../constants/cache';
import { useOpenBrainSearch } from '../hooks/useOpenBrainSearch';
import { theme } from '../theme';
import { sortUsersByQuery } from '../utils/searchRanking';
import {
  buildOpenBrainSearchRows,
  normalizeOpenBrainSearchInput,
} from '../utils/openBrainSearch';
import { executeOpenBrainFollowToggle } from '../utils/openBrainFollow';

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

function formatReactionLabel(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'reaction';
  return raw.replace(/_/g, ' ');
}

function notificationPayload(item) {
  const payload = item?.payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};
  return payload;
}

function buildNotificationViewModel(item) {
  const payload = notificationPayload(item);
  const username = item?.profiles?.username || item?.actor_id || '';

  if (item?.type === 'follow') {
    return {
      username,
      segments: [
        { type: 'actor', text: username ? `@${username}` : 'Someone' },
        { type: 'text', text: ' is now following your thoughts' },
      ],
      action: null,
    };
  }

  if (item?.type === 'reaction') {
    const reactionLabel = formatReactionLabel(payload?.reaction_type || item?.reaction_type);
    return {
      username,
      segments: [
        { type: 'actor', text: username ? `@${username}` : 'Someone' },
        { type: 'text', text: ` has reacted "${reactionLabel}" to your ` },
        { type: 'thought', text: 'thought' },
      ],
      action: { type: 'open_thought', thought: item },
    };
  }

  return {
    username,
    segments: [
      { type: 'actor', text: username ? `@${username}` : 'Someone' },
      { type: 'text', text: ` sent a ${item?.type || 'notification'}` },
    ],
    action: null,
  };
}

export const __testables = {
  buildNotificationViewModel,
  formatReactionLabel,
  notificationPayload,
};

export default function OpenBrainTopMenu({ navigation, token }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSmallScreen = width <= 420;
  const dropdownMaxHeight = Math.max(220, Math.floor(height * 0.5));
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsOpenedAtRef = useRef(0);
  const searchOpenedAtRef = useRef(0);
  const notificationsLoadingRef = useRef(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [followBusyUserId, setFollowBusyUserId] = useState('');
  const {
    query,
    setQuery,
    loading,
    error,
    didSearch,
    results,
    setResults,
    runSearch,
    resetSearch,
  } = useOpenBrainSearch({
    token,
    apiRequest,
    cacheTtlMs: CACHE_TTL_MS.SEARCH,
    sortUsersByQuery,
    fallbackErrorMessage: 'Search failed.',
  });

  const fetchNotifications = useCallback(async () => {
    if (!token || notificationsLoadingRef.current) return;
    notificationsLoadingRef.current = true;
    setNotificationsLoading(true);
    setNotificationsError('');
    try {
      const data = await apiRequest('/open-brain/notifications', { token, cache: { ttlMs: CACHE_TTL_MS.NOTIFICATIONS } });
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
    } catch (err) {
      setNotificationsError(err.message || 'Failed to load notifications.');
    } finally {
      notificationsLoadingRef.current = false;
      setNotificationsLoading(false);
    }
  }, [token]);

  async function handleSearch() {
    await runSearch();
  }

  async function toggleFollowFromSearch(user) {
    const targetUserId = user?.id;
    if (!token || !targetUserId || followBusyUserId) return;
    const isSelf = user?.is_self === true;
    if (isSelf) return;
    const currentlyFollowing = user?.is_following === true;
    setFollowBusyUserId(targetUserId);
    setResults(current => ({
      ...current,
      users: (current.users || []).map(item => (
        item?.id === targetUserId ? { ...item, is_following: !currentlyFollowing } : item
      )),
    }));
    try {
      await executeOpenBrainFollowToggle({
        token,
        targetUserId,
        isFollowing: currentlyFollowing,
        apiRequest,
        sendFollowNotification,
      });
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
    resetSearch();
    setFollowBusyUserId('');
  }

  function closeNotifications() {
    setIsNotificationsOpen(false);
  }

  async function openNotifications() {
    notificationsOpenedAtRef.current = Date.now();
    setIsNotificationsOpen(true);
    await fetchNotifications();
  }

  function openSearch() {
    searchOpenedAtRef.current = Date.now();
    setIsSearchOpen(true);
    resetSearch();
  }

  function handleNotificationsBackdropPress() {
    if (Date.now() - notificationsOpenedAtRef.current < 180) return;
    closeNotifications();
  }

  function handleSearchBackdropPress() {
    if (Date.now() - searchOpenedAtRef.current < 180) return;
    closeSearch();
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
    const value = normalizeOpenBrainSearchInput(query);
    if (!value) return;
    closeSearch();
    navigation.navigate('OpenBrainSearch', { query: value });
  }

  function openThoughtFromNotification(item) {
    const slug = String(item?.thought?.share_slug || '').trim();
    if (!slug) return;
    closeNotifications();
    navigation.navigate('SharedThought', { slug });
  }

  const hasSearched = didSearch && !loading;
  const hasResults = results.users.length > 0 || results.thoughts.length > 0;
  const unreadCount = notifications.filter(item => !item?.read_at).length;
  const searchRows = useMemo(() => buildOpenBrainSearchRows(results), [results]);
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
      const isSelf = user?.is_self === true;
      const isFollowing = user?.is_following === true;
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
    <View style={[styles.outer, { paddingTop: insets.top }]}>
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
            hitSlop={10}
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
            onPress={openSearch}
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
        <Pressable style={[styles.modalBackdrop, { paddingTop: insets.top + 70 }]} onPress={handleNotificationsBackdropPress}>
          <Pressable
            style={[styles.dropdownModal, { maxHeight: dropdownMaxHeight }]}
            onPress={event => event.stopPropagation()}
          >
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Notifications</Text>
              {notificationsLoading ? <Text style={styles.emptyText}>Loading...</Text> : null}
              {!!notificationsError ? <Text style={styles.errorText}>{notificationsError}</Text> : null}
              {!notificationsLoading && !notificationsError && notifications.length === 0 ? (
                <Text style={styles.emptyText}>No notifications yet.</Text>
              ) : null}
              {!notificationsLoading && !notificationsError && notifications.length > 0 ? (
                <ScrollView
                  style={styles.notificationsScroll}
                  contentContainerStyle={styles.notificationsScrollContent}
                  showsVerticalScrollIndicator
                >
                  {notifications.map(item => {
                    const unread = !item?.read_at;
                    const timestamp = formatRelativeTime(item?.created_at || item?.inserted_at || item?.updated_at);
                    const model = buildNotificationViewModel(item);
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
                            {model.segments.map((segment, index) => {
                              if (segment.type === 'actor' && model.username) {
                                return (
                                  <Text
                                    key={`segment-${item.id}-${index}`}
                                    style={styles.notificationsLink}
                                    onPress={() => openProfile(model.username)}
                                  >
                                    {segment.text}
                                  </Text>
                                );
                              }
                              if (segment.type === 'thought' && model.action?.type === 'open_thought') {
                                return (
                                  <Text
                                    key={`segment-${item.id}-${index}`}
                                    style={styles.notificationsLink}
                                    onPress={() => openThoughtFromNotification(model.action.thought)}
                                  >
                                    {segment.text}
                                  </Text>
                                );
                              }
                              return <Text key={`segment-${item.id}-${index}`}>{segment.text}</Text>;
                            })}
                          </Text>
                        </View>
                        {!!timestamp ? <Text style={styles.notificationsTime}>{timestamp}</Text> : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
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
        <Pressable style={[styles.modalBackdrop, { paddingTop: insets.top + 70 }]} onPress={handleSearchBackdropPress}>
          <Pressable
            style={[styles.dropdownModal, { maxHeight: dropdownMaxHeight }]}
            onPress={event => event.stopPropagation()}
          >
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
              style={[styles.resultsWrap, { maxHeight: dropdownMaxHeight }]}
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
