import { getEntry } from '../lib/db.js';

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
    `SUMMARY:${escapeIcsText(entry.content)}`,
    `DESCRIPTION:${escapeIcsText(entry.raw_text || entry.content)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const id = parseInt(req.query.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'invalid id' });
  }

  try {
    const entry = await getEntry(id);
    if (!entry) return res.status(404).json({ error: 'not found' });
    if (entry.category !== 'reminder' || !entry.remind_at) {
      return res.status(400).json({ error: 'entry is not a reminder with schedule' });
    }

    const ics = buildReminderIcs(entry);
    const reminderName = toSafeFilePart(entry.content);
    const safeName = `second-brain-${reminderName}-${entry.id}.ics`;

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    return res.status(200).send(ics);
  } catch (err) {
    console.error('[GET /api/ics]', err);
    return res.status(500).json({ error: err.message });
  }
}
