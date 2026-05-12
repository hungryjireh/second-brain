import { StyleSheet } from 'react-native';
import { theme } from '../theme';
import { openBrainStyle } from '../theme';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bgBase,
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
    fontFamily: openBrainStyle.fontSerif,
  },
  copy: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: openBrainStyle.fontRegular,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontFamily: openBrainStyle.fontRegular,
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
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.86,
  },
  buttonText: {
    color: theme.colors.accentOnSolid,
    fontSize: 15,
    fontFamily: openBrainStyle.fontSemiBold,
  },
  error: {
    color: theme.colors.dangerSoft,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: openBrainStyle.fontRegular,
  },
});

export default styles;
