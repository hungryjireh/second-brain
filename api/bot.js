import {
  getTelegramLinkByChatId,
  setTelegramChatIdForUser,
} from "../lib/db.js";
import {
  createTelegramSessionToken,
  refreshSupabaseSession,
  TELEGRAM_SESSION_TOKEN_PURPOSE,
  verifyTelegramLinkKey,
} from "../lib/auth.js";
import { transcribeFromUrl } from "../lib/whisper.js";
import { sendMessage } from "../lib/notify.js";
import { classifyAndInsertEntry } from "../lib/entry-processing.js";
import {
  MAX_VOICE_NOTE_DURATION_SECONDS,
  MIN_VOICE_NOTE_DURATION_SECONDS,
} from "../lib/constants/voice.js";
import crypto from "crypto";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = String(process.env.TELEGRAM_WEBHOOK_SECRET || "");
const DEFAULT_TIMEZONE = "Asia/Singapore";

const LINK_USAGE_MESSAGE =
  "To use this bot, first link your account:\n1) Open secondbrain webapp settings\n2) Copy your Telegram link key\n3) Send: /link <your-key>";

function hasValidWebhookSecret(req) {
  if (!WEBHOOK_SECRET) return true;
  const provided = req.headers["x-telegram-bot-api-secret-token"];
  if (typeof provided !== "string") return false;
  const expectedBuffer = Buffer.from(WEBHOOK_SECRET, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

async function processText(rawText, chatId, userId, authToken) {
  const { textToClassify, finalCategory, normalizedContent, remindAt } =
    await classifyAndInsertEntry({
      rawText,
      userId,
      authToken,
    });

  let reply = `✅ Got it — saved as *${finalCategory}*.\n\n_${normalizedContent || textToClassify}_`;

  if (finalCategory === "reminder" && remindAt) {
    const when = new Date(remindAt * 1000).toLocaleString("en-SG", {
      timeZone: DEFAULT_TIMEZONE,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    reply += `\n\n⏰ Reminder time detected: *${when}*.\nDownload the .ics file from the web app to save this reminder to your device calendar.`;
  }

  await sendMessage(reply, chatId);
}

async function linkTelegramChatToUser(chatId, linkKey) {
  const { userId, authTokenToStore, requestAuthToken } =
    verifyTelegramLinkKey(linkKey);
  await setTelegramChatIdForUser(
    userId,
    chatId,
    authTokenToStore,
    requestAuthToken,
  );
  return userId;
}

async function getLinkedUserId(chatId) {
  return getTelegramLinkByChatId(String(chatId));
}

function maybeReadJwtPayloadWithoutVerifying(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(
      Buffer.from(normalized + padding, "base64").toString("utf8"),
    );
  } catch {
    return null;
  }
}

function isLegacyLocalTelegramSessionToken(token) {
  const payload = maybeReadJwtPayloadWithoutVerifying(token);
  if (payload?.purpose !== TELEGRAM_SESSION_TOKEN_PURPOSE) return false;
  const hasRefreshToken = typeof payload?.srt === "string" && payload.srt;
  const hasVersion = Number.isInteger(payload?.v);
  return !payload?.exp && !hasRefreshToken && !hasVersion;
}

async function resolveBotAuthToken({ chatId, userId, storedToken }) {
  const payload = maybeReadJwtPayloadWithoutVerifying(storedToken);
  if (payload?.purpose !== TELEGRAM_SESSION_TOKEN_PURPOSE) {
    return String(storedToken || "").trim();
  }

  const refreshToken = String(payload?.srt || "").trim();
  if (!refreshToken) {
    throw new Error("missing refresh token for telegram session");
  }

  const session = await refreshSupabaseSession({ refreshToken });
  const refreshedAccessToken = String(session?.access_token || "").trim();
  if (!refreshedAccessToken) {
    throw new Error("Supabase session did not return an access token");
  }

  const nextRefreshToken = String(
    session?.refresh_token || refreshToken,
  ).trim();
  if (nextRefreshToken && nextRefreshToken !== refreshToken) {
    const nextSessionToken = createTelegramSessionToken(
      userId,
      nextRefreshToken,
    );
    try {
      await setTelegramChatIdForUser(
        userId,
        chatId,
        nextSessionToken,
        refreshedAccessToken,
      );
    } catch (err) {
      console.warn("[bot webhook] failed to persist rotated refresh token", {
        userId,
        chatId: String(chatId),
        error: err?.message || "unknown error",
      });
    }
  }

  return refreshedAccessToken;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!hasValidWebhookSecret(req)) return res.status(401).end();

  const update = req.body;
  const msg = update?.message;

  if (!msg) {
    return res.status(200).end(); // nothing to do, respond and exit
  }

  const chatId = msg.chat.id;

  try {
    const text = msg.text?.trim();

    if (text?.startsWith("/link")) {
      const linkKey = text.replace("/link", "").trim();
      if (!linkKey) {
        await sendMessage(
          "Please provide your link key: /link <your-key>",
          chatId,
        );
        return res.status(200).end();
      }
      await linkTelegramChatToUser(chatId, linkKey);
      await sendMessage(
        `✅ Your Telegram is now linked to your secondbrain account. Send any text or voice note (max ${MAX_VOICE_NOTE_DURATION_SECONDS} seconds) to continue.`,
        chatId,
      );
      return res.status(200).end();
    }

    const linkedUser = await getLinkedUserId(chatId);
    if (!linkedUser?.userId || !linkedUser?.authToken) {
      await sendMessage(
        `🔒 Account linking required.\n\n${LINK_USAGE_MESSAGE}`,
        chatId,
      );
      return res.status(200).end();
    }
    if (isLegacyLocalTelegramSessionToken(linkedUser.authToken)) {
      await sendMessage(
        `🔒 Please relink your account to refresh your session:\n/link <your-key>`,
        chatId,
      );
      return res.status(200).end();
    }

    const authToken = await resolveBotAuthToken({
      chatId,
      userId: linkedUser.userId,
      storedToken: linkedUser.authToken,
    });

    if (text?.startsWith("/start")) {
      await sendMessage(
        `👋 *Second Brain* is ready.\n\nSend me a voice note (max ${MAX_VOICE_NOTE_DURATION_SECONDS} seconds) or text and I'll classify and store it.\n\n• ⏰ Reminders\n• ✅ TODOs\n• 💡 Thoughts\n• 📝 Notes\n\nNeed to relink? Use /link <your-key>.`,
        chatId,
      );
    } else if (text) {
      await notifyTyping(chatId);
      await processText(text, chatId, linkedUser.userId, authToken);
    } else if (msg.voice) {
      if ((msg.voice.duration || 0) < MIN_VOICE_NOTE_DURATION_SECONDS) {
        await sendMessage(
          `⏱️ Voice notes must be at least ${MIN_VOICE_NOTE_DURATION_SECONDS} seconds long. Please try recording again.`,
          chatId,
        );
        return res.status(200).end();
      }
      if ((msg.voice.duration || 0) > MAX_VOICE_NOTE_DURATION_SECONDS) {
        await sendMessage(
          `⏱️ Voice notes must be ${MAX_VOICE_NOTE_DURATION_SECONDS} seconds or less. Please send a shorter voice note.`,
          chatId,
        );
        return res.status(200).end();
      }
      await notifyTyping(chatId);
      const fileInfo = await telegramGetFile(msg.voice.file_id);
      const audioUrl = `https://api.telegram.org/file/bot${TOKEN}/${fileInfo.file_path}`;
      const rawText = await transcribeFromUrl(audioUrl);

      if (!rawText) {
        await sendMessage(
          "🤔 Couldn't transcribe that — try speaking more clearly.",
          chatId,
        );
      } else {
        await sendMessage(`🎙️ _Transcribed: "${rawText}"_`, chatId);
        await processText(rawText, chatId, linkedUser.userId, authToken);
      }
    }
  } catch (err) {
    console.error("[bot webhook]", err.message);
    try {
      if (/JWT|token|expired|unauthorized|401/i.test(err.message || "")) {
        await sendMessage(
          `🔒 Your login session expired. Please relink your account:\n/link <your-key>`,
          chatId,
        );
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
    `https://api.telegram.org/bot${TOKEN}/getFile?file_id=${fileId}`,
  );
  const data = await res.json();
  if (!data.ok) throw new Error(`getFile failed: ${data.description}`);
  return data.result;
}

async function notifyTyping(chatId) {
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  }).catch(() => {}); // fire-and-forget, ignore errors
}
