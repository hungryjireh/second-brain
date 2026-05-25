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
});
