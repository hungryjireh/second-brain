function mapImportedMessages(messages) {
  return messages
    .map((msg) => ({
      sender: msg?.sender === "human" ? "human" : "assistant",
      text: String(msg?.text ?? "").trim(),
      fileUrls: Array.isArray(msg?.files)
        ? msg.files
            .map((file) => String(file?.url ?? "").trim())
            .filter(Boolean)
        : [],
    }))
    .filter((msg) => msg.text);
}

function mapTranscriptSenderLabel(senderLabel) {
  const label = String(senderLabel ?? "").toLowerCase();
  if (
    label === "assistant" ||
    label === "ai" ||
    label === "chatgpt" ||
    label === "claude" ||
    label === "bot" ||
    label === "model"
  ) {
    return "assistant";
  }
  return "human";
}

function parseTranscriptUsingInlineMarkers(source) {
  const markerPattern =
    /(user|human|you|me|assistant|ai|chatgpt|claude|bot|model)\s*[:-]\s*/gi;
  const markers = Array.from(source.matchAll(markerPattern));
  if (markers.length < 2) return null;

  const messages = [];
  for (let index = 0; index < markers.length; index += 1) {
    const current = markers[index];
    const next = markers[index + 1];
    const start = current.index + current[0].length;
    const end = next ? next.index : source.length;
    const text = source.slice(start, end).trim();
    if (!text) continue;
    messages.push({
      sender: mapTranscriptSenderLabel(current[1]),
      text,
      fileUrls: [],
    });
  }

  const hasAssistant = messages.some((msg) => msg.sender === "assistant");
  if (messages.length < 2 || !hasAssistant) return null;
  return { messages };
}

export function parseImportedConversationFromText(sourceText) {
  const rawText = String(sourceText ?? "").trim();
  if (!rawText.startsWith("{")) return null;

  try {
    const parsed = JSON.parse(rawText);
    if (parsed?._format !== "chat_conversation_v1") return null;
    if (!Array.isArray(parsed.messages) || parsed.messages.length === 0)
      return null;
    const messages = mapImportedMessages(parsed.messages);
    return messages.length > 0 ? { messages } : null;
  } catch {
    return null;
  }
}

export function parseBrainstormTranscriptFromText(sourceText) {
  const source = String(sourceText ?? "").trim();
  if (!source) return null;

  const normalizedSource = source
    .replace(/\r\n?/g, "\n")
    .replace(/[\u200B-\u200D\u2060\uFEFF\uFFFC]/g, "");
  const lines = normalizedSource.split(/\n|\u2028|\u2029/);
  const messages = [];
  let current = null;
  for (const line of lines) {
    const trimmed = String(line ?? "").trim();
    const marker = trimmed.match(
      /^[^A-Za-z0-9]*?(user|human|you|me|assistant|ai|chatgpt|claude|bot|model)\s*[:-]\s*(.*)$/i,
    );
    if (marker) {
      if (current && current.text.trim()) {
        messages.push({ ...current, text: current.text.trim() });
      }
      const sender = mapTranscriptSenderLabel(marker[1]);
      current = {
        sender,
        text: String(marker[2] ?? "").trim(),
        fileUrls: [],
      };
      continue;
    }
    if (!current) continue;
    current.text = current.text
      ? `${current.text}\n${trimmed}`.trim()
      : trimmed;
  }
  if (current && current.text.trim()) {
    messages.push({ ...current, text: current.text.trim() });
  }

  const hasAssistant = messages.some((msg) => msg.sender === "assistant");
  if (messages.length >= 2 && hasAssistant) return { messages };

  return parseTranscriptUsingInlineMarkers(normalizedSource);
}

export function parseImportedConversationFromEntry(entry) {
  return parseImportedConversationFromText(entry?.raw_text);
}

export function parseBrainstormTranscriptFromEntry(entry) {
  return (
    parseBrainstormTranscriptFromText(entry?.raw_text) ||
    parseBrainstormTranscriptFromText(entry?.description)
  );
}
