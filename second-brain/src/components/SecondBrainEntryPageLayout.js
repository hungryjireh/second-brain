import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import styles from "../screens/SecondBrainScreen.styles";

function defaultOnBackPress(navigation) {
  if (navigation?.canGoBack?.()) {
    navigation.goBack();
    return;
  }
  navigation?.navigate?.("SecondBrain");
}

export default function SecondBrainEntryPageLayout({
  navigation,
  submenuLabel,
  backLabel = "Back to Second Brain",
  panelStyle,
  children,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.entryDetailsSubmenuHeader}>
        <Pressable
          style={styles.entryDetailsSubmenuBackButton}
          onPress={() => defaultOnBackPress(navigation)}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
        >
          <Feather
            name="arrow-left"
            size={18}
            style={styles.entryDetailsSubmenuBackIcon}
          />
        </Pressable>
        <Text style={styles.entryDetailsSubmenuLabel}>{submenuLabel}</Text>
      </View>
      <View
        style={[
          styles.entryPanel,
          { maxWidth: "100%", maxHeight: "100%", flex: 1 },
          panelStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}
