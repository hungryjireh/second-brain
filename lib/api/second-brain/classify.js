import Groq from "groq-sdk";
import {
  buildClassifySystemPrompt,
  buildClassifyUserPrompt,
} from "../../prompts/second-brain.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export function getGroqModel() {
  return process.env.GROQ_MODEL || "llama-3.1-8b-instant";
}

/**
 * Classify raw text into a structured entry using Groq (LLaMA 3.3 70B).
 * @param {string} rawText
 * @param {{ timezone?: string, existingTags?: string[] }} options
 * @returns {Promise<{ category: string, title: string, summary: string, content: string, remind_at: number|null, tags: string[] }>}
 */
export async function classify(rawText, options = {}) {
  const timezone = options.timezone || "Asia/Singapore";
  const existingTags = Array.isArray(options.existingTags)
    ? options.existingTags
        .map((tag) => String(tag ?? "").trim())
        .filter(Boolean)
        .slice(0, 20)
    : [];
  const today = new Date().toLocaleDateString("en-SG", {
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const completion = await groq.chat.completions.create({
    model: getGroqModel(),
    max_tokens: 256,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: buildClassifySystemPrompt(timezone),
      },
      {
        role: "user",
        content: buildClassifyUserPrompt({ today, existingTags, rawText }),
      },
    ],
  });

  const text = completion.choices[0].message.content.trim();

  let parsed;
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(clean);
  } catch {
    throw new Error(`Failed to parse Groq response: ${text}`);
  }

  let remind_at = null;
  if (parsed.remind_at) {
    const ts = new Date(parsed.remind_at).getTime();
    if (!isNaN(ts)) remind_at = Math.floor(ts / 1000);
  }

  const tags = [
    ...new Set(
      (Array.isArray(parsed.tags) ? parsed.tags : [])
        .map((tag) =>
          String(tag ?? "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    ),
  ];

  if (tags.length === 0) {
    tags.push("general");
  }

  return {
    category: parsed.category,
    title: parsed.title,
    summary: parsed.summary,
    content: parsed.content,
    remind_at,
    tags,
  };
}
