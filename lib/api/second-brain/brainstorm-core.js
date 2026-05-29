import Groq from "groq-sdk";
import { getGroqModel } from "./classify.js";
import { buildBrainstormSystemPrompt } from "../../prompts/second-brain.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function brainstormReply({
  message,
  history = [],
  timezone = "Asia/Singapore",
}) {
  const trimmedMessage = typeof message === "string" ? message.trim() : "";
  if (!trimmedMessage) {
    throw new Error("message is required");
  }

  const normalizedHistory = Array.isArray(history)
    ? history
        .map((item) => ({
          role: item?.role === "assistant" ? "assistant" : "user",
          content: typeof item?.content === "string" ? item.content.trim() : "",
        }))
        .filter((item) => item.content.length > 0)
        .slice(-12)
    : [];

  const completion = await groq.chat.completions.create({
    model: getGroqModel(),
    temperature: 0.6,
    max_tokens: 300,
    messages: [
      {
        role: "system",
        content: buildBrainstormSystemPrompt(timezone),
      },
      ...normalizedHistory,
      { role: "user", content: trimmedMessage },
    ],
  });

  const content = completion?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() : "";
}
