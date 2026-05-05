import { insertEntry, getUserTimezone } from '../lib/db.js';
import { classify }    from '../lib/classify.js';
import { transcribeFromUrl } from '../lib/whisper.js';
import { sendMessage }  from '../lib/notify.js';

const TOKEN          = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const WEBHOOK_SECRET  = process.env.TELEGRAM_WEBHOOK_SECRET; // optional extra guard
const TELEGRAM_USER_ID = process.env.TELEGRAM_USER_ID || process.env.TELEGRAM_USER_EMAIL;

function isAllowed(msg) {
  return msg?.chat?.id?.toString() === ALLOWED_CHAT_ID;
}

async function processText(rawText, chatId) {
  if (!TELEGRAM_USER_ID) {
    throw new Error('Missing TELEGRAM_USER_ID or TELEGRAM_USER_EMAIL for bot-owned entries');
  }

  const timezone = await getUserTimezone(TELEGRAM_USER_ID);
  const { category, content, remind_at } = await classify(rawText, { timezone });
  await insertEntry({
    userId: TELEGRAM_USER_ID,
    raw_text: rawText,
    category,
    content,
    remind_at,
  });

  let reply = `✅ Got it — saved as *${category}*.\n\n_${content}_`;

  if (category === 'reminder' && remind_at) {
    const when = new Date(remind_at * 1000).toLocaleString('en-SG', {
      timeZone: timezone,
      weekday: 'short',
      month:   'short',
      day:     'numeric',
      hour:    '2-digit',
      minute:  '2-digit',
    });
    reply += `\n\n⏰ Reminder time detected: *${when}*.\nDownload the .ics file from the web app to save this reminder to your device calendar.`;
  }

  await sendMessage(reply, chatId);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  if (WEBHOOK_SECRET) {
    const header = req.headers['x-telegram-bot-api-secret-token'];
    if (header !== WEBHOOK_SECRET) return res.status(403).end();
  }

  const update = req.body;
  const msg    = update?.message;

  if (!msg || !isAllowed(msg)) {
    return res.status(200).end(); // nothing to do, respond and exit
  }

  const chatId = msg.chat.id;

  try {
    if (msg.text?.startsWith('/start')) {
      await sendMessage(
        `👋 *Second Brain* is ready.\n\nSend me a voice note or text and I'll classify and store it.\n\n• ⏰ Reminders\n• ✅ TODOs\n• 💡 Thoughts\n• 📝 Notes`,
        chatId
      );
    } else if (msg.text) {
      await notifyTyping(chatId);
      await processText(msg.text.trim(), chatId);
    } else if (msg.voice) {
      await notifyTyping(chatId);
      const fileInfo = await telegramGetFile(msg.voice.file_id);
      const audioUrl = `https://api.telegram.org/file/bot${TOKEN}/${fileInfo.file_path}`;
      const rawText  = await transcribeFromUrl(audioUrl);

      if (!rawText) {
        await sendMessage("🤔 Couldn't transcribe that — try speaking more clearly.", chatId);
      } else {
        await sendMessage(`🎙️ _Transcribed: "${rawText}"_`, chatId);
        await processText(rawText, chatId);
      }
    }
  } catch (err) {
    console.error('[bot webhook]', err.message);
    try {
      await sendMessage(`❌ Something went wrong: ${err.message}`, chatId);
    } catch { /* swallow */ }
  }

  // ✅ Respond only after all async work is done
  res.status(200).end();
}

// ─── Telegram API helpers ─────────────────────────────────────────────────────

async function telegramGetFile(fileId) {
  const res = await fetch(
    `https://api.telegram.org/bot${TOKEN}/getFile?file_id=${fileId}`
  );
  const data = await res.json();
  if (!data.ok) throw new Error(`getFile failed: ${data.description}`);
  return data.result;
}

async function notifyTyping(chatId) {
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendChatAction`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ chat_id: chatId, action: 'typing' }),
  }).catch(() => {}); // fire-and-forget, ignore errors
}
