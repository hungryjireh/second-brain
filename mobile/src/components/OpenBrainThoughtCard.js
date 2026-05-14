import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import styles from './OpenBrainThoughtCard.styles';
import { theme } from '../theme';
import ProfileAvatar from './ProfileAvatar';

const REACTIONS = [
  { key: 'felt_this', label: 'felt this' },
  { key: 'me_too', label: 'me too' },
  { key: 'made_me_think', label: 'made me think' },
];

function normalizeThoughtText(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\u2028|\u2029/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

const PREVIEW_CHAR_LIMIT = 220;
const ACTION_ICON_ONLY_MAX_WIDTH = 768;

function getThoughtPreview(text, limit = PREVIEW_CHAR_LIMIT) {
  const normalized = normalizeThoughtText(text);
  if (!normalized) return { preview: '', full: '', isTruncated: false };
  if (normalized.length <= limit) return { preview: normalized, full: normalized, isTruncated: false };
  const cut = normalized.slice(0, limit);
  const breakAt = Math.max(cut.lastIndexOf(' '), cut.lastIndexOf('\n'));
  const cleanCut = (breakAt > 0 ? cut.slice(0, breakAt) : cut).trimEnd();
  return {
    preview: `${cleanCut}...`,
    full: normalized,
    isTruncated: true,
  };
}

function parseThoughtForCard(text) {
  const normalized = normalizeThoughtText(text);
  if (!normalized) return { title: '', blocks: [] };
  const lines = normalized.split('\n');
  let firstLineIndex = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim()) {
      firstLineIndex = i;
      break;
    }
  }
  if (firstLineIndex < 0) return { title: '', blocks: [], hasTitle: false };
  const title = lines[firstLineIndex].trim();
  const body = lines.slice(firstLineIndex + 1).join('\n').trim();
  if (!body) return { title: '', blocks: [{ text: title, isQuote: false }], hasTitle: false };

  const blocks = body
    .split(/\n\s*\n/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const unwrapped = part.replace(/^>\s?/gm, '').trim();
      const isQuote = /^>\s?/.test(part) || /^".+"$/.test(part) || /^“.+”$/.test(part) || /^'.+'$/.test(part);
      return { text: isQuote ? unwrapped : part, isQuote };
    });

  return { title, blocks, hasTitle: true };
}

function coerceCount(value) {
  return Number.isInteger(value) ? value : 0;
}

function getThoughtSaveCount(item) {
  if (!item || typeof item !== 'object') return 0;
  return coerceCount(item.save_count);
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

function OpenBrainThoughtCard({
  item,
  text,
  authorPrefix,
  authorLabel,
  onAuthorPress,
  topMeta,
  bottomMeta,
  date,
  onPress,
  onOpenProfile,
  token,
  onToggleFollow,
  onReact,
  onShare,
  onAddToSecondBrain,
  addToSecondBrainPayload = null,
  reactingKey = '',
  followBusyUserId = '',
  largeBody = false,
  feedBody = false,
  transparentCard = false,
  inlineActionWithDate = false,
}) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 720;
  const iconOnlyActions = Platform.OS !== 'web' || width <= ACTION_ICON_ONLY_MAX_WIDTH;
  const [hoveredAction, setHoveredAction] = useState('');
  const [hoveredMetric, setHoveredMetric] = useState('');
  const [isActionDrawerOpen, setIsActionDrawerOpen] = useState(false);
  const [drawerAnchor, setDrawerAnchor] = useState(null);
  const actionTriggerRef = useRef(null);
  const sourceText = item ? item.text : text;
  const showInlineDateActions = !item && isSmallScreen && onShare && inlineActionWithDate;
  const thoughtContent = useMemo(() => getThoughtPreview(sourceText), [sourceText]);
  const [expanded, setExpanded] = useState(false);
  const displayedText = thoughtContent.isTruncated && !expanded ? thoughtContent.preview : thoughtContent.full;
  const parsedThought = useMemo(() => parseThoughtForCard(displayedText), [displayedText]);
  const [isAddingToSecondBrain, setIsAddingToSecondBrain] = useState(false);
  const initialAddedToSecondBrain = Boolean(
    item?.viewer_has_added_to_second_brain || addToSecondBrainPayload?.viewer_has_added_to_second_brain
  );
  const [addedToSecondBrain, setAddedToSecondBrain] = useState(initialAddedToSecondBrain);
  const [addToSecondBrainResponse, setAddToSecondBrainResponse] = useState('');

  useEffect(() => {
    setExpanded(false);
  }, [thoughtContent.full]);

  useEffect(() => {
    setIsAddingToSecondBrain(false);
    setAddedToSecondBrain(initialAddedToSecondBrain);
    setAddToSecondBrainResponse('');
    setIsActionDrawerOpen(false);
    setDrawerAnchor(null);
  }, [item?.id, sourceText, initialAddedToSecondBrain]);

  function closeActionDrawer() {
    setIsActionDrawerOpen(false);
  }

  function openActionDrawer() {
    const triggerNode = actionTriggerRef.current;
    if (triggerNode?.measureInWindow) {
      triggerNode.measureInWindow((x, y, w, h) => {
        setDrawerAnchor({ x, y, w, h });
        setIsActionDrawerOpen(true);
      });
      return;
    }
    setIsActionDrawerOpen(true);
  }

  const drawerLeft = drawerAnchor
    ? Math.max(8, Math.min(width - 8 - 170, drawerAnchor.x + drawerAnchor.w - 170))
    : 8;
  const drawerTop = drawerAnchor ? drawerAnchor.y + drawerAnchor.h + 6 : 0;

  async function handleAddToSecondBrain(payload) {
    if (isAddingToSecondBrain) return;
    setIsAddingToSecondBrain(true);
    setAddToSecondBrainResponse('');
    try {
      await onAddToSecondBrain?.(payload);
      setAddedToSecondBrain(true);
      setAddToSecondBrainResponse('Added to SecondBrain.');
    } catch (_err) {
      setAddToSecondBrainResponse('Unable to add to SecondBrain. Please try again.');
    } finally {
      setIsAddingToSecondBrain(false);
    }
  }

  function requestAddToSecondBrain(payload) {
    if (!addedToSecondBrain) {
      handleAddToSecondBrain(payload);
      return;
    }
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined'
        ? window.confirm('This thought is already in your SecondBrain. Add it again?')
        : false;
      if (confirmed) handleAddToSecondBrain(payload);
      return;
    }
    Alert.alert(
      'Add to SecondBrain again?',
      'This thought is already in your SecondBrain.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add again', onPress: () => handleAddToSecondBrain(payload) },
      ]
    );
  }

  if (item?.missing_today) {
    const name = item.profile?.username || 'unknown';
    const streak = coerceCount(item.profile?.streak_count);
    const saveCount = getThoughtSaveCount(item);
    return (
      <View style={[styles.card, { borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10 }]}>
        <View style={styles.metaLine}>
          <Text style={styles.username}>@{name}</Text>
          <Text style={styles.metaDot}>·</Text>
          <View style={styles.metricGroup}>
            <View style={styles.metricInline}>
              <Pressable
                accessibilityRole="image"
                accessibilityLabel="Streak"
                style={styles.metricIconHoverTarget}
                onHoverIn={Platform.OS === 'web' ? () => setHoveredMetric(`streak-missing-${name}`) : undefined}
                onHoverOut={Platform.OS === 'web' ? () => setHoveredMetric('') : undefined}
              >
                <Feather name="zap" size={12} color={theme.colors.textSecondary} />
              </Pressable>
              <Text style={styles.metricCount}>{streak}</Text>
              {Platform.OS === 'web' && hoveredMetric === `streak-missing-${name}` ? (
                <View pointerEvents="none" style={styles.metricTooltip}>
                  <Text style={styles.actionTooltipText}>Streak</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.metricInline}>
              <Pressable
                accessibilityRole="image"
                accessibilityLabel="Saves"
                style={styles.metricIconHoverTarget}
                onHoverIn={Platform.OS === 'web' ? () => setHoveredMetric(`saves-missing-${name}`) : undefined}
                onHoverOut={Platform.OS === 'web' ? () => setHoveredMetric('') : undefined}
              >
                <Feather name="bookmark" size={12} color={theme.colors.textSecondary} />
              </Pressable>
              <Text style={styles.metricCount}>{saveCount}</Text>
              {Platform.OS === 'web' && hoveredMetric === `saves-missing-${name}` ? (
                <View pointerEvents="none" style={styles.metricTooltip}>
                  <Text style={styles.actionTooltipText}>Saves</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
        <Text style={[styles.meta, { fontStyle: 'italic', marginTop: 4 }]}>no thought today</Text>
      </View>
    );
  }

  if (item) {
    const name = item.profile?.username || 'unknown';
    const avatarUrl = item.profile?.avatar_url || '';
    const streak = coerceCount(item.profile?.streak_count);
    const saveCount = getThoughtSaveCount(item);
    const isSelf = coerceBoolean(item.profile?.is_self);
    const isFollowing = coerceBoolean(item.profile?.is_following);
    const followBusy = followBusyUserId === item.user_id;
    const formattedTime = date || topMeta || '';

    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Pressable onPress={() => onOpenProfile?.(name)} accessibilityRole="button">
            <ProfileAvatar
              profile={item.profile}
              avatarUrl={avatarUrl}
              username={name}
              token={token}
              imageStyle={styles.avatar}
              fallbackStyle={styles.avatarFallback}
              textStyle={styles.avatarFallbackText}
            />
          </Pressable>
          <View style={styles.metaBlock}>
            <View style={styles.metaLine}>
              <Pressable onPress={() => onOpenProfile?.(name)} accessibilityRole="button">
                <Text style={styles.username}>@{name}</Text>
              </Pressable>
              <Text style={styles.metaDot}>·</Text>
              <View style={styles.metricGroup}>
                <View style={styles.metricInline}>
                  <Pressable
                    accessibilityRole="image"
                    accessibilityLabel="Streak"
                    style={styles.metricIconHoverTarget}
                    onHoverIn={Platform.OS === 'web' ? () => setHoveredMetric(`streak-${item.id}`) : undefined}
                    onHoverOut={Platform.OS === 'web' ? () => setHoveredMetric('') : undefined}
                  >
                    <Feather name="zap" size={12} color={theme.colors.textSecondary} />
                  </Pressable>
                  <Text style={styles.metricCount}>{streak}</Text>
                  {Platform.OS === 'web' && hoveredMetric === `streak-${item.id}` ? (
                    <View pointerEvents="none" style={styles.metricTooltip}>
                      <Text style={styles.actionTooltipText}>Streak</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.metricInline}>
                  <Pressable
                    accessibilityRole="image"
                    accessibilityLabel="Saves"
                    style={styles.metricIconHoverTarget}
                    onHoverIn={Platform.OS === 'web' ? () => setHoveredMetric(`saves-${item.id}`) : undefined}
                    onHoverOut={Platform.OS === 'web' ? () => setHoveredMetric('') : undefined}
                  >
                    <Feather name="bookmark" size={12} color={theme.colors.textSecondary} />
                  </Pressable>
                  <Text style={styles.metricCount}>{saveCount}</Text>
                  {Platform.OS === 'web' && hoveredMetric === `saves-${item.id}` ? (
                    <View pointerEvents="none" style={styles.metricTooltip}>
                      <Text style={styles.actionTooltipText}>Saves</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
            {!!formattedTime && <Text style={styles.time}>{formattedTime}</Text>}
          </View>
          {!isSelf && !isSmallScreen ? (
            <Pressable
              onPress={() => onToggleFollow?.(item.user_id, isFollowing)}
              disabled={followBusy}
              style={[
                styles.followButton,
                isFollowing ? styles.followButtonFollowing : styles.followButtonActive,
                followBusy && { opacity: 0.55 },
              ]}
            >
              <Text style={[styles.followButtonText, isFollowing && styles.followButtonTextFollowing]}>
                {isFollowing ? 'Unfollow' : 'Follow'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={thoughtContent.isTruncated ? () => setExpanded(current => !current) : undefined}
          disabled={!thoughtContent.isTruncated}
          accessibilityRole={thoughtContent.isTruncated ? 'button' : undefined}
        >
          <View style={styles.thoughtBlocks}>
            {!!parsedThought.hasTitle && (
              <Text style={[styles.thoughtTitle, styles.thoughtTitleFeed, isSmallScreen && styles.thoughtTitleFeedCompact]}>
                {parsedThought.title}
              </Text>
            )}
            {parsedThought.blocks.map((block, index) => (
              <View key={`thought-${item.id}-block-${index}`} style={block.isQuote ? styles.quoteBlock : null}>
                <Text style={[styles.body, styles.bodyFeed, block.isQuote ? styles.quoteText : null]}>{block.text}</Text>
              </View>
            ))}
          </View>
        </Pressable>

        <View style={[styles.reactions, isSmallScreen && styles.reactionsCompact]}>
          {REACTIONS.map(reaction => {
            const active = Boolean(item.reactions?.mine?.[reaction.key]);
            const count = Number(item.reactions?.[reaction.key] || 0);
            const busy = reactingKey === `${item.id}-${reaction.key}`;
            return (
              <Pressable
                key={reaction.key}
                onPress={() => onReact?.(item.id, reaction.key, active)}
                disabled={busy}
                style={[
                  styles.reactionChip,
                  isSmallScreen && styles.reactionChipCompact,
                  active && styles.reactionChipActive,
                  busy && { opacity: 0.55 },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[styles.reactionText, isSmallScreen && styles.reactionTextCompact, active && styles.reactionTextActive]}
                >
                  {reaction.label}{count > 0 ? ` ${count}` : ''}
                </Text>
              </Pressable>
            );
          })}
          {onShare ? (
            <View style={[styles.actionsBlock, isSmallScreen && styles.actionsBlockCompact]}>
              {isSmallScreen ? (
                <View style={styles.mobileActionDrawerWrap}>
                  <Pressable
                    ref={actionTriggerRef}
                    style={styles.mobileActionTrigger}
                    onPress={() => (isActionDrawerOpen ? closeActionDrawer() : openActionDrawer())}
                    disabled={isAddingToSecondBrain}
                    accessibilityRole="button"
                    accessibilityLabel="Thought actions"
                  >
                    {isAddingToSecondBrain ? (
                      <Text style={styles.mobileActionTriggerText}>...</Text>
                    ) : (
                      <Feather name="more-horizontal" size={14} style={styles.mobileActionTriggerIcon} />
                    )}
                  </Pressable>
                </View>
              ) : (
                <View style={styles.actionsGroup}>
                  <Pressable
                    onPress={() => requestAddToSecondBrain(item)}
                    disabled={isAddingToSecondBrain}
                    style={[styles.secondaryActionButton, addedToSecondBrain && styles.secondaryActionButtonAdded]}
                    accessibilityRole="button"
                    accessibilityLabel={addedToSecondBrain ? 'Added to SecondBrain' : 'Add to SecondBrain'}
                    onHoverIn={Platform.OS === 'web' ? () => setHoveredAction(`add-${item.id}`) : undefined}
                    onHoverOut={Platform.OS === 'web' ? () => setHoveredAction('') : undefined}
                  >
                    <View style={styles.actionButtonContent}>
                      <Feather name={addedToSecondBrain ? 'check' : 'plus'} size={12} color={addedToSecondBrain ? theme.colors.textPrimary : theme.colors.textSecondary} />
                      {!iconOnlyActions ? (
                        <Text style={[styles.secondaryActionButtonText, addedToSecondBrain && styles.secondaryActionButtonTextAdded]}>
                          {addedToSecondBrain ? 'Added' : 'Add to SecondBrain'}
                        </Text>
                      ) : null}
                    </View>
                    {Platform.OS === 'web' && hoveredAction === `add-${item.id}` ? (
                      <View pointerEvents="none" style={styles.actionTooltip}>
                        <Text style={styles.actionTooltipText}>{addedToSecondBrain ? 'Added' : 'Add to SecondBrain'}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                  <Pressable
                    onPress={() => onShare?.(item)}
                    style={styles.shareButton}
                    accessibilityRole="button"
                    accessibilityLabel="Share"
                    onHoverIn={Platform.OS === 'web' ? () => setHoveredAction(`share-${item.id}`) : undefined}
                    onHoverOut={Platform.OS === 'web' ? () => setHoveredAction('') : undefined}
                  >
                    <View style={styles.actionButtonContent}>
                      <Feather name="share" size={12} color={theme.colors.textSecondary} />
                      {!iconOnlyActions ? <Text style={styles.shareButtonText}>Share</Text> : null}
                    </View>
                    {Platform.OS === 'web' && hoveredAction === `share-${item.id}` ? (
                      <View pointerEvents="none" style={styles.actionTooltip}>
                        <Text style={styles.actionTooltipText}>Share</Text>
                      </View>
                    ) : null}
                  </Pressable>
                </View>
              )}
              {!!addToSecondBrainResponse && <Text style={styles.secondaryActionResponse}>{addToSecondBrainResponse}</Text>}
            </View>
          ) : null}
        </View>
        {onShare && isSmallScreen && isActionDrawerOpen ? (
          <Modal transparent visible={isActionDrawerOpen} animationType="none" onRequestClose={closeActionDrawer}>
            <Pressable style={styles.mobileActionDrawerBackdrop} onPress={closeActionDrawer}>
              <View style={[styles.mobileActionDrawer, styles.mobileActionDrawerPortal, { top: drawerTop, left: drawerLeft }]}>
                {!isSelf ? (
                  <Pressable
                    style={styles.mobileActionDrawerItem}
                    onPress={() => {
                      closeActionDrawer();
                      onToggleFollow?.(item.user_id, isFollowing);
                    }}
                    disabled={followBusy}
                  >
                    <Text style={styles.mobileActionDrawerText}>{isFollowing ? 'Unfollow' : 'Follow'}</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={styles.mobileActionDrawerItem}
                  onPress={() => {
                    closeActionDrawer();
                    requestAddToSecondBrain(item);
                  }}
                >
                  <Text style={styles.mobileActionDrawerText}>{addedToSecondBrain ? 'Added to SecondBrain' : 'Add to SecondBrain'}</Text>
                </Pressable>
                <Pressable
                  style={styles.mobileActionDrawerItem}
                  onPress={() => {
                    closeActionDrawer();
                    onShare?.(item);
                  }}
                >
                  <Text style={styles.mobileActionDrawerText}>Share</Text>
                </Pressable>
              </View>
            </Pressable>
          </Modal>
        ) : null}
      </View>
    );
  }

  const Container = onPress ? Pressable : View;
  return (
    <Container style={[styles.card, transparentCard && { backgroundColor: 'transparent' }]} onPress={onPress}>
      {!!authorLabel ? (
        <View style={styles.standaloneAuthorRow}>
          {!!authorPrefix ? <Text style={styles.standaloneAuthorPrefix}>{authorPrefix}</Text> : null}
          <Pressable
            onPress={onAuthorPress}
            disabled={!onAuthorPress}
            accessibilityRole={onAuthorPress ? 'link' : undefined}
          >
            <Text style={styles.standaloneAuthor}>{authorLabel}</Text>
          </Pressable>
        </View>
      ) : null}
      {!!topMeta && <Text style={styles.meta}>{topMeta}</Text>}
      {showInlineDateActions ? (
        <View style={styles.dateActionRow}>
          {!!date && <Text style={styles.date}>{date}</Text>}
          <View style={styles.mobileActionDrawerWrap}>
            <Pressable
              ref={actionTriggerRef}
              style={styles.mobileActionTrigger}
              onPress={() => (isActionDrawerOpen ? closeActionDrawer() : openActionDrawer())}
              disabled={isAddingToSecondBrain}
              accessibilityRole="button"
              accessibilityLabel="Thought actions"
            >
              {isAddingToSecondBrain ? (
                <Text style={styles.mobileActionTriggerText}>...</Text>
              ) : (
                <Feather name="more-horizontal" size={14} style={styles.mobileActionTriggerIcon} />
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        !!date && <Text style={styles.date}>{date}</Text>
      )}
      <Pressable
        onPress={thoughtContent.isTruncated ? () => setExpanded(current => !current) : undefined}
        disabled={!thoughtContent.isTruncated}
        accessibilityRole={thoughtContent.isTruncated ? 'button' : undefined}
      >
        <View style={styles.thoughtBlocks}>
          {!!parsedThought.hasTitle && (
            <Text
              style={[
                styles.thoughtTitle,
                feedBody && styles.thoughtTitleFeed,
                feedBody && isSmallScreen && styles.thoughtTitleFeedCompact,
                largeBody && styles.bodyLarge,
              ]}
            >
              {parsedThought.title}
            </Text>
          )}
          {parsedThought.blocks.map((block, index) => (
            <View key={`standalone-thought-block-${index}`} style={block.isQuote ? styles.quoteBlock : null}>
              <Text style={[styles.body, feedBody && styles.bodyFeed, block.isQuote ? styles.quoteText : null]}>
                {block.text}
              </Text>
            </View>
          ))}
        </View>
      </Pressable>
      {!!bottomMeta && <Text style={styles.meta}>{bottomMeta}</Text>}
      {onShare ? (
        <View style={styles.reactions}>
          <View style={styles.actionsBlock}>
            {isSmallScreen ? (
              !showInlineDateActions ? (
                <View style={styles.mobileActionDrawerWrap}>
                  <Pressable
                    ref={actionTriggerRef}
                    style={styles.mobileActionTrigger}
                    onPress={() => (isActionDrawerOpen ? closeActionDrawer() : openActionDrawer())}
                    disabled={isAddingToSecondBrain}
                    accessibilityRole="button"
                    accessibilityLabel="Thought actions"
                  >
                    {isAddingToSecondBrain ? (
                      <Text style={styles.mobileActionTriggerText}>...</Text>
                    ) : (
                      <Feather name="more-horizontal" size={14} style={styles.mobileActionTriggerIcon} />
                    )}
                  </Pressable>
                </View>
              ) : null
            ) : (
              <View style={styles.actionsGroup}>
                <Pressable
                  onPress={() => requestAddToSecondBrain(addToSecondBrainPayload || { text: sourceText })}
                  disabled={isAddingToSecondBrain}
                  style={[styles.secondaryActionButton, addedToSecondBrain && styles.secondaryActionButtonAdded]}
                  accessibilityRole="button"
                  accessibilityLabel={addedToSecondBrain ? 'Added to SecondBrain' : 'Add to SecondBrain'}
                  onHoverIn={Platform.OS === 'web' ? () => setHoveredAction('add-standalone') : undefined}
                  onHoverOut={Platform.OS === 'web' ? () => setHoveredAction('') : undefined}
                >
                  <View style={styles.actionButtonContent}>
                    <Feather name={addedToSecondBrain ? 'check' : 'plus'} size={12} color={addedToSecondBrain ? theme.colors.textPrimary : theme.colors.textSecondary} />
                    {!iconOnlyActions ? (
                      <Text style={[styles.secondaryActionButtonText, addedToSecondBrain && styles.secondaryActionButtonTextAdded]}>
                        {addedToSecondBrain ? 'Added' : 'Add to SecondBrain'}
                      </Text>
                    ) : null}
                  </View>
                  {Platform.OS === 'web' && hoveredAction === 'add-standalone' ? (
                    <View pointerEvents="none" style={styles.actionTooltip}>
                      <Text style={styles.actionTooltipText}>{addedToSecondBrain ? 'Added' : 'Add to SecondBrain'}</Text>
                    </View>
                  ) : null}
                </Pressable>
                <Pressable
                  onPress={() => onShare?.({ text: sourceText })}
                  style={styles.shareButton}
                  accessibilityRole="button"
                  accessibilityLabel="Share"
                  onHoverIn={Platform.OS === 'web' ? () => setHoveredAction('share-standalone') : undefined}
                  onHoverOut={Platform.OS === 'web' ? () => setHoveredAction('') : undefined}
                >
                  <View style={styles.actionButtonContent}>
                    <Feather name="share" size={12} color={theme.colors.textSecondary} />
                    {!iconOnlyActions ? <Text style={styles.shareButtonText}>Share</Text> : null}
                  </View>
                  {Platform.OS === 'web' && hoveredAction === 'share-standalone' ? (
                    <View pointerEvents="none" style={styles.actionTooltip}>
                      <Text style={styles.actionTooltipText}>Share</Text>
                    </View>
                  ) : null}
                </Pressable>
              </View>
            )}
            {!!addToSecondBrainResponse && <Text style={styles.secondaryActionResponse}>{addToSecondBrainResponse}</Text>}
          </View>
        </View>
      ) : null}
      {onShare && isSmallScreen && isActionDrawerOpen ? (
        <Modal transparent visible={isActionDrawerOpen} animationType="none" onRequestClose={closeActionDrawer}>
          <Pressable style={styles.mobileActionDrawerBackdrop} onPress={closeActionDrawer}>
            <View style={[styles.mobileActionDrawer, styles.mobileActionDrawerPortal, { top: drawerTop, left: drawerLeft }]}>
              <Pressable
                style={styles.mobileActionDrawerItem}
                onPress={() => {
                  closeActionDrawer();
                  if (item) requestAddToSecondBrain(item);
                  else requestAddToSecondBrain(addToSecondBrainPayload || { text: sourceText });
                }}
              >
                <Text style={styles.mobileActionDrawerText}>{addedToSecondBrain ? 'Added to SecondBrain' : 'Add to SecondBrain'}</Text>
              </Pressable>
              <Pressable
                style={styles.mobileActionDrawerItem}
                onPress={() => {
                  closeActionDrawer();
                  if (item) onShare?.(item);
                  else onShare?.({ text: sourceText });
                }}
              >
                <Text style={styles.mobileActionDrawerText}>Share</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      ) : null}
    </Container>
  );
}

function areThoughtCardPropsEqual(prevProps, nextProps) {
  if (prevProps.item !== nextProps.item) return false;
  if (prevProps.text !== nextProps.text) return false;
  if (prevProps.authorPrefix !== nextProps.authorPrefix) return false;
  if (prevProps.authorLabel !== nextProps.authorLabel) return false;
  if (prevProps.topMeta !== nextProps.topMeta) return false;
  if (prevProps.bottomMeta !== nextProps.bottomMeta) return false;
  if (prevProps.date !== nextProps.date) return false;
  if (prevProps.onPress !== nextProps.onPress) return false;
  if (prevProps.onOpenProfile !== nextProps.onOpenProfile) return false;
  if (prevProps.onToggleFollow !== nextProps.onToggleFollow) return false;
  if (prevProps.onReact !== nextProps.onReact) return false;
  if (prevProps.onShare !== nextProps.onShare) return false;
  if (prevProps.onAddToSecondBrain !== nextProps.onAddToSecondBrain) return false;
  if (prevProps.addToSecondBrainPayload !== nextProps.addToSecondBrainPayload) return false;
  if (prevProps.largeBody !== nextProps.largeBody) return false;
  if (prevProps.feedBody !== nextProps.feedBody) return false;
  if (prevProps.transparentCard !== nextProps.transparentCard) return false;
  if (prevProps.inlineActionWithDate !== nextProps.inlineActionWithDate) return false;

  const prevItemId = prevProps.item?.id;
  const nextItemId = nextProps.item?.id;
  if (prevItemId !== nextItemId) return false;

  // Ignore global busy-key churn when it does not target this specific card.
  const prevReactionBusy = prevItemId ? prevProps.reactingKey.startsWith(`${prevItemId}-`) : false;
  const nextReactionBusy = nextItemId ? nextProps.reactingKey.startsWith(`${nextItemId}-`) : false;
  if (prevReactionBusy !== nextReactionBusy) return false;

  const prevFollowBusy = prevProps.item?.user_id ? prevProps.followBusyUserId === prevProps.item.user_id : false;
  const nextFollowBusy = nextProps.item?.user_id ? nextProps.followBusyUserId === nextProps.item.user_id : false;
  if (prevFollowBusy !== nextFollowBusy) return false;

  return true;
}

export default memo(OpenBrainThoughtCard, areThoughtCardPropsEqual);
