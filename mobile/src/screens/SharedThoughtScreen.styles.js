import { StyleSheet } from 'react-native';
import { theme } from '../theme';
import { openBrainStyle } from '../constants/openbrainStyle';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bgBase },
  content: { flex: 1, padding: 16, gap: 10 },
  title: { color: theme.colors.textPrimary, fontSize: 24, lineHeight: 30, fontFamily: openBrainStyle.fontSerif },
  error: { color: theme.colors.danger },
});

export default styles;
