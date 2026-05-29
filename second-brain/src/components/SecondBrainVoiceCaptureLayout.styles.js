import { StyleSheet } from "react-native";
import { theme } from "../theme";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F3F7",
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
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D5DBE5",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#64748B",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  backIcon: {
    color: "#64748B",
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
    paddingTop: 120,
  },
  heading: {
    color: "#0F172A",
    textAlign: "center",
    fontFamily: theme.fonts.semibold,
    fontSize: 24,
    lineHeight: 58,
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 24,
    maxWidth: 460,
    color: "#8A99AD",
    textAlign: "center",
    fontFamily: theme.fonts.regular,
    fontSize: 16,
    lineHeight: 25,
  },
});

export default styles;
