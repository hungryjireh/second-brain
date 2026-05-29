import { insertEntry } from "../../db.js";
import { classify } from "./classify.js";
import {
  compactWhitespace,
  truncateWords,
  truncateChars,
} from "../../text-format.js";

function parseClassifierTags(input) {
  if (!Array.isArray(input)) return [];

  const deduped = new Map();
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const label = compactWhitespace(raw.replace(/^#+/, ""));
    if (!label) continue;
    const normalized = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32);
    if (!normalized) continue;
    if (!deduped.has(normalized)) {
      deduped.set(normalized, {
        name: label.slice(0, 32),
        normalized_name: normalized,
      });
    }
  }
  return [...deduped.values()].slice(0, 12);
}

export function parseClaudeConversationsImport(input) {
  const source = Array.isArray(input) ? input : [input];
  const conversations = [];

  for (const item of source) {
    if (!item || typeof item !== "object") continue;
    const chatMessages = Array.isArray(item.chat_messages)
      ? item.chat_messages
      : [];
    const messages = chatMessages
      .map((msg) => ({
        uuid: msg?.uuid ? String(msg.uuid) : null,
        sender: msg?.sender === "human" ? "human" : "assistant",
        text: String(msg?.text ?? "").trim(),
        created_at: msg?.created_at ? String(msg.created_at) : null,
        files: Array.isArray(msg?.files)
          ? msg.files
              .filter((file) => file && typeof file === "object")
              .map((file) => ({
                id: file.id ? String(file.id) : null,
                kind: file.kind ? String(file.kind) : null,
                source: file.source ? String(file.source) : null,
                url: file.url ? String(file.url) : null,
              }))
          : [],
      }))
      .filter((msg) => msg.text);
    if (messages.length === 0) continue;

    const firstHuman = messages.find((msg) => msg.sender === "human");
    const fallbackSummary = firstHuman?.text ?? messages[0]?.text ?? "";
    const summary =
      truncateChars(truncateWords(fallbackSummary, 22), 180) ||
      "Imported conversation";
    const title =
      truncateChars(
        compactWhitespace(String(item.name ?? "Imported Claude conversation")),
        80,
      ) || "Imported Claude conversation";

    conversations.push({
      source: "claude",
      title,
      summary,
      raw_text: JSON.stringify({
        _format: "chat_conversation_v1",
        source: "claude",
        conversation: {
          uuid: item.uuid ? String(item.uuid) : null,
          name: String(item.name ?? ""),
          created_at: item.created_at ? String(item.created_at) : null,
          updated_at: item.updated_at ? String(item.updated_at) : null,
        },
        messages,
      }),
    });
  }

  return conversations;
}

function extractChatGptMessageText(message) {
  if (!message || typeof message !== "object") return "";
  const content = message.content;
  if (!content) return "";

  if (typeof content === "string") return content.trim();

  if (Array.isArray(content?.parts)) {
    return content.parts
      .map((part) => (typeof part === "string" ? part : ""))
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && typeof part.text === "string") {
          return part.text;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  if (typeof content?.text === "string") return content.text.trim();
  return "";
}

export function parseChatGptConversationsImport(input) {
  const source = Array.isArray(input) ? input : [input];
  const conversations = [];

  for (const item of source) {
    if (!item || typeof item !== "object") continue;

    let orderedMessages = [];

    if (item.mapping && typeof item.mapping === "object") {
      const nodes = Object.values(item.mapping)
        .filter((node) => node && typeof node === "object" && node.message)
        .map((node) => node.message)
        .filter(Boolean)
        .map((msg) => {
          const role =
            msg?.author?.role === "user"
              ? "human"
              : msg?.author?.role === "assistant"
                ? "assistant"
                : null;
          const text = extractChatGptMessageText(msg);
          const createdAt = Number(msg?.create_time);
          return {
            id: msg?.id ? String(msg.id) : null,
            sender: role,
            text,
            createdAt: Number.isFinite(createdAt) ? createdAt : null,
          };
        })
        .filter((msg) => msg.sender && msg.text);

      orderedMessages = nodes
        .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
        .map((msg) => ({ uuid: msg.id, sender: msg.sender, text: msg.text }));
    } else if (Array.isArray(item.messages)) {
      orderedMessages = item.messages
        .map((msg) => {
          const sender =
            msg?.author === "user" || msg?.role === "user"
              ? "human"
              : "assistant";
          const text = String(msg?.text ?? msg?.content ?? "").trim();
          return { uuid: msg?.id ? String(msg.id) : null, sender, text };
        })
        .filter((msg) => msg.text);
    }

    if (orderedMessages.length === 0) continue;

    const firstHuman = orderedMessages.find((msg) => msg.sender === "human");
    const fallbackSummary = firstHuman?.text ?? orderedMessages[0]?.text ?? "";
    const summary =
      truncateChars(truncateWords(fallbackSummary, 22), 180) ||
      "Imported conversation";
    const title =
      truncateChars(
        compactWhitespace(
          String(item.title ?? item.name ?? "Imported ChatGPT conversation"),
        ),
        80,
      ) || "Imported ChatGPT conversation";
    const createTime = Number(item?.create_time);
    const updateTime = Number(item?.update_time);

    conversations.push({
      source: "chatgpt",
      title,
      summary,
      raw_text: JSON.stringify({
        _format: "chat_conversation_v1",
        source: "chatgpt",
        conversation: {
          uuid: item.id ? String(item.id) : null,
          name: String(item.title ?? item.name ?? ""),
          created_at: Number.isFinite(createTime)
            ? new Date(createTime * 1000).toISOString()
            : null,
          updated_at: Number.isFinite(updateTime)
            ? new Date(updateTime * 1000).toISOString()
            : null,
        },
        messages: orderedMessages,
      }),
    });
  }

  return conversations;
}

export async function importLlmConversationsAsEntries({
  userId,
  authToken,
  conversations,
  normalizeEntry,
  classifyFn,
}) {
  const parsed = [
    ...parseClaudeConversationsImport(conversations),
    ...parseChatGptConversationsImport(conversations),
  ];

  if (parsed.length === 0) {
    return [];
  }

  const created = [];
  const classifyConversation =
    typeof classifyFn === "function" ? classifyFn : classify;

  for (const conversation of parsed) {
    const fallbackTags = ["imported", conversation.source || "chat"];
    let category = "note";
    let title = conversation.title;
    let summary = conversation.summary;
    let remind_at = null;
    let tags = fallbackTags;

    const classificationInput = compactWhitespace(
      `${conversation.title}\n${conversation.summary}`,
    );

    if (process.env.GROQ_API_KEY) {
      try {
        const classified = await classifyConversation(classificationInput, {});
        category = compactWhitespace(classified?.category) || category;
        title = compactWhitespace(classified?.title) || title;
        summary = compactWhitespace(classified?.summary) || summary;
        remind_at = Number.isInteger(classified?.remind_at)
          ? classified.remind_at
          : null;
        const normalizedTags = parseClassifierTags(classified?.tags);
        if (normalizedTags.length > 0) {
          tags = normalizedTags;
        }
      } catch (err) {
        console.error("[importLlmConversationsAsEntries] classify failed", err);
      }
    }

    const entry = await insertEntry({
      userId,
      raw_text: conversation.raw_text,
      category,
      title,
      summary,
      content: summary,
      remind_at,
      priority: 0,
      tags,
      authToken,
    });
    if (entry) {
      created.push(
        typeof normalizeEntry === "function" ? normalizeEntry(entry) : entry,
      );
    }
  }

  return created;
}
