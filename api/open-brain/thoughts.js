import crypto from 'crypto';
import { getBearerToken, verifyAuthToken, resolveAuthUserId } from '../../lib/auth.js';
import { json, supabaseRequest, getEpochDayInTimezone } from './helpers.js';

const MAX_CONTENT_LENGTH = 5000;

function createShareSlug() {
  return crypto.randomBytes(8).toString('base64url');
}

function computeNextStreak({ streakCount, lastPostedAt, timezone }) {
  const now = new Date();
  const safeTimezone = timezone || 'UTC';
  const currentDay = getEpochDayInTimezone(now, safeTimezone);
  const previousDate = lastPostedAt ? new Date(lastPostedAt) : null;
  const previousDay = previousDate ? getEpochDayInTimezone(previousDate, safeTimezone) : null;
  const baseStreak = Number.isInteger(streakCount) ? streakCount : 0;

  if (!Number.isInteger(currentDay) || !Number.isInteger(previousDay)) return 1;
  if (currentDay === previousDay) return Math.max(1, baseStreak);
  if (currentDay - previousDay === 1) return Math.max(1, baseStreak) + 1;
  return 1;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST'].includes(req.method)) return json(res, 405, { error: 'Method not allowed' });

  const token = getBearerToken(req);
  if (!token) return json(res, 401, { error: 'missing bearer token' });

  let authUser;
  try {
    authUser = await verifyAuthToken(token);
  } catch (err) {
    return json(res, 401, { error: err.message || 'unauthorized' });
  }

  const userId = resolveAuthUserId(authUser);
  if (!userId) return json(res, 401, { error: 'invalid auth user' });

  try {
    const profileRows = await supabaseRequest('/rest/v1/profiles', {
      method: 'GET',
      query: {
        select: 'id,streak_count,last_posted_at,timezone',
        id: `eq.${userId}`,
        limit: 1,
      },
      authToken: token,
    });
    const profile = profileRows?.[0];
    if (!profile) return json(res, 404, { error: 'profile not found' });

    if (req.method === 'GET') {
      const thoughtRows = await supabaseRequest('/rest/v1/thoughts', {
        method: 'GET',
        query: {
          select: 'id,content,visibility,created_at',
          user_id: `eq.${userId}`,
          order: 'created_at.desc',
          limit: 1,
        },
        authToken: token,
      });
      const latestThought = thoughtRows?.[0] || null;
      if (!latestThought) return json(res, 200, { thought: null, has_posted_today: false });

      const timezone = profile.timezone || 'UTC';
      const latestDay = getEpochDayInTimezone(new Date(latestThought.created_at), timezone);
      const currentDay = getEpochDayInTimezone(new Date(), timezone);
      const hasPostedToday = Number.isInteger(latestDay) && Number.isInteger(currentDay) && latestDay === currentDay;

      return json(res, 200, { thought: hasPostedToday ? latestThought : null, has_posted_today: hasPostedToday });
    }

    const thought = String(req.body?.thought || '').trim();
    const visibility = String(req.body?.visibility || 'public').trim().toLowerCase();

    if (!thought) return json(res, 400, { error: 'thought is required' });
    if (thought.length > MAX_CONTENT_LENGTH) return json(res, 400, { error: `thought must be ${MAX_CONTENT_LENGTH} characters or less` });
    if (!['public', 'private'].includes(visibility)) return json(res, 400, { error: 'visibility must be public or private' });

    const rows = await supabaseRequest('/rest/v1/thoughts', {
      method: 'POST',
      body: [{
        user_id: userId,
        content: { text: thought },
        visibility,
        share_slug: visibility === 'public' ? createShareSlug() : null,
      }],
      prefer: 'return=representation',
      authToken: token,
    });

    const nextStreak = computeNextStreak({
      streakCount: profile.streak_count,
      lastPostedAt: profile.last_posted_at,
      timezone: profile.timezone,
    });

    const updatedProfileRows = await supabaseRequest('/rest/v1/profiles', {
      method: 'PATCH',
      query: {
        id: `eq.${userId}`,
      },
      body: {
        streak_count: nextStreak,
        last_posted_at: new Date().toISOString(),
      },
      prefer: 'return=representation',
      authToken: token,
    });

    return json(res, 201, { thought: rows?.[0] || null, profile: updatedProfileRows?.[0] || null });
  } catch (err) {
    const message = err?.data?.message || err.message || 'request failed';
    if (err.status === 401 || err.status === 403) return json(res, 401, { error: 'unauthorized' });
    return json(res, 500, { error: message });
  }
}
