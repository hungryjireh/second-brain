import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { login, setToken } from '../api';
import { theme } from '../theme';

export default function LoginScreen({ onLoggedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setError('');
    try {
      const data = await login(email.trim(), password);
      await setToken(data.token);
      onLoggedIn(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Welcome back</Text>
        <Text style={styles.title}>
          Sign in to second<Text style={styles.titleAccent}>brain</Text>
        </Text>
        <Text style={styles.subtitle}>Use your account credentials to continue.</Text>

        <View style={styles.form}>
          <TextInput
            placeholder="Email"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor={theme.colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />
          <Pressable style={[styles.button, (loading || !email.trim() || !password) && styles.buttonDisabled]} onPress={handleLogin} disabled={loading || !email.trim() || !password}>
            <Text style={[styles.buttonText, (loading || !email.trim() || !password) && styles.buttonTextDisabled]}>{loading ? 'Signing in...' : 'Sign In'}</Text>
          </Pressable>
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: theme.colors.bgBase,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    backgroundColor: theme.colors.bgSurface,
    borderWidth: 0.5,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  eyebrow: {
    marginBottom: 0,
    color: theme.colors.brandText,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    fontFamily: 'DMSans_600SemiBold',
  },
  title: {
    marginTop: 8,
    marginBottom: 8,
    color: theme.colors.textPrimary,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.4,
    fontFamily: 'DMSerifDisplay_400Regular',
  },
  titleAccent: {
    color: theme.colors.brand,
  },
  subtitle: {
    marginTop: 0,
    marginBottom: 18,
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
  },
  form: {
    gap: 10,
  },
  input: {
    width: '100%',
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.bgRaised,
    color: theme.colors.textPrimary,
    borderWidth: 0.5,
    borderColor: theme.colors.border,
    borderRadius: 10,
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
  },
  button: {
    marginTop: 2,
    width: '100%',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'transparent',
    backgroundColor: theme.colors.brand,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: theme.colors.bgHover,
  },
  buttonText: {
    color: '#f5fff9',
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
  },
  buttonTextDisabled: {
    color: theme.colors.textMuted,
  },
  errorBox: {
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(220,60,60,0.28)',
    backgroundColor: 'rgba(220,60,60,0.1)',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
  },
});
