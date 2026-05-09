import { StyleSheet } from 'react-native';
import { theme } from '../theme';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bgBase, padding: 16 },
  heading: { color: theme.colors.textPrimary, fontSize: 24, fontWeight: '700', marginBottom: 10 },
  topActions: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  secondaryButton: { borderColor: theme.colors.border, borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10 },
  secondaryButtonText: { color: theme.colors.textSecondary },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tab: { flex: 1, alignItems: 'center', padding: 10, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8 },
  tabActive: { backgroundColor: theme.colors.bgSurface },
  tabText: { color: theme.colors.textPrimary },
  error: { color: theme.colors.danger, marginBottom: 6 },
});

export default styles;
