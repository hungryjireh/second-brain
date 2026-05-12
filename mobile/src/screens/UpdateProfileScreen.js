import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { apiRequest } from '../api';
import { CACHE_TTL_MS } from '../constants/cache';
import OpenBrainBottomNav from '../components/OpenBrainBottomNav';
import OpenBrainTopMenu from '../components/OpenBrainTopMenu';
import { theme } from '../theme';
import { initialsFromName, mutedTint } from '../utils/profileAvatar';
import styles from './UpdateProfileScreenStyles';

const TIMEZONE_OPTIONS = [
  'Asia/Singapore',
  'UTC',
  'Asia/Manila',
  'Asia/Jakarta',
  'Asia/Bangkok',
  'Asia/Tokyo',
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
];

function getTimezoneOptions() {
  if (typeof Intl.supportedValuesOf === 'function') {
    return Intl.supportedValuesOf('timeZone');
  }
  return TIMEZONE_OPTIONS;
}

export default function UpdateProfileScreen({ token, navigation }) {
  const defaultTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Singapore', []);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [timezoneMenuOpen, setTimezoneMenuOpen] = useState(false);
  const [timezoneSearch, setTimezoneSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const timezoneOptions = useMemo(() => {
    const options = getTimezoneOptions();
    return options.includes(timezone) ? options : [timezone, ...options];
  }, [timezone]);
  const filteredTimezoneOptions = useMemo(() => {
    const query = timezoneSearch.trim().toLowerCase();
    if (!query) return timezoneOptions;
    return timezoneOptions.filter(option => option.toLowerCase().includes(query));
  }, [timezoneOptions, timezoneSearch]);

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
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.headerCard}>
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: mutedTint(username) }]}>
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

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Regional settings</Text>
              <Text style={styles.label}>Timezone</Text>
              <View style={styles.timezoneDropdownWrapper}>
                <Pressable
                  style={styles.timezoneDropdown}
                  onPress={() => {
                    setTimezoneMenuOpen(prev => {
                      if (prev) setTimezoneSearch('');
                      return !prev;
                    });
                  }}
                >
                  <Text style={styles.timezoneDropdownText}>{timezone || 'Select timezone'}</Text>
                  <Text style={styles.timezoneDropdownChevron}>{timezoneMenuOpen ? '▲' : '▼'}</Text>
                </Pressable>
                {timezoneMenuOpen ? (
                  <ScrollView
                    style={styles.timezoneDropdownList}
                    showsVerticalScrollIndicator
                    contentContainerStyle={styles.timezoneDropdownListContent}
                  >
                    <TextInput
                      value={timezoneSearch}
                      onChangeText={setTimezoneSearch}
                      placeholder="Search timezone"
                      placeholderTextColor={theme.colors.textMuted}
                      style={styles.timezoneSearchInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {filteredTimezoneOptions.map(option => {
                      const isSelected = option === timezone;
                      return (
                        <Pressable
                          key={option}
                          style={[styles.timezoneDropdownOption, isSelected && styles.timezoneDropdownOptionSelected]}
                          onPress={() => {
                            setTimezone(option);
                            setTimezoneMenuOpen(false);
                            setTimezoneSearch('');
                          }}
                        >
                          <Text style={[styles.timezoneDropdownOptionText, isSelected && styles.timezoneDropdownOptionTextSelected]}>
                            {option}
                          </Text>
                        </Pressable>
                      );
                    })}
                    {filteredTimezoneOptions.length === 0 ? (
                      <Text style={styles.timezoneNoResults}>No timezones found.</Text>
                    ) : null}
                  </ScrollView>
                ) : null}
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
      <OpenBrainBottomNav navigation={navigation} currentRoute="UpdateOpenBrainProfile" />
    </View>
  );
}
