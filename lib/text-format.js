function compactWhitespace(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateWords(value, maxWords) {
  const words = compactWhitespace(value).split(" ").filter(Boolean);
  return words.slice(0, maxWords).join(" ");
}

function truncateChars(value, maxChars) {
  const text = compactWhitespace(value);
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1).trimEnd()}…`;
}

export { compactWhitespace, truncateWords, truncateChars };
