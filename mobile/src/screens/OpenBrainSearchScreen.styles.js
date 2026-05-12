import { StyleSheet } from 'react-native';
import { theme } from '../theme';
import { openBrainStyle } from '../constants/openbrainStyle';

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
    fontFamily: openBrainStyle.fontSerif,
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
    fontFamily: openBrainStyle.fontRegular,
    backgroundColor: theme.colors.bgSurface,
  },
  submitButton: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: openBrainStyle.accent,
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitLabel: {
    color: openBrainStyle.accentOnSolid,
    fontSize: 14,
    fontFamily: openBrainStyle.fontSemiBold,
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
    fontFamily: openBrainStyle.fontSemiBold,
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
    fontFamily: openBrainStyle.fontSemiBold,
  },
  resultSecondary: {
    marginTop: 2,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: openBrainStyle.fontRegular,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: openBrainStyle.fontRegular,
    marginBottom: 6,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: openBrainStyle.fontRegular,
    marginBottom: 6,
  },
  loading: {
    marginTop: 8,
  },
});

export default styles;
