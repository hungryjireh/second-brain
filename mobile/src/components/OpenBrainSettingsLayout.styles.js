import { StyleSheet } from 'react-native';
import { theme } from '../theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgBase,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    gap: 10,
    marginBottom: 12,
  },
  title: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.serif,
    fontSize: 34,
    lineHeight: 38,
  },
  copy: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
    fontSize: 13,
  },
});

export default styles;
