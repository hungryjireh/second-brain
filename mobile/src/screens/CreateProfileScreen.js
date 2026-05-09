import { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { apiRequest } from '../api';
import { theme } from '../theme';

export default function CreateProfileScreen({ token, navigation }) {
  const defaultTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', []);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!username.trim() || !timezone.trim()) return;
    setLoading(true);
    setError('');
    try {
      await apiRequest('/open-brain/profile', {
        method: 'POST',
        token,
        body: {
          username: username.trim(),
          avatar_url: avatarUrl.trim(),
          timezone: timezone.trim(),
        },
      });
      navigation.replace('OpenBrain');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create your OpenBrain profile</Text>
      <TextInput value={username} onChangeText={setUsername} placeholder="Username" placeholderTextColor={theme.colors.textSecondary} style={styles.input} maxLength={24} autoCapitalize="none" />
      <TextInput value={avatarUrl} onChangeText={setAvatarUrl} placeholder="Avatar URL (optional)" placeholderTextColor={theme.colors.textSecondary} style={styles.input} autoCapitalize="none" />
      <TextInput value={timezone} onChangeText={setTimezone} placeholder="Timezone" placeholderTextColor={theme.colors.textSecondary} style={styles.input} autoCapitalize="none" />
      <Pressable style={styles.button} onPress={handleCreate} disabled={loading || !username.trim() || !timezone.trim()}>
        <Text style={styles.buttonText}>{loading ? 'Saving profile...' : 'Create profile'}</Text>
      </Pressable>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bgBase, padding: 16, justifyContent: 'center', gap: 10 },
  title: { color: theme.colors.textPrimary, fontSize: 24, fontWeight: '700', marginBottom: 6 },
  input: { backgroundColor: theme.colors.bgSurface, color: theme.colors.textPrimary, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, padding: 12 },
  button: { backgroundColor: theme.colors.brand, borderRadius: 10, alignItems: 'center', padding: 12, marginTop: 6 },
  buttonText: { color: theme.colors.textPrimary, fontWeight: '700' },
  error: { color: theme.colors.danger },
});
