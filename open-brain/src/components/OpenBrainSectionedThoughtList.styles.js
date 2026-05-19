import { StyleSheet } from "react-native";
import { theme } from "../theme";

const styles = StyleSheet.create({
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
    marginBottom: 8,
  },
  sectionHeader: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.72,
    textTransform: "uppercase",
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.borderStrong,
  },
});

export default styles;
