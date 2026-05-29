import { Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import styles from "./SecondBrainMicrophoneButton.styles";

export default function SecondBrainMicrophoneButton({
  onPress,
  disabled = false,
  active = false,
  loading = false,
  idleIconName = "mic",
  activeIconName = "square",
  accessibilityLabel,
  containerStyle,
}) {
  const iconName = loading ? "loader" : active ? activeIconName : idleIconName;

  return (
    <View style={[styles.micWrap, containerStyle]}>
      <View style={styles.micGlowOuter} />
      <View style={styles.micGlowInner} />
      <Pressable
        style={[
          styles.micButton,
          active && styles.micButtonActive,
          disabled && styles.micButtonDisabled,
        ]}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <Feather name={iconName} size={44} style={styles.micIcon} />
      </Pressable>
    </View>
  );
}
