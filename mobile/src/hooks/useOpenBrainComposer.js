import { useCallback, useMemo, useState } from 'react';
import {
  loadOpenBrainComposerState,
  randomFrom,
  THANK_YOU_PROMPTS,
  THOUGHT_FALLBACK_PROMPTS,
} from '../utils/openBrainComposer';
import { formatTimeLabel, formatTodayLabel } from '../utils/dateUtils';

export function useOpenBrainComposer({
  token,
  apiRequest,
  cacheProfileTtlMs,
  cacheThoughtsTtlMs,
  allowThoughtFetchFailure = false,
  initialError = '',
  fallbackSaveErrorMessage = 'Unable to save thought.',
  onPostSuccess,
}) {
  const [draft, setDraft] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [hasPostedToday, setHasPostedToday] = useState(false);
  const [postedHeading, setPostedHeading] = useState('');
  const [streakCount, setStreakCount] = useState(0);
  const [saveCount, setSaveCount] = useState(0);
  const [prompt, setPrompt] = useState(() => randomFrom(THOUGHT_FALLBACK_PROMPTS));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(initialError);
  const todayLabel = useMemo(() => formatTodayLabel(new Date()), []);
  const timeLabel = useMemo(() => formatTimeLabel(), []);

  const loadComposerState = useCallback(async () => {
    const state = await loadOpenBrainComposerState({
      token,
      apiRequest,
      cacheProfileTtlMs,
      cacheThoughtsTtlMs,
      allowThoughtFetchFailure,
    });
    setStreakCount(state.streakCount);
    setSaveCount(state.saveCount);
    setDraft(state.draft);
    setVisibility(state.visibility);
    setHasPostedToday(state.hasPostedToday);
    if (state.hasPostedToday) setPostedHeading(randomFrom(THANK_YOU_PROMPTS));
    return state;
  }, [allowThoughtFetchFailure, apiRequest, cacheProfileTtlMs, cacheThoughtsTtlMs, token]);

  const postThought = useCallback(async () => {
    if (!draft.trim() || saving || hasPostedToday) return null;
    try {
      setSaving(true);
      setError('');
      const data = await apiRequest('/open-brain/thoughts', {
        method: 'POST',
        token,
        body: { thought: draft.trim(), visibility },
      });
      setHasPostedToday(true);
      setPostedHeading(randomFrom(THANK_YOU_PROMPTS));
      setStreakCount(Number.isInteger(data?.profile?.streak_count) ? data.profile.streak_count : streakCount);
      if (onPostSuccess) await onPostSuccess(data);
      return data;
    } catch (err) {
      setError(err?.message || fallbackSaveErrorMessage);
      return null;
    } finally {
      setSaving(false);
    }
  }, [apiRequest, draft, fallbackSaveErrorMessage, hasPostedToday, onPostSuccess, saving, streakCount, token, visibility]);

  return {
    draft,
    setDraft,
    visibility,
    setVisibility,
    hasPostedToday,
    postedHeading,
    streakCount,
    saveCount,
    prompt,
    setPrompt,
    saving,
    error,
    setError,
    todayLabel,
    timeLabel,
    loadComposerState,
    postThought,
  };
}
