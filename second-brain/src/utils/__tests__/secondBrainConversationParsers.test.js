import { parseBrainstormTranscriptFromText } from "../secondBrainConversationParsers";

describe("secondBrainConversationParsers", () => {
  it("parses transcript lines with me/ai labels", () => {
    const source =
      "Me: Draft a launch checklist.\nAI: Start with goals, audience, and timeline.";
    const parsed = parseBrainstormTranscriptFromText(source);

    expect(parsed).toEqual({
      messages: [
        { sender: "human", text: "Draft a launch checklist.", fileUrls: [] },
        {
          sender: "assistant",
          text: "Start with goals, audience, and timeline.",
          fileUrls: [],
        },
      ],
    });
  });

  it("parses transcript lines with chatgpt label and dash separators", () => {
    const source =
      "You - Help me brainstorm names.\nChatGPT - Try short, memorable names first.";
    const parsed = parseBrainstormTranscriptFromText(source);

    expect(parsed).toEqual({
      messages: [
        { sender: "human", text: "Help me brainstorm names.", fileUrls: [] },
        {
          sender: "assistant",
          text: "Try short, memorable names first.",
          fileUrls: [],
        },
      ],
    });
  });

  it("parses inline transcript markers when assistant marker is not on a new line", () => {
    const source =
      "User: I am exploring app ideas for non-tech users. Assistant: Great direction. Let's narrow your audience first.";
    const parsed = parseBrainstormTranscriptFromText(source);

    expect(parsed).toEqual({
      messages: [
        {
          sender: "human",
          text: "I am exploring app ideas for non-tech users.",
          fileUrls: [],
        },
        {
          sender: "assistant",
          text: "Great direction. Let's narrow your audience first.",
          fileUrls: [],
        },
      ],
    });
  });

  it("does not treat prose like AI-generated or tell me: as transcript markers", () => {
    const source =
      "i want to brainstorm about: User: We should make this friendlier for non-tech users. Assistant: That sounds good for AI-generated content. To further develop this idea, can you tell me: what onboarding would help most?";
    const parsed = parseBrainstormTranscriptFromText(source);

    expect(parsed).toEqual({
      messages: [
        {
          sender: "human",
          text: "We should make this friendlier for non-tech users.",
          fileUrls: [],
        },
        {
          sender: "assistant",
          text: "That sounds good for AI-generated content. To further develop this idea, can you tell me: what onboarding would help most?",
          fileUrls: [],
        },
      ],
    });
  });

  it("does not split assistant text when a wrapped line starts with AI-generated", () => {
    const source = [
      "User: I am exploring app ideas for non-tech users.",
      "Assistant: So, you want to create an app that bridges the gap between non-techies and AI, making it easier for them to discover and explore the possibilities of",
      "AI-generated content.",
      "To further develop this idea, can you tell me:",
    ].join("\n");
    const parsed = parseBrainstormTranscriptFromText(source);

    expect(parsed).toEqual({
      messages: [
        {
          sender: "human",
          text: "I am exploring app ideas for non-tech users.",
          fileUrls: [],
        },
        {
          sender: "assistant",
          text: [
            "So, you want to create an app that bridges the gap between non-techies and AI, making it easier for them to discover and explore the possibilities of",
            "AI-generated content.",
            "To further develop this idea, can you tell me:",
          ].join("\n"),
          fileUrls: [],
        },
      ],
    });
  });

  it("parses transcript text when newlines are persisted as literal \\n", () => {
    const source =
      "User: Help me draft a launch blurb.\\n\\nAssistant: Start with one promise and one audience.";
    const parsed = parseBrainstormTranscriptFromText(source);

    expect(parsed).toEqual({
      messages: [
        {
          sender: "human",
          text: "Help me draft a launch blurb.",
          fileUrls: [],
        },
        {
          sender: "assistant",
          text: "Start with one promise and one audience.",
          fileUrls: [],
        },
      ],
    });
  });
});
