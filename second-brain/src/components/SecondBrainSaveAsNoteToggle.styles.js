import { StyleSheet } from "react-native";
import { theme } from "../theme";

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: "transparent",
  },
  label: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    fontWeight: "600",
  },
});

export default styles;
