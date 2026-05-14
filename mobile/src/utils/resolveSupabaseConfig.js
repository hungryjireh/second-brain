import Constants from 'expo-constants';

export default function resolveSupabaseConfig() {
  const env = process.env || {};
  const runtimeExtra = Constants?.expoConfig?.extra || Constants?.manifest2?.extra || {};

  const url = String(env.EXPO_PUBLIC_SUPABASE_URL || runtimeExtra.EXPO_PUBLIC_SUPABASE_URL || runtimeExtra.SUPABASE_URL || '')
    .trim()
    .replace(/\/+$/, '');
  const publishableKey = String(
    env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      || runtimeExtra.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      || runtimeExtra.SUPABASE_PUBLISHABLE_KEY
      || ''
  ).trim();

  if (!url || !publishableKey) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  }

  return { url, publishableKey };
}
