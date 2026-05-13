export function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return UUID_REGEX.test(String(value || ''));
}

function getSupabaseEnv() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('Missing Supabase env configuration');
  }

  return { supabaseUrl, supabasePublishableKey };
}

export async function supabaseRequest(path, { method = 'GET', query, body, authToken, prefer } = {}) {
  const { supabaseUrl, supabasePublishableKey } = getSupabaseEnv();
  const url = new URL(path, supabaseUrl);

  for (const [key, value] of Object.entries(query || {})) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, String(value));
  }

  const headers = {
    apikey: supabasePublishableKey,
    Authorization: `Bearer ${authToken || supabasePublishableKey}`,
  };

  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (prefer) headers.Prefer = prefer;

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;
  if (!response.ok) {
    const err = new Error(data?.message || `Supabase request failed (${response.status})`);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export function getEpochDayInTimezone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find(part => part.type === 'year')?.value);
  const month = Number(parts.find(part => part.type === 'month')?.value);
  const day = Number(parts.find(part => part.type === 'day')?.value);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}
