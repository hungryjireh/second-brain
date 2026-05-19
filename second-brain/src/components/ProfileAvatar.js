import { useEffect, useMemo, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { theme } from '../theme';
import { initialsFromName } from '../utils/profileAvatar';
import resolveSupabaseConfig from '../utils/resolveSupabaseConfig';

function resolveAvatarUrl(rawValue) {
  const value = String(rawValue || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;

  const normalizedPath = value.replace(/^\/+/, '');
  if (normalizedPath.startsWith('storage/v1/object/public/')) {
    try {
      const { url } = resolveSupabaseConfig();
      return `${url}/${normalizedPath}`;
    } catch {
      return '';
    }
  }

  if (normalizedPath.startsWith('profileImage/')) {
    try {
      const { url } = resolveSupabaseConfig();
      return `${url}/storage/v1/object/public/${normalizedPath}`;
    } catch {
      return '';
    }
  }

  return '';
}

export default function ProfileAvatar({
  profile = null,
  avatarUrl,
  username,
  imageStyle,
  fallbackStyle,
  textStyle,
}) {
  const profileAvatarUrl = String(profile?.avatar_url || '').trim();
  const resolvedAvatarUrl = useMemo(
    () => resolveAvatarUrl(profileAvatarUrl || avatarUrl),
    [profileAvatarUrl, avatarUrl]
  );
  const [loadMode, setLoadMode] = useState('primary');
  useEffect(() => {
    setLoadMode('primary');
  }, [resolvedAvatarUrl]);

  if (resolvedAvatarUrl && loadMode !== 'fallback') {
    const activeSource = { uri: resolvedAvatarUrl };
    return (
      <Image
        source={activeSource}
        style={imageStyle}
        onError={event => {
          console.warn('OpenBrain avatar load failed', {
            uri: activeSource?.uri,
            error: event?.nativeEvent?.error,
          });
          setLoadMode('fallback');
        }}
      />
    );
  }

  return (
    <View style={[fallbackStyle, { backgroundColor: theme.colors.accent }]}>
      <Text style={textStyle}>{initialsFromName(username)}</Text>
    </View>
  );
}
