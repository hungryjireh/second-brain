import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { apiRequest, invalidateApiCache } from '../api';
import { CACHE_TTL_MS } from '../constants/cache';
import OpenBrainSettingsLayout from '../components/OpenBrainSettingsLayout';
import TimezoneDropdown from '../components/TimezoneDropdown';
import { theme } from '../theme';
import styles from './UpdateProfileScreenStyles';

export default function UpdateProfileScreen({ token, navigation }) {
  const defaultTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Singapore', []);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [timezoneMenuOpen, setTimezoneMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [canChangeUsername, setCanChangeUsername] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/open-brain/profile', { token, cache: { ttlMs: CACHE_TTL_MS.PROFILE } });
      setUsername(String(data.profile?.username || ''));
      setBio(String(data.profile?.bio || ''));
      setAvatarUrl(String(data.profile?.avatar_url || ''));
      setTimezone(String(data.profile?.timezone || defaultTimezone));
      setCanChangeUsername(Boolean(data.profile?.can_change_username));
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
    if (!username.trim() || !timezone.trim() || saving) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiRequest('/open-brain/profile', {
        method: 'PATCH',
        token,
        body: {
          username: username.trim(),
          bio: bio.trim(),
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
    <OpenBrainSettingsLayout
      token={token}
      navigation={navigation}
      title="Profile settings"
      copy="Edit how people see you on OpenBrain."
      headerStyle={styles.headerSection}
      scroll
      scrollStyle={styles.formScroll}
      scrollContentContainerStyle={styles.formContentContainer}
    >
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
              editable={canChangeUsername}
              onChangeText={setUsername}
              placeholder="e.g. jireh"
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.input, !canChangeUsername && styles.inputDisabled]}
              maxLength={24}
              autoCapitalize="none"
            />
            <Text style={styles.fieldHint}>
              {canChangeUsername ? 'You can change your username once.' : 'You already used your one username change.'}
            </Text>
            <Text style={[styles.label, styles.bioLabel]}>Bio</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Tell people a little about you"
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.input, styles.textArea]}
              multiline
              textAlignVertical="top"
              maxLength={280}
            />
            <Text style={styles.fieldHint}>{bio.length}/280</Text>
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
              style={[styles.primaryButton, (saving || !username.trim() || !timezone.trim()) && styles.buttonDisabled]}
              onPress={handleUpdateProfile}
              disabled={saving || !username.trim() || !timezone.trim()}
            >
              <Text style={[styles.primaryButtonText, (saving || !username.trim() || !timezone.trim()) && styles.buttonDisabledText]}>
                {saving ? 'Saving profile...' : 'Save changes'}
              </Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('OpenBrainSettings')}>
              <Text style={styles.secondaryButtonText}>Back to settings</Text>
            </Pressable>
          </View>
        </>
      )}
    </OpenBrainSettingsLayout>
  );
}
