import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const BASE_SYSTEM_PROMPT = `You are a personal assistant parsing a voice/text note.
Classify the following note into exactly one category:
- "reminder" — something to do at a specific time
- "todo" — a task with no specific time
- "thought" — a spontaneous idea or reflection
- "note" — a fact to remember (appointment, info, reference)

If the category is "reminder", extract the scheduled time as an ISO 8601 datetime.

Respond ONLY with a JSON object, no other text:
{
  "category": "reminder" | "todo" | "thought" | "note",
  "title": "short title (3-8 words)",
  "summary": "one-sentence summary",
  "content": "cleaned, concise version of the note",
  "remind_at": "ISO 8601 datetime or null"
}`;

/**
 * Classify raw text into a structured entry using Groq (LLaMA 3.3 70B).
 * @param {string} rawText
 * @param {{ timezone?: string }} options
 * @returns {Promise<{ category: string, title: string, summary: string, content: string, remind_at: number|null }>}
 */
export async function classify(rawText, options = {}) {
  const timezone = options.timezone || 'Asia/Singapore';
  const today = new Date().toLocaleDateString('en-SG', {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 256,
    temperature: 0.1,
    messages: [
      { role: 'system', content: `${BASE_SYSTEM_PROMPT}\nAssume the user's timezone is ${timezone}.` },
      { role: 'user', content: `Today is ${today}.\n\nNote: "${rawText}"` },
    ],
  });

  const text = completion.choices[0].message.content.trim();

  let parsed;
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(clean);
  } catch {
    throw new Error(`Failed to parse Groq response: ${text}`);
  }

  let remind_at = null;
  if (parsed.remind_at) {
    const ts = new Date(parsed.remind_at).getTime();
    if (!isNaN(ts)) remind_at = Math.floor(ts / 1000);
  }

  return {
    category: parsed.category,
    title: parsed.title,
    summary: parsed.summary,
    content:  parsed.content,
    remind_at,
  };
}
