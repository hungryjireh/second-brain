/**
 * Run after every deploy to register (or re-register) the Telegram webhook.
 *
 *   TELEGRAM_BOT_TOKEN=xxx \
 *   VERCEL_URL=https://your-app.vercel.app \
 *   WEBHOOK_LOCAL_FALLBACK_URL=http://localhost:3000 \
 *   node scripts/set-webhook.js
 *
 * Or just: npm run webhook:set   (reads from .env.local via dotenv)
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const TOKEN  = process.env.TELEGRAM_BOT_TOKEN;
const BASE   = process.env.VERCEL_URL?.replace(/\/$/, '');
const FALLBACK_BASE = process.env.WEBHOOK_LOCAL_FALLBACK_URL?.replace(/\/$/, '');

if (!TOKEN)  { console.error('❌  TELEGRAM_BOT_TOKEN not set'); process.exit(1); }
if (!BASE && !FALLBACK_BASE) {
  console.error('❌  Set VERCEL_URL or WEBHOOK_LOCAL_FALLBACK_URL');
  process.exit(1);
}

async function isReachable(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/api/bot`, { method: 'HEAD' });
    return res.ok || res.status === 405;
  } catch {
    return false;
  }
}

let activeBase = BASE || FALLBACK_BASE;
if (BASE) {
  const vercelReachable = await isReachable(BASE);
  if (!vercelReachable && FALLBACK_BASE) {
    console.warn(`⚠️  Could not reach VERCEL_URL (${BASE}); falling back to ${FALLBACK_BASE}`);
    activeBase = FALLBACK_BASE;
  }
}

const webhookUrl = `${activeBase}/api/bot`;

const body = {
  url: webhookUrl,
  allowed_updates: ['message'],
  drop_pending_updates: true,
};

const res  = await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
  method:  'POST',
  headers: { 'Content-Type': 'application/json' },
  body:    JSON.stringify(body),
});

const data = await res.json();

if (data.ok) {
  console.log(`✅  Webhook set → ${webhookUrl}`);
} else {
  console.error('❌  setWebhook failed:', data.description);
  process.exit(1);
}
