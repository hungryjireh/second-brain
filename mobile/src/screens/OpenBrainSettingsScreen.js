import { Pressable, Text, View } from 'react-native';
import OpenBrainSettingsLayout from '../components/OpenBrainSettingsLayout';
import styles from './OpenBrainSettingsScreen.styles';

export default function OpenBrainSettingsScreen({ token, navigation }) {
  return (
    <OpenBrainSettingsLayout
      token={token}
      navigation={navigation}
      title="Account settings"
      copy="Manage your profile and credentials."
      headerStyle={styles.headerSection}
    >
      <View style={styles.card}>
        <Pressable style={styles.navButton} onPress={() => navigation.navigate('UpdateOpenBrainProfile')}>
          <Text style={styles.navButtonText}>Update profile</Text>
          <Text style={styles.navButtonArrow}>{'>'}</Text>
        </Pressable>

        <Pressable style={styles.navButton} onPress={() => navigation.navigate('OpenBrainResetPassword')}>
          <Text style={styles.navButtonText}>Reset password</Text>
          <Text style={styles.navButtonArrow}>{'>'}</Text>
        </Pressable>
      </View>
    </OpenBrainSettingsLayout>
  );
}
