import { json } from "../lib/open-brain/helpers.js";
import {
  getBearerToken,
  verifyAuthToken,
  resolveAuthUserId,
} from "../lib/auth.js";
import { extractChatGptShareConversation } from "../lib/extract-chatgpt-share-html.js";
import { importLlmConversationsAsEntries } from "../lib/llm-conversation-import.js";
import { scrapeChatGptShareData } from "../lib/scrape-chatgpt-share-url.js";
import { normalizeEntry } from "./entries.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  const token = getBearerToken(req);
  if (!token) return json(res, 401, { error: "missing bearer token" });

  let authUser;
  try {
    authUser = await verifyAuthToken(token);
  } catch (err) {
    return json(res, 401, { error: err.message || "unauthorized" });
  }

  const userId = resolveAuthUserId(authUser);
  if (!userId) {
    return json(res, 401, {
      error: "invalid auth token payload: expected UUID user id",
    });
  }

  const chatUrl = String(req.body?.chat_url ?? "").trim();
  if (!chatUrl) {
    return json(res, 400, { error: "chat_url is required" });
  }

  try {
    const { html, estuaryUrls } = await scrapeChatGptShareData(chatUrl);
    const conversations = extractChatGptShareConversation(html, {
      estuaryUrls,
    });
    const created = await importLlmConversationsAsEntries({
      userId,
      authToken: token,
      conversations,
      normalizeEntry,
    });

    if (created.length === 0) {
      return json(res, 400, {
        error: "No valid ChatGPT conversation messages found in shared link",
      });
    }

    return json(res, 201, {
      source_url: chatUrl,
      extracted_conversations: conversations,
      created,
    });
  } catch (err) {
    console.error("[POST /api/import-chatgpt-share]", err);
    return json(res, err?.status === 400 ? 400 : 500, { error: err.message });
  }
}
