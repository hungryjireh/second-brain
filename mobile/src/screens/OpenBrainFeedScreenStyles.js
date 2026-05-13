import { StyleSheet } from 'react-native';
import { theme } from '../theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgSurface,
  },
  content: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 12,
  },
  floatingDraftButton: {
    position: 'absolute',
    right: 16,
    bottom: 84,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCardWrap: {
    width: '100%',
    maxWidth: 560,
    height: '82%',
    maxHeight: 760,
    paddingHorizontal: 12,
    alignSelf: 'center',
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 9,
    backgroundColor: theme.colors.bgBase,
  },
  tabActive: {
    borderColor: theme.colors.accentStrong,
    backgroundColor: theme.colors.bgRaised,
  },
  tabLabel: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.semibold,
    fontSize: 13,
  },
  tabLabelActive: {
    color: theme.colors.textPrimary,
  },
  statusState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingBottom: 130,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    marginBottom: 8,
  },
  sectionHeader: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.72,
    textTransform: 'uppercase',
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.borderStrong,
  },
  listEmpty: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    marginBottom: 12,
  },
  error: {
    color: theme.colors.danger,
    fontFamily: theme.fonts.regular,
    marginBottom: 12,
  },
});

export default styles;
