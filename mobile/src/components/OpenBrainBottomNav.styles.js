import { StyleSheet } from 'react-native';
import { theme } from '../theme';

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 0,
    backgroundColor: theme.colors.bgSurface,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
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
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  buttonActive: {
    backgroundColor: theme.colors.bgRaised,
    borderColor: theme.colors.borderStrong,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 3,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.brandText,
  },
  label: {
    color: theme.colors.textSecondary,
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
  },
  labelActive: {
    color: theme.colors.textPrimary,
    letterSpacing: 0.2,
  },
});

export default styles;
