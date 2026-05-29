import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  decodeHtmlEntities,
  extractChatGptShareConversation,
  stripTagsToMarkdown,
} from "./extract-chatgpt-share-html.js";

const CLAUDE_SHARE_ID_REGEX = /claude\.ai\/share\/([0-9a-f-]{8,})/i;

function hashUuid(input) {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 32);
}

function extractClaudeMessageText(messageBlock, role, fallbackText) {
  if (role === "human") {
    const userMessageMatch = messageBlock.match(
      /<div\b[^>]*data-testid="user-message"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i,
    );
    if (userMessageMatch?.[1]) {
      const text = stripTagsToMarkdown(userMessageMatch[1]);
      if (text) return text;
    }
  }

  if (role === "assistant") {
    const assistantMessageMatch = messageBlock.match(
      /<div\b[^>]*class="[^"]*standard-markdown[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/i,
    );
    if (assistantMessageMatch?.[1]) {
      const text = stripTagsToMarkdown(assistantMessageMatch[1]);
      if (text) return text;
    }
  }

  return fallbackText;
}

function inferFileKind(fileName, badgeText) {
  const normalized = `${fileName} ${badgeText}`.toLowerCase();
  if (
    normalized.includes(".png") ||
    normalized.includes(".jpg") ||
    normalized.includes(".jpeg") ||
    normalized.includes(".gif") ||
    normalized.includes(".webp") ||
    normalized.includes("image")
  ) {
    return "image";
  }
  return "document";
}

function extractClaudeMessageFiles(messageBlock, role, messageUuidPrefix) {
  if (role !== "human") return [];

  const thumbnailRegex =
    /<div\b[^>]*data-testid="file-thumbnail"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
  const files = [];
  let fileIndex = 0;
  let match;
  while ((match = thumbnailRegex.exec(messageBlock)) !== null) {
    const fileNameMatch = match[1].match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i);
    const fileName = fileNameMatch
      ? decodeHtmlEntities(stripTagsToMarkdown(fileNameMatch[1])).trim()
      : "";
    if (!fileName || fileName === "Files hidden in shared chats") continue;

    const badgeText = decodeHtmlEntities(
      stripTagsToMarkdown(match[1].replace(/<h3\b[^>]*>[\s\S]*?<\/h3>/i, "")),
    ).trim();
    const kind = inferFileKind(fileName, badgeText);
    fileIndex += 1;
    files.push({
      id: hashUuid(`${messageUuidPrefix}:file:${fileIndex}:${fileName}`),
      kind,
      source: "claude_share",
      url: null,
    });
  }

  return files;
}

function extractClaudeShareConversation(html, options = {}) {
  const shareIdMatch = html.match(CLAUDE_SHARE_ID_REGEX);
  const shareId = shareIdMatch?.[1];
  const titleMatch = html.match(
    /<div class="truncate text-text-300">([\s\S]*?)<\/div>/i,
  );
  const buildTimestampMatch = html.match(/data-build-timestamp="(\d{10,})"/i);

  const fallbackPayload = extractChatGptShareConversation(html, options);
  const createdAt = buildTimestampMatch
    ? new Date(Number(buildTimestampMatch[1]) * 1000).toISOString()
    : (fallbackPayload[0]?.created_at ?? new Date().toISOString());
  const updatedAt = createdAt;

  const blockRegex =
    /<h2 class="sr-only select-none">([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2 class="sr-only select-none">|<\/body>)/gi;
  const chatMessages = [];
  let messageIndex = 0;
  let match;

  while ((match = blockRegex.exec(html)) !== null) {
    const headerText = decodeHtmlEntities(stripTagsToMarkdown(match[1])).trim();
    const messageBlock = match[2];

    let sender;
    let fallbackText;
    if (headerText.startsWith("You said:")) {
      sender = "human";
      fallbackText = headerText.replace(/^You said:\s*/i, "").trim();
    } else if (headerText.startsWith("Claude responded:")) {
      sender = "assistant";
      fallbackText = headerText.replace(/^Claude responded:\s*/i, "").trim();
    } else {
      continue;
    }

    const text = extractClaudeMessageText(messageBlock, sender, fallbackText);
    if (!text) continue;

    messageIndex += 1;
    const messageUuidPrefix = `${shareId ?? "claude"}:${messageIndex}:${sender}:${text}`;
    const files = extractClaudeMessageFiles(
      messageBlock,
      sender,
      messageUuidPrefix,
    );
    chatMessages.push({
      uuid: hashUuid(messageUuidPrefix),
      text,
      content: [
        {
          start_timestamp: null,
          stop_timestamp: null,
          flags: null,
          type: "text",
          text,
          citations: [],
        },
      ],
      sender,
      created_at: createdAt,
      updated_at: updatedAt,
      attachments: [],
      files,
      parent_message_uuid: null,
    });
  }

  if (chatMessages.length === 0) {
    if (fallbackPayload[0]) {
      fallbackPayload[0].uuid = shareId ?? fallbackPayload[0].uuid;
      if (fallbackPayload[0].name === "Imported ChatGPT conversation") {
        fallbackPayload[0].name = "Imported Claude conversation";
      }
    }
    return fallbackPayload;
  }

  return [
    {
      uuid: shareId ?? hashUuid(html),
      name: decodeHtmlEntities(
        titleMatch?.[1]?.trim() || "Imported Claude conversation",
      ),
      summary: "",
      created_at: createdAt,
      updated_at: updatedAt,
      account: { uuid: "[REDACTED]" },
      chat_messages: chatMessages,
    },
  ];
}

function writeClaudeShareConversationFile(inputPath, outputPath, options = {}) {
  const html = fs.readFileSync(inputPath, "utf8");
  const payload = extractClaudeShareConversation(html, options);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

function runCli() {
  const inputPath =
    process.argv[2] ?? "sample/claude/claude_conversation_share.txt";
  const outputPath =
    process.argv[3] ?? "sample/claude/claude_conversation.json";
  const payload = writeClaudeShareConversationFile(inputPath, outputPath);
  const messageCount = payload[0]?.chat_messages?.length ?? 0;
  console.log(`Wrote ${messageCount} messages to ${outputPath}`);
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) runCli();

export { extractClaudeShareConversation, writeClaudeShareConversationFile };
