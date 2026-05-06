import {
  insertEntry,
  getTelegramLinkByChatId,
  setTelegramChatIdForUser,
} from '../lib/db.js';
import { verifyTelegramLinkKey } from '../lib/auth.js';
import { classify } from '../lib/classify.js';
import { transcribeFromUrl } from '../lib/whisper.js';
import { sendMessage } from '../lib/notify.js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET; // optional extra guard
const DEFAULT_TIMEZONE = 'Asia/Singapore';

const LINK_USAGE_MESSAGE = 'To use this bot, first link your account:\n1) Open secondbrain webapp settings\n2) Copy your Telegram link key\n3) Send: /link <your-key>';

async function processText(rawText, chatId, userId, authToken) {
  const { category, content, remind_at } = await classify(rawText);
  await insertEntry({
    userId,
    raw_text: rawText,
    category,
    content,
    remind_at,
    authToken,
  });

  let reply = `✅ Got it — saved as *${category}*.\n\n_${content}_`;

  if (category === 'reminder' && remind_at) {
    const when = new Date(remind_at * 1000).toLocaleString('en-SG', {
      timeZone: DEFAULT_TIMEZONE,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    reply += `\n\n⏰ Reminder time detected: *${when}*.\nDownload the .ics file from the web app to save this reminder to your device calendar.`;
  }

  await sendMessage(reply, chatId);
}

async function linkTelegramChatToUser(chatId, linkKey) {
  const { userId, authToken } = verifyTelegramLinkKey(linkKey);
  await setTelegramChatIdForUser(userId, chatId, authToken);
  return userId;
}

async function getLinkedUserId(chatId) {
  return getTelegramLinkByChatId(String(chatId));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  if (WEBHOOK_SECRET) {
    const header = req.headers['x-telegram-bot-api-secret-token'];
    if (header !== WEBHOOK_SECRET) return res.status(403).end();
  }

  const update = req.body;
  const msg = update?.message;

  if (!msg) {
    return res.status(200).end(); // nothing to do, respond and exit
  }

  const chatId = msg.chat.id;

  try {
    const text = msg.text?.trim();

    if (text?.startsWith('/link')) {
      const linkKey = text.replace('/link', '').trim();
      if (!linkKey) {
        await sendMessage('Please provide your link key: /link <your-key>', chatId);
        return res.status(200).end();
      }
      await linkTelegramChatToUser(chatId, linkKey);
      await sendMessage('✅ Your Telegram is now linked to your secondbrain account. Send any text or voice note to continue.', chatId);
      return res.status(200).end();
    }

    const linkedUser = await getLinkedUserId(chatId);
    if (!linkedUser?.userId || !linkedUser?.authToken) {
      await sendMessage(`🔒 Account linking required.\n\n${LINK_USAGE_MESSAGE}`, chatId);
      return res.status(200).end();
    }

    if (text?.startsWith('/start')) {
      await sendMessage(
        `👋 *Second Brain* is ready.\n\nSend me a voice note or text and I'll classify and store it.\n\n• ⏰ Reminders\n• ✅ TODOs\n• 💡 Thoughts\n• 📝 Notes\n\nNeed to relink? Use /link <your-key>.`,
        chatId
      );
    } else if (text) {
      await notifyTyping(chatId);
      await processText(text, chatId, linkedUser.userId, linkedUser.authToken);
    } else if (msg.voice) {
      await notifyTyping(chatId);
      const fileInfo = await telegramGetFile(msg.voice.file_id);
      const audioUrl = `https://api.telegram.org/file/bot${TOKEN}/${fileInfo.file_path}`;
      const rawText = await transcribeFromUrl(audioUrl);

      if (!rawText) {
        await sendMessage("🤔 Couldn't transcribe that — try speaking more clearly.", chatId);
      } else {
        await sendMessage(`🎙️ _Transcribed: "${rawText}"_`, chatId);
        await processText(rawText, chatId, linkedUser.userId, linkedUser.authToken);
      }
    }
  } catch (err) {
    console.error('[bot webhook]', err.message);
    try {
      if (/JWT|token|expired|unauthorized|401/i.test(err.message || '')) {
        await sendMessage(`🔒 Your login session expired. Please relink your account:\n/link <your-key>`, chatId);
      } else {
        await sendMessage(`❌ Something went wrong: ${err.message}`, chatId);
      }
    } catch {
      // swallow
    }
  }

  // Respond only after all async work is done.
  res.status(200).end();
}

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
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
  }).catch(() => {}); // fire-and-forget, ignore errors
}
