const CLASSIFY_BASE_SYSTEM_PROMPT = `You are a personal assistant parsing a voice/text note.
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
- Reuse tags from the user's existing tags whenever they fit the note. Unless user has no existing tags, suggest new tags only if none of the existing tags can be reused.

Write all text fields in a warm, first-person voice as if the assistant is an active participant — not a neutral observer summarizing from the outside. Preserve meaningful qualifiers, uncertainty, and nuance rather than flattening the note to its headline.

Respond ONLY with a JSON object, no other text:
{
  "category": "reminder" | "todo" | "thought" | "note",
  "title": "short title (3-8 words)",
  "summary": "one-sentence summary written in first-person plural (e.g. 'We discussed...', 'I noted...', 'We explored...')",
  "content": "cleaned, concise version of the note",
  "remind_at": "ISO 8601 datetime or null",
  "tags": ["tag1", "tag2", "..."]
}`;

const BRAINSTORM_BASE_SYSTEM_PROMPT = `You are a brainstorming partner for a personal knowledge app.
Help the user think through ideas by asking useful follow-up questions, offering options, and gently structuring their thoughts.
Keep responses concise, practical, and conversational.
Do not output JSON or markdown wrappers.`;

export function buildClassifySystemPrompt(timezone) {
  return `${CLASSIFY_BASE_SYSTEM_PROMPT}\nAssume the user's timezone is ${timezone}.`;
}

export function buildClassifyUserPrompt({ today, existingTags, rawText }) {
  const tagText =
    Array.isArray(existingTags) && existingTags.length > 0
      ? existingTags.join(", ")
      : "none";
  return `Today is ${today}.\nExisting user tags: ${tagText}.\n\nNote: "${rawText}"`;
}

export function buildBrainstormSystemPrompt(timezone) {
  return `${BRAINSTORM_BASE_SYSTEM_PROMPT}\nThe user's timezone is ${timezone}.`;
}

export function buildEndFinalizePrompt() {
  return [
    "Summarise this conversation between a human and an AI and generate structured entry fields.",
    "Write all fields in a warm, first-person voice as if the assistant is an active participant — not a neutral observer. Preserve meaningful qualifiers, uncertainty, and nuance rather than flattening to a headline.",
    'Return ONLY valid JSON with this exact shape: {"description":"...","title":"...","summary":"...","content":"..."}',
    "",
    "description must be a markdown string in this exact structure:",
    "# Conversation Summary\\nOne sentence overview.\\n\\n## Goal\\n- ...\\n\\n## Outputs & Decisions\\n- ...\\n\\n## To Revisit\\n- ...\\n\\n## Context to Remember\\n- ...",
    "",
    "Field rules:",
    "- Keep it concise and specific.",
    "- If a section has nothing to report, write: - None.",
    "- title: 3-8 words, specific, no markdown.",
    "- summary: one concise sentence, no markdown.",
    "- content: concise cleaned note in plain text, preserving important context and decisions.",
    "- description: use \\n for newlines, no code blocks, valid JSON string.",
  ].join("\n");
}
