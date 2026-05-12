import { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { apiRequest } from '../api';
import { CACHE_TTL_MS } from '../constants/cache';
import styles from './AppPickerScreenStyles';

function AppLogo({ name }) {
  if (name === 'second-brain') {
    return (
      <Text style={styles.logoText}>
        second<Text style={styles.logoBrand}>brain</Text>
      </Text>
    );
  }

  return (
    <Text style={styles.logoText}>
      open<Text style={styles.logoBlue}>brain</Text>
    </Text>
  );
}

export default function AppPickerScreen({ navigation, token }) {
  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      try {
        await apiRequest('/settings', { token, cache: { ttlMs: CACHE_TTL_MS.SETTINGS } });
      } catch {
        // Expired/invalid auth is handled globally by apiRequest via authExpiredHandler.
        if (cancelled) return;
      }
    }

    verifySession();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.kicker}>Choose app</Text>
        <Text style={styles.title}>Where do you want to go?</Text>
        <Pressable style={styles.card} onPress={() => navigation.navigate('SecondBrain')}>
          <AppLogo name="second-brain" />
        </Pressable>
        <Pressable style={styles.card} onPress={() => navigation.navigate('OpenBrainFeed')}>
          <AppLogo name="open-brain" />
        </Pressable>
      </View>
    </View>
  );
}
