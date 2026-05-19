import { theme } from "../theme";

export const commonFollowStyles = {
  buttonBase: {
    borderWidth: 1,
    borderColor: theme.colors.textSecondary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  buttonActive: {
    backgroundColor: theme.colors.white09,
  },
  buttonFollowing: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.textSecondary,
  },
  textBase: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    fontSize: 12,
  },
  textFollowing: {
    color: theme.colors.textSecondary,
  },
};

export const commonLayoutStyles = {
  screenBase: {
    flex: 1,
    backgroundColor: theme.colors.bgBase,
  },
};

export const commonFormPrimitives = {
  inputBase: {
    borderRadius: 10,
    borderWidth: 1,
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  primaryButtonBase: {
    alignItems: "center",
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    width: "100%",
  },
  primaryButtonTextBase: {
    fontFamily: theme.fonts.semibold,
    fontSize: 14,
  },
  secondaryButtonBase: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: "100%",
  },
  secondaryButtonTextBase: {
    fontFamily: theme.fonts.semibold,
    fontSize: 14,
  },
  actionsColumn: {
    flexDirection: "column",
    gap: 10,
    marginTop: 4,
    zIndex: 1,
  },
};

export const commonFormCompositions = {
  raisedInput: {
    ...commonFormPrimitives.inputBase,
    backgroundColor: theme.colors.bgRaised,
    borderColor: theme.colors.border,
  },
  primaryAccentButton: {
    ...commonFormPrimitives.primaryButtonBase,
    backgroundColor: theme.colors.accentStrong,
  },
  primaryAccentButtonText: {
    ...commonFormPrimitives.primaryButtonTextBase,
    color: theme.colors.textLight,
  },
  secondaryRaisedButton: {
    ...commonFormPrimitives.secondaryButtonBase,
    backgroundColor: theme.colors.bgRaised,
    borderColor: theme.colors.border,
  },
  secondaryRaisedButtonText: {
    ...commonFormPrimitives.secondaryButtonTextBase,
    color: theme.colors.textSecondary,
  },
};

export const commonDropdownStyles = {
  trigger: {
    backgroundColor: theme.colors.bgRaised,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 44,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
  },
  wrapper: {
    position: "relative",
    zIndex: 40,
  },
  text: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.regular,
    fontSize: 14,
  },
  chevronText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.semibold,
    fontSize: 12,
  },
  chevronIcon: {
    color: theme.colors.textSecondary,
  },
  list: {
    position: "absolute",
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.bgRaised,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 10,
    maxHeight: 220,
    zIndex: 30,
    elevation: 8,
  },
  listContent: {
    paddingVertical: 4,
  },
  searchInput: {
    backgroundColor: theme.colors.bgSurface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 8,
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    marginHorizontal: 8,
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionSelected: {
    backgroundColor: theme.colors.accentDim,
  },
  optionText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    fontSize: 13,
  },
  optionTextSelected: {
    color: theme.colors.accentText,
  },
  noResults: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
};

export const commonStatusStyles = {
  errorBanner: {
    color: theme.colors.dangerStrong,
    backgroundColor: theme.colors.dangerBg,
    borderColor: theme.colors.dangerBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: theme.fonts.regular,
    fontSize: 12,
  },
};

export const commonSearchStyles = {
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitLabel: {
    color: theme.colors.textLight,
    fontSize: 14,
    fontFamily: theme.fonts.semibold,
  },
  sectionLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 14,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontFamily: theme.fonts.semibold,
    marginBottom: 6,
  },
  resultPrimary: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: theme.fonts.semibold,
  },
  resultSecondary: {
    marginTop: 2,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: theme.fonts.regular,
  },
};
