import { StyleSheet } from "react-native";
import { theme } from "../theme";

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    borderTopWidth: 0,
    backgroundColor: theme.colors.bgSurface,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  floatingDraftButton: {
    position: "absolute",
    right: 16,
    top: -52,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderColor: theme.colors.border,
    borderWidth: 1,
    backgroundColor: theme.colors.bgBase,
    zIndex: 10,
  },
  floatingDraftButtonActive: {
    borderColor: theme.colors.accentStrong,
    backgroundColor: theme.colors.accentDim,
  },
  draftIcon: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.semibold,
    fontSize: 22,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCardWrap: {
    width: "100%",
    maxWidth: 560,
    height: "82%",
    maxHeight: 760,
    paddingHorizontal: 12,
    alignSelf: "center",
  },
  row: {
    flexDirection: "row",
    gap: 10,
    padding: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 20,
    backgroundColor: theme.colors.bgBase,
  },
  button: {
    flex: 1,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "transparent",
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  buttonActive: {
    backgroundColor: theme.colors.bgRaised,
    borderColor: theme.colors.borderStrong,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 3,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.accent,
  },
  label: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.semibold,
    fontSize: 13,
  },
  labelActive: {
    color: theme.colors.textPrimary,
    letterSpacing: 0.2,
  },
});

export default styles;
