import { StyleSheet } from 'react-native';
import { theme } from '../theme';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bgBase, padding: 16, gap: 10 },
  title: { color: theme.colors.textPrimary, fontSize: 24, fontWeight: '700' },
  input: { backgroundColor: theme.colors.bgSurface, color: theme.colors.textPrimary, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, padding: 12 },
  button: { backgroundColor: theme.colors.brand, borderRadius: 10, alignItems: 'center', padding: 12 },
  buttonText: { color: theme.colors.textPrimary, fontWeight: '700' },
  error: { color: theme.colors.danger },
  card: { backgroundColor: theme.colors.bgSurface, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 6 },
  body: { color: theme.colors.textPrimary, fontSize: 18, marginBottom: 8 },
  meta: { color: theme.colors.textSecondary },
});

export default styles;
