import { parseStructuredEntryPayload } from "../secondBrainStructuredEntryPayload";

describe("parseStructuredEntryPayload", () => {
  it("parses fenced JSON with literal multiline strings and description first", () => {
    const payload = parseStructuredEntryPayload(`\`\`\`json
{
  "description": "# Conversation Summary
One sentence overview of creating a short-form video content for a personal knowledge app, specifically 'A Day in the Life' style video.",
  "title": "Short-Form Video Content Creation",
  "summary": "Developed a concept for a short-form video content featuring a team member's 'A Day in the Life' experience.",
  "content": "Created a concept for a short-form video content featuring a team member's 'A Day in the Life' experience.
Decided on a lighthearted tone, short length, and a simple walk-through format.
Discussed adding fun elements such as quick cuts, upbeat music, and visual breaks.
Decided on a simple walk-through format without scripted dialogue."
}
\`\`\``);

    expect(payload).toEqual({
      description:
        "# Conversation Summary\nOne sentence overview of creating a short-form video content for a personal knowledge app, specifically 'A Day in the Life' style video.",
      title: "Short-Form Video Content Creation",
      summary:
        "Developed a concept for a short-form video content featuring a team member's 'A Day in the Life' experience.",
      content:
        "Created a concept for a short-form video content featuring a team member's 'A Day in the Life' experience.\nDecided on a lighthearted tone, short length, and a simple walk-through format.\nDiscussed adding fun elements such as quick cuts, upbeat music, and visual breaks.\nDecided on a simple walk-through format without scripted dialogue.",
    });
  });

  it("parses title-first payloads without content", () => {
    const payload = parseStructuredEntryPayload(`{
  "title": "Personal Knowledge App Brainstorming",
  "summary": "Developing a concept for a short-form video.",
  "description": "# Conversation Summary
A user brainstormed a short-form video concept."
}`);

    expect(payload).toEqual({
      description:
        "# Conversation Summary\nA user brainstormed a short-form video concept.",
      title: "Personal Knowledge App Brainstorming",
      summary: "Developing a concept for a short-form video.",
      content: "",
    });
  });

  it("returns null for plain markdown notes", () => {
    expect(
      parseStructuredEntryPayload(
        "# Conversation Summary\nA plain markdown summary.",
      ),
    ).toBeNull();
  });

  it("does not parse trailing structured field fragments without a JSON object", () => {
    expect(
      parseStructuredEntryPayload(`# Conversation Summary
An app for sharing daily thoughts and wisdom.

## Goal
- Create a platform for users to share their daily thoughts and insights.
"
  "title": "Open Brain App Development`),
    ).toBeNull();
  });

  it("parses markdown-labeled title/summary/content fields without leaking them into description", () => {
    const payload = parseStructuredEntryPayload(`# Conversation Summary
A personal knowledge app for sharing and discovering daily thoughts and wisdom.

## Goal
- Create a social media-like app for sharing concise thoughts and ideas.
- Use a Large Language Model (LLM) for moderation.

## Outputs & Decisions
- Limited text format to encourage concise thoughts.
- No images or videos allowed.
- Anonymous human reviewers for moderation.
- Opaque moderation process.

## To Revisit
- Define appeal process for moderation decisions.
- Determine logistics of human review process.

## Context to Remember
- Community values and guidelines to be defined.
- User experience and engagement to be prioritized.

## title: Personal Knowledge App for Daily Thoughts
## summary: Create a social media app for sharing daily thoughts and wisdom.
## content: The app will allow users to share concise thoughts and ideas, moderated by a Large Language Model and reviewed by anonymous human moderators. The app will prioritize user experience and engagement, with a focus on community values and guidelines.`);

    expect(payload).toEqual({
      description: `# Conversation Summary
A personal knowledge app for sharing and discovering daily thoughts and wisdom.

## Goal
- Create a social media-like app for sharing concise thoughts and ideas.
- Use a Large Language Model (LLM) for moderation.

## Outputs & Decisions
- Limited text format to encourage concise thoughts.
- No images or videos allowed.
- Anonymous human reviewers for moderation.
- Opaque moderation process.

## To Revisit
- Define appeal process for moderation decisions.
- Determine logistics of human review process.

## Context to Remember
- Community values and guidelines to be defined.
- User experience and engagement to be prioritized.`,
      title: "Personal Knowledge App for Daily Thoughts",
      summary:
        "Create a social media app for sharing daily thoughts and wisdom.",
      content:
        "The app will allow users to share concise thoughts and ideas, moderated by a Large Language Model and reviewed by anonymous human moderators. The app will prioritize user experience and engagement, with a focus on community values and guidelines.",
    });
  });
});
