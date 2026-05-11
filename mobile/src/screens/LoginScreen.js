import { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { login, setToken } from '../api';
import { theme } from '../theme';
import styles from './LoginScreenStyles';

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
