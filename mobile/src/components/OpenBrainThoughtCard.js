import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import styles from './OpenBrainThoughtCard.styles';
import { theme } from '../theme';

const REACTIONS = [
  { key: 'felt_this', label: 'felt this' },
  { key: 'me_too', label: 'me too' },
  { key: 'made_me_think', label: 'made me think' },
];

function initialsFromName(name) {
  const cleaned = String(name || '').trim();
  if (!cleaned) return '?';
  return cleaned.slice(0, 1).toUpperCase();
}

function mutedTint(seed = '') {
  const palette = ['#514876', '#495072', '#5a465f', '#425467', '#5c4f46', '#4f4f70'];
  const total = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[total % palette.length];
}

function normalizeThoughtText(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\u2028|\u2029/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

const PREVIEW_CHAR_LIMIT = 220;

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

export default function OpenBrainThoughtCard({
  item,
  text,
  topMeta,
  bottomMeta,
  date,
  onPress,
  onOpenProfile,
  onToggleFollow,
  onReact,
  onShare,
  reactingKey = '',
  followBusyUserId = '',
  largeBody = false,
  feedBody = false,
  transparentCard = false,
}) {
  const sourceText = item ? item.text : text;
  const thoughtContent = useMemo(() => getThoughtPreview(sourceText), [sourceText]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [thoughtContent.full]);

  if (item?.missing_today) {
    const name = item.profile?.username || 'unknown';
    const streak = Number.isInteger(item.profile?.streak_count) ? item.profile.streak_count : 0;
    return (
      <View style={[styles.card, { borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10 }]}>
        <Text style={styles.username}>@{name} <Text style={styles.streak}>· 🔥 {streak}</Text></Text>
        <Text style={[styles.meta, { fontStyle: 'italic', marginTop: 4 }]}>no thought today</Text>
      </View>
    );
  }

  if (item) {
    const name = item.profile?.username || 'unknown';
    const avatarUrl = item.profile?.avatar_url || '';
    const streak = Number.isInteger(item.profile?.streak_count) ? item.profile.streak_count : 0;
    const isSelf = Boolean(item.profile?.is_self);
    const isFollowing = Boolean(item.profile?.is_following);
    const followBusy = followBusyUserId === item.user_id;
    const formattedTime = date || topMeta || '';
    const displayedText = thoughtContent.isTruncated && !expanded ? thoughtContent.preview : thoughtContent.full;
    const parsedThought = parseThoughtForCard(displayedText);

    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Pressable onPress={() => onOpenProfile?.(name)} accessibilityRole="button">
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: mutedTint(name) }]}>
                <Text style={styles.avatarFallbackText}>{initialsFromName(name)}</Text>
              </View>
            )}
          </Pressable>
          <View style={styles.metaBlock}>
            <View style={styles.metaLine}>
              <Pressable onPress={() => onOpenProfile?.(name)} accessibilityRole="button">
                <Text style={styles.username}>@{name}</Text>
              </Pressable>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.streak}>🔥 {streak}</Text>
            </View>
            {!!formattedTime && <Text style={styles.time}>{formattedTime}</Text>}
          </View>
          {!isSelf ? (
            <Pressable
              onPress={() => onToggleFollow?.(item.user_id, isFollowing)}
              disabled={followBusy}
              style={[
                styles.followButton,
                isFollowing ? styles.followButtonFollowing : styles.followButtonActive,
                followBusy && { opacity: 0.55 },
              ]}
            >
              <Text style={styles.followButtonText}>{isFollowing ? 'unfollow' : 'follow'}</Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={thoughtContent.isTruncated ? () => setExpanded(current => !current) : undefined}
          disabled={!thoughtContent.isTruncated}
          accessibilityRole={thoughtContent.isTruncated ? 'button' : undefined}
        >
          <View style={styles.thoughtBlocks}>
            {!!parsedThought.hasTitle && <Text style={[styles.thoughtTitle, styles.thoughtTitleFeed]}>{parsedThought.title}</Text>}
            {parsedThought.blocks.map((block, index) => (
              <View key={`thought-${item.id}-block-${index}`} style={block.isQuote ? styles.quoteBlock : null}>
                <Text style={[styles.body, styles.bodyFeed, block.isQuote ? styles.quoteText : null]}>{block.text}</Text>
              </View>
            ))}
          </View>
        </Pressable>

        <View style={styles.reactions}>
          {REACTIONS.map(reaction => {
            const active = Boolean(item.reactions?.mine?.[reaction.key]);
            const count = Number(item.reactions?.[reaction.key] || 0);
            const busy = reactingKey === `${item.id}-${reaction.key}`;
            return (
              <Pressable
                key={reaction.key}
                onPress={() => onReact?.(item.id, reaction.key, active)}
                disabled={busy}
                style={[styles.reactionChip, active && styles.reactionChipActive, busy && { opacity: 0.55 }]}
              >
                <Text style={[styles.reactionText, active && styles.reactionTextActive]}>
                  {reaction.label}{count > 0 ? ` ${count}` : ''}
                </Text>
              </Pressable>
            );
          })}
          {onShare ? (
            <Pressable onPress={() => onShare?.(item)} style={styles.shareButton}>
              <Text style={styles.shareButtonText}>↗ Share</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  const Container = onPress ? Pressable : View;
  return (
    <Container style={[styles.card, transparentCard && { backgroundColor: 'transparent' }]} onPress={onPress}>
      {!!topMeta && <Text style={styles.meta}>{topMeta}</Text>}
      {!!date && <Text style={styles.date}>{date}</Text>}
      <Pressable
        onPress={thoughtContent.isTruncated ? () => setExpanded(current => !current) : undefined}
        disabled={!thoughtContent.isTruncated}
        accessibilityRole={thoughtContent.isTruncated ? 'button' : undefined}
      >
        {(() => {
          const displayedText = thoughtContent.isTruncated && !expanded ? thoughtContent.preview : thoughtContent.full;
          const parsedThought = parseThoughtForCard(displayedText);
          return (
            <View style={styles.thoughtBlocks}>
              {!!parsedThought.hasTitle && (
                <Text style={[styles.thoughtTitle, feedBody && styles.thoughtTitleFeed, largeBody && styles.bodyLarge]}>
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
          );
        })()}
      </Pressable>
      {!!bottomMeta && <Text style={styles.meta}>{bottomMeta}</Text>}
      {onShare ? (
        <View style={styles.reactions}>
          <Pressable onPress={() => onShare?.({ text: sourceText })} style={styles.shareButton}>
            <Text style={styles.shareButtonText}>↗ Share</Text>
          </Pressable>
        </View>
      ) : null}
    </Container>
  );
}
