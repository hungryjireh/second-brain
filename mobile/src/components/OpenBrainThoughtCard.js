import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.bgSurface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  body: {
    color: theme.colors.textPrimary,
  },
  bodyLarge: {
    fontSize: 18,
    marginBottom: 8,
  },
  meta: {
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  date: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
});

export default function OpenBrainThoughtCard({
  text,
  topMeta,
  bottomMeta,
  date,
  onPress,
  largeBody = false,
}) {
  const Container = onPress ? Pressable : View;
  return (
    <Container style={styles.card} onPress={onPress}>
      {!!topMeta && <Text style={styles.meta}>{topMeta}</Text>}
      {!!date && <Text style={styles.date}>{date}</Text>}
      <Text style={[styles.body, largeBody && styles.bodyLarge]}>{text || ''}</Text>
      {!!bottomMeta && <Text style={styles.meta}>{bottomMeta}</Text>}
    </Container>
  );
}
