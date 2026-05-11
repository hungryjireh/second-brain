import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import LoginScreen from './src/screens/LoginScreen';
import AppPickerScreen from './src/screens/AppPickerScreen';
import SecondBrainScreen from './src/screens/SecondBrainScreen';
import OpenBrainScreen from './src/screens/OpenBrainScreen';
import OpenBrainFeedScreen from './src/screens/OpenBrainFeedScreen';
import CreateProfileScreen from './src/screens/CreateProfileScreen';
import OpenBrainProfileScreen from './src/screens/OpenBrainProfileScreen';
import UpdateProfileScreen from './src/screens/UpdateProfileScreen';
import SharedThoughtScreen from './src/screens/SharedThoughtScreen';
import { clearToken, getToken, setAuthExpiredHandler } from './src/api';
import { theme } from './src/theme';

const Stack = createNativeStackNavigator();

function HeaderBrand() {
  return (
    <Text style={styles.headerBrandText}>
      second<Text style={styles.headerBrandAccent}>brain</Text>
    </Text>
  );
}

function HeaderLiveStatus() {
  const dateLabel = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Text style={styles.headerLiveText}>
      {dateLabel} <Text style={styles.headerLiveDot}>●</Text> live
    </Text>
  );
}

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.bgBase,
    card: theme.colors.bgBase,
    text: theme.colors.textPrimary,
    border: theme.colors.border,
  },
};

export default function App() {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fontsLoaded] = useFonts({
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_600SemiBold,
    DMSerifDisplay_400Regular,
  });

  useEffect(() => {
    (async () => {
      const stored = await getToken();
      setToken(stored || null);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    setAuthExpiredHandler(async () => {
      await clearToken();
      setToken(null);
    });

    return () => setAuthExpiredHandler(null);
  }, []);

  async function logout() {
    await clearToken();
    setToken(null);
  }

  if (loading || !fontsLoaded) return <ActivityIndicator style={{ flex: 1 }} color={theme.colors.brand} />;

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator>
          {!token ? (
            <Stack.Screen name="Login" options={{ headerShown: false }}>
              {() => <LoginScreen onLoggedIn={setToken} />}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen
                name="OpenBrainFeed"
                options={{
                  headerShown: false,
                }}
              >
                {props => <OpenBrainFeedScreen {...props} token={token} />}
              </Stack.Screen>
              <Stack.Screen name="OpenBrain" options={{ headerShown: false }}>
                {props => <OpenBrainScreen {...props} token={token} />}
              </Stack.Screen>
              <Stack.Screen
                name="Apps"
                options={{
                  headerShown: false,
                }}
              >
                {props => <AppPickerScreen {...props} token={token} />}
              </Stack.Screen>
              <Stack.Screen
                name="SecondBrain"
                options={{
                  headerTitle: () => <HeaderBrand />,
                  headerTitleAlign: 'left',
                  headerRight: () => <HeaderLiveStatus />,
                  headerStyle: { backgroundColor: theme.colors.bgBase },
                  headerShadowVisible: false,
                }}
              >
                {() => <SecondBrainScreen token={token} />}
              </Stack.Screen>
              <Stack.Screen name="CreateOpenBrainProfile" options={{ headerShown: false }}>
                {props => <CreateProfileScreen {...props} token={token} />}
              </Stack.Screen>
              <Stack.Screen name="OpenBrainProfile" options={{ headerShown: false }}>
                {props => <OpenBrainProfileScreen {...props} token={token} />}
              </Stack.Screen>
              <Stack.Screen name="UpdateOpenBrainProfile" options={{ headerShown: false }}>
                {props => <UpdateProfileScreen {...props} token={token} />}
              </Stack.Screen>
              <Stack.Screen name="SharedThought" component={SharedThoughtScreen} options={{ headerShown: false }} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  headerBrandText: {
    color: theme.colors.textPrimary,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.5,
    fontFamily: 'DMSans_600SemiBold',
  },
  headerBrandAccent: {
    color: theme.colors.brand,
  },
  headerLiveText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'DMSans_300Light',
    paddingRight: 12,
  },
  headerLiveDot: {
    color: theme.colors.brand,
    fontSize: 12,
  },
});
