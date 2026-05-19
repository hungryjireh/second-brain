import { View } from "react-native";
import styles from "../screens/SecondBrainScreen.styles";

export default function SecondBrainEntryPageLayout({
  panelStyle,
  children,
}) {
  return (
    <View style={styles.container}>
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
