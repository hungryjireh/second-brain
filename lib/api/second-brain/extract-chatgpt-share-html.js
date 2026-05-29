import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function decodeHtmlEntities(input) {
  return input
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function inlineTextFromHtml(html) {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function escapeMarkdownCell(text) {
  return text.replace(/\|/g, "\\|");
}

function linkifyPlainUrls(text) {
  return text.replace(/(?<!\]\()(https?:\/\/[^\s)]+)/gi, (_, url) => {
    return `[${url}](${url})`;
  });
}

function renderInlineMarkupAsMarkdown(html) {
  let output = html;
  output = output.replace(
    /<a\b[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, label) => `[${inlineTextFromHtml(label)}](${href})`,
  );
  output = output.replace(
    /<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi,
    (_, __, content) => `**${inlineTextFromHtml(content)}**`,
  );
  output = output.replace(
    /<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi,
    (_, __, content) => `*${inlineTextFromHtml(content)}*`,
  );
  output = output.replace(
    /<u\b[^>]*>([\s\S]*?)<\/u>/gi,
    (_, content) => `__${inlineTextFromHtml(content)}__`,
  );
  output = output.replace(
    /<code\b[^>]*>([\s\S]*?)<\/code>/gi,
    (_, content) => `\`${inlineTextFromHtml(content)}\``,
  );
  return output;
}

function renderCodeBlocksAsMarkdown(html) {
  return html.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_, content) => {
    const codeText = decodeHtmlEntities(
      content.replace(/<\/p>/gi, "\n").replace(/<br\s*\/?>/gi, "\n"),
    )
      .replace(/<[^>]+>/g, "")
      .replace(/\r/g, "")
      .trim();
    if (!codeText) return "";
    return `\n\n\`\`\`\n${codeText}\n\`\`\`\n\n`;
  });
}

function renderListItemsAsMarkdown(content, markerFn) {
  const items = [...content.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => inlineTextFromHtml(renderInlineMarkupAsMarkdown(match[1])))
    .filter(Boolean);
  if (items.length === 0) return "";
  return `${items.map((item, idx) => `${markerFn(idx)} ${item}`).join("\n")}\n`;
}

function renderListsAsMarkdown(html) {
  let output = html;
  output = output.replace(
    /<ol\b[^>]*>([\s\S]*?)<\/ol>/gi,
    (_, content) =>
      `\n\n${renderListItemsAsMarkdown(content, (idx) => `${idx + 1}.`)}\n`,
  );
  output = output.replace(
    /<ul\b[^>]*>([\s\S]*?)<\/ul>/gi,
    (_, content) => `\n\n${renderListItemsAsMarkdown(content, () => "-")}\n`,
  );
  return output;
}

function renderBlockquotesAsMarkdown(html) {
  return html.replace(
    /<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi,
    (_, content) => {
      const text = decodeHtmlEntities(
        content
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<\/p>/gi, "\n")
          .replace(/<\/div>/gi, "\n"),
      )
        .replace(/<[^>]+>/g, "")
        .replace(/\r/g, "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `> ${line}`)
        .join("\n");
      return text ? `\n\n${text}\n\n` : "";
    },
  );
}

function renderTablesAsMarkdown(html) {
  return html.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (tableHtml) => {
    const rowMatches = [...tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
    if (rowMatches.length === 0) return "";

    const rows = rowMatches
      .map((rowMatch) => {
        const cells = [
          ...rowMatch[1].matchAll(/<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi),
        ].map((cellMatch) => {
          const inlineMarkdown = renderInlineMarkupAsMarkdown(cellMatch[2]);
          const linked = linkifyPlainUrls(inlineTextFromHtml(inlineMarkdown));
          return escapeMarkdownCell(linked);
        });
        return cells.filter(Boolean);
      })
      .filter((cells) => cells.length > 0);

    if (rows.length < 2) return "";

    const header = rows[0];
    const colCount = header.length;
    const body = rows.slice(1).map((row) => {
      const normalized = row.slice(0, colCount);
      while (normalized.length < colCount) normalized.push("");
      return normalized;
    });

    const headerLine = `|  ${header.join("  |  ")}  |`;
    const separator = `| ${header.map(() => "---").join(" | ")} |`;
    const bodyLines = body.map((row) => `|  ${row.join("  |  ")}  |`);
    return `\n\n${[headerLine, separator, ...bodyLines].join("\n")}\n\n`;
  });
}

function stripTagsToMarkdown(html) {
  const withoutSourcesSections = html.replace(
    /<([a-z0-9]+)\b[^>]*aria-label="Sources"[^>]*>[\s\S]*?<\/\1>/gi,
    "",
  );
  const withMarkdownCodeBlocks = renderCodeBlocksAsMarkdown(
    withoutSourcesSections,
  );
  const withMarkdownTables = renderTablesAsMarkdown(withMarkdownCodeBlocks);
  const withMarkdownLists = renderListsAsMarkdown(withMarkdownTables);
  const withMarkdownBlockquotes =
    renderBlockquotesAsMarkdown(withMarkdownLists);
  const withMarkdownHeaders = withMarkdownBlockquotes.replace(
    /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi,
    (_, level, content) => {
      const text = inlineTextFromHtml(content);
      if (!text) return "";
      return `\n\n${"#".repeat(Number(level))} ${text}\n\n`;
    },
  );
  const withInlineMarkdown = renderInlineMarkupAsMarkdown(withMarkdownHeaders);

  const withLineBreaks = withInlineMarkdown
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "- ");

  const withoutTags = withLineBreaks
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "");

  const normalized = linkifyPlainUrls(decodeHtmlEntities(withoutTags))
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const cleanedLines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        line !== "ChatGPT said:" &&
        line !== "ChatGPT said" &&
        line !== "#### ChatGPT said:" &&
        line !== "You said:" &&
        line !== "#### You said:" &&
        line !== "Sources" &&
        line !== "Show moreShow less" &&
        line !== "Voice" &&
        line !== "Reject non-essential" &&
        line !== "Accept all" &&
        line !== "We use cookies" &&
        line !== "we use cookies" &&
        line !== "# We use cookies" &&
        !line.startsWith("ChatGPT can make mistakes.") &&
        !line.startsWith("Cookies help this site function"),
    );

  const bulletMarkerRegex = /^[-–—•]\s*$/;
  const bulletNormalized = [];
  for (let i = 0; i < cleanedLines.length; i += 1) {
    const line = cleanedLines[i];
    if (bulletMarkerRegex.test(line)) {
      let nextIndex = i + 1;
      while (
        nextIndex < cleanedLines.length &&
        bulletMarkerRegex.test(cleanedLines[nextIndex])
      ) {
        nextIndex += 1;
      }
      if (nextIndex < cleanedLines.length) {
        bulletNormalized.push(`- ${cleanedLines[nextIndex]}`);
        i = nextIndex;
        continue;
      }
    }
    bulletNormalized.push(line);
  }

  return bulletNormalized
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function hashUuid(input) {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 32);
}

function extractImageAltText(messageHtml) {
  const imgAltMatch = messageHtml.match(/<img\b[^>]*\balt="([^"]+)"[^>]*>/i);
  if (!imgAltMatch) return "";
  const altText = inlineTextFromHtml(imgAltMatch[1]);
  if (!altText) return "";
  if (altText.startsWith("Generated image:")) return altText;
  return `Generated image: ${altText}`;
}

function buildEstuaryUrlByFileId(estuaryUrls = []) {
  const byFileId = new Map();
  for (const value of estuaryUrls) {
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      continue;
    }
    const fileIdFromQuery = parsed.searchParams.get("id");
    const pathMatch = parsed.pathname.match(/\/(file_[a-f0-9]+)(?:\/)?$/i);
    const fileIdFromPath = pathMatch ? pathMatch[1] : "";
    const fileId = fileIdFromQuery || fileIdFromPath;
    if (!fileId) continue;
    byFileId.set(fileId, value);
  }
  return byFileId;
}

function extractSedimentFileIdsInOrder(html) {
  const matches = [...html.matchAll(/sediment:\/\/(file_[a-f0-9]+)/gi)];
  const ordered = [];
  const seen = new Set();
  for (const match of matches) {
    const fileId = match[1];
    if (seen.has(fileId)) continue;
    seen.add(fileId);
    ordered.push(fileId);
  }
  return ordered;
}

function extractMessageText(messageHtml) {
  const markdownText = stripTagsToMarkdown(messageHtml);
  if (markdownText) return markdownText;
  return extractImageAltText(messageHtml);
}

function extractChatGptShareConversation(html, options = {}) {
  const estuaryUrlByFileId = buildEstuaryUrlByFileId(options.estuaryUrls);
  const orderedSedimentFileIds = extractSedimentFileIdsInOrder(html);
  let fallbackImageFileIndex = 0;
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const shareIdMatch = html.match(/chatgpt\.com\/share\/([0-9a-f-]{8,})/i);
  const createTimeMatch = html.match(/"create_time",([0-9.]+)/);
  const updateTimeMatch = html.match(/"update_time",([0-9.]+)/);

  const createdAt = createTimeMatch
    ? new Date(Number(createTimeMatch[1]) * 1000).toISOString()
    : new Date().toISOString();
  const updatedAt = updateTimeMatch
    ? new Date(Number(updateTimeMatch[1]) * 1000).toISOString()
    : createdAt;

  const legacyMessageRegex =
    /<div data-message-author-role="(user|assistant)"[\s\S]*?data-message-id="([^"]+)"[\s\S]*?(?=<div data-message-author-role="(?:user|assistant)"|<\/body>)/gi;
  const modernMessageRegex =
    /<(?:div|section)\b(?=[^>]*data-turn="(user|assistant)")(?=[^>]*data-turn-id="([^"]+)")[^>]*>[\s\S]*?(?=<(?:div|section)\b(?=[^>]*data-turn="(?:user|assistant)")(?=[^>]*data-turn-id="[^"]+")[^>]*>|<\/body>)/gi;
  const messageMatches = [];
  let match;
  while ((match = legacyMessageRegex.exec(html)) !== null) {
    messageMatches.push({
      role: match[1],
      messageId: match[2],
      html: match[0],
      index: match.index,
    });
  }
  while ((match = modernMessageRegex.exec(html)) !== null) {
    messageMatches.push({
      role: match[1],
      messageId: match[2],
      html: match[0],
      index: match.index,
    });
  }
  messageMatches.sort((a, b) => a.index - b.index);
  const chatMessages = [];
  const seenMessageIds = new Set();

  for (const messageMatch of messageMatches) {
    const role = messageMatch.role === "user" ? "human" : "assistant";
    const messageId = messageMatch.messageId;
    if (seenMessageIds.has(messageId)) continue;
    const text = extractMessageText(messageMatch.html);
    if (!text) continue;
    const imageFileId =
      role === "assistant" &&
      text.startsWith("Generated image:") &&
      fallbackImageFileIndex < orderedSedimentFileIds.length
        ? orderedSedimentFileIds[fallbackImageFileIndex++]
        : "";
    const estuaryUrl = imageFileId ? estuaryUrlByFileId.get(imageFileId) : "";
    const files = [];
    if (imageFileId && role === "assistant") {
      files.push({
        id: imageFileId,
        kind: "image",
        source: "chatgpt_estuary",
        url: estuaryUrl || null,
      });
    }
    seenMessageIds.add(messageId);

    chatMessages.push({
      uuid: messageId,
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
      sender: role,
      created_at: createdAt,
      updated_at: updatedAt,
      attachments: [],
      files,
      parent_message_uuid: null,
    });
  }

  const conversationUuid = shareIdMatch?.[1] ?? hashUuid(html);
  return [
    {
      uuid: conversationUuid,
      name: decodeHtmlEntities(
        titleMatch?.[1] ?? "Imported ChatGPT conversation",
      ),
      summary: "",
      created_at: createdAt,
      updated_at: updatedAt,
      account: { uuid: "[REDACTED]" },
      chat_messages: chatMessages,
    },
  ];
}

function writeChatGptShareConversationFile(
  inputPath,
  outputPath,
  options = {},
) {
  const html = fs.readFileSync(inputPath, "utf8");
  const payload = extractChatGptShareConversation(html, options);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

function runCli() {
  const inputPath = process.argv[2] ?? "sample/chatgpt/sample_chat.txt";
  const outputPath =
    process.argv[3] ?? "sample/chatgpt/chatgpt_conversation.json";
  const payload = writeChatGptShareConversationFile(inputPath, outputPath);
  const messageCount = payload[0]?.chat_messages?.length ?? 0;
  console.log(`Wrote ${messageCount} messages to ${outputPath}`);
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) runCli();

export {
  decodeHtmlEntities,
  extractChatGptShareConversation,
  stripTagsToMarkdown,
  writeChatGptShareConversationFile,
};
