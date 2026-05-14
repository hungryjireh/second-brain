import { StyleSheet } from 'react-native';
import { theme } from '../theme';

const styles = StyleSheet.create({
  headerSection: {
    marginBottom: 4,
  },
  card: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 16,
    gap: 10,
  },
  navButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.bgSurface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  navButtonText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.semibold,
    fontSize: 16,
  },
  navButtonArrow: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.semibold,
    fontSize: 18,
    lineHeight: 18,
  },
});

export default styles;
