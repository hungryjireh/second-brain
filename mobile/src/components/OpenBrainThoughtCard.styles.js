import { StyleSheet } from 'react-native';
import { theme } from '../theme';

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#070809',
    borderColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 20,
    marginBottom: 14,
    shadowColor: '#000',
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
    fontFamily: 'DMSans_600SemiBold',
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
    color: 'rgba(244,242,239,0.78)',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
  },
  metricIconHoverTarget: {
    paddingVertical: 2,
    paddingHorizontal: 1,
  },
  username: {
    color: theme.colors.textPrimary,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 17,
    lineHeight: 20,
  },
  metaDot: {
    color: 'rgba(244,242,239,0.5)',
    fontFamily: 'DMSans_400Regular',
  },
  streak: {
    color: 'rgba(244,242,239,0.78)',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
  },
  time: {
    color: 'rgba(244,242,239,0.5)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
  },
  body: {
    color: '#ede9e3',
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 18,
    lineHeight: 30,
  },
  bodyFeed: {
    fontFamily: 'DMSans_400Regular',
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
    color: '#ede9e3',
    fontFamily: 'DMSerifDisplay_400Regular',
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
    borderLeftColor: '#1d9e75',
    paddingLeft: 10,
  },
  quoteText: {
    fontStyle: 'italic',
    color: 'rgba(237,233,227,0.82)',
  },
  meta: {
    color: theme.colors.textSecondary,
    fontFamily: 'DMSans_400Regular',
    marginBottom: 6,
  },
  date: {
    color: theme.colors.textSecondary,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    marginBottom: 6,
  },
  followButton: {
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  followButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  followButtonFollowing: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  followButtonText: {
    color: '#f5f3ef',
    fontFamily: 'DMSans_400Regular',
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
    backgroundColor: 'rgba(255,255,255,0.09)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  reactionChipActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  reactionText: {
    color: 'rgba(243,241,236,0.66)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
  },
  reactionTextActive: {
    color: '#f5f3ef',
  },
  shareButton: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.09)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    position: 'relative',
  },
  secondaryActionButton: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 7,
    position: 'relative',
  },
  secondaryActionButtonAdded: {
    backgroundColor: 'rgba(29,158,117,0.22)',
    borderColor: 'rgba(29,158,117,0.7)',
  },
  secondaryActionButtonText: {
    color: 'rgba(243,241,236,0.8)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
  },
  secondaryActionButtonTextAdded: {
    color: '#8ef1cf',
  },
  secondaryActionResponse: {
    color: 'rgba(243,241,236,0.72)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shareButtonText: {
    color: 'rgba(243,241,236,0.8)',
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
  },
  actionTooltip: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    marginBottom: 8,
    backgroundColor: '#111',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    zIndex: 20,
  },
  actionTooltipText: {
    color: '#f5f3ef',
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    lineHeight: 14,
  },
  metricTooltip: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    marginBottom: 8,
    backgroundColor: '#111',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    zIndex: 20,
  },
});

export default styles;
