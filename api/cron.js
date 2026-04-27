import { getDueReminders, markReminded } from '../lib/db.js';
import { sendMessage } from '../lib/notify.js';

// This endpoint is called by Vercel Cron — configure in vercel.json (see below).
// It polls for due reminders and fires them via Telegram.
// Secured with CRON_SECRET so only Vercel's scheduler can trigger it.

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  // Verify the request comes from Vercel Cron
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const due = await getDueReminders();

    if (due.length === 0) {
      return res.status(200).json({ fired: 0 });
    }

    const results = await Promise.allSettled(
      due.map(async (entry) => {
        await sendMessage(`⏰ Reminder: ${entry.content}`);
        await markReminded(entry.id);
        return entry.id;
      })
    );

    const fired  = results.filter(r => r.status === 'fulfilled').length;
    const errors = results.filter(r => r.status === 'rejected').map(r => r.reason?.message);

    console.log(`[cron] Fired ${fired}/${due.length} reminders`);
    if (errors.length) console.error('[cron] Errors:', errors);

    return res.status(200).json({ fired, errors });
  } catch (err) {
    console.error('[cron]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
