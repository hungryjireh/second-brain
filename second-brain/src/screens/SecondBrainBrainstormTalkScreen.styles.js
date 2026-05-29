import { StyleSheet } from "react-native";
import { theme } from "../theme";

const styles = StyleSheet.create({
  layoutBody: {
    paddingTop: 24,
    paddingHorizontal: 0,
    alignItems: "stretch",
  },
  layoutHeading: {
    lineHeight: 34,
    marginTop: 2,
  },
  layoutDescription: {
    marginTop: 10,
    marginBottom: 14,
    paddingHorizontal: 24,
  },
  talkArea: { flex: 1, width: "100%" },
  container: { flex: 1 },
  messagesList: { flex: 1 },
  messagesWrap: { padding: 16, gap: 10, paddingBottom: 160, flexGrow: 1 },
  controlsWrap: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  stateText: {
    fontFamily: theme.fonts.heading,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  controlButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bgRaised,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryControlButton: {
    borderColor: theme.colors.brand,
    backgroundColor: theme.colors.brand,
  },
  primaryControlButtonText: {
    color: theme.colors.textLight,
    fontFamily: theme.fonts.heading,
    fontSize: 13,
  },
  controlButtonDisabled: { opacity: 0.45 },
  error: {
    color: theme.colors.danger,
    fontFamily: theme.fonts.body,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  finalizingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    backgroundColor: theme.colors.bgRaised,
  },
  finalizingText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 13,
  },
});

export default styles;
