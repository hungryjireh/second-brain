import { StyleSheet } from "react-native";
import { theme } from "../theme";
import { commonFollowStyles } from "../styles/commonStyles";

const absoluteFill = {
  ...StyleSheet.absoluteFillObject,
};

const pillActionButton = {
  borderRadius: 999,
  backgroundColor: theme.colors.white09,
  borderWidth: 1,
  borderColor: theme.colors.textSecondary,
  paddingHorizontal: 12,
  paddingVertical: 7,
  position: "relative",
};

const secondaryMetaButtonText = {
  color: theme.colors.textSecondary,
  fontFamily: theme.fonts.regular,
  fontSize: 12,
};

const hoverTooltip = {
  position: "absolute",
  bottom: "100%",
  left: 0,
  marginBottom: 8,
  backgroundColor: theme.colors.surfaceOverlay,
  borderRadius: 8,
  paddingHorizontal: 8,
  paddingVertical: 5,
  borderWidth: 1,
  borderColor: theme.colors.white15,
  zIndex: 20,
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.bgRaised,
    borderColor: theme.colors.white03,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 20,
    marginBottom: 14,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.semibold,
    fontSize: 20,
  },
  metaBlock: {
    flex: 1,
    gap: 4,
  },
  metaLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  metricGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metricInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    position: "relative",
  },
  metricCount: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.semibold,
    fontSize: 14,
  },
  metricIconHoverTarget: {
    paddingVertical: 2,
    paddingHorizontal: 1,
  },
  username: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.semibold,
    fontSize: 17,
    lineHeight: 20,
  },
  metaDot: {
    color: theme.colors.textWarm50,
    fontFamily: theme.fonts.regular,
  },
  streak: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.semibold,
    fontSize: 14,
  },
  time: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    fontSize: 12,
  },
  body: {
    color: theme.colors.textWarm,
    fontFamily: theme.fonts.serif,
    fontSize: 18,
    lineHeight: 30,
  },
  bodyFeed: {
    fontFamily: theme.fonts.regular,
    fontSize: 16,
    lineHeight: 23,
    color: theme.colors.textSecondary,
  },
  bodyLarge: {
    fontSize: 24,
    lineHeight: 40,
  },
  thoughtBlocks: {
    gap: 10,
  },
  markdownBody: {
    gap: 8,
  },
  markdownParagraph: {
    color: theme.colors.textWarm,
    fontFamily: theme.fonts.serif,
    fontSize: 18,
    lineHeight: 30,
    flexShrink: 1,
  },
  markdownParagraphFeed: {
    fontFamily: theme.fonts.regular,
    fontSize: 16,
    lineHeight: 23,
    color: theme.colors.textSecondary,
  },
  markdownParagraphLarge: {
    fontSize: 24,
    lineHeight: 40,
  },
  markdownHeading: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 24,
    lineHeight: 32,
  },
  markdownHeadingFeed: {
    fontSize: 22,
    lineHeight: 30,
  },
  markdownHeadingSmallScreen: {
    fontSize: 20,
    lineHeight: 28,
  },
  markdownBold: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.semibold,
  },
  markdownUnderline: {
    color: theme.colors.textWarm,
    textDecorationLine: "underline",
  },
  markdownItalic: {
    color: theme.colors.textWarm,
    fontStyle: "italic",
  },
  markdownCode: {
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.white09,
  },
  markdownLink: {
    color: theme.colors.accent,
    textDecorationLine: "underline",
  },
  markdownCodeBlock: {
    borderRadius: 8,
    backgroundColor: theme.colors.white09,
    padding: 10,
    minWidth: 0,
  },
  markdownCodeScrollContent: {
    minWidth: "100%",
  },
  markdownCodeBlockText: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: theme.fonts.mono,
    flexShrink: 1,
  },
  markdownList: {
    gap: 4,
  },
  markdownListItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  markdownListBullet: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    minWidth: 14,
  },
  markdownQuote: {
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.accent,
    paddingLeft: 10,
  },
  markdownQuoteText: {
    color: theme.colors.textSecondary,
  },
  markdownTableWrap: {
    marginVertical: 2,
  },
  markdownTable: {
    borderWidth: 1,
    borderColor: theme.colors.white15,
    borderRadius: 8,
    overflow: "hidden",
  },
  markdownTableRow: {
    flexDirection: "row",
  },
  markdownTableHeaderRow: {
    backgroundColor: theme.colors.white03,
  },
  markdownTableCell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.white15,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 92,
    flexShrink: 1,
  },
  markdownTableHeaderCell: {
    backgroundColor: theme.colors.white03,
  },
  markdownTableHeaderText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.semibold,
  },
  markdownTableText: {
    color: theme.colors.textSecondary,
  },
  thoughtTitle: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 34,
    lineHeight: 40,
    marginBottom: 12,
  },
  thoughtTitleFeed: {
    fontSize: 36,
    lineHeight: 42,
  },
  thoughtTitleFeedCompact: {
    fontSize: 28,
    lineHeight: 34,
  },
  quoteBlock: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
    paddingLeft: 10,
  },
  quoteText: {
    fontStyle: "italic",
    color: theme.colors.textSecondary,
  },
  meta: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    marginBottom: 6,
  },
  standaloneAuthorRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginBottom: 4,
  },
  standaloneAuthorPrefix: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  standaloneAuthor: {
    color: theme.colors.accent,
    fontFamily: theme.fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
  },
  date: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    marginBottom: 6,
  },
  dateActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  followButton: {
    ...commonFollowStyles.buttonBase,
    position: "relative",
  },
  followButtonActive: {
    ...commonFollowStyles.buttonActive,
  },
  followButtonFollowing: {
    ...commonFollowStyles.buttonFollowing,
  },
  followButtonText: {
    ...commonFollowStyles.textBase,
  },
  followButtonTextFollowing: {
    ...commonFollowStyles.textFollowing,
  },
  reactions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 20,
  },
  reactionsCompact: {
    flexWrap: "nowrap",
    gap: 6,
    alignItems: "center",
    width: "100%",
  },
  actionsGroup: {
    marginLeft: "auto",
    flexDirection: "row",
    gap: 10,
  },
  actionsBlock: {
    marginLeft: "auto",
    alignItems: "flex-end",
    gap: 8,
  },
  actionsBlockCompact: {
    gap: 0,
  },
  mobileActionDrawerWrap: { position: "relative", alignItems: "flex-end" },
  mobileActionTrigger: {
    borderWidth: 0,
    borderRadius: 8,
    minWidth: 28,
    minHeight: 26,
    paddingHorizontal: 6,
    paddingVertical: 3,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.white09,
  },
  mobileActionTriggerText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.semibold,
    fontSize: 14,
    lineHeight: 16,
  },
  mobileActionTriggerIcon: {
    color: theme.colors.textSecondary,
  },
  mobileActionDrawer: {
    position: "absolute",
    zIndex: 3,
    minWidth: 170,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.white15,
    backgroundColor: theme.colors.bgRaised,
    paddingVertical: 4,
  },
  mobileActionDrawerPortal: {
    zIndex: 90,
    elevation: 90,
  },
  mobileActionDrawerBackdrop: {
    flex: 1,
  },
  confirmModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  confirmModalBlur: {
    ...absoluteFill,
  },
  confirmModalBackdrop: {
    ...absoluteFill,
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
  mobileActionDrawerItem: {
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  mobileActionDrawerText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.regular,
    fontSize: 12,
  },
  reactionChip: {
    borderRadius: 999,
    backgroundColor: theme.colors.white09,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: theme.colors.textSecondary,
  },
  reactionChipCompact: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  reactionChipActive: {
    backgroundColor: theme.colors.white22,
    borderWidth: 1,
    borderColor: theme.colors.textPrimary,
  },
  reactionText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    fontSize: 12,
  },
  reactionTextCompact: {
    fontSize: 10,
    lineHeight: 13,
    textAlign: "center",
  },
  reactionTextActive: {
    color: theme.colors.textPrimary,
  },
  shareButton: {
    ...pillActionButton,
  },
  secondaryActionButton: {
    ...pillActionButton,
  },
  secondaryActionButtonAdded: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.textPrimary,
  },
  secondaryActionButtonText: {
    ...secondaryMetaButtonText,
  },
  secondaryActionButtonTextAdded: {
    color: theme.colors.textPrimary,
  },
  secondaryActionResponse: {
    color: theme.colors.textWarm72,
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  actionButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  shareButtonText: {
    ...secondaryMetaButtonText,
  },
  actionTooltip: {
    ...hoverTooltip,
  },
  actionTooltipText: {
    color: theme.colors.textLight,
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    lineHeight: 14,
  },
  metricTooltip: {
    ...hoverTooltip,
  },
});

export default styles;
