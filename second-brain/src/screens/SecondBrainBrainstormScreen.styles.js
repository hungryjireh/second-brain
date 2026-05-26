import { StyleSheet } from "react-native";
import { theme } from "../theme";

const styles = StyleSheet.create({
  fullScreenPanel: {
    width: "100%",
    maxWidth: "100%",
    maxHeight: "100%",
    borderRadius: 0,
    borderWidth: 0,
    padding: 0,
    gap: 0,
    backgroundColor: theme.colors.bgBase,
  },
  container: { flex: 1 },
  messagesList: { flex: 1 },
  messagesWrap: { padding: 16, gap: 10, paddingBottom: 120, flexGrow: 1 },
  messageRow: { width: "100%" },
  userRow: { alignItems: "flex-end" },
  assistantRow: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "88%",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  userBubble: {
    backgroundColor: theme.colors.conversationBubbleHumanBg,
    borderColor: theme.colors.conversationBubbleHumanBorder,
  },
  assistantBubble: {
    backgroundColor: theme.colors.bgBase,
    borderColor: theme.colors.conversationBubbleAssistantBorder,
  },
  roleLabel: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  messageText: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 160,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.body,
  },
  sendButton: {
    minWidth: 72,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: theme.colors.brand,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  sendDisabled: { opacity: 0.5 },
  sendButtonText: {
    color: theme.colors.textLight,
    fontFamily: theme.fonts.heading,
    fontSize: 14,
  },
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
    marginHorizontal: 12,
    marginBottom: 8,
  },
  finalizingText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 13,
  },
});

export default styles;
