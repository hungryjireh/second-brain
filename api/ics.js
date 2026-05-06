import { getEntry } from '../lib/db.js';
import { getBearerToken, verifyAuthToken, resolveAuthUserId } from '../lib/auth.js';

function escapeIcsText(text) {
  return String(text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function formatIcsDate(unixTs) {
  const d = new Date(unixTs * 1000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

function toSafeFilePart(text) {
  const cleaned = String(text ?? '')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  return cleaned || 'reminder';
}

function buildReminderIcs(entry) {
  const now = Math.floor(Date.now() / 1000);
  const uid = `entry-${entry.id}-${entry.remind_at}@second-brain`;
  const title = entry.title || entry.content || 'Reminder';
  const description = entry.description || entry.raw_text || entry.summary || entry.content || title;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Second Brain//Reminder Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDate(now)}`,
    `DTSTART:${formatIcsDate(entry.remind_at)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'missing bearer token' });

  let authUser;
  try {
    authUser = await verifyAuthToken(token);
  } catch (err) {
    return res.status(401).json({ error: err.message || 'unauthorized' });
  }
  const userId = resolveAuthUserId(authUser);
  if (!userId) return res.status(401).json({ error: 'invalid auth token payload: expected UUID user id' });

  const id = parseInt(req.query.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'invalid id' });
  }

  try {
    const entry = await getEntry(userId, id);
    if (!entry) return res.status(404).json({ error: 'not found' });
    if (entry.category !== 'reminder' || !entry.remind_at) {
      return res.status(400).json({ error: 'entry is not a reminder with schedule' });
    }

    const ics = buildReminderIcs(entry);
    const reminderName = toSafeFilePart(entry.title || entry.content || 'reminder');
    const safeName = `second-brain-${reminderName}-${entry.id}.ics`;

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    return res.status(200).send(ics);
  } catch (err) {
    console.error('[GET /api/ics]', err);
    return res.status(500).json({ error: err.message });
  }
}
