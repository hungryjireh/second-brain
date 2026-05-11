import { StyleSheet } from 'react-native';
import { theme } from '../theme';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bgBase,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.4,
    fontFamily: 'DMSerifDisplay_400Regular',
    marginBottom: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    minWidth: 180,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    backgroundColor: theme.colors.bgSurface,
  },
  submitButton: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7ec8ff',
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitLabel: {
    color: '#0f1115',
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
  },
  resultsWrap: {
    flex: 1,
    marginTop: 8,
  },
  section: {
    paddingTop: 4,
  },
  sectionLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontFamily: 'DMSans_600SemiBold',
    marginBottom: 6,
  },
  resultRow: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    backgroundColor: theme.colors.bgSurface,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  resultPrimary: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'DMSans_600SemiBold',
  },
  resultSecondary: {
    marginTop: 2,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'DMSans_400Regular',
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'DMSans_400Regular',
    marginBottom: 6,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'DMSans_400Regular',
    marginBottom: 6,
  },
  loading: {
    marginTop: 8,
  },
});

export default styles;
