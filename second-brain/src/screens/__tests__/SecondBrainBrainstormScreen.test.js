import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SecondBrainBrainstormScreen from "../SecondBrainBrainstormScreen";
import { apiRequest } from "../../api";
import {
  createBrainstormSession,
  readBrainstormSession,
  writeBrainstormSession,
} from "../../utils/brainstormSessions";

jest.mock("../../api", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("../../utils/brainstormSessions", () => {
  let counter = 0;
  const sessionsById = new Map();
  const linkedEntryById = new Map();

  function cloneSession(session) {
    return session ? JSON.parse(JSON.stringify(session)) : session;
  }

  return {
    createBrainstormSession: jest.fn(
      async ({ entryId = null, seedText = "" } = {}) => {
        counter += 1;
        const session = {
          id: `session-${counter}`,
          entryId,
          lifecycle: "active",
          updatedAt: new Date().toISOString(),
          finalizeGuards: { ended: false, wipSaved: false },
          messages: seedText
            ? [
                {
                  id: `seed-${counter}`,
                  role: "assistant",
                  content: String(seedText),
                  createdAt: new Date().toISOString(),
                },
              ]
            : [],
        };
        sessionsById.set(session.id, cloneSession(session));
        return cloneSession(session);
      },
    ),
    getLinkedBrainstormSessionId: jest.fn(async (entryId) => {
      return linkedEntryById.get(Number(entryId)) || "";
    }),
    linkEntryToBrainstormSession: jest.fn(async (entryId, sessionId) => {
      linkedEntryById.set(Number(entryId), sessionId);
    }),
    readBrainstormSession: jest.fn(async (sessionId) => {
      return cloneSession(sessionsById.get(sessionId) || null);
    }),
    toBrainstormTranscript: jest.fn((messages) =>
      (Array.isArray(messages) ? messages : [])
        .map((message) => String(message?.content || ""))
        .filter(Boolean)
        .join("\n"),
    ),
    writeBrainstormSession: jest.fn(async (session) => {
      sessionsById.set(session.id, cloneSession(session));
    }),
  };
});

describe("SecondBrainBrainstormScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it("appends user then assistant messages in deterministic order", async () => {
    apiRequest.mockResolvedValue({ reply: "Assistant reply" });

    const { getByPlaceholderText, getByLabelText } = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    const input = getByPlaceholderText("Share your thought, or type /end");
    fireEvent.changeText(input, "Brainstorm this");
    fireEvent.press(getByLabelText("Enter note"));

    await waitFor(() => {
      const brainstormCalls = apiRequest.mock.calls.filter(
        ([path, options]) =>
          path === "/brainstorm" && options?.method === "POST",
      );
      expect(brainstormCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("repairs legacy merged assistant truncation from seed entry transcript", async () => {
    const sessionId = "legacy-session-1";
    await writeBrainstormSession({
      id: sessionId,
      entryId: 222,
      lifecycle: "active",
      updatedAt: new Date().toISOString(),
      finalizeGuards: { ended: false, wipSaved: false },
      messages: [
        {
          id: "2026-05-26T15:01:38.412Z-assistant-1-0-merged",
          role: "assistant",
          content:
            "generated content.\nTo further develop this idea, can you tell me:",
          createdAt: new Date().toISOString(),
        },
      ],
    });

    render(
      <SecondBrainBrainstormScreen
        route={{
          params: {
            sessionId,
            seedEntry: {
              id: 222,
              raw_text: [
                "User: I am exploring app ideas for non-tech users.",
                "Assistant: So, you want to create an app that bridges the gap between non-techies and AI, making it easier for them to discover and explore the possibilities of",
                "AI-generated content.",
                "To further develop this idea, can you tell me:",
              ].join("\n"),
            },
          },
        }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(async () => {
      const repairedSession = await readBrainstormSession(sessionId);
      expect(repairedSession?.messages?.[0]?.content).toContain(
        "So, you want to create an app",
      );
      expect(repairedSession?.messages?.[0]?.content).toContain(
        "AI-generated content.",
      );
    });
  });

  it("finalizes once for repeated /end commands", async () => {
    apiRequest.mockImplementation((path, options) => {
      if (path === "/brainstorm" && options?.method === "POST") {
        const message = String(options?.body?.message || "");
        if (
          message.includes(
            "Summarise this conversation between a human and an AI and generate structured entry fields.",
          )
        ) {
          return Promise.resolve({
            reply: JSON.stringify({
              description:
                "## Key points/decisions\n- Finalized idea direction.\n\n## Follow-up actions\n- Draft first version.",
              title: "Second pass title",
              summary: "Second pass summary sentence.",
              content: "Second pass cleaned content.",
            }),
          });
        }
        return Promise.resolve({ reply: "Assistant reply" });
      }
      if (path === "/entries" && options?.method === "POST") {
        return Promise.resolve({ id: 101, title: "Result" });
      }
      return Promise.resolve({});
    });

    const goBack = jest.fn();
    const { getByPlaceholderText, getByLabelText } = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.changeText(
      getByPlaceholderText("Share your thought, or type /end"),
      "First idea",
    );
    fireEvent.press(getByLabelText("Enter note"));

    await waitFor(() => {
      const brainstormCalls = apiRequest.mock.calls.filter(
        ([path, options]) =>
          path === "/brainstorm" && options?.method === "POST",
      );
      expect(brainstormCalls.length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.changeText(
      getByPlaceholderText("Share your thought, or type /end"),
      "/end",
    );
    fireEvent.press(getByLabelText("Enter note"));

    await waitFor(() => expect(goBack).toHaveBeenCalled());

    const finalizeCalls = apiRequest.mock.calls.filter(
      ([path, options]) => path === "/entries" && options?.method === "POST",
    );
    expect(finalizeCalls.length).toBeGreaterThanOrEqual(1);
    expect(finalizeCalls[0][1]).toEqual(
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({
          description: expect.stringContaining("## Key points/decisions"),
          raw_text: expect.stringContaining("First idea"),
          tags: ["brainstorm"],
          title: "Second pass title",
          summary: "Second pass summary sentence.",
          content: "Second pass cleaned content.",
        }),
      }),
    );
  });

  it("parses /end JSON wrapped in markdown fences with spacing", async () => {
    apiRequest.mockImplementation((path, options) => {
      if (path === "/brainstorm" && options?.method === "POST") {
        const message = String(options?.body?.message || "");
        if (
          message.includes(
            "Summarise this conversation between a human and an AI and generate structured entry fields.",
          )
        ) {
          return Promise.resolve({
            reply:
              '``` json\n{"description":"# Conversation Summary\\nWrapped summary.","title":"Wrapped Title","summary":"Wrapped summary sentence.","content":"Wrapped cleaned content."}\n```',
          });
        }
        return Promise.resolve({ reply: "Assistant reply" });
      }
      if (path === "/entries" && options?.method === "POST") {
        return Promise.resolve({ id: 1111, title: "Result" });
      }
      return Promise.resolve({});
    });

    const goBack = jest.fn();
    const { getByPlaceholderText, getByLabelText } = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.changeText(
      getByPlaceholderText("Share your thought, or type /end"),
      "Need finalize output",
    );
    fireEvent.press(getByLabelText("Enter note"));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/brainstorm",
        expect.objectContaining({ method: "POST" }),
      );
    });

    fireEvent.changeText(
      getByPlaceholderText("Share your thought, or type /end"),
      "/end",
    );
    fireEvent.press(getByLabelText("Enter note"));

    await waitFor(() => expect(goBack).toHaveBeenCalled());

    const createCalls = apiRequest.mock.calls.filter(
      ([path, requestOptions]) =>
        path === "/entries" && requestOptions?.method === "POST",
    );
    expect(createCalls).toHaveLength(1);
    expect(createCalls[0][1]?.body).toEqual(
      expect.objectContaining({
        description: expect.stringContaining("# Conversation Summary"),
      }),
    );
    expect(createCalls[0][1]?.body).not.toEqual(
      expect.objectContaining({
        description: expect.stringContaining("```"),
      }),
    );
  });

  it("parses /end JSON wrapped in markdown language fences", async () => {
    apiRequest.mockImplementation((path, options) => {
      if (path === "/brainstorm" && options?.method === "POST") {
        const message = String(options?.body?.message || "");
        if (
          message.includes(
            "Summarise this conversation between a human and an AI and generate structured entry fields.",
          )
        ) {
          return Promise.resolve({
            reply:
              '```markdown\n{"description":"# Conversation Summary\\nMarkdown wrapped summary.","title":"Markdown Wrapped Title","summary":"Markdown wrapped summary sentence.","content":"Markdown wrapped cleaned content."}\n```',
          });
        }
        return Promise.resolve({ reply: "Assistant reply" });
      }
      if (path === "/entries" && options?.method === "POST") {
        return Promise.resolve({ id: 1112, title: "Result" });
      }
      return Promise.resolve({});
    });

    const goBack = jest.fn();
    const { getByPlaceholderText, getByLabelText } = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.changeText(
      getByPlaceholderText("Share your thought, or type /end"),
      "Need markdown finalize output",
    );
    fireEvent.press(getByLabelText("Enter note"));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/brainstorm",
        expect.objectContaining({ method: "POST" }),
      );
    });

    fireEvent.changeText(
      getByPlaceholderText("Share your thought, or type /end"),
      "/end",
    );
    fireEvent.press(getByLabelText("Enter note"));

    await waitFor(() => expect(goBack).toHaveBeenCalled());

    const createCalls = apiRequest.mock.calls.filter(
      ([path, requestOptions]) =>
        path === "/entries" && requestOptions?.method === "POST",
    );
    expect(createCalls).toHaveLength(1);
    expect(createCalls[0][1]?.body).toEqual(
      expect.objectContaining({
        title: "Markdown Wrapped Title",
        summary: "Markdown wrapped summary sentence.",
        content: "Markdown wrapped cleaned content.",
        description: expect.stringContaining("# Conversation Summary"),
      }),
    );
    expect(createCalls[0][1]?.body?.description).not.toContain("```");
  });

  it("parses JSON-like /end payloads with multiline unescaped description", async () => {
    apiRequest.mockImplementation((path, options) => {
      if (path === "/brainstorm" && options?.method === "POST") {
        const message = String(options?.body?.message || "");
        if (
          message.includes(
            "Summarise this conversation between a human and an AI and generate structured entry fields.",
          )
        ) {
          return Promise.resolve({
            reply: `\`\`\`json
{
  "title": "Content Creation and Instagram Marketing",
  "description": "# Conversation Summary
## Goal
- Create content for marketing campaigns.
## Outputs & Decisions
- Focus on Instagram marketing.
",
  "summary": "Generated ideas for Instagram marketing content to increase engagement.",
  "content": "Content creation for marketing campaigns."
}
\`\`\``,
          });
        }
        return Promise.resolve({ reply: "Assistant reply" });
      }
      if (path === "/entries" && options?.method === "POST") {
        return Promise.resolve({ id: 1113, title: "Result" });
      }
      return Promise.resolve({});
    });

    const goBack = jest.fn();
    const { getByPlaceholderText, getByLabelText } = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.changeText(
      getByPlaceholderText("Share your thought, or type /end"),
      "Need malformed-json finalize output",
    );
    fireEvent.press(getByLabelText("Enter note"));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/brainstorm",
        expect.objectContaining({ method: "POST" }),
      );
    });

    fireEvent.changeText(
      getByPlaceholderText("Share your thought, or type /end"),
      "/end",
    );
    fireEvent.press(getByLabelText("Enter note"));

    await waitFor(() => expect(goBack).toHaveBeenCalled());

    const createCalls = apiRequest.mock.calls.filter(
      ([path, requestOptions]) =>
        path === "/entries" && requestOptions?.method === "POST",
    );
    expect(createCalls).toHaveLength(1);
    expect(createCalls[0][1]?.body).toEqual(
      expect.objectContaining({
        title: "Content Creation and Instagram Marketing",
        summary:
          "Generated ideas for Instagram marketing content to increase engagement.",
        content: "Content creation for marketing campaigns.",
        description: expect.stringContaining("# Conversation Summary"),
      }),
    );
    expect(createCalls[0][1]?.body?.description).not.toContain("```");
  });

  it("parses exact /end structured payload fields into the create request", async () => {
    apiRequest.mockImplementation((path, options) => {
      if (path === "/brainstorm" && options?.method === "POST") {
        const message = String(options?.body?.message || "");
        if (
          message.includes(
            "Summarise this conversation between a human and an AI and generate structured entry fields.",
          )
        ) {
          return Promise.resolve({
            reply: `\`\`\`json
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
\`\`\``,
          });
        }
        return Promise.resolve({ reply: "Assistant reply" });
      }
      if (path === "/entries" && options?.method === "POST") {
        return Promise.resolve({ id: 1114, title: "Result" });
      }
      return Promise.resolve({});
    });

    const goBack = jest.fn();
    const { getByPlaceholderText, getByLabelText } = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.changeText(
      getByPlaceholderText("Share your thought, or type /end"),
      "Need exact finalize output",
    );
    fireEvent.press(getByLabelText("Enter note"));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/brainstorm",
        expect.objectContaining({ method: "POST" }),
      );
    });

    fireEvent.changeText(
      getByPlaceholderText("Share your thought, or type /end"),
      "/end",
    );
    fireEvent.press(getByLabelText("Enter note"));

    await waitFor(() => expect(goBack).toHaveBeenCalled());

    const createCalls = apiRequest.mock.calls.filter(
      ([path, requestOptions]) =>
        path === "/entries" && requestOptions?.method === "POST",
    );
    expect(createCalls).toHaveLength(1);
    expect(createCalls[0][1]?.body).toEqual(
      expect.objectContaining({
        description:
          "# Conversation Summary\nOne sentence overview of creating a short-form video content for a personal knowledge app, specifically 'A Day in the Life' style video.",
        title: "Short-Form Video Content Creation",
        summary:
          "Developed a concept for a short-form video content featuring a team member's 'A Day in the Life' experience.",
        content: expect.stringContaining(
          "Decided on a lighthearted tone, short length, and a simple walk-through format.",
        ),
      }),
    );
    expect(createCalls[0][1]?.body?.description).not.toContain("```");
  });

  it("parses /end structured payloads that omit content", async () => {
    apiRequest.mockImplementation((path, options) => {
      if (path === "/brainstorm" && options?.method === "POST") {
        const message = String(options?.body?.message || "");
        if (
          message.includes(
            "Summarise this conversation between a human and an AI and generate structured entry fields.",
          )
        ) {
          return Promise.resolve({
            reply: `{
  "title": "Personal Knowledge App Brainstorming",
  "summary": "Developing a concept for a short-form video.",
  "description": "# Conversation Summary
A user brainstormed a short-form video concept."
}`,
          });
        }
        return Promise.resolve({ reply: "Assistant reply" });
      }
      if (path === "/entries" && options?.method === "POST") {
        return Promise.resolve({ id: 1115, title: "Result" });
      }
      return Promise.resolve({});
    });

    const goBack = jest.fn();
    const { getByPlaceholderText, getByLabelText } = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.changeText(
      getByPlaceholderText("Share your thought, or type /end"),
      "Need missing content finalize output",
    );
    fireEvent.press(getByLabelText("Enter note"));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/brainstorm",
        expect.objectContaining({ method: "POST" }),
      );
    });

    fireEvent.changeText(
      getByPlaceholderText("Share your thought, or type /end"),
      "/end",
    );
    fireEvent.press(getByLabelText("Enter note"));

    await waitFor(() => expect(goBack).toHaveBeenCalled());

    const createCalls = apiRequest.mock.calls.filter(
      ([path, requestOptions]) =>
        path === "/entries" && requestOptions?.method === "POST",
    );
    expect(createCalls).toHaveLength(1);
    expect(createCalls[0][1]?.body).toEqual(
      expect.objectContaining({
        title: "Personal Knowledge App Brainstorming",
        summary: "Developing a concept for a short-form video.",
        description:
          "# Conversation Summary\nA user brainstormed a short-form video concept.",
        content:
          "# Conversation Summary\nA user brainstormed a short-form video concept.",
      }),
    );
  });

  it("parses markdown-labeled /end payload fields without storing labels in description", async () => {
    apiRequest.mockImplementation((path, options) => {
      if (path === "/brainstorm" && options?.method === "POST") {
        const message = String(options?.body?.message || "");
        if (
          message.includes(
            "Summarise this conversation between a human and an AI and generate structured entry fields.",
          )
        ) {
          return Promise.resolve({
            reply: `# Conversation Summary
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
## content: The app will allow users to share concise thoughts and ideas, moderated by a Large Language Model and reviewed by anonymous human moderators. The app will prioritize user experience and engagement, with a focus on community values and guidelines.`,
          });
        }
        return Promise.resolve({ reply: "Assistant reply" });
      }
      if (path === "/entries" && options?.method === "POST") {
        return Promise.resolve({ id: 1116, title: "Result" });
      }
      return Promise.resolve({});
    });

    const goBack = jest.fn();
    const { getByPlaceholderText, getByLabelText } = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.changeText(
      getByPlaceholderText("Share your thought, or type /end"),
      "Need markdown-labeled finalize output",
    );
    fireEvent.press(getByLabelText("Enter note"));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/brainstorm",
        expect.objectContaining({ method: "POST" }),
      );
    });

    fireEvent.changeText(
      getByPlaceholderText("Share your thought, or type /end"),
      "/end",
    );
    fireEvent.press(getByLabelText("Enter note"));

    await waitFor(() => expect(goBack).toHaveBeenCalled());

    const createCalls = apiRequest.mock.calls.filter(
      ([callPath, requestOptions]) =>
        callPath === "/entries" && requestOptions?.method === "POST",
    );
    expect(createCalls).toHaveLength(1);
    expect(createCalls[0][1]?.body).toEqual(
      expect.objectContaining({
        title: "Personal Knowledge App for Daily Thoughts",
        summary:
          "Create a social media app for sharing daily thoughts and wisdom.",
        content:
          "The app will allow users to share concise thoughts and ideas, moderated by a Large Language Model and reviewed by anonymous human moderators. The app will prioritize user experience and engagement, with a focus on community values and guidelines.",
        description: expect.stringContaining("# Conversation Summary"),
      }),
    );
    expect(createCalls[0][1]?.body?.description).not.toContain("## title:");
    expect(createCalls[0][1]?.body?.description).not.toContain("## summary:");
    expect(createCalls[0][1]?.body?.description).not.toContain("## content:");
  });

  it("marks session with ended-summary metadata after /end", async () => {
    apiRequest.mockImplementation((path, options) => {
      if (path === "/brainstorm" && options?.method === "POST") {
        const message = String(options?.body?.message || "");
        if (
          message.includes(
            "Summarise this conversation between a human and an AI and generate structured entry fields.",
          )
        ) {
          return Promise.resolve({
            reply:
              "## Key points/decisions\n- Confirmed.\n\n## Follow-up actions\n- None.",
          });
        }
        return Promise.resolve({ reply: "Assistant reply" });
      }
      if (path === "/entries" && options?.method === "POST") {
        return Promise.resolve({ id: 1001, title: "Result" });
      }
      return Promise.resolve({});
    });

    const goBack = jest.fn();
    const { getByPlaceholderText, getByLabelText } = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.changeText(
      getByPlaceholderText("Share your thought, or type /end"),
      "Wrap this up",
    );
    fireEvent.press(getByLabelText("Enter note"));

    await waitFor(() => {
      const brainstormCalls = apiRequest.mock.calls.filter(
        ([path, options]) =>
          path === "/brainstorm" && options?.method === "POST",
      );
      expect(brainstormCalls.length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.changeText(
      getByPlaceholderText("Share your thought, or type /end"),
      "/end",
    );
    fireEvent.press(getByLabelText("Enter note"));

    await waitFor(() => expect(goBack).toHaveBeenCalled());
    const createdSession = await createBrainstormSession.mock.results[0]?.value;
    const saved = await readBrainstormSession(createdSession?.id);
    expect(saved?.hasEndedSummary).toBe(true);
  });

  it("regenerates summary when /end is submitted again in a resumed session", async () => {
    apiRequest.mockImplementation((path, options) => {
      if (path === "/brainstorm" && options?.method === "POST") {
        const message = String(options?.body?.message || "");
        if (
          message.includes(
            "Summarise this conversation between a human and an AI and generate structured entry fields.",
          )
        ) {
          return Promise.resolve({
            reply: JSON.stringify({
              description:
                "# Conversation Summary\nSecond pass summary.\n\n## Goal\n- Close loop.\n\n## Outputs Produced\n- Nothing to note.\n\n## Decisions Made\n- Nothing to note.\n\n## Working Prompts & Framings\n- Nothing to note.\n\n## Constraints & Preferences\n- Nothing to note.\n\n## Ruled Out\n- Nothing to note.\n\n## Unfinished Threads\n- Nothing to note.\n\n## Corrections Made\n- Nothing to note.\n\n## Implicit Knowledge the Human Brought\n- Nothing to note.",
              title: "Second pass title",
              summary: "Second pass summary sentence.",
              content: "Second pass cleaned content.",
            }),
          });
        }
        return Promise.resolve({ reply: "Assistant reply" });
      }
      if (path === "/entries" && options?.method === "POST") {
        return Promise.resolve({ id: 202, title: "Result" });
      }
      if (
        typeof path === "string" &&
        path.startsWith("/entries?id=") &&
        options?.method === "PATCH"
      ) {
        return Promise.resolve({ id: 202, title: "Result" });
      }
      return Promise.resolve({});
    });

    const firstView = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.changeText(
      firstView.getByPlaceholderText("Share your thought, or type /end"),
      "First pass",
    );
    fireEvent.press(firstView.getByLabelText("Enter note"));

    await waitFor(() => {
      expect(firstView.getByText("Assistant reply")).toBeTruthy();
    });

    fireEvent.changeText(
      firstView.getByPlaceholderText("Share your thought, or type /end"),
      "/end",
    );
    fireEvent.press(firstView.getByLabelText("Enter note"));

    await waitFor(() => {
      const createCalls = apiRequest.mock.calls.filter(
        ([path, options]) => path === "/entries" && options?.method === "POST",
      );
      expect(createCalls).toHaveLength(1);
    });

    await act(async () => {
      firstView.unmount();
    });

    const createdSession = await createBrainstormSession.mock.results[0]?.value;
    const resumedView = render(
      <SecondBrainBrainstormScreen
        route={{ params: { sessionId: createdSession?.id } }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.changeText(
      resumedView.getByPlaceholderText("Share your thought, or type /end"),
      "/end",
    );
    fireEvent.press(resumedView.getByLabelText("Enter note"));

    await waitFor(() => {
      const finalizeCalls = apiRequest.mock.calls.filter(
        ([path, options]) =>
          path === "/brainstorm" &&
          options?.method === "POST" &&
          String(options?.body?.message || "").includes(
            "Summarise this conversation between a human and an AI and generate structured entry fields.",
          ),
      );
      expect(finalizeCalls).toHaveLength(2);
    });

    const createCalls = apiRequest.mock.calls.filter(
      ([path, options]) => path === "/entries" && options?.method === "POST",
    );
    expect(createCalls).toHaveLength(1);
    const patchCalls = apiRequest.mock.calls.filter(
      ([path, options]) =>
        path === "/entries?id=202" && options?.method === "PATCH",
    );
    expect(patchCalls.length).toBeGreaterThanOrEqual(1);
    expect(patchCalls).toEqual(
      expect.arrayContaining([
        [
          "/entries?id=202",
          expect.objectContaining({
            method: "PATCH",
            body: expect.objectContaining({
              title: "Second pass title",
              summary: "Second pass summary sentence.",
              content: "Second pass cleaned content.",
              description: expect.stringContaining("# Conversation Summary"),
            }),
          }),
        ],
      ]),
    );
  });

  it("prevents duplicate /end finalize requests from rapid taps", async () => {
    apiRequest.mockImplementation((path, options) => {
      if (path === "/brainstorm" && options?.method === "POST") {
        const message = String(options?.body?.message || "");
        if (
          message.includes(
            "Summarise this conversation between a human and an AI and generate structured entry fields.",
          )
        ) {
          return Promise.resolve({
            reply:
              "## Key points/decisions\n- Done.\n\n## Follow-up actions\n- None.",
          });
        }
        return Promise.resolve({ reply: "Assistant reply" });
      }
      if (path === "/entries" && options?.method === "POST") {
        return Promise.resolve({ id: 303, title: "Result" });
      }
      return Promise.resolve({});
    });

    const goBack = jest.fn();
    const { getByPlaceholderText, getByLabelText } = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.changeText(
      getByPlaceholderText("Share your thought, or type /end"),
      "First idea",
    );
    fireEvent.press(getByLabelText("Enter note"));

    await waitFor(() => {
      const brainstormCalls = apiRequest.mock.calls.filter(
        ([path, options]) =>
          path === "/brainstorm" && options?.method === "POST",
      );
      expect(brainstormCalls.length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.changeText(
      getByPlaceholderText("Share your thought, or type /end"),
      "/end",
    );
    const sendButton = getByLabelText("Enter note");
    fireEvent.press(sendButton);
    fireEvent.press(sendButton);

    await waitFor(() => expect(goBack).toHaveBeenCalled());

    const finalizeCalls = apiRequest.mock.calls.filter(
      ([path, options]) => path === "/entries" && options?.method === "POST",
    );
    expect(finalizeCalls).toHaveLength(1);
  });

  it("shows loading indicator while /end finalization is in progress", async () => {
    let resolveSummary;
    const summaryPromise = new Promise((resolve) => {
      resolveSummary = resolve;
    });
    apiRequest.mockImplementation((path, options) => {
      if (path === "/brainstorm" && options?.method === "POST") {
        const message = String(options?.body?.message || "");
        if (
          message.includes(
            "Summarise this conversation between a human and an AI and generate structured entry fields.",
          )
        ) {
          return summaryPromise;
        }
        return Promise.resolve({ reply: "Assistant reply" });
      }
      if (path === "/entries" && options?.method === "POST") {
        return Promise.resolve({ id: 404, title: "Result" });
      }
      return Promise.resolve({});
    });

    const goBack = jest.fn();
    const { getByPlaceholderText, getByLabelText, queryByLabelText } = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.changeText(
      getByPlaceholderText("Share your thought, or type /end"),
      "/end",
    );
    fireEvent.press(getByLabelText("Enter note"));

    await waitFor(() => {
      expect(queryByLabelText("Finalizing brainstorm")).toBeTruthy();
    });

    await act(async () => {
      resolveSummary({
        reply:
          "## Key points/decisions\n- Done.\n\n## Follow-up actions\n- None.",
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(goBack).toHaveBeenCalled();
    });
    expect(queryByLabelText("Finalizing brainstorm")).toBeNull();
  });

  it("prevents duplicate brainstorm requests from rapid Send taps", async () => {
    let resolveBrainstorm;
    const brainstormPromise = new Promise((resolve) => {
      resolveBrainstorm = resolve;
    });
    apiRequest.mockImplementation((path) => {
      if (path === "/brainstorm") return brainstormPromise;
      return Promise.resolve({});
    });

    const { getByPlaceholderText, getByLabelText } = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.changeText(
      getByPlaceholderText("Share your thought, or type /end"),
      "Concurrent send test",
    );
    const sendButton = getByLabelText("Enter note");
    fireEvent.press(sendButton);
    fireEvent.press(sendButton);

    await waitFor(() => {
      const brainstormCalls = apiRequest.mock.calls.filter(
        ([path, options]) =>
          path === "/brainstorm" && options?.method === "POST",
      );
      expect(brainstormCalls).toHaveLength(1);
    });

    await act(async () => {
      resolveBrainstorm({ reply: "Assistant reply" });
      await Promise.resolve();
    });
  });

  it("does not duplicate /entries when unmounting during /end finalize", async () => {
    apiRequest.mockResolvedValueOnce({ reply: "Assistant reply" });
    let resolveFinalize;
    const finalizePromise = new Promise((resolve) => {
      resolveFinalize = resolve;
    });
    apiRequest.mockImplementation((path, options) => {
      if (path === "/brainstorm" && options?.method === "POST") {
        return Promise.resolve({ reply: "Assistant reply" });
      }
      if (path === "/entries" && options?.method === "POST") {
        return finalizePromise;
      }
      return Promise.resolve({});
    });

    const view = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.changeText(
      view.getByPlaceholderText("Share your thought, or type /end"),
      "First idea",
    );
    fireEvent.press(view.getByLabelText("Enter note"));

    await waitFor(() => {
      const brainstormCalls = apiRequest.mock.calls.filter(
        ([path, options]) =>
          path === "/brainstorm" && options?.method === "POST",
      );
      expect(brainstormCalls.length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.changeText(
      view.getByPlaceholderText("Share your thought, or type /end"),
      "/end",
    );
    fireEvent.press(view.getByLabelText("Enter note"));

    await act(async () => {
      view.unmount();
    });

    await act(async () => {
      resolveFinalize({ id: 505, title: "Result" });
      await Promise.resolve();
    });

    const finalizeCalls = apiRequest.mock.calls.filter(
      ([path, options]) => path === "/entries" && options?.method === "POST",
    );
    expect(finalizeCalls).toHaveLength(1);
  });

  it("creates a prefixed WIP entry when leaving without /end", async () => {
    apiRequest
      .mockResolvedValueOnce({ reply: "Assistant reply" })
      .mockResolvedValueOnce({ id: 55, title: "Draft title" })
      .mockResolvedValueOnce({});

    const view = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.changeText(
      view.getByPlaceholderText("Share your thought, or type /end"),
      "Unfinished thought",
    );
    fireEvent.press(view.getByLabelText("Enter note"));

    await waitFor(() => {
      const brainstormCalls = apiRequest.mock.calls.filter(
        ([path, options]) =>
          path === "/brainstorm" && options?.method === "POST",
      );
      expect(brainstormCalls.length).toBeGreaterThanOrEqual(1);
    });

    await act(async () => {
      view.unmount();
    });

    await waitFor(() => {
      const finalizePostCalls = apiRequest.mock.calls.filter(
        ([path, options]) => path === "/entries" && options?.method === "POST",
      );
      expect(finalizePostCalls.length).toBeGreaterThanOrEqual(1);
      expect(apiRequest).toHaveBeenCalledWith(
        "/entries?id=55",
        expect.objectContaining({
          method: "PATCH",
          body: expect.objectContaining({
            title: "[BRAINSTORMING] Draft title",
          }),
        }),
      );
    });
  });

  it("updates continued entry when leaving without /end", async () => {
    apiRequest
      .mockResolvedValueOnce({ reply: "Assistant follow-up" })
      .mockResolvedValueOnce({ id: 9, title: "Existing title" })
      .mockResolvedValueOnce({});

    const view = render(
      <SecondBrainBrainstormScreen
        route={{ params: { seedEntry: { id: 9, raw_text: "Seed context" } } }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.changeText(
      view.getByPlaceholderText("Share your thought, or type /end"),
      "New continued thought",
    );
    fireEvent.press(view.getByLabelText("Enter note"));

    await waitFor(() => {
      expect(view.getByText("Assistant follow-up")).toBeTruthy();
    });

    await act(async () => {
      view.unmount();
    });

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/entries?id=9",
        expect.objectContaining({
          method: "PATCH",
          body: expect.objectContaining({
            description: expect.stringContaining("New continued thought"),
          }),
        }),
      );
      const postCalls = apiRequest.mock.calls.filter(
        ([path, options]) => path === "/entries" && options?.method === "POST",
      );
      expect(postCalls).toHaveLength(0);
    });
  });

  it("does not finalize when leaving without sending any new chat", async () => {
    const view = render(
      <SecondBrainBrainstormScreen
        route={{ params: { seedEntry: { id: 9, raw_text: "Seed context" } } }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      view.unmount();
    });

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("makes no brainstorm or entry API calls when opened and exited immediately", async () => {
    const view = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      view.unmount();
    });

    const brainstormCalls = apiRequest.mock.calls.filter(
      ([path, options]) => path === "/brainstorm" && options?.method === "POST",
    );
    const createEntryCalls = apiRequest.mock.calls.filter(
      ([path, options]) => path === "/entries" && options?.method === "POST",
    );
    const patchEntryCalls = apiRequest.mock.calls.filter(
      ([path, options]) =>
        typeof path === "string" &&
        path.startsWith("/entries?id=") &&
        options?.method === "PATCH",
    );

    expect(brainstormCalls).toHaveLength(0);
    expect(createEntryCalls).toHaveLength(0);
    expect(patchEntryCalls).toHaveLength(0);
  });

  it("renders typebar submit button", async () => {
    const { getByLabelText } = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    expect(getByLabelText("Enter note")).toBeTruthy();
  });

  it("uses a multiline expanding typebar input", async () => {
    const { getByPlaceholderText } = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    const input = getByPlaceholderText("Share your thought, or type /end");
    expect(input.props.multiline).toBe(true);
    expect(input.props.textAlignVertical).toBe("top");
    expect(input.props.scrollEnabled).toBe(false);
  });

  it("hides microphone controls in brainstorm typebar", async () => {
    const { queryByLabelText } = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    expect(queryByLabelText("Record voice note")).toBeNull();
    expect(queryByLabelText("Stop and submit voice note")).toBeNull();
    expect(queryByLabelText("Preparing voice recorder")).toBeNull();
  });

  it("hides settings control in brainstorm typebar", async () => {
    const { queryByLabelText } = render(
      <SecondBrainBrainstormScreen
        route={{ params: {} }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    expect(queryByLabelText("Open settings")).toBeNull();
  });

  it("does not finalize a continued session when no new message is sent", async () => {
    const existing = await createBrainstormSession({
      entryId: 111,
      seedText: "Existing brainstorm context",
    });
    const view = render(
      <SecondBrainBrainstormScreen
        route={{ params: { sessionId: existing.id } }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      view.unmount();
    });

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("uses only raw_text for the initial brainstorm prompt", async () => {
    const view = render(
      <SecondBrainBrainstormScreen
        route={{
          params: {
            seedEntry: {
              id: 333,
              title: "Title should be ignored",
              summary: "Summary should be ignored",
              content: "Content should be ignored",
              description: "Description should be ignored",
              raw_text: "This raw text should be used",
            },
          },
        }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );

    await waitFor(() => {
      expect(
        view.getByText(
          "i want to brainstorm about: This raw text should be used",
        ),
      ).toBeTruthy();
      expect(view.queryByText(/Title should be ignored/)).toBeNull();
      expect(view.queryByText(/Summary should be ignored/)).toBeNull();
      expect(view.queryByText(/Content should be ignored/)).toBeNull();
      expect(view.queryByText(/Description should be ignored/)).toBeNull();
    });
  });

  it("does not auto-send initial prompt when raw_text is empty", async () => {
    apiRequest.mockResolvedValue({ reply: "Assistant reply" });

    render(
      <SecondBrainBrainstormScreen
        route={{
          params: {
            seedEntry: {
              id: 444,
              title: "Ignored title",
              summary: "Ignored summary",
              content: "Ignored content",
              description: "Ignored description",
              raw_text: "   ",
            },
          },
        }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    const brainstormCalls = apiRequest.mock.calls.filter(
      ([path, options]) => path === "/brainstorm" && options?.method === "POST",
    );
    expect(brainstormCalls).toHaveLength(0);
  });

  it("renders resumed messages when id and createdAt are missing", async () => {
    readBrainstormSession.mockResolvedValueOnce({
      id: "legacy-3",
      lifecycle: "active",
      messages: [
        { role: "user", content: "No metadata user message" },
        { role: "assistant", content: "No metadata assistant message" },
      ],
    });

    const view = render(
      <SecondBrainBrainstormScreen
        route={{ params: { sessionId: "legacy-3" } }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );

    await waitFor(() => {
      expect(view.getByText("No metadata user message")).toBeTruthy();
      expect(view.getByText("No metadata assistant message")).toBeTruthy();
    });
  });

  it("saves continued session updates even when resumed session was already wip-saved", async () => {
    readBrainstormSession.mockResolvedValueOnce({
      id: "continued-1",
      lifecycle: "wip-saved",
      finalizeGuards: { ended: false, wipSaved: true },
      messages: [{ role: "user", content: "Existing brainstorm context" }],
    });
    apiRequest.mockImplementation((path, options) => {
      if (path === "/brainstorm" && options?.method === "POST") {
        return Promise.resolve({ reply: "Follow-up reply" });
      }
      if (path === "/entries" && options?.method === "POST") {
        return Promise.resolve({ id: 900, title: "Continued result" });
      }
      if (path === "/entries?id=900" && options?.method === "PATCH") {
        return Promise.resolve({});
      }
      return Promise.resolve({});
    });

    const view = render(
      <SecondBrainBrainstormScreen
        route={{ params: { sessionId: "continued-1" } }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );

    await waitFor(() => {
      expect(view.getByText("Existing brainstorm context")).toBeTruthy();
    });

    fireEvent.changeText(
      view.getByPlaceholderText("Share your thought, or type /end"),
      "New continuation message",
    );
    fireEvent.press(view.getByLabelText("Enter note"));

    await waitFor(() => {
      const brainstormCalls = apiRequest.mock.calls.filter(
        ([path, options]) =>
          path === "/brainstorm" && options?.method === "POST",
      );
      expect(brainstormCalls.length).toBeGreaterThanOrEqual(1);
    });

    await act(async () => {
      view.unmount();
      await Promise.resolve();
    });

    await waitFor(() => {
      const finalizeCalls = apiRequest.mock.calls.filter(
        ([path, options]) => path === "/entries" && options?.method === "POST",
      );
      expect(finalizeCalls).toHaveLength(1);
    });
  });

  it("stores markdown summary on /end for resumed sessions", async () => {
    readBrainstormSession.mockResolvedValueOnce({
      id: "continued-2",
      lifecycle: "wip-saved",
      finalizeGuards: { ended: false, wipSaved: true },
      messages: [
        { role: "user", content: "Original idea context" },
        { role: "assistant", content: "Original assistant guidance" },
      ],
    });

    apiRequest.mockImplementation((path, options) => {
      if (path === "/brainstorm" && options?.method === "POST") {
        const message = String(options?.body?.message || "");
        if (
          message.includes(
            "Summarise this conversation between a human and an AI and generate structured entry fields.",
          )
        ) {
          return Promise.resolve({
            reply:
              "## Key points/decisions\n- Confirmed direction.\n\n## Follow-up actions\n- Draft first outline.",
          });
        }
        return Promise.resolve({ reply: "New assistant response" });
      }
      if (path === "/entries" && options?.method === "POST") {
        return Promise.resolve({ id: 901, title: "Ended result" });
      }
      return Promise.resolve({});
    });

    const goBack = jest.fn();
    const view = render(
      <SecondBrainBrainstormScreen
        route={{ params: { sessionId: "continued-2" } }}
        navigation={{ goBack }}
        token="token"
      />,
    );

    await waitFor(() => {
      expect(view.getByText("Original idea context")).toBeTruthy();
      expect(view.getByText("Original assistant guidance")).toBeTruthy();
    });

    fireEvent.changeText(
      view.getByPlaceholderText("Share your thought, or type /end"),
      "Continuation from resumed session",
    );
    fireEvent.press(view.getByLabelText("Enter note"));

    await waitFor(() => {
      expect(view.getByText("New assistant response")).toBeTruthy();
    });

    fireEvent.changeText(
      view.getByPlaceholderText("Share your thought, or type /end"),
      "/end",
    );
    fireEvent.press(view.getByLabelText("Enter note"));

    await waitFor(() => {
      expect(goBack).toHaveBeenCalled();
    });

    const finalizeCalls = apiRequest.mock.calls.filter(
      ([path, options]) => path === "/entries" && options?.method === "POST",
    );
    expect(finalizeCalls).toHaveLength(1);
    expect(finalizeCalls[0][1]?.body?.description).toContain(
      "## Key points/decisions",
    );
    expect(finalizeCalls[0][1]?.body?.description).toContain(
      "## Follow-up actions",
    );
  });

  it("persists parsed /end description on resumed sessions with existing entry id", async () => {
    readBrainstormSession.mockResolvedValueOnce({
      id: "resumed-existing-entry",
      entryId: 333,
      lifecycle: "active",
      finalizeGuards: { ended: false, wipSaved: false },
      messages: [
        { role: "user", content: "Original user context" },
        { role: "assistant", content: "Original assistant context" },
      ],
    });

    apiRequest.mockImplementation((path, options) => {
      if (path === "/brainstorm" && options?.method === "POST") {
        const message = String(options?.body?.message || "");
        if (
          message.includes(
            "Summarise this conversation between a human and an AI and generate structured entry fields.",
          )
        ) {
          return Promise.resolve({
            reply:
              '```json\n{"description":"# Conversation Summary\\nPersisted parsed summary.","title":"Structured title","summary":"Structured summary.","content":"Structured content."}\n```',
          });
        }
      }
      if (path === "/entries?id=333" && options?.method === "PATCH") {
        return Promise.resolve({ id: 333 });
      }
      return Promise.resolve({});
    });

    const goBack = jest.fn();
    const view = render(
      <SecondBrainBrainstormScreen
        route={{ params: { sessionId: "resumed-existing-entry" } }}
        navigation={{ goBack }}
        token="token"
      />,
    );

    await waitFor(() => {
      expect(view.getByText("Original user context")).toBeTruthy();
      expect(view.getByText("Original assistant context")).toBeTruthy();
    });

    fireEvent.changeText(
      view.getByPlaceholderText("Share your thought, or type /end"),
      "/end",
    );
    fireEvent.press(view.getByLabelText("Enter note"));

    await waitFor(() => {
      expect(goBack).toHaveBeenCalled();
    });

    const patchCalls = apiRequest.mock.calls.filter(
      ([path, options]) =>
        path === "/entries?id=333" && options?.method === "PATCH",
    );
    expect(patchCalls.length).toBeGreaterThanOrEqual(1);
    expect(patchCalls[0][1]?.body?.description).toBe(
      "# Conversation Summary\nPersisted parsed summary.",
    );
    expect(patchCalls[0][1]?.body?.description).not.toContain("```");
    expect(patchCalls[0][1]?.body?.raw_text).toContain("Original user context");
    expect(patchCalls[0][1]?.body?.raw_text).toContain(
      "Original assistant context",
    );
  });
});
