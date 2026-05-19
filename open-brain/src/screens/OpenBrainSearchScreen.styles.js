import { StyleSheet } from "react-native";
import { theme } from "../theme";
import { commonLayoutStyles, commonSearchStyles } from "../styles/commonStyles";

const styles = StyleSheet.create({
  screen: {
    ...commonLayoutStyles.screenBase,
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
    fontFamily: theme.fonts.serif,
    marginBottom: 10,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
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
    fontFamily: theme.fonts.regular,
    backgroundColor: theme.colors.bgSurface,
  },
  submitButton: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.accent,
  },
  submitButtonDisabled: {
    ...commonSearchStyles.submitButtonDisabled,
  },
  submitLabel: {
    ...commonSearchStyles.submitLabel,
  },
  resultsWrap: {
    flex: 1,
    marginTop: 8,
  },
  section: {
    paddingTop: 4,
  },
  sectionLabel: {
    ...commonSearchStyles.sectionLabel,
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
    ...commonSearchStyles.resultPrimary,
  },
  resultSecondary: {
    ...commonSearchStyles.resultSecondary,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: theme.fonts.regular,
    marginBottom: 6,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: theme.fonts.regular,
    marginBottom: 6,
    textAlign: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loading: {
    marginTop: 8,
  },
});

export default styles;
