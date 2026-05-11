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
    borderColor: theme.colors.brand,
    backgroundColor: theme.colors.brandDim,
  },
  draftIcon: {
    color: theme.colors.textPrimary,
    fontFamily: 'DMSans_600SemiBold',
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
    paddingHorizontal: 12,
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
    borderColor: theme.colors.brand,
    backgroundColor: theme.colors.bgRaised,
  },
  tabLabel: {
    color: theme.colors.textSecondary,
    fontFamily: 'DMSans_600SemiBold',
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
    fontFamily: 'DMSans_400Regular',
    marginBottom: 12,
  },
  error: {
    color: theme.colors.danger,
    fontFamily: 'DMSans_400Regular',
    marginBottom: 12,
  },
});

export default styles;
