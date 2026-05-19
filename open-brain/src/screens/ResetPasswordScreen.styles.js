import { StyleSheet } from 'react-native';
import { theme } from '../theme';
import { commonFormCompositions, commonFormPrimitives, commonStatusStyles } from '../styles/commonStyles';

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
    ...commonFormCompositions.raisedInput,
  },
  primaryButton: {
    ...commonFormCompositions.primaryAccentButton,
  },
  primaryButtonText: {
    ...commonFormCompositions.primaryAccentButtonText,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.accentStrong,
    opacity: 0.55,
  },
  buttonDisabledText: {
    color: theme.colors.textLight,
  },
  secondaryButton: {
    ...commonFormCompositions.secondaryRaisedButton,
  },
  secondaryButtonText: {
    ...commonFormCompositions.secondaryRaisedButtonText,
  },
  actionsRow: {
    ...commonFormPrimitives.actionsColumn,
  },
  error: {
    ...commonStatusStyles.errorBanner,
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
