import { StyleSheet } from 'react-native';
import { theme } from '../theme';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bgBase },
  content: { flex: 1, padding: 16, gap: 10 },
  thoughtViewport: { flex: 1, minHeight: 0 },
  thoughtScroll: { flex: 1 },
  thoughtScrollContent: { paddingBottom: 8 },
  error: { color: theme.colors.danger },
});

export default styles;
