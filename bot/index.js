import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { transcribe } from './whisper.js';
import { classify } from '../api/services/classify.js';
import { insertEntry } from '../api/services/db.js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not set');
if (!ALLOWED_CHAT_ID) throw new Error('TELEGRAM_CHAT_ID is not set');

const bot = new TelegramBot(TOKEN, { polling: true });

console.log('[bot] Polling for messages...');

// ─── Guard: only accept messages from the configured chat ID ─────────────────
function isAllowed(msg) {
  return msg.chat.id.toString() === ALLOWED_CHAT_ID;
}

// ─── Shared processing pipeline ──────────────────────────────────────────────
async function processText(rawText, chatId) {
  const { category, content, remind_at } = await classify(rawText);
  const entry = insertEntry({ raw_text: rawText, category, content, remind_at });

  let reply = `✅ Got it — saved as *${category}*.\n\n_${content}_`;

  if (category === 'reminder' && remind_at) {
    const when = new Date(remind_at * 1000).toLocaleString('en-SG', {
      timeZone: 'Asia/Singapore',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    reply += `\n\n⏰ I'll remind you on *${when}*.`;
  }

  return bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
}

// ─── Text messages ────────────────────────────────────────────────────────────
bot.on('text', async (msg) => {
  if (!isAllowed(msg)) return;

  const text = msg.text?.trim();
  if (!text || text.startsWith('/')) return; // ignore commands for now

  try {
    await bot.sendChatAction(msg.chat.id, 'typing');
    await processText(text, msg.chat.id);
  } catch (err) {
    console.error('[bot/text]', err.message);
    bot.sendMessage(msg.chat.id, `❌ Something went wrong: ${err.message}`);
  }
});

// ─── Voice messages ───────────────────────────────────────────────────────────
bot.on('voice', async (msg) => {
  if (!isAllowed(msg)) return;

  const chatId = msg.chat.id;

  try {
    await bot.sendChatAction(chatId, 'typing');

    // Download OGG file from Telegram
    const fileId = msg.voice.file_id;
    const fileInfo = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${fileInfo.file_path}`;

    const tmpPath = path.join(os.tmpdir(), `voice_${Date.now()}.ogg`);
    const res = await fetch(fileUrl);
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(tmpPath, Buffer.from(buffer));

    // Transcribe
    const rawText = await transcribe(tmpPath);
    fs.unlinkSync(tmpPath); // clean up

    if (!rawText) {
      return bot.sendMessage(chatId, "🤔 Couldn't transcribe that — try speaking more clearly.");
    }

    await bot.sendMessage(chatId, `🎙️ _Transcribed: "${rawText}"_`, { parse_mode: 'Markdown' });
    await processText(rawText, chatId);
  } catch (err) {
    console.error('[bot/voice]', err.message);
    bot.sendMessage(chatId, `❌ Something went wrong: ${err.message}`);
  }
});

// ─── /start command ───────────────────────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
  if (!isAllowed(msg)) return;
  bot.sendMessage(
    msg.chat.id,
    `👋 *Second Brain* is ready.\n\nSend me a voice note or text message and I'll classify and store it for you.\n\nTypes I understand:\n• ⏰ Reminders (with times)\n• ✅ TODOs\n• 💡 Thoughts\n• 📝 Notes`,
    { parse_mode: 'Markdown' }
  );
});
