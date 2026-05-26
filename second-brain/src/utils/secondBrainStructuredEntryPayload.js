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
  const source = extractBalancedJsonObject(value) || value;
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

  return parseLooseJsonFields(normalized) || parseLooseJsonFields(raw);
}
