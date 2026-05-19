import { StyleSheet } from "react-native";
import { theme } from "../theme";
import {
  commonDropdownStyles,
  commonFormCompositions,
  commonFormPrimitives,
  commonStatusStyles,
} from "../styles/commonStyles";

const styles = StyleSheet.create({
  headerSection: {
    marginBottom: 2,
  },
  formScroll: {
    flex: 1,
  },
  formContentContainer: {
    paddingBottom: 120,
  },
  sectionCard: {
    backgroundColor: theme.colors.bgBase,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 10,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  sectionCardElevated: {
    zIndex: 100,
    elevation: 12,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.semibold,
    fontSize: 16,
    marginBottom: 2,
  },
  label: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.regular,
    fontSize: 13,
  },
  bioLabel: {
    marginTop: 8,
  },
  fieldHint: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    marginTop: -2,
  },
  input: {
    ...commonFormCompositions.raisedInput,
  },
  textArea: {
    minHeight: 96,
  },
  inputDisabled: {
    backgroundColor: theme.colors.bgBase,
    color: theme.colors.textMuted,
  },
  timezoneDropdown: {
    ...commonDropdownStyles.trigger,
  },
  timezoneDropdownWrapper: {
    ...commonDropdownStyles.wrapper,
  },
  timezoneDropdownText: {
    ...commonDropdownStyles.text,
  },
  timezoneDropdownChevron: {
    ...commonDropdownStyles.chevronText,
  },
  timezoneDropdownChevronIcon: {
    ...commonDropdownStyles.chevronIcon,
  },
  timezoneDropdownList: {
    ...commonDropdownStyles.list,
  },
  timezoneDropdownListContent: {
    ...commonDropdownStyles.listContent,
  },
  timezoneSearchInput: {
    ...commonDropdownStyles.searchInput,
  },
  timezoneDropdownOption: {
    ...commonDropdownStyles.option,
  },
  timezoneDropdownOptionSelected: {
    ...commonDropdownStyles.optionSelected,
  },
  timezoneDropdownOptionText: {
    ...commonDropdownStyles.optionText,
  },
  timezoneDropdownOptionTextSelected: {
    ...commonDropdownStyles.optionTextSelected,
  },
  timezoneNoResults: {
    ...commonDropdownStyles.noResults,
  },
  primaryButton: {
    ...commonFormCompositions.primaryAccentButton,
  },
  primaryButtonText: {
    ...commonFormCompositions.primaryAccentButtonText,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.bgHover,
  },
  buttonDisabledText: {
    color: theme.colors.textMuted,
  },
  secondaryButton: {
    ...commonFormCompositions.secondaryRaisedButton,
  },
  secondaryButtonText: {
    ...commonFormCompositions.secondaryRaisedButtonText,
  },
  uploadButton: {
    alignItems: "center",
    backgroundColor: theme.colors.bgRaised,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 2,
  },
  uploadButtonText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.semibold,
    fontSize: 13,
  },
  muted: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    fontSize: 14,
  },
  actionsRow: {
    ...commonFormPrimitives.actionsColumn,
  },
  confirmModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  confirmModalBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  confirmModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  confirmModalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.white15,
    backgroundColor: theme.colors.bgRaised,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 10,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  confirmModalTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.semibold,
    fontSize: 17,
    lineHeight: 22,
  },
  confirmModalBody: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  confirmModalActions: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  confirmModalButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.textSecondary,
    backgroundColor: theme.colors.white09,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  confirmModalButtonPrimary: {
    borderColor: theme.colors.textPrimary,
    backgroundColor: theme.colors.accentSoft,
  },
  confirmModalButtonText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    fontSize: 12,
  },
  confirmModalButtonTextPrimary: {
    color: theme.colors.textPrimary,
  },
  error: {
    ...commonStatusStyles.errorBanner,
  },
  success: {
    color: theme.colors.accent,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: theme.fonts.regular,
    fontSize: 12,
  },
});

export default styles;
