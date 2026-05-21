import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  NavigationContainer,
  DefaultTheme,
  getStateFromPath as getStateFromPathDefault,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { Feather } from "@expo/vector-icons";
import LoginScreen from "./src/screens/LoginScreen";
import SecondBrainScreen from "./src/screens/SecondBrainScreen";
import SecondBrainEntryDetailsScreen from "./src/screens/SecondBrainEntryDetailsScreen";
import SecondBrainEditEntryScreen from "./src/screens/SecondBrainEditEntryScreen";
import { clearToken, getToken, setAuthExpiredHandler } from "./src/api";
import { theme } from "./src/theme";
import {
  shouldApplyIOSInputZoomFix,
  shouldShowSecondBrainHeaderDate,
} from "./src/utils/responsive";
import styles from "./App.styles";

const Stack = createNativeStackNavigator();

function HeaderBrand() {
  return (
    <Text style={styles.headerBrandText}>
      second<Text style={styles.headerBrandAccent}>brain</Text>
    </Text>
  );
}

function HeaderLiveStatus() {
  const dateLabel = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return <Text style={styles.headerLiveText}>{dateLabel}</Text>;
}

function HeaderSecondBrainBack({ navigation }) {
  return (
    <Pressable
      onPress={() => {
        if (navigation?.canGoBack?.()) {
          navigation.goBack();
          return;
        }
        navigation?.navigate?.("SecondBrain");
      }}
      accessibilityRole="button"
      accessibilityLabel="Back to Second Brain"
      style={{
        minWidth: 72,
        paddingVertical: 6,
        paddingLeft: 12,
        justifyContent: "center",
      }}
    >
      <Feather name="arrow-left" size={20} color={theme.colors.textSecondary} />
    </Pressable>
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
  const { width } = useWindowDimensions();
  const hideSecondBrainHeaderDate = !shouldShowSecondBrainHeaderDate(width);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fontsLoaded] = useFonts(theme.fonts.loadMap);
  const isAuthenticated = Boolean(token);

  const linking = useMemo(
    () => ({
      config: {
        screens: {
          Login: "login",
          SecondBrain: "second-brain",
          SecondBrainEntryDetails: "second-brain/entry/:entryId",
          SecondBrainEditEntry: "second-brain/edit/:entryId",
        },
      },
      getStateFromPath(path, options) {
        const rawPath = String(path || "");
        const defaultPath = isAuthenticated ? "/second-brain" : "/login";
        const normalizedPath = (
          rawPath === "" || rawPath === "/" ? defaultPath : rawPath
        )
          .replace(
            /^\/apps(?:\/|$)/,
            isAuthenticated ? "/second-brain" : "/login",
          )
          .replace(/^\/?secondbrain\/microphone-flow(?:\/|$)/, "/second-brain")
          .replace(
            /^\/?second-brain\/microphone-flow(?:\/|$)/,
            "/second-brain",
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

  async function logout() {
    await clearToken();
    setToken(null);
  }

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

  if (loading || !fontsLoaded) {
    return (
      <ActivityIndicator
        style={styles.loadingIndicator}
        color={theme.colors.brand}
      />
    );
  }

  const initialRouteName = isAuthenticated ? "SecondBrain" : "Login";

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
            {!isAuthenticated ? (
              <Stack.Screen name="Login" options={{ headerShown: false }}>
                {() => <LoginScreen onLoggedIn={setToken} />}
              </Stack.Screen>
            ) : (
              <>
                <Stack.Screen
                  name="SecondBrain"
                  options={{
                    headerTitle: () => <HeaderBrand />,
                    headerTitleAlign: "center",
                    headerBackVisible: false,
                    headerLeft: () => null,
                    headerRight: hideSecondBrainHeaderDate
                      ? undefined
                      : () => <HeaderLiveStatus />,
                    headerStyle: { backgroundColor: theme.colors.bgBase },
                    headerShadowVisible: false,
                  }}
                >
                  {(props) => (
                    <SecondBrainScreen
                      {...props}
                      token={token}
                      onLogout={logout}
                    />
                  )}
                </Stack.Screen>

                <Stack.Screen
                  name="SecondBrainEntryDetails"
                  options={({ navigation }) => ({
                    headerTitle: () => <HeaderBrand />,
                    headerTitleAlign: "center",
                    headerLeft: () => (
                      <HeaderSecondBrainBack navigation={navigation} />
                    ),
                    headerRight: hideSecondBrainHeaderDate
                      ? undefined
                      : () => <HeaderLiveStatus />,
                    headerStyle: { backgroundColor: theme.colors.bgBase },
                    headerShadowVisible: false,
                  })}
                >
                  {(props) => (
                    <SecondBrainEntryDetailsScreen {...props} token={token} />
                  )}
                </Stack.Screen>

                <Stack.Screen
                  name="SecondBrainEditEntry"
                  options={({ navigation }) => ({
                    headerTitle: () => <HeaderBrand />,
                    headerTitleAlign: "center",
                    headerLeft: () => (
                      <HeaderSecondBrainBack navigation={navigation} />
                    ),
                    headerRight: hideSecondBrainHeaderDate
                      ? undefined
                      : () => <HeaderLiveStatus />,
                    headerStyle: { backgroundColor: theme.colors.bgBase },
                    headerShadowVisible: false,
                  })}
                >
                  {(props) => (
                    <SecondBrainEditEntryScreen {...props} token={token} />
                  )}
                </Stack.Screen>
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </SafeAreaProvider>
  );
}
