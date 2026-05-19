import { Pressable, Text, View } from "react-native";
import OpenBrainSettingsLayout from "../components/OpenBrainSettingsLayout";
import styles from "./OpenBrainSettingsScreen.styles";

export default function OpenBrainSettingsScreen({
  token,
  navigation,
  onLogout,
}) {
  return (
    <OpenBrainSettingsLayout
      token={token}
      navigation={navigation}
      showTopMenuBackButton={false}
      title="Account settings"
      copy="Manage your profile and credentials."
      headerStyle={styles.headerSection}
    >
      <View style={styles.card}>
        <Pressable
          style={styles.navButton}
          onPress={() => navigation.navigate("UpdateOpenBrainProfile")}
        >
          <Text style={styles.navButtonText}>Update profile</Text>
          <Text style={styles.navButtonArrow}>{">"}</Text>
        </Pressable>

        <Pressable
          style={styles.navButton}
          onPress={() => navigation.navigate("OpenBrainResetPassword")}
        >
          <Text style={styles.navButtonText}>Reset password</Text>
          <Text style={styles.navButtonArrow}>{">"}</Text>
        </Pressable>

        <Pressable
          style={[styles.navButton, styles.logoutButton]}
          onPress={onLogout}
          accessibilityRole="button"
          accessibilityLabel="Log out"
        >
          <Text style={[styles.navButtonText, styles.logoutButtonText]}>
            Log out
          </Text>
        </Pressable>
      </View>
    </OpenBrainSettingsLayout>
  );
}
