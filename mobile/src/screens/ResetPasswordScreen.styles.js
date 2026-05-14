import { StyleSheet } from 'react-native';
import { theme } from '../theme';

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: theme.colors.bgSurface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 10,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  label: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    marginTop: 2,
  },
  input: {
    backgroundColor: theme.colors.bgRaised,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 10,
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.accentStrong,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    width: '100%',
  },
  primaryButtonText: {
    color: theme.colors.textLight,
    fontFamily: theme.fonts.semibold,
    fontSize: 14,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.accentStrong,
    opacity: 0.55,
  },
  buttonDisabledText: {
    color: theme.colors.textLight,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.bgRaised,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: '100%',
  },
  secondaryButtonText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.semibold,
    fontSize: 14,
  },
  actionsRow: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 4,
    zIndex: 1,
  },
  error: {
    color: theme.colors.dangerStrong,
    backgroundColor: theme.colors.dangerBg,
    borderColor: theme.colors.dangerBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: theme.fonts.regular,
    fontSize: 12,
  },
  success: {
    color: theme.colors.accentText,
    backgroundColor: theme.colors.accentDim,
    borderColor: theme.colors.accentBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: theme.fonts.regular,
    fontSize: 12,
  },
});

export default styles;
