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
  // Inline marker parsing is a fallback path, so keep matching strict enough
  // to avoid false positives in prose like "AI-generated" or "tell me:".
  const markerPattern =
    /(?:^|[\s([{>"'])\s*(user|human|you|assistant|ai|chatgpt|claude|bot|model)\s*[:-]\s+/gi;
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
  const parseTranscriptSource = (source) => {
    const lines = source.split(/\n|\u2028|\u2029/);
    const messages = [];
    let current = null;
    for (const line of lines) {
      const trimmed = String(line ?? "").trim();
      const marker = trimmed.match(
        /^[^A-Za-z0-9]*?(user|human|you|me|assistant|ai|chatgpt|claude|bot|model)\s*(?::\s*|-\s+)(.*)$/i,
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

    return parseTranscriptUsingInlineMarkers(source);
  };

  const source = String(sourceText ?? "").trim();
  if (!source) return null;

  const normalizedSource = source
    .replace(/\r\n?/g, "\n")
    .replace(/[\u200B-\u200D\u2060\uFEFF\uFFFC]/g, "");
  const parsedFromNormalized = parseTranscriptSource(normalizedSource);
  if (parsedFromNormalized) return parsedFromNormalized;

  if (!normalizedSource.includes("\\n")) return null;
  const parsedFromEscapedNewlines = parseTranscriptSource(
    normalizedSource.replace(/\\n/g, "\n"),
  );
  if (parsedFromEscapedNewlines) return parsedFromEscapedNewlines;

  return null;
}

export function repairLegacyTruncatedAssistantMessages(session, entry) {
  if (!session || typeof session !== "object") return session;

  const sourceText = String(entry?.raw_text || entry?.description || "");
  if (!sourceText.trim()) return session;

  const transcript = parseBrainstormTranscriptFromText(sourceText);
  if (!transcript?.messages?.length) return session;

  const transcriptAssistantTexts = transcript.messages
    .filter((message) => message?.sender === "assistant")
    .map((message) => String(message?.text ?? "").trim())
    .filter(Boolean);
  if (transcriptAssistantTexts.length === 0) return session;

  const sessionMessages = Array.isArray(session.messages)
    ? session.messages
    : [];
  let assistantOrdinal = 0;
  let hasChanges = false;
  const repairedMessages = sessionMessages.map((message) => {
    if (message?.role !== "assistant") return message;

    const currentText = String(message?.content ?? "").trim();
    const candidateText = transcriptAssistantTexts[assistantOrdinal] || "";
    assistantOrdinal += 1;

    if (!currentText || !candidateText || candidateText === currentText) {
      return message;
    }

    const isLegacyMergedId = String(message?.id || "").includes("-merged");
    const looksLikeTrimmedSuffix =
      candidateText.length > currentText.length &&
      candidateText.endsWith(currentText);

    if (!isLegacyMergedId && !looksLikeTrimmedSuffix) {
      return message;
    }

    hasChanges = true;
    return {
      ...message,
      content: candidateText,
    };
  });

  if (!hasChanges) return session;
  return {
    ...session,
    messages: repairedMessages,
  };
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
