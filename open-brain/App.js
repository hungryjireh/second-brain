import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import {
  NavigationContainer,
  DefaultTheme,
  getStateFromPath as getStateFromPathDefault,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import LoginScreen from "./src/screens/LoginScreen";
import OpenBrainScreen from "./src/screens/OpenBrainScreen";
import OpenBrainFeedScreen from "./src/screens/OpenBrainFeedScreen";
import CreateProfileScreen from "./src/screens/CreateProfileScreen";
import OpenBrainProfileScreen from "./src/screens/OpenBrainProfileScreen";
import UpdateProfileScreen from "./src/screens/UpdateProfileScreen";
import OpenBrainSettingsScreen from "./src/screens/OpenBrainSettingsScreen";
import ResetPasswordScreen from "./src/screens/ResetPasswordScreen";
import OpenBrainUserSearchScreen from "./src/screens/OpenBrainUserSearchScreen";
import OpenBrainSearchScreen from "./src/screens/OpenBrainSearchScreen";
import SharedThoughtScreen from "./src/screens/SharedThoughtScreen";
import { clearToken, getToken, setAuthExpiredHandler } from "./src/api";
import { theme } from "./src/theme";
import { shouldApplyIOSInputZoomFix } from "./src/utils/responsive";
import styles from "./App.styles";

const Stack = createNativeStackNavigator();

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
  const [fontsLoaded] = useFonts(theme.fonts.loadMap);
  const isAuthenticated = Boolean(token);

  const linking = useMemo(
    () => ({
      config: {
        screens: {
          Login: "login",
          OpenBrainFeed: "open-brain",
          OpenBrain: "open-brain/write",
          CreateOpenBrainProfile: "open-brain/create-profile",
          OpenBrainProfile: {
            path: "open-brain/profile/:username?",
          },
          UpdateOpenBrainProfile: "open-brain/update-profile",
          OpenBrainSettings: "open-brain/settings",
          OpenBrainResetPassword: "open-brain/settings/reset-password",
          OpenBrainUserSearch: "open-brain/user-search",
          OpenBrainSearch: "open-brain/search",
          SharedThought: "shared-thought/:slug",
        },
      },
      getStateFromPath(path, options) {
        const rawPath = String(path || "");
        const defaultPath = isAuthenticated ? "/open-brain" : "/login";
        const normalizedPath = (
          rawPath === "" || rawPath === "/" ? defaultPath : rawPath
        )
          .replace(/^\/?open-brain\/u\//, "/open-brain/profile/")
          .replace(
            /^\/apps(?:\/|$)/,
            isAuthenticated ? "/open-brain" : "/login",
          );
        return getStateFromPathDefault(normalizedPath, options);
      },
    }),
    [isAuthenticated],
  );

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

  useEffect(() => {
    if (typeof document === "undefined" || typeof navigator === "undefined") {
      return undefined;
    }

    if (!shouldApplyIOSInputZoomFix(Platform.OS, navigator.userAgent)) {
      return undefined;
    }

    const styleId = "ios-input-zoom-fix";
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = styleId;
      styleTag.textContent =
        "input, textarea, select { font-size: 16px !important; }";
      document.head.appendChild(styleTag);
    }

    return () => {
      if (styleTag && styleTag.parentNode) {
        styleTag.parentNode.removeChild(styleTag);
      }
    };
  }, []);

  if (loading || !fontsLoaded)
    return (
      <ActivityIndicator
        style={styles.loadingIndicator}
        color={theme.colors.brand}
      />
    );

  const initialRouteName =
    Platform.OS === "web" ? "Login" : token ? "OpenBrainFeed" : "Login";

  return (
    <SafeAreaProvider>
      <View style={styles.appRoot}>
        <NavigationContainer theme={navTheme} linking={linking}>
          <Stack.Navigator
            initialRouteName={initialRouteName}
            screenOptions={{
              contentStyle: { backgroundColor: theme.colors.bgBase },
            }}
          >
            <Stack.Screen name="Login" options={{ headerShown: false }}>
              {() => <LoginScreen onLoggedIn={setToken} />}
            </Stack.Screen>
            {token ? (
              <>
                <Stack.Screen
                  name="OpenBrainFeed"
                  options={{
                    headerShown: false,
                    animation: "none",
                  }}
                >
                  {(props) => <OpenBrainFeedScreen {...props} token={token} />}
                </Stack.Screen>
                <Stack.Screen name="OpenBrain" options={{ headerShown: false }}>
                  {(props) => <OpenBrainScreen {...props} token={token} />}
                </Stack.Screen>
                <Stack.Screen
                  name="CreateOpenBrainProfile"
                  options={{ headerShown: false }}
                >
                  {(props) => <CreateProfileScreen {...props} token={token} />}
                </Stack.Screen>
                <Stack.Screen
                  name="OpenBrainProfile"
                  options={{ headerShown: false, animation: "none" }}
                >
                  {(props) => (
                    <OpenBrainProfileScreen {...props} token={token} />
                  )}
                </Stack.Screen>
                <Stack.Screen
                  name="UpdateOpenBrainProfile"
                  options={{ headerShown: false }}
                >
                  {(props) => <UpdateProfileScreen {...props} token={token} />}
                </Stack.Screen>
                <Stack.Screen
                  name="OpenBrainSettings"
                  options={{ headerShown: false, animation: "none" }}
                >
                  {(props) => (
                    <OpenBrainSettingsScreen {...props} token={token} />
                  )}
                </Stack.Screen>
                <Stack.Screen
                  name="OpenBrainResetPassword"
                  options={{ headerShown: false }}
                >
                  {(props) => <ResetPasswordScreen {...props} token={token} />}
                </Stack.Screen>
                <Stack.Screen
                  name="OpenBrainUserSearch"
                  options={{ headerShown: false }}
                >
                  {(props) => (
                    <OpenBrainUserSearchScreen {...props} token={token} />
                  )}
                </Stack.Screen>
                <Stack.Screen
                  name="OpenBrainSearch"
                  options={{ headerShown: false }}
                >
                  {(props) => (
                    <OpenBrainSearchScreen {...props} token={token} />
                  )}
                </Stack.Screen>
              </>
            ) : null}
            <Stack.Screen name="SharedThought" options={{ headerShown: false }}>
              {(props) => <SharedThoughtScreen {...props} token={token} />}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </SafeAreaProvider>
  );
}
