import { StyleSheet } from 'react-native';
import { theme } from '../theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgBase,
  },
  list: {
    flex: 1,
    backgroundColor: theme.colors.bgBase,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: theme.colors.bgBase,
  },
  headerCard: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 16,
    marginBottom: 14,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.bgHover,
    borderColor: theme.colors.borderStrong,
    borderWidth: 1,
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.bold,
    fontSize: 24,
    fontWeight: '700',
  },
  profileText: {
    flex: 1,
    gap: 8,
  },
  username: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.semibold,
    fontSize: 20,
    lineHeight: 24,
  },
  usernamePlaceholder: {
    width: 160,
    maxWidth: '90%',
    height: 24,
    borderRadius: 8,
    backgroundColor: theme.colors.bgHover,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakPill: {
    borderColor: theme.colors.borderStrong,
    borderWidth: 1,
    borderRadius: 999,
    backgroundColor: theme.colors.bgHover,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  streakPlaceholder: {
    width: 98,
    height: 30,
    borderRadius: 999,
    backgroundColor: theme.colors.bgHover,
    borderColor: theme.colors.borderStrong,
    borderWidth: 1,
  },
  streakPillText: {
    color: theme.colors.textLight,
    fontFamily: theme.fonts.regular,
    fontSize: 12,
  },
  thoughtCount: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.semibold,
    fontSize: 14,
  },
  thoughtCountPlaceholder: {
    width: 70,
    height: 18,
    borderRadius: 6,
    backgroundColor: theme.colors.bgHover,
  },
  followButton: {
    alignSelf: 'center',
    borderRadius: 999,
    borderColor: 'transparent',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  followActiveButton: {
    backgroundColor: theme.colors.white09,
  },
  followingButton: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accentBorder,
  },
  followButtonText: {
    color: theme.colors.textWarm80,
    fontFamily: theme.fonts.regular,
    fontSize: 12,
  },
  followButtonTextFollowing: {
    color: theme.colors.accentText,
  },
  muted: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
  },
  empty: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    fontStyle: 'italic',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    marginBottom: 8,
  },
  sectionHeader: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.72,
    textTransform: 'uppercase',
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.borderStrong,
  },
  error: {
    color: theme.colors.danger,
    fontFamily: theme.fonts.regular,
    fontSize: 13,
  },
});

export default styles;
