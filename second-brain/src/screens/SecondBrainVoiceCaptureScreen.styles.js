import { StyleSheet } from "react-native";
import { theme } from "../theme";

export default StyleSheet.create({
  error: {
    marginTop: 10,
    color: "#DC2626",
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  timer: {
    marginTop: 14,
    color: "#64748B",
    fontFamily: theme.fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  micWrap: {
    marginTop: 44,
  },
});
