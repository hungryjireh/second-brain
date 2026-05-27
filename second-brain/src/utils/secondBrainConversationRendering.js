export function parseBrainstormConversationFromSession(session) {
  if (!session || typeof session !== "object") return null;
  if (!Array.isArray(session.messages) || session.messages.length === 0) {
    return null;
  }

  const messages = session.messages
    .map((msg) => {
      const sender = msg?.role === "assistant" ? "assistant" : "human";
      const text = String(msg?.content ?? "").trim();
      if (!text) return null;
      return { sender, text, fileUrls: [] };
    })
    .filter(Boolean);

  if (messages.length === 0) return null;
  return { messages };
}
