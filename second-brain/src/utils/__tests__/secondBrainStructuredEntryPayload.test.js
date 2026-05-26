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
});
