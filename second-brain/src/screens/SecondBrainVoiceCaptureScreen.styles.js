import { StyleSheet } from "react-native";
import { theme } from "../theme";

export default StyleSheet.create({
  heading: {
    color: "#0F172A",
    textAlign: "center",
    fontFamily: theme.fonts.semibold,
    fontSize: 24,
    lineHeight: 58,
    letterSpacing: -0.8,
  },
  description: {
    marginTop: 24,
    maxWidth: 460,
    color: "#8A99AD",
    textAlign: "center",
    fontFamily: theme.fonts.regular,
    fontSize: 16,
    lineHeight: 25,
  },
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
