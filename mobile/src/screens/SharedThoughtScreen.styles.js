import { StyleSheet } from 'react-native';
import { theme } from '../theme';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bgBase, padding: 16, gap: 10 },
  title: { color: theme.colors.textPrimary, fontSize: 24, fontWeight: '700' },
  error: { color: theme.colors.danger },
});

export default styles;
