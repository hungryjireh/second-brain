import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  TextInput,
  Pressable,
} from "react-native";
import { login, setSessionTokens } from "../api";
import { theme } from "../theme";
import {
  areRequiredFieldsPresent,
  normalizeRequiredField,
} from "../utils/formFields";
import styles from "./LoginScreenStyles";

export default function LoginScreen({ onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const passwordInputRef = useRef(null);
  const emailRef = useRef("");
  const passwordRef = useRef("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const normalizedEmail = normalizeRequiredField(emailRef.current);
  const normalizedPassword = passwordRef.current;
  const canSubmit = areRequiredFieldsPresent([
    normalizedEmail,
    normalizedPassword,
  ]);

  async function handleLogin() {
    if (!canSubmit || loading) return;

    setLoading(true);
    setError("");
    try {
      const data = await login(normalizedEmail, normalizedPassword);
      await setSessionTokens({
        token: data.token,
        refreshToken: data.refreshToken,
      });
      onLoggedIn(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
    >
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Welcome back</Text>
        <Text style={styles.title}>
          Sign in to second<Text style={styles.titleAccent}>brain</Text>
        </Text>
        <Text style={styles.subtitle}>
          Use your account credentials to continue.
        </Text>

        <View style={styles.form}>
          <TextInput
            placeholder="Email"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => passwordInputRef.current?.focus()}
            value={email}
            onChangeText={(value) => {
              emailRef.current = value;
              setEmail(value);
            }}
            style={styles.input}
          />
          <TextInput
            ref={passwordInputRef}
            placeholder="Password"
            placeholderTextColor={theme.colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            value={password}
            onChangeText={(value) => {
              passwordRef.current = value;
              setPassword(value);
            }}
            returnKeyType="go"
            onSubmitEditing={handleLogin}
            style={styles.input}
          />
          <Pressable
            style={[
              styles.button,
              (loading || !canSubmit) && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading || !canSubmit}
          >
            <Text
              style={[styles.buttonText, loading && styles.buttonTextDisabled]}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Text>
          </Pressable>
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
