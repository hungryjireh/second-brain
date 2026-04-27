/**
 * Run after every deploy to register (or re-register) the Telegram webhook.
 *
 *   TELEGRAM_BOT_TOKEN=xxx \
 *   TELEGRAM_WEBHOOK_SECRET=yyy \
 *   VERCEL_URL=https://your-app.vercel.app \
 *   node scripts/set-webhook.js
 *
 * Or just: npm run webhook:set   (reads from .env.local via dotenv)
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const TOKEN  = process.env.TELEGRAM_BOT_TOKEN;
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const BASE   = process.env.VERCEL_URL?.replace(/\/$/, '');

if (!TOKEN)  { console.error('❌  TELEGRAM_BOT_TOKEN not set'); process.exit(1); }
if (!BASE)   { console.error('❌  VERCEL_URL not set (e.g. https://your-app.vercel.app)'); process.exit(1); }

const webhookUrl = `${BASE}/api/bot`;

const body = {
  url: webhookUrl,
  allowed_updates: ['message'],
  drop_pending_updates: true,
  ...(SECRET ? { secret_token: SECRET } : {}),
};

const res  = await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
  method:  'POST',
  headers: { 'Content-Type': 'application/json' },
  body:    JSON.stringify(body),
});

const data = await res.json();

if (data.ok) {
  console.log(`✅  Webhook set → ${webhookUrl}`);
  if (SECRET) console.log('🔒  Secret token registered.');
} else {
  console.error('❌  setWebhook failed:', data.description);
  process.exit(1);
}
