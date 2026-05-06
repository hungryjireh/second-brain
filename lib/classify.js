import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const BASE_SYSTEM_PROMPT = `You are a personal assistant parsing a voice/text note.
Classify the following note into exactly one category:
- "reminder" — something to do at a specific time
- "todo" — a task with no specific time
- "thought" — a spontaneous idea or reflection
- "note" — a fact to remember (appointment, info, reference)

If the category is "reminder", extract the scheduled time as an ISO 8601 datetime.

Also extract relevant tags from the note:
- Return at least 1 tag and at most 3 tags.
- Tags must be short (1-3 words), lowercase, and specific to the note.
- Avoid generic tags like "note", "thought", "task", "personal" unless truly necessary.
- A user can only have a maximum of 10 tags, , so reuse tags from the user's existing tags whenever they fit the note.
- Suggest new tags only if none of the existing tags can be reused.
- If new tags are suggested, return at most 1 tag.

Respond ONLY with a JSON object, no other text:
{
  "category": "reminder" | "todo" | "thought" | "note",
  "title": "short title (3-8 words)",
  "summary": "one-sentence summary",
  "content": "cleaned, concise version of the note",
  "remind_at": "ISO 8601 datetime or null",
  "tags": ["tag1", "tag2", "tag3"]
}`;

/**
 * Classify raw text into a structured entry using Groq (LLaMA 3.3 70B).
 * @param {string} rawText
 * @param {{ timezone?: string, existingTags?: string[] }} options
 * @returns {Promise<{ category: string, title: string, summary: string, content: string, remind_at: number|null, tags: string[] }>}
 */
export async function classify(rawText, options = {}) {
  const timezone = options.timezone || 'Asia/Singapore';
  const existingTags = Array.isArray(options.existingTags)
    ? options.existingTags
      .map(tag => String(tag ?? '').trim())
      .filter(Boolean)
      .slice(0, 20)
    : [];
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
      {
        role: 'user',
        content: `Today is ${today}.\nExisting user tags: ${existingTags.length > 0 ? existingTags.join(', ') : 'none'}.\n\nNote: "${rawText}"`,
      },
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

  const tags = [...new Set(
    (Array.isArray(parsed.tags) ? parsed.tags : [])
      .map(tag => String(tag ?? '').trim().toLowerCase())
      .filter(Boolean)
  )].slice(0, 3);

  if (tags.length === 0) {
    tags.push('general');
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
