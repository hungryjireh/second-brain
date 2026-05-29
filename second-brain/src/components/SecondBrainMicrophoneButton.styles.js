import { StyleSheet } from "react-native";
import { theme } from "../theme";

export default StyleSheet.create({
  micWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 244,
    height: 244,
  },
  micGlowOuter: {
    position: "absolute",
    width: 244,
    height: 244,
    borderRadius: 122,
    backgroundColor: theme.colors.brand,
    opacity: 0.16,
    transform: [{ scale: 1.08 }],
  },
  micGlowInner: {
    position: "absolute",
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: theme.colors.brand,
    opacity: 0.24,
  },
  micButton: {
    width: 124,
    height: 124,
    borderRadius: 62,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.brand,
    shadowColor: theme.colors.brand,
    shadowOpacity: 0.34,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  micButtonActive: {
    backgroundColor: theme.colors.brand,
  },
  micButtonDisabled: {
    opacity: 0.6,
  },
  micIcon: {
    color: "#F8FAFC",
  },
});
