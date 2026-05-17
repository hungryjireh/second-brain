import { theme } from '../theme';

export const commonFollowStyles = {
  buttonBase: {
    borderWidth: 1,
    borderColor: theme.colors.textSecondary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  buttonActive: {
    backgroundColor: theme.colors.white09,
  },
  buttonFollowing: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.textSecondary,
  },
  textBase: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    fontSize: 12,
  },
  textFollowing: {
    color: theme.colors.textSecondary,
  },
};

export const commonLayoutStyles = {
  screenBase: {
    flex: 1,
    backgroundColor: theme.colors.bgBase,
  },
};

export const commonSearchStyles = {
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitLabel: {
    color: theme.colors.textLight,
    fontSize: 14,
    fontFamily: theme.fonts.semibold,
  },
  sectionLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontFamily: theme.fonts.semibold,
    marginBottom: 6,
  },
  resultPrimary: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: theme.fonts.semibold,
  },
  resultSecondary: {
    marginTop: 2,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: theme.fonts.regular,
  },
};
