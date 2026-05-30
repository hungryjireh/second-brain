import { Switch, Text, View } from "react-native";
import styles from "./SecondBrainSaveAsNoteToggle.styles";

export default function SecondBrainSaveAsNoteToggle({
  value,
  onValueChange,
  style,
}) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>Save as Note</Text>
      <Switch
        value={Boolean(value)}
        onValueChange={onValueChange}
        accessibilityRole="switch"
        accessibilityLabel="Save as Note"
      />
    </View>
  );
}
