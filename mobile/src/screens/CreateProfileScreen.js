import { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { apiRequest } from '../api';
import OpenBrainTopMenu from '../components/OpenBrainTopMenu';
import { theme } from '../theme';
import styles from './CreateProfileScreenStyles';

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
      navigation.replace('OpenBrainFeed');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <OpenBrainTopMenu navigation={navigation} token={token} />
      <View style={styles.content}>
        <Text style={styles.title}>Create your OpenBrain profile</Text>
        <TextInput value={username} onChangeText={setUsername} placeholder="Username" placeholderTextColor={theme.colors.textSecondary} style={styles.input} maxLength={24} autoCapitalize="none" />
        <TextInput value={avatarUrl} onChangeText={setAvatarUrl} placeholder="Avatar URL (optional)" placeholderTextColor={theme.colors.textSecondary} style={styles.input} autoCapitalize="none" />
        <TextInput value={timezone} onChangeText={setTimezone} placeholder="Timezone" placeholderTextColor={theme.colors.textSecondary} style={styles.input} autoCapitalize="none" />
        <Pressable style={styles.button} onPress={handleCreate} disabled={loading || !username.trim() || !timezone.trim()}>
          <Text style={styles.buttonText}>{loading ? 'Saving profile...' : 'Create profile'}</Text>
        </Pressable>
        {!!error && <Text style={styles.error}>{error}</Text>}
      </View>
    </View>
  );
}
