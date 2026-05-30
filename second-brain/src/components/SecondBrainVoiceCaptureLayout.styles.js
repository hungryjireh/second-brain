import { StyleSheet } from "react-native";
import { theme } from "../theme";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F3F4",
    alignItems: "center",
  },
  topRow: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    minHeight: 56,
  },
  backButton: {
    position: "absolute",
    left: 20,
    width: 106,
    height: 52,
  },
  title: {
    color: "#0F172A",
    fontFamily: theme.fonts.semibold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0.1,
  },
  body: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 36,
  },
  introWrap: {
    alignItems: "center",
    width: "100%",
  },
  introWrapHidden: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
  },
  heading: {
    color: theme.colors.textPrimary,
    textAlign: "left",
    fontFamily: theme.fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    width: "100%",
  },
  subtitle: {
    marginTop: 14,
    width: "100%",
    color: theme.colors.textSecondary,
    textAlign: "left",
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  transcriptWrap: {
    position: "absolute",
    top: 36,
    left: 24,
    right: 24,
    alignItems: "center",
  },
  transcriptText: {
    maxWidth: 520,
    color: theme.colors.textPrimary,
    textAlign: "left",
    fontFamily: theme.fonts.semibold,
    fontSize: 16,
    lineHeight: 24,
  },
});

export default styles;
