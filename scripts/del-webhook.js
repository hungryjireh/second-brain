/**
 * Removes the Telegram webhook — use this when developing locally
 * with long-polling, or when decommissioning.
 *
 *   TELEGRAM_BOT_TOKEN=xxx node scripts/del-webhook.js
 *   or: npm run webhook:del
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) { console.error('❌  TELEGRAM_BOT_TOKEN not set'); process.exit(1); }

const res  = await fetch(
  `https://api.telegram.org/bot${TOKEN}/deleteWebhook?drop_pending_updates=true`
);
const data = await res.json();

if (data.ok) {
  console.log('✅  Webhook deleted. Bot is now in polling mode.');
} else {
  console.error('❌  deleteWebhook failed:', data.description);
  process.exit(1);
}
