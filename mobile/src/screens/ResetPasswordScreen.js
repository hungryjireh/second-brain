import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { apiRequest } from '../api';
import OpenBrainSettingsLayout from '../components/OpenBrainSettingsLayout';
import { theme } from '../theme';
import styles from './ResetPasswordScreen.styles';

export default function ResetPasswordScreen({ token, navigation }) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSendReset() {
    if (!email.trim() || sending) return;
    setSending(true);
    setError('');
    setSuccess('');
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        token,
        body: { email: email.trim() },
      });
      setSuccess('If that email exists, a password reset link has been sent.');
    } catch (err) {
      setError(err.message || 'Unable to send password reset email.');
    } finally {
      setSending(false);
    }
  }

  return (
    <OpenBrainSettingsLayout
      token={token}
      navigation={navigation}
      backLabel="Back to settings"
      onBackPress={() => navigation.navigate('OpenBrainSettings')}
      title="Reset your password"
      copy="Enter your account email and we'll send a reset link."
      headerStyle={styles.header}
    >
      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.primaryButton, (sending || !email.trim()) && styles.buttonDisabled]}
            onPress={handleSendReset}
            disabled={sending || !email.trim()}
          >
            <Text style={[styles.primaryButtonText, (sending || !email.trim()) && styles.buttonDisabledText]}>
              {sending ? 'Sending reset link...' : 'Send reset link'}
            </Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('OpenBrainSettings')}>
            <Text style={styles.secondaryButtonText}>Back to settings</Text>
          </Pressable>
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!success && <Text style={styles.success}>{success}</Text>}
      </View>
    </OpenBrainSettingsLayout>
  );
}
