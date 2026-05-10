import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
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
    .replace(/\n(?:[ \t]*\n)+/g, '\n')
    .trim();
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#070809',
    borderColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: theme.colors.textPrimary,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 20,
  },
  metaBlock: {
    flex: 1,
    gap: 4,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  username: {
    color: theme.colors.textPrimary,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 17,
    lineHeight: 20,
  },
  metaDot: {
    color: 'rgba(244,242,239,0.5)',
    fontFamily: 'DMSans_400Regular',
  },
  streak: {
    color: 'rgba(244,242,239,0.78)',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
  },
  time: {
    color: 'rgba(244,242,239,0.5)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
  },
  body: {
    color: '#ede9e3',
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 21,
    lineHeight: 38,
  },
  bodyLarge: {
    fontSize: 24,
    lineHeight: 42,
  },
  meta: {
    color: theme.colors.textSecondary,
    fontFamily: 'DMSans_400Regular',
    marginBottom: 6,
  },
  date: {
    color: theme.colors.textSecondary,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    marginBottom: 6,
  },
  followButton: {
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  followButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  followButtonFollowing: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  followButtonText: {
    color: '#f5f3ef',
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
  },
  reactions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 20,
  },
  reactionChip: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.09)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  reactionChipActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  reactionText: {
    color: 'rgba(243,241,236,0.66)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
  },
  reactionTextActive: {
    color: '#f5f3ef',
  },
});

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
  reactingKey = '',
  followBusyUserId = '',
  largeBody = false,
}) {
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
    const thoughtText = normalizeThoughtText(item.text);

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

        <Text style={styles.body}>{thoughtText}</Text>

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
        </View>
      </View>
    );
  }

  const Container = onPress ? Pressable : View;
  return (
    <Container style={styles.card} onPress={onPress}>
      {!!topMeta && <Text style={styles.meta}>{topMeta}</Text>}
      {!!date && <Text style={styles.date}>{date}</Text>}
      <Text style={[styles.body, largeBody && styles.bodyLarge]}>{text || ''}</Text>
      {!!bottomMeta && <Text style={styles.meta}>{bottomMeta}</Text>}
    </Container>
  );
}
