import { StyleSheet } from 'react-native';
import { theme } from '../theme';
import { commonLayoutStyles, commonSearchStyles } from '../styles/commonStyles';

const styles = StyleSheet.create({
  screen: {
    ...commonLayoutStyles.screenBase,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 12,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
    fontFamily: theme.fonts.serif,
  },
  copy: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: theme.fonts.regular,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    backgroundColor: theme.colors.bgSurface,
  },
  placeholder: {
    color: theme.colors.textSecondary,
  },
  button: {
    marginTop: 6,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
  },
  buttonDisabled: {
    ...commonSearchStyles.submitButtonDisabled,
  },
  buttonPressed: {
    opacity: 0.86,
  },
  buttonText: {
    ...commonSearchStyles.submitLabel,
    color: theme.colors.accentOnSolid,
    fontSize: 15,
  },
  error: {
    color: theme.colors.dangerSoft,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: theme.fonts.regular,
  },
});

export default styles;
