import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { apiRequest, invalidateApiCache } from '../api';
import { CACHE_TTL_MS } from '../constants/cache';
import OpenBrainBottomNav from '../components/OpenBrainBottomNav';
import OpenBrainTopMenu from '../components/OpenBrainTopMenu';
import TimezoneDropdown from '../components/TimezoneDropdown';
import { theme } from '../theme';
import { initialsFromName } from '../utils/profileAvatar';
import styles from './UpdateProfileScreenStyles';

export default function UpdateProfileScreen({ token, navigation }) {
  const defaultTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Singapore', []);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [timezoneMenuOpen, setTimezoneMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/open-brain/profile', { token, cache: { ttlMs: CACHE_TTL_MS.PROFILE } });
      setUsername(String(data.profile?.username || ''));
      setAvatarUrl(String(data.profile?.avatar_url || ''));
      setTimezone(String(data.profile?.timezone || defaultTimezone));
    } catch (err) {
      if (String(err.message).toLowerCase().includes('404') || String(err.message).toLowerCase().includes('not found')) {
        navigation.replace('CreateOpenBrainProfile');
        return;
      }
      setError(err.message || 'Failed to load your profile.');
    } finally {
      setLoading(false);
    }
  }, [defaultTimezone, navigation, token]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleUpdateProfile() {
    if (!timezone.trim() || saving) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiRequest('/open-brain/profile', {
        method: 'PATCH',
        token,
        body: {
          avatar_url: avatarUrl,
          timezone,
        },
      });
      await invalidateApiCache({
        token,
        exactPaths: ['/open-brain/profile'],
        pathPrefixes: ['/open-brain/feed'],
      });
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update your profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <OpenBrainTopMenu navigation={navigation} token={token} />
      <View style={styles.content}>
        <View style={styles.headerSection}>
          <View style={styles.headerCard}>
            <View style={styles.avatarWrap}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: theme.colors.accent }]}>
                  <Text style={styles.avatarFallbackText}>{initialsFromName(username)}</Text>
                </View>
              )}
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.eyebrow}>Open-brain profile</Text>
              <Text style={styles.title}>Profile settings</Text>
              <Text style={styles.copy}>Edit how people see you on OpenBrain.</Text>
            </View>
          </View>
        </View>
        <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContentContainer} keyboardShouldPersistTaps="handled">
          {loading ? (
            <View style={styles.sectionCard}>
              <Text style={styles.muted}>Loading profile...</Text>
            </View>
          ) : (
            <>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Identity</Text>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  value={username}
                  editable={false}
                  placeholder="e.g. jireh"
                  placeholderTextColor={theme.colors.textMuted}
                  style={[styles.input, styles.inputDisabled]}
                  maxLength={24}
                  autoCapitalize="none"
                />
                <Text style={styles.fieldHint}>Username is fixed for now.</Text>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Profile photo</Text>
                <Text style={styles.label}>Avatar URL (optional)</Text>
                <TextInput
                  value={avatarUrl}
                  onChangeText={setAvatarUrl}
                  placeholder="https://example.com/avatar.jpg"
                  placeholderTextColor={theme.colors.textMuted}
                  style={styles.input}
                  autoCapitalize="none"
                  inputMode="url"
                />
              </View>

              <View style={[styles.sectionCard, timezoneMenuOpen && styles.sectionCardElevated]}>
                <Text style={styles.sectionTitle}>Regional settings</Text>
                <Text style={styles.label}>Timezone</Text>
                <View style={styles.timezoneDropdownWrapper}>
                  <TimezoneDropdown
                    value={timezone}
                    onChange={setTimezone}
                    placeholderTextColor={theme.colors.textMuted}
                    onOpenChange={setTimezoneMenuOpen}
                    styles={{
                      dropdown: styles.timezoneDropdown,
                      dropdownText: styles.timezoneDropdownText,
                      dropdownChevronIcon: styles.timezoneDropdownChevronIcon,
                      dropdownList: styles.timezoneDropdownList,
                      dropdownListContent: styles.timezoneDropdownListContent,
                      searchInput: styles.timezoneSearchInput,
                      dropdownOption: styles.timezoneDropdownOption,
                      dropdownOptionSelected: styles.timezoneDropdownOptionSelected,
                      dropdownOptionText: styles.timezoneDropdownOptionText,
                      dropdownOptionTextSelected: styles.timezoneDropdownOptionTextSelected,
                      noResults: styles.timezoneNoResults,
                    }}
                  />
                </View>
              </View>

              {!!error && <Text style={styles.error}>{error}</Text>}
              {!!success && <Text style={styles.success}>{success}</Text>}

              <View style={styles.actionsRow}>
                <Pressable
                  style={[styles.primaryButton, (saving || !timezone.trim()) && styles.buttonDisabled]}
                  onPress={handleUpdateProfile}
                  disabled={saving || !timezone.trim()}
                >
                  <Text style={[styles.primaryButtonText, (saving || !timezone.trim()) && styles.buttonDisabledText]}>
                    {saving ? 'Saving profile...' : 'Save changes'}
                  </Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('OpenBrainFeed')}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </View>
      <OpenBrainBottomNav navigation={navigation} currentRoute="UpdateOpenBrainProfile" />
    </View>
  );
}
