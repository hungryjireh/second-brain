import { StyleSheet } from 'react-native';
import { theme } from '../theme';
import { openBrainStyle } from '../constants/openbrainStyle';

const styles = StyleSheet.create({
  card: {
    backgroundColor: openBrainStyle.surfaceDark,
    borderColor: openBrainStyle.white03,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 20,
    marginBottom: 14,
    shadowColor: openBrainStyle.shadow,
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
    color: openBrainStyle.textWarm78,
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
    color: openBrainStyle.textWarm50,
    fontFamily: openBrainStyle.fontRegular,
  },
  streak: {
    color: openBrainStyle.textWarm78,
    fontFamily: openBrainStyle.fontSemiBold,
    fontSize: 14,
  },
  time: {
    color: openBrainStyle.textWarm50,
    fontFamily: openBrainStyle.fontRegular,
    fontSize: 12,
  },
  body: {
    color: openBrainStyle.textWarm,
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
    color: openBrainStyle.textWarm,
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
    borderLeftColor: openBrainStyle.accent,
    paddingLeft: 10,
  },
  quoteText: {
    fontStyle: 'italic',
    color: openBrainStyle.textWarm82,
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
    borderColor: openBrainStyle.white20,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  followButtonActive: {
    backgroundColor: openBrainStyle.white20,
  },
  followButtonFollowing: {
    backgroundColor: openBrainStyle.white08,
  },
  followButtonText: {
    color: openBrainStyle.textLight,
    fontFamily: openBrainStyle.fontRegular,
    fontSize: 12,
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
    backgroundColor: openBrainStyle.white09,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  reactionChipActive: {
    backgroundColor: openBrainStyle.white22,
  },
  reactionText: {
    color: openBrainStyle.textWarm66,
    fontFamily: openBrainStyle.fontRegular,
    fontSize: 12,
  },
  reactionTextActive: {
    color: openBrainStyle.textLight,
  },
  shareButton: {
    borderRadius: 999,
    backgroundColor: openBrainStyle.white09,
    paddingHorizontal: 12,
    paddingVertical: 7,
    position: 'relative',
  },
  secondaryActionButton: {
    borderRadius: 999,
    backgroundColor: openBrainStyle.white09,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 7,
    position: 'relative',
  },
  secondaryActionButtonAdded: {
    backgroundColor: openBrainStyle.accentSoft,
    borderColor: openBrainStyle.accentBorder,
  },
  secondaryActionButtonText: {
    color: openBrainStyle.textWarm80,
    fontFamily: openBrainStyle.fontRegular,
    fontSize: 12,
  },
  secondaryActionButtonTextAdded: {
    color: openBrainStyle.accentText,
  },
  secondaryActionResponse: {
    color: openBrainStyle.textWarm72,
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
    color: openBrainStyle.textWarm80,
    fontFamily: openBrainStyle.fontRegular,
    fontSize: 12,
  },
  actionTooltip: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    marginBottom: 8,
    backgroundColor: openBrainStyle.surfaceOverlay,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: openBrainStyle.white15,
    zIndex: 20,
  },
  actionTooltipText: {
    color: openBrainStyle.textLight,
    fontFamily: openBrainStyle.fontRegular,
    fontSize: 12,
    lineHeight: 14,
  },
  metricTooltip: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    marginBottom: 8,
    backgroundColor: openBrainStyle.surfaceOverlay,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: openBrainStyle.white15,
    zIndex: 20,
  },
});

export default styles;
