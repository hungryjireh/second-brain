import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

export default function OpenBrainTopMenu({ navigation }) {
  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.backButton}
        onPress={() => navigation.navigate('Apps')}
        accessibilityRole="button"
        accessibilityLabel="Back to Apps"
      >
        <Text style={styles.backLabel}>←</Text>
      </Pressable>
      <Text style={styles.logoText}>
        open<Text style={styles.logoAccent}>brain</Text>
      </Text>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 62,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.bgBase,
  },
  backButton: {
    minWidth: 72,
    paddingVertical: 6,
  },
  backLabel: {
    color: theme.colors.textSecondary,
    fontSize: 20,
    fontFamily: 'DMSans_600SemiBold',
  },
  logoText: {
    color: theme.colors.textPrimary,
    fontSize: 25,
    lineHeight: 30,
    letterSpacing: -0.3,
    fontFamily: 'DMSerifDisplay_400Regular',
  },
  logoAccent: {
    color: '#7ec8ff',
  },
  spacer: {
    minWidth: 72,
  },
});
