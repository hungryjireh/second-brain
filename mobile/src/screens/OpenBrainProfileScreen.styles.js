import { StyleSheet } from 'react-native';
import { theme } from '../theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgBase,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerCard: {
    backgroundColor: theme.colors.bgRaised,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: theme.colors.textPrimary,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 24,
  },
  profileText: {
    flex: 1,
    gap: 4,
  },
  username: {
    color: theme.colors.textPrimary,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 22,
    lineHeight: 26,
  },
  streak: {
    color: theme.colors.textSecondary,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
  },
  followButton: {
    alignSelf: 'center',
    borderRadius: 999,
    borderColor: theme.colors.border,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  followActiveButton: {
    backgroundColor: '#2f9de4',
  },
  followingButton: {
    backgroundColor: theme.colors.bgHover,
  },
  followButtonText: {
    color: '#f2fbff',
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
  },
  muted: {
    color: theme.colors.textSecondary,
    fontFamily: 'DMSans_400Regular',
  },
  empty: {
    color: theme.colors.textSecondary,
    fontFamily: 'DMSans_400Regular',
    fontStyle: 'italic',
  },
  error: {
    color: theme.colors.danger,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
  },
});

export default styles;
