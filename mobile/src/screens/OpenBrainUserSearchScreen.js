import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import OpenBrainTopMenu from '../components/OpenBrainTopMenu';
import { apiRequest } from '../api';
import styles from './OpenBrainUserSearchScreen.styles';

export default function OpenBrainUserSearchScreen({ token, navigation }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch() {
    const username = query.trim().replace(/^@+/, '');
    if (!username || loading) return;

    setLoading(true);
    setError('');
    try {
      const response = await apiRequest(`/open-brain/profile?username=${encodeURIComponent(username)}`, { token });
      const targetUsername = response?.profile?.username || username;
      navigation.navigate('OpenBrainProfile', { username: targetUsername });
    } catch (err) {
      setError(err.message || 'Could not find that user.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      keyboardVerticalOffset={Platform.select({ ios: 16, android: 0 })}
    >
      <OpenBrainTopMenu navigation={navigation} token={token} />
      <View style={styles.content}>
        <Text style={styles.title}>Search users</Text>
        <Text style={styles.copy}>Find someone by username and open their OpenBrain profile.</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Type a username"
          placeholderTextColor={styles.placeholder.color}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          editable={!loading}
          accessibilityLabel="Search users by username"
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Pressable
          onPress={handleSearch}
          disabled={loading || !query.trim()}
          style={({ pressed }) => [
            styles.button,
            (loading || !query.trim()) && styles.buttonDisabled,
            pressed && !loading && query.trim() && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Search for user"
        >
          <Text style={styles.buttonText}>{loading ? 'Searching...' : 'Search'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
