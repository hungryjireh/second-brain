import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styles from './OpenBrainBottomNav.styles';

const BUTTONS = [
  { key: 'OpenBrainFeed', label: 'Home' },
  { key: 'OpenBrainProfile', label: 'Profile' },
  { key: 'UpdateOpenBrainProfile', label: 'Settings' },
];

export default function OpenBrainBottomNav({ navigation, currentRoute }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.row}>
        {BUTTONS.map(button => {
          const active = button.key === currentRoute;
          return (
            <Pressable
              key={button.key}
              style={[styles.button, active && styles.buttonActive]}
              onPress={() => navigation?.navigate(button.key)}
              accessibilityRole="button"
            >
              {active ? <View style={styles.activeDot} /> : null}
              <Text style={[styles.label, active && styles.labelActive]}>{button.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
