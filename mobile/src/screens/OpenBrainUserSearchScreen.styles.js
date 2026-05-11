import { StyleSheet } from 'react-native';
import { theme } from '../theme';

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
    fontFamily: 'DMSerifDisplay_400Regular',
  },
  copy: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'DMSans_400Regular',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
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
    backgroundColor: '#7ec8ff',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.86,
  },
  buttonText: {
    color: '#0f1115',
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
  },
  error: {
    color: '#ff7b7b',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'DMSans_400Regular',
  },
});

export default styles;
