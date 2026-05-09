import { StyleSheet } from 'react-native';
import { theme } from '../theme';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bgBase, padding: 16 },
  headerCard: { backgroundColor: theme.colors.bgSurface, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  username: { color: theme.colors.textPrimary, fontSize: 22, fontWeight: '700' },
  streak: { color: theme.colors.textSecondary, marginTop: 4, marginBottom: 8 },
  followButton: { alignSelf: 'flex-start', backgroundColor: theme.colors.brand, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  followButtonText: { color: '#fff', fontWeight: '700' },
  muted: { color: theme.colors.textSecondary },
  error: { color: theme.colors.danger },
});

export default styles;
