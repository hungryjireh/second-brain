import { StyleSheet } from "react-native";
import { theme } from "../theme";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgRaised,
  },
  content: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 12,
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 9,
    backgroundColor: theme.colors.bgBase,
  },
  tabActive: {
    borderColor: theme.colors.accentStrong,
    backgroundColor: theme.colors.bgRaised,
  },
  tabLabel: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.semibold,
    fontSize: 13,
  },
  tabLabelActive: {
    color: theme.colors.textPrimary,
  },
  list: {
    paddingBottom: 130,
  },
  listEmpty: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  meta: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    marginBottom: 12,
    textAlign: "center",
  },
  error: {
    color: theme.colors.danger,
    fontFamily: theme.fonts.regular,
    marginBottom: 12,
  },
});

export default styles;
