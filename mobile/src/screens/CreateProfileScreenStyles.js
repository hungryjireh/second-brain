import { StyleSheet } from 'react-native';
import { theme } from '../theme';
import { openBrainStyle } from '../constants/openbrainStyle';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bgBase },
  content: { flex: 1, padding: 16, justifyContent: 'center', gap: 10 },
  title: { color: theme.colors.textPrimary, fontSize: 24, lineHeight: 30, fontFamily: openBrainStyle.fontSerif, marginBottom: 6 },
  input: { backgroundColor: theme.colors.bgSurface, color: theme.colors.textPrimary, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, padding: 12, fontSize: 14, fontFamily: openBrainStyle.fontRegular },
  button: { backgroundColor: openBrainStyle.accentStrong, borderRadius: 10, alignItems: 'center', padding: 12, marginTop: 6 },
  buttonText: { color: openBrainStyle.accentOnSolid, fontFamily: openBrainStyle.fontSemiBold, fontSize: 14 },
  error: { color: theme.colors.danger },
});

export default styles;
