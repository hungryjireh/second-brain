import { Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import styles from "./SecondBrainBackButton.styles";

export default function SecondBrainBackButton({
  onPress,
  accessibilityLabel = "Back",
  style,
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.button, style]}
    >
      <View style={styles.inner}>
        <Feather name="arrow-left" size={20} style={styles.icon} />
      </View>
    </Pressable>
  );
}
