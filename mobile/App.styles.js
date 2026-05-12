import { StyleSheet } from 'react-native';
import { openBrainStyle } from './constants/openbrainStyle';
import { theme } from './theme';

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: theme.colors.bgBase,
  },
  loadingIndicator: {
    flex: 1,
  },
  headerBrandText: {
    color: theme.colors.textPrimary,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.5,
    fontFamily: openBrainStyle.fontSemiBold,
  },
  headerBrandAccent: {
    color: theme.colors.brand,
  },
  headerLiveText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: openBrainStyle.fontRegular,
    paddingRight: 12,
  },
  headerLiveDot: {
    color: theme.colors.brand,
    fontSize: 12,
  },
});

export default styles;
