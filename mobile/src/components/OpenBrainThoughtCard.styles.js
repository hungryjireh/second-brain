import { StyleSheet } from 'react-native';
import { theme } from '../theme';
import { openBrainStyle } from '../theme';

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceDark,
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
    flexDirection: 'row',
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: theme.colors.textPrimary,
    fontFamily: openBrainStyle.fontSemiBold,
    fontSize: 20,
  },
  metaBlock: {
    flex: 1,
    gap: 4,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  metricGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    position: 'relative',
  },
  metricCount: {
    color: theme.colors.textWarm78,
    fontFamily: openBrainStyle.fontSemiBold,
    fontSize: 14,
  },
  metricIconHoverTarget: {
    paddingVertical: 2,
    paddingHorizontal: 1,
  },
  username: {
    color: theme.colors.textPrimary,
    fontFamily: openBrainStyle.fontSemiBold,
    fontSize: 17,
    lineHeight: 20,
  },
  metaDot: {
    color: theme.colors.textWarm50,
    fontFamily: openBrainStyle.fontRegular,
  },
  streak: {
    color: theme.colors.textWarm78,
    fontFamily: openBrainStyle.fontSemiBold,
    fontSize: 14,
  },
  time: {
    color: theme.colors.textWarm50,
    fontFamily: openBrainStyle.fontRegular,
    fontSize: 12,
  },
  body: {
    color: theme.colors.textWarm,
    fontFamily: openBrainStyle.fontSerif,
    fontSize: 18,
    lineHeight: 30,
  },
  bodyFeed: {
    fontFamily: openBrainStyle.fontRegular,
    fontSize: 16,
    lineHeight: 23,
  },
  bodyLarge: {
    fontSize: 24,
    lineHeight: 40,
  },
  thoughtBlocks: {
    gap: 10,
  },
  thoughtTitle: {
    color: theme.colors.textWarm,
    fontFamily: openBrainStyle.fontSerif,
    fontSize: 34,
    lineHeight: 40,
    marginBottom: 12,
  },
  thoughtTitleFeed: {
    fontSize: 36,
    lineHeight: 42,
  },
  quoteBlock: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
    paddingLeft: 10,
  },
  quoteText: {
    fontStyle: 'italic',
    color: theme.colors.textWarm82,
  },
  meta: {
    color: theme.colors.textSecondary,
    fontFamily: openBrainStyle.fontRegular,
    marginBottom: 6,
  },
  date: {
    color: theme.colors.textSecondary,
    fontFamily: openBrainStyle.fontRegular,
    fontSize: 12,
    marginBottom: 6,
  },
  followButton: {
    borderColor: 'transparent',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    position: 'relative',
  },
  followButtonActive: {
    backgroundColor: theme.colors.white09,
  },
  followButtonFollowing: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accentBorder,
  },
  followButtonText: {
    color: theme.colors.textWarm80,
    fontFamily: openBrainStyle.fontRegular,
    fontSize: 12,
  },
  followButtonTextFollowing: {
    color: theme.colors.accentText,
  },
  reactions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 20,
  },
  actionsGroup: {
    marginLeft: 'auto',
    flexDirection: 'row',
    gap: 10,
  },
  actionsBlock: {
    marginLeft: 'auto',
    alignItems: 'flex-end',
    gap: 8,
  },
  reactionChip: {
    borderRadius: 999,
    backgroundColor: theme.colors.white09,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  reactionChipActive: {
    backgroundColor: theme.colors.white22,
  },
  reactionText: {
    color: theme.colors.textWarm66,
    fontFamily: openBrainStyle.fontRegular,
    fontSize: 12,
  },
  reactionTextActive: {
    color: theme.colors.textLight,
  },
  shareButton: {
    borderRadius: 999,
    backgroundColor: theme.colors.white09,
    paddingHorizontal: 12,
    paddingVertical: 7,
    position: 'relative',
  },
  secondaryActionButton: {
    borderRadius: 999,
    backgroundColor: theme.colors.white09,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 7,
    position: 'relative',
  },
  secondaryActionButtonAdded: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accentBorder,
  },
  secondaryActionButtonText: {
    color: theme.colors.textWarm80,
    fontFamily: openBrainStyle.fontRegular,
    fontSize: 12,
  },
  secondaryActionButtonTextAdded: {
    color: theme.colors.accentText,
  },
  secondaryActionResponse: {
    color: theme.colors.textWarm72,
    fontFamily: openBrainStyle.fontRegular,
    fontSize: 12,
    lineHeight: 16,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shareButtonText: {
    color: theme.colors.textWarm80,
    fontFamily: openBrainStyle.fontRegular,
    fontSize: 12,
  },
  actionTooltip: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    marginBottom: 8,
    backgroundColor: theme.colors.surfaceOverlay,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: theme.colors.white15,
    zIndex: 20,
  },
  actionTooltipText: {
    color: theme.colors.textLight,
    fontFamily: openBrainStyle.fontRegular,
    fontSize: 12,
    lineHeight: 14,
  },
  metricTooltip: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    marginBottom: 8,
    backgroundColor: theme.colors.surfaceOverlay,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: theme.colors.white15,
    zIndex: 20,
  },
});

export default styles;
