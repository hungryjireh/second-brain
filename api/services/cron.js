import cron from 'node-cron';
import { getDueReminders, markReminded } from './db.js';
import { sendMessage } from '../../bot/notify.js';

/**
 * Poll the DB every minute and fire any due reminders via Telegram.
 */
export function startCron() {
  cron.schedule('* * * * *', async () => {
    const due = await getDueReminders();
    if (!due || due.length === 0) return;

    console.log(`[cron] ${due.length} reminder(s) due`);

    for (const entry of due) {
      try {
        await sendMessage(`⏰ Reminder: ${entry.content}`);
        await markReminded(entry.id);
        console.log(`[cron] Fired reminder #${entry.id}: ${entry.content}`);
      } catch (err) {
        console.error(`[cron] Failed to send reminder #${entry.id}:`, err.message);
      }
    }
  });

  console.log('[cron] Reminder poller started (every minute)');
}
