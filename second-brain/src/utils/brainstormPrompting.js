export function buildBrainstormHistory(messages, { excludeLast = false } = {}) {
  const source = Array.isArray(messages) ? messages : [];
  const scoped = excludeLast ? source.slice(0, -1) : source;
  return scoped
    .map((item) => ({
      role: item?.role === "assistant" ? "assistant" : "user",
      content: String(item?.content || "").trim(),
    }))
    .filter((item) => item.content);
}
