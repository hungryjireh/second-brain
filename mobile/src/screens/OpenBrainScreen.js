import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { apiRequest } from '../api';
import OpenBrainThoughtComposer from '../components/OpenBrainThoughtComposer';
import OpenBrainBottomNav from '../components/OpenBrainBottomNav';
import OpenBrainTopMenu from '../components/OpenBrainTopMenu';
import styles from './OpenBrainScreen.styles';

const MAX_CHARS = 5000;
const THOUGHT_FALLBACK_PROMPTS = [
  'What stayed with you today?',
  'What are you noticing about yourself?',
  'What felt true for a second?',
  'Write your thought for today...',
];
const THANK_YOU_PROMPTS = [
  "What's on your mind?",
  'thank you for sharing',
  'that belongs to today now',
];

function formatTodayLabel(date) {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  return `${dayName} ${day} ${month}`;
}

function formatTimeLabel(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function randomFrom(list, current = '') {
  if (!Array.isArray(list) || list.length === 0) return '';
  if (list.length === 1) return list[0];
  let next = current;
  while (next === current) {
    next = list[Math.floor(Math.random() * list.length)];
  }
  return next;
}

export default function OpenBrainScreen({ token, navigation }) {
  const [draft, setDraft] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [hasPostedToday, setHasPostedToday] = useState(false);
  const [postedHeading, setPostedHeading] = useState('');
  const [streakCount, setStreakCount] = useState(0);
  const [prompt, setPrompt] = useState(() => randomFrom(THOUGHT_FALLBACK_PROMPTS));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const todayLabel = useMemo(() => formatTodayLabel(new Date()), []);
  const timeLabel = useMemo(() => formatTimeLabel(), []);

  const ensureProfile = useCallback(async () => {
    try {
      const data = await apiRequest('/open-brain/profile', { token, cache: { ttlMs: 60000 } });
      setStreakCount(Number.isInteger(data?.profile?.streak_count) ? data.profile.streak_count : 0);
      return true;
    } catch (err) {
      if (String(err.message).toLowerCase().includes('404') || String(err.message).toLowerCase().includes('not found')) {
        navigation.replace('CreateOpenBrainProfile');
        return false;
      }
      throw err;
    }
  }, [navigation, token]);

  useEffect(() => {
    ensureProfile().catch(err => setError(err.message));
  }, [ensureProfile]);

  useEffect(() => {
    let cancelled = false;
    async function loadTodaysThought() {
      try {
        const data = await apiRequest('/open-brain/thoughts', { token, cache: { ttlMs: 30000 } });
        if (cancelled || !data?.has_posted_today || !data?.thought) return;
        const postedText = typeof data.thought?.content?.text === 'string' ? data.thought.content.text : '';
        setDraft(postedText);
        setVisibility(data.thought?.visibility === 'private' ? 'private' : 'public');
        setHasPostedToday(true);
        setPostedHeading(randomFrom(THANK_YOU_PROMPTS));
      } catch {
        // The feed remains usable even if today's thought fails to hydrate.
      }
    }

    loadTodaysThought();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function postThought() {
    if (!draft.trim() || saving || hasPostedToday) return;
    try {
      setSaving(true);
      setError('');
      const data = await apiRequest('/open-brain/thoughts', { method: 'POST', token, body: { thought: draft.trim(), visibility } });
      setHasPostedToday(true);
      setPostedHeading(randomFrom(THANK_YOU_PROMPTS));
      setStreakCount(Number.isInteger(data?.profile?.streak_count) ? data.profile.streak_count : streakCount);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <OpenBrainTopMenu navigation={navigation} token={token} />
      <View style={styles.composerWrap}>
        <OpenBrainThoughtComposer
          value={draft}
          onChangeText={text => setDraft(text.slice(0, MAX_CHARS))}
          placeholder="Write your thought for today..."
          buttonLabel={saving ? 'Saving...' : hasPostedToday ? '✓' : 'Done'}
          onSubmit={postThought}
          disabled={saving || !draft.trim()}
          multiline
          maxLength={MAX_CHARS}
          showRemaining={false}
          dateLabel={todayLabel}
          timeLabel={timeLabel}
          streakCount={streakCount}
          heading={hasPostedToday ? (postedHeading || "What's on your mind?") : "What's on your mind?"}
          prompt={prompt}
          onRefreshPrompt={() => setPrompt(current => randomFrom(THOUGHT_FALLBACK_PROMPTS, current))}
          canRefreshPrompt={THOUGHT_FALLBACK_PROMPTS.length > 1}
          visibility={visibility}
          onToggleVisibility={() => setVisibility(current => (current === 'public' ? 'private' : 'public'))}
          isPosted={hasPostedToday}
          error={error}
        />
      </View>
      {error ? (
        <View style={styles.inlineErrorWrap}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}
      <OpenBrainBottomNav navigation={navigation} currentRoute="OpenBrain" />
    </View>
  );
}
