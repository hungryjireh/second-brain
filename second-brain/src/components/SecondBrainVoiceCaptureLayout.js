import { Text, View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import styles from "./SecondBrainVoiceCaptureLayout.styles";

export default function SecondBrainVoiceCaptureLayout({
  insetsTop = 0,
  screenTitle,
  heading,
  description,
  onBackPress,
  children,
  bodyStyle,
  headingStyle,
  descriptionStyle,
}) {
  return (
    <View style={styles.container}>
      <View style={[styles.topRow, { marginTop: Math.max(insetsTop, 8) + 4 }]}>
        <Pressable
          style={styles.backButton}
          onPress={onBackPress}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Feather name="chevron-left" size={28} style={styles.backIcon} />
        </Pressable>
        <Text style={styles.title}>{screenTitle}</Text>
      </View>

      <View style={[styles.body, bodyStyle]}>
        {heading ? (
          <Text style={[styles.heading, headingStyle]}>{heading}</Text>
        ) : null}
        {description ? (
          <Text style={[styles.subtitle, descriptionStyle]}>{description}</Text>
        ) : null}
        {children}
      </View>
    </View>
  );
}
