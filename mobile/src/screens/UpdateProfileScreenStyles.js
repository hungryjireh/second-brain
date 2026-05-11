import { StyleSheet } from 'react-native';
import { theme } from '../theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgBase,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: theme.colors.bgSurface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 18 },
  },
  eyebrow: {
    color: '#7ec8ff',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: theme.colors.textPrimary,
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 34,
    lineHeight: 38,
  },
  copy: {
    color: theme.colors.textSecondary,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    marginBottom: 4,
  },
  label: {
    color: theme.colors.textPrimary,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
  },
  input: {
    backgroundColor: theme.colors.bgRaised,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 10,
    color: theme.colors.textPrimary,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  inputDisabled: {
    color: theme.colors.textMuted,
  },
  timezoneDropdown: {
    backgroundColor: theme.colors.bgRaised,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 44,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  timezoneDropdownText: {
    color: theme.colors.textPrimary,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
  },
  timezoneDropdownChevron: {
    color: theme.colors.textSecondary,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
  },
  timezoneDropdownList: {
    backgroundColor: theme.colors.bgRaised,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 10,
    maxHeight: 220,
  },
  timezoneDropdownListContent: {
    paddingVertical: 4,
  },
  timezoneDropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  timezoneDropdownOptionSelected: {
    backgroundColor: 'rgba(126,200,255,0.16)',
  },
  timezoneDropdownOptionText: {
    color: theme.colors.textSecondary,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
  },
  timezoneDropdownOptionTextSelected: {
    color: '#c9ecff',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2f9de4',
    borderRadius: 10,
    marginTop: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: '#f2fbff',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.bgHover,
  },
  buttonDisabledText: {
    color: theme.colors.textMuted,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.bgRaised,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: theme.colors.textSecondary,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
  },
  muted: {
    color: theme.colors.textSecondary,
    fontFamily: 'DMSans_400Regular',
  },
  error: {
    color: '#f87171',
    backgroundColor: 'rgba(220,60,60,0.1)',
    borderColor: 'rgba(220,60,60,0.28)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
  },
  success: {
    color: '#86efac',
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderColor: 'rgba(34,197,94,0.35)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
  },
});

export default styles;
