import { StyleSheet } from 'react-native';
import { theme } from '../theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: theme.colors.bgBase,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    backgroundColor: theme.colors.bgSurface,
    borderWidth: 0.5,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 24,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  eyebrow: {
    marginBottom: 0,
    color: theme.colors.brandText,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    fontFamily: theme.fonts.semibold,
  },
  title: {
    marginTop: 8,
    marginBottom: 8,
    color: theme.colors.textPrimary,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.4,
    fontFamily: theme.fonts.serif,
  },
  titleAccent: {
    color: theme.colors.brand,
  },
  subtitle: {
    marginTop: 0,
    marginBottom: 18,
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: theme.fonts.regular,
  },
  form: {
    gap: 10,
  },
  input: {
    width: '100%',
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.bgRaised,
    color: theme.colors.textPrimary,
    borderWidth: 0.5,
    borderColor: theme.colors.border,
    borderRadius: 10,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  button: {
    marginTop: 2,
    width: '100%',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'transparent',
    backgroundColor: theme.colors.brand,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: theme.colors.bgHover,
  },
  buttonText: {
    color: theme.colors.buttonTextOnBrand,
    fontFamily: theme.fonts.semibold,
    fontSize: 14,
  },
  buttonTextDisabled: {
    color: theme.colors.textMuted,
  },
  errorBox: {
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: theme.colors.dangerBorder,
    backgroundColor: theme.colors.dangerBg,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  errorText: {
    color: theme.colors.dangerStrong,
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
});

export default styles;
