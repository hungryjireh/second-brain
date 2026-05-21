import { extractChatGptShareConversation } from "./extract-chatgpt-share-html.js";

const CLAUDE_SHARE_ID_REGEX = /claude\.ai\/share\/([0-9a-f-]{8,})/i;

function extractClaudeShareConversation(html, options = {}) {
  const payload = extractChatGptShareConversation(html, options);
  const shareIdMatch = html.match(CLAUDE_SHARE_ID_REGEX);
  const shareId = shareIdMatch?.[1];

  if (!payload[0]) return payload;

  if (shareId) {
    payload[0].uuid = shareId;
  }
  if (payload[0].name === "Imported ChatGPT conversation") {
    payload[0].name = "Imported Claude conversation";
  }

  return payload;
}

export { extractClaudeShareConversation };
