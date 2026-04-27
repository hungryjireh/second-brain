/**
 * Send a plain-text message to the hard-coded personal chat ID via Telegram Bot API.
 * Used by both the bot webhook handler and the cron reminder endpoint.
 */
export async function sendMessage(text, chatId) {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const target = chatId ?? process.env.TELEGRAM_CHAT_ID;

  if (!token || !target) {
    throw new Error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set');
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ chat_id: target, text, parse_mode: 'Markdown' }),
  });

  console.log(res)

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram sendMessage failed ${res.status}: ${err}`);
  }

  return res.json();
}
