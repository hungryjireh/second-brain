export const OPEN_BRAIN_MAX_CHARS = 5000;

export const THOUGHT_FALLBACK_PROMPTS = [
  'What stayed with you today?',
  'What are you noticing about yourself?',
  'What felt true for a second?',
  'Write your thought for today...',
];

export const THANK_YOU_PROMPTS = [
  "What's on your mind?",
  'thank you for sharing',
  'that belongs to today now',
];

export function formatTodayLabel(date) {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  return `${dayName} ${day} ${month}`;
}

export function formatTimeLabel(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function randomFrom(list, current = '') {
  if (!Array.isArray(list) || list.length === 0) return '';
  if (list.length === 1) return list[0];
  let next = current;
  while (next === current) {
    next = list[Math.floor(Math.random() * list.length)];
  }
  return next;
}

export async function loadOpenBrainComposerState({
  token,
  apiRequest,
  cacheProfileTtlMs,
  cacheThoughtsTtlMs,
  allowThoughtFetchFailure = false,
}) {
  const profileData = await apiRequest('/open-brain/profile', {
    token,
    cache: { ttlMs: cacheProfileTtlMs },
  });

  let thoughtData = null;
  try {
    thoughtData = await apiRequest('/open-brain/thoughts', {
      token,
      cache: { ttlMs: cacheThoughtsTtlMs },
    });
  } catch (err) {
    if (!allowThoughtFetchFailure) throw err;
  }

  const hasPostedToday = Boolean(thoughtData?.has_posted_today && thoughtData?.thought);
  const postedText = hasPostedToday && typeof thoughtData?.thought?.content?.text === 'string'
    ? thoughtData.thought.content.text
    : '';

  return {
    streakCount: Number.isInteger(profileData?.profile?.streak_count) ? profileData.profile.streak_count : 0,
    saveCount: Number.isInteger(profileData?.profile?.save_count) ? profileData.profile.save_count : 0,
    hasPostedToday,
    draft: postedText,
    visibility: thoughtData?.thought?.visibility === 'private' ? 'private' : 'public',
  };
}
