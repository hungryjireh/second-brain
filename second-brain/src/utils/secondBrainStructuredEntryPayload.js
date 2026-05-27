const STRUCTURED_ENTRY_FIELDS = ["description", "title", "summary", "content"];

function emptyStructuredPayload() {
  return {
    description: "",
    title: "",
    summary: "",
    content: "",
  };
}

function normalizeParsedPayload(parsed) {
  const payload = emptyStructuredPayload();
  for (const field of STRUCTURED_ENTRY_FIELDS) {
    const value = parsed?.[field];
    payload[field] = typeof value === "string" ? value.trim() : "";
  }
  return payload;
}

function hasStructuredPayloadValue(payload) {
  return STRUCTURED_ENTRY_FIELDS.some((field) => payload[field]);
}

function stripMarkdownFences(value) {
  return value
    .replace(/```[^\n\r]*[\n\r]?/g, "")
    .replace(/```/g, "")
    .trim();
}

function extractBalancedJsonObject(text) {
  const start = text.indexOf("{");
  if (start === -1) return "";
  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (isEscaped) {
      isEscaped = false;
      continue;
    }
    if (ch === "\\") {
      isEscaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return "";
}

function unescapeLooseJsonString(value) {
  return value
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\")
    .trim();
}

function parseLooseJsonFields(value) {
  const source = extractBalancedJsonObject(value);
  if (!source) return null;
  const payload = emptyStructuredPayload();
  const fieldAlternates = STRUCTURED_ENTRY_FIELDS.join("|");

  for (const field of STRUCTURED_ENTRY_FIELDS) {
    const pattern = new RegExp(
      `"${field}"\\s*:\\s*"([\\s\\S]*?)"\\s*(?=,\\s*"(?:${fieldAlternates})"\\s*:|\\s*})`,
      "i",
    );
    const match = source.match(pattern);
    if (match) payload[field] = unescapeLooseJsonString(match[1]);
  }

  return hasStructuredPayloadValue(payload) ? payload : null;
}

function parseMarkdownLabeledFields(value) {
  const lines = String(value || "").split(/\r?\n/);
  const fieldLinePattern =
    /^\s{0,3}(?:[-*]\s*)?(?:#{1,6}\s*)?(?:\*\*)?(description|title|summary|content)(?:\*\*)?\s*:\s*(.*)$/i;
  const hits = [];

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(fieldLinePattern);
    if (!match) continue;
    hits.push({
      index,
      field: String(match[1] || "").toLowerCase(),
      lineRemainder: String(match[2] || ""),
    });
  }

  if (!hits.length) return null;

  const fieldsFound = new Set(hits.map((hit) => hit.field));
  const hasDescription = fieldsFound.has("description");
  const hasEnoughStructuredFields =
    fieldsFound.size >= 3 || (hasDescription && fieldsFound.size >= 2);
  if (!hasEnoughStructuredFields) return null;

  const payload = emptyStructuredPayload();

  for (let i = 0; i < hits.length; i += 1) {
    const hit = hits[i];
    const nextHit = hits[i + 1];
    const fieldLines = [hit.lineRemainder];
    const endLineIndex = nextHit ? nextHit.index : lines.length;

    for (
      let lineIndex = hit.index + 1;
      lineIndex < endLineIndex;
      lineIndex += 1
    ) {
      fieldLines.push(lines[lineIndex]);
    }

    if (!payload[hit.field]) {
      payload[hit.field] = fieldLines.join("\n").trim();
    }
  }

  if (!payload.description && hits[0].index > 0) {
    const leadingDescription = lines.slice(0, hits[0].index).join("\n").trim();
    if (leadingDescription) {
      payload.description = leadingDescription;
    }
  }

  return hasStructuredPayloadValue(payload) ? payload : null;
}

export function parseStructuredEntryPayload(value) {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;

  const normalized = stripMarkdownFences(raw);
  const parseCandidates = [
    normalized,
    raw,
    extractBalancedJsonObject(normalized),
  ].filter(Boolean);

  for (const candidate of parseCandidates) {
    try {
      const parsedCandidate = JSON.parse(candidate);
      const parsed =
        typeof parsedCandidate === "string"
          ? JSON.parse(parsedCandidate)
          : parsedCandidate;
      const payload = normalizeParsedPayload(parsed);
      if (hasStructuredPayloadValue(payload)) return payload;
    } catch {
      // Try the next candidate shape.
    }
  }

  return (
    parseLooseJsonFields(normalized) ||
    parseLooseJsonFields(raw) ||
    parseMarkdownLabeledFields(normalized) ||
    parseMarkdownLabeledFields(raw)
  );
}
