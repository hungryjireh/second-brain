import { StyleSheet } from 'react-native';
import { theme } from '../theme';
import { openBrainStyle } from '../constants/openbrainStyle';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgSurface,
  },
  composerWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 108,
  },
  inlineErrorWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  error: {
    color: theme.colors.danger,
    fontFamily: openBrainStyle.fontRegular,
    marginBottom: 6,
  },
});

export default styles;
