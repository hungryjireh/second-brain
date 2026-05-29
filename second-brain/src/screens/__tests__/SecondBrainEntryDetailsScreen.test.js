import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import * as ReactNative from "react-native";
import { Alert } from "react-native";
import SecondBrainEntryDetailsScreen from "../SecondBrainEntryDetailsScreen";
import { apiRequest } from "../../api";
import { theme } from "../../theme";
import {
  getLinkedBrainstormSessionId,
  readBrainstormSession,
} from "../../utils/brainstormSessions";

jest.mock("../../api", () => ({
  apiRequest: jest.fn(),
}));
jest.mock("../../utils/brainstormSessions", () => ({
  getLinkedBrainstormSessionId: jest.fn(),
  isBrainstormTalkEntry: jest.fn((entry) =>
    Array.isArray(entry?.tags)
      ? entry.tags.includes("brainstorm-conversation")
      : false,
  ),
  normalizeBrainstormMode: jest.fn((value) =>
    value === "talk" ? "talk" : "text",
  ),
  readBrainstormSession: jest.fn(),
}));

function renderWithHeaderAction({
  entry,
  routeParams,
  navigationOverrides,
  token,
}) {
  const setOptions = jest.fn();
  const navigation = {
    setOptions,
    ...navigationOverrides,
  };
  const route = routeParams ? { params: routeParams } : { params: { entry } };
  const utils = render(
    <SecondBrainEntryDetailsScreen
      route={route}
      navigation={navigation}
      token={token}
    />,
  );

  const pressHeaderActionButton = () => {
    const latestOptions = setOptions.mock.calls.at(-1)?.[0];
    const HeaderRight = latestOptions?.headerRight;
    const headerButton = HeaderRight();
    act(() => {
      headerButton.props.onPress();
    });
  };

  return {
    ...utils,
    pressHeaderActionButton,
    navigation,
    setOptions,
  };
}

describe("SecondBrainEntryDetailsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    getLinkedBrainstormSessionId.mockResolvedValue("");
    readBrainstormSession.mockResolvedValue(null);
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("renders entry details content", () => {
    const entry = {
      id: 42,
      title: "Ship tests",
      summary: "Write behavior checks",
      content: null,
      raw_text: "Full detail content",
      category: "todo",
      tags: ["work"],
    };

    const { getByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    expect(getByText("Ship tests")).toBeTruthy();
    expect(getByText("TODO")).toBeTruthy();
    expect(getByText("Write behavior checks")).toBeTruthy();
    expect(getByText("Full detail content")).toBeTruthy();
    expect(getByText("#work")).toBeTruthy();
    expect(getByText("+ tag")).toBeTruthy();
  });

  it("uses a full-page ScrollView for regular entries", () => {
    const entry = {
      id: 420,
      title: "Full-page scrolling",
      summary: "Header should scroll",
      raw_text: "Body copy",
      tags: ["ux"],
    };

    const view = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    expect(view.UNSAFE_getAllByType(ReactNative.ScrollView)).toHaveLength(1);
  });

  it("adds a tag inline when pressing the + tag flow", async () => {
    const entry = {
      id: 76,
      title: "Taggable",
      summary: "Can add tags",
      raw_text: "Body",
      tags: ["design"],
    };
    const navigation = {
      setOptions: jest.fn(),
      replace: jest.fn(),
      navigate: jest.fn(),
    };
    apiRequest.mockResolvedValueOnce({
      ...entry,
      tags: ["design", "imported"],
    });

    const { getByLabelText, getByText, queryByDisplayValue } = render(
      <SecondBrainEntryDetailsScreen
        route={{ params: { entry, entryId: entry.id } }}
        navigation={navigation}
        token="token"
      />,
    );

    fireEvent.press(getByLabelText("Add tag"));
    fireEvent.changeText(getByLabelText("Tag input"), "imported");
    fireEvent.press(getByText("Add"));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith("/entries?id=76", {
        method: "PATCH",
        token: "token",
        body: { tags: ["design", "imported"] },
      });
    });
    expect(getByText("#imported")).toBeTruthy();
    expect(queryByDisplayValue("imported")).toBeNull();
  });

  it("opens inline tag input and does not navigate away when + tag is pressed", () => {
    const entry = {
      id: 77,
      title: "Inline tag edit",
      summary: "Should stay on details",
      raw_text: "Body",
      tags: ["design"],
    };
    const navigation = {
      setOptions: jest.fn(),
      replace: jest.fn(),
      navigate: jest.fn(),
    };

    const { getByLabelText, getByText } = render(
      <SecondBrainEntryDetailsScreen
        route={{ params: { entry, entryId: entry.id } }}
        navigation={navigation}
        token="token"
      />,
    );

    fireEvent.press(getByLabelText("Add tag"));

    expect(getByLabelText("Tag input")).toBeTruthy();
    expect(getByText("Add")).toBeTruthy();
    expect(getByText("Cancel")).toBeTruthy();
    expect(navigation.replace).not.toHaveBeenCalledWith(
      "SecondBrainEditEntry",
      expect.anything(),
    );
    expect(navigation.navigate).not.toHaveBeenCalledWith(
      "SecondBrainEditEntry",
      expect.anything(),
    );
  });

  it("shows + tag even when entry has no tags", () => {
    const entry = {
      id: 78,
      title: "No tags yet",
      summary: "Start tagging",
      raw_text: "Body",
      tags: [],
    };

    const { getByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    expect(getByText("+ tag")).toBeTruthy();
  });

  it("prefers content over summary when content is present", () => {
    const entry = {
      id: 52,
      title: "Prefer content",
      summary: "Summary fallback text",
      content: "Primary content text",
      raw_text: "Body",
      category: "note",
    };

    const { getByText, queryByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    expect(getByText("Primary content text")).toBeTruthy();
    expect(queryByText("Summary fallback text")).toBeNull();
  });

  it("renders a category pill for the entry above the title section", () => {
    const entry = {
      id: 314,
      category: "reminder",
      title: "Pay internet bill",
      summary: "Monthly payment",
      raw_text: "Body",
    };

    const { getByTestId, getByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    expect(getByTestId("entry-category-pill")).toBeTruthy();
    expect(getByText("Reminder")).toBeTruthy();
    expect(getByText("Pay internet bill")).toBeTruthy();
  });

  it("shows created timestamp below summary and last updated in the category row", () => {
    const entry = {
      id: 101,
      title: "Timestamped entry",
      summary: "Check time metadata",
      raw_text: "Body",
      created_at: 1710000000,
      updated_at: 1710003600,
    };

    const { getByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    expect(getByText(/Created /)).toBeTruthy();
    expect(getByText(/ · /)).toBeTruthy();
  });

  it("applies extra spacing to the summary text block", () => {
    const entry = {
      id: 808,
      title: "Spaced entry",
      summary: "Spacing summary",
      raw_text: "Body",
      created_at: 1710000000,
      tags: ["spacing"],
    };

    const { getByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    const summaryText = getByText("Spacing summary");
    const summaryStyle = ReactNative.StyleSheet.flatten(
      summaryText.props.style,
    );

    expect(summaryStyle.marginTop).toBe(10);
    expect(summaryStyle.marginBottom).toBeUndefined();
  });

  it("does not render the in-page back button", () => {
    const { queryByLabelText } = render(
      <SecondBrainEntryDetailsScreen
        route={{ params: { entry: { title: "Entry" } } }}
      />,
    );

    expect(queryByLabelText("Back to Second Brain")).toBeNull();
  });

  it("renders imported conversation messages when entry is a chat conversation payload", () => {
    const entry = {
      title: "Claude thread",
      raw_text: JSON.stringify({
        _format: "chat_conversation_v1",
        messages: [
          { sender: "human", text: "Please summarize this" },
          {
            sender: "assistant",
            text: "Here is a summary.",
            files: [{ url: "https://example.com/generated-image.png" }],
          },
        ],
      }),
    };

    const { getByText, queryByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    expect(getByText("Assistant")).toBeTruthy();
    expect(queryByText(/^You$/)).toBeTruthy();
    expect(getByText("Please summarize this")).toBeTruthy();
    expect(getByText("Here is a summary.")).toBeTruthy();
    expect(getByText("Attachments:")).toBeTruthy();
    expect(getByText("Attachment 1")).toBeTruthy();
  });

  it("uses a full-page ScrollView for imported conversations", () => {
    const entry = {
      title: "Virtualized conversation",
      raw_text: JSON.stringify({
        _format: "chat_conversation_v1",
        messages: [
          { sender: "human", text: "Message one" },
          { sender: "assistant", text: "Message two" },
        ],
      }),
    };

    const view = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    expect(view.UNSAFE_getAllByType(ReactNative.ScrollView)).toHaveLength(1);
    expect(view.queryByText("Message one")).toBeTruthy();
    expect(view.queryByText("Message two")).toBeTruthy();
  });

  it("renders assistant conversation bubble with bgSurface background", () => {
    const entry = {
      title: "Claude thread",
      raw_text: JSON.stringify({
        _format: "chat_conversation_v1",
        messages: [
          { sender: "human", text: "Please summarize this" },
          { sender: "assistant", text: "Here is a summary." },
        ],
      }),
    };

    const { getByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    const assistantLabel = getByText("Assistant");
    let node = assistantLabel.parent;
    let foundBgSurface = false;
    while (node) {
      const styleProp = node.props?.style;
      const flattened = Array.isArray(styleProp)
        ? styleProp.flatMap((part) => (Array.isArray(part) ? part : [part]))
        : [styleProp];
      if (
        flattened.some(
          (part) =>
            part &&
            typeof part === "object" &&
            part.backgroundColor === theme.colors.bgSurface,
        )
      ) {
        foundBgSurface = true;
        break;
      }
      node = node.parent;
    }

    expect(foundBgSurface).toBe(true);
  });

  it("falls back to raw body rendering when imported conversation JSON is invalid", () => {
    const entry = {
      title: "Broken import",
      raw_text: "{not-valid-json",
    };

    const { getByText, queryByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    expect(getByText("{not-valid-json")).toBeTruthy();
    expect(queryByText("You")).toBeNull();
    expect(queryByText("Assistant")).toBeNull();
  });

  it("caps web conversation rendering and shows hidden-message notice", () => {
    const originalPlatform = ReactNative.Platform.OS;
    Object.defineProperty(ReactNative.Platform, "OS", {
      configurable: true,
      value: "web",
    });
    try {
      const messages = Array.from({ length: 205 }, (_, index) => ({
        sender: index % 2 === 0 ? "human" : "assistant",
        text: `Conversation message ${index}`,
      }));
      const entry = {
        title: "Large web conversation",
        raw_text: JSON.stringify({
          _format: "chat_conversation_v1",
          messages,
        }),
      };

      const view = render(
        <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
      );
      const { getByText, queryByText } = view;

      expect(getByText("Conversation message 0")).toBeTruthy();
      expect(queryByText("Conversation message 204")).toBeNull();
      expect(getByText("Conversation message 199")).toBeTruthy();
      expect(
        getByText("Showing first 200 messages on web for performance."),
      ).toBeTruthy();
    } finally {
      Object.defineProperty(ReactNative.Platform, "OS", {
        configurable: true,
        value: originalPlatform,
      });
    }
  });

  it("renders brainstorm conversation messages when entry has a linked session", async () => {
    const entry = {
      id: 88,
      title: "Brainstorm WIP",
      raw_text: "User: old transcript text",
    };
    getLinkedBrainstormSessionId.mockResolvedValue("session-1");
    readBrainstormSession.mockResolvedValue({
      id: "session-1",
      messages: [
        { role: "user", content: "Help me brainstorm launch ideas." },
        { role: "assistant", content: "Start with 3 launch themes." },
      ],
    });

    const { getAllByText, getByTestId, queryByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    await waitFor(() => {
      expect(getByTestId("brainstorm-conversation-toggle")).toBeTruthy();
    });
    expect(queryByText("User: old transcript text")).toBeNull();
    expect(queryByText("Help me brainstorm launch ideas.")).toBeNull();

    fireEvent.press(getByTestId("brainstorm-conversation-toggle"));
    await waitFor(() => {
      expect(
        getAllByText("Help me brainstorm launch ideas.").length,
      ).toBeGreaterThan(0);
    });
    expect(getAllByText("Start with 3 launch themes.").length).toBeGreaterThan(
      0,
    );
    expect(getAllByText("You").length).toBeGreaterThan(0);
    expect(getAllByText("Assistant").length).toBeGreaterThan(0);
  });

  it("prefers the persisted entry transcript over a divergent local brainstorm session", async () => {
    const entry = {
      id: 89,
      title: "Brainstorm canonical",
      raw_text:
        "User: Server-side brainstorm prompt\n\nAssistant: Server-side brainstorm answer",
    };
    getLinkedBrainstormSessionId.mockResolvedValue("session-divergent");
    readBrainstormSession.mockResolvedValue({
      id: "session-divergent",
      messages: [
        { role: "user", content: "Local-only prompt" },
        { role: "assistant", content: "Local-only answer" },
      ],
    });

    const { getAllByText, getByTestId, queryByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    await waitFor(() => {
      expect(getByTestId("brainstorm-conversation-toggle")).toBeTruthy();
    });

    fireEvent.press(getByTestId("brainstorm-conversation-toggle"));
    expect(
      getAllByText("Server-side brainstorm prompt").length,
    ).toBeGreaterThan(0);
    expect(
      getAllByText("Server-side brainstorm answer").length,
    ).toBeGreaterThan(0);
    expect(queryByText("Local-only prompt")).toBeNull();
    expect(queryByText("Local-only answer")).toBeNull();
  });

  it("shows persisted brainstorm summary content without a local ended session", async () => {
    const entry = {
      id: 90,
      title: "Brainstorm persisted summary",
      summary: "A concise persisted summary.",
      content: "Clean persisted brainstorm summary body.",
      raw_text:
        "User: Persisted conversation prompt\n\nAssistant: Persisted conversation answer",
    };
    getLinkedBrainstormSessionId.mockResolvedValue("");

    const { getByText, getByTestId, queryByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    await waitFor(() => {
      expect(getByTestId("brainstorm-summary-toggle")).toBeTruthy();
      expect(getByTestId("brainstorm-conversation-toggle")).toBeTruthy();
    });

    expect(getByText("A concise persisted summary.")).toBeTruthy();
    expect(queryByText("Clean persisted brainstorm summary body.")).toBeNull();

    fireEvent.press(getByTestId("brainstorm-summary-toggle"));
    expect(getByText("Clean persisted brainstorm summary body.")).toBeTruthy();
  });

  it("uses a full-page ScrollView for brainstorm entries", async () => {
    const entry = {
      id: 1888,
      title: "Brainstorm scrolling",
      raw_text: "User: seed",
    };
    getLinkedBrainstormSessionId.mockResolvedValue("session-scroll");
    readBrainstormSession.mockResolvedValue({
      id: "session-scroll",
      messages: [{ role: "assistant", content: "Keep scrolling" }],
    });

    const view = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    await waitFor(() => {
      expect(view.getByTestId("brainstorm-conversation-toggle")).toBeTruthy();
    });
    expect(view.UNSAFE_getAllByType(ReactNative.ScrollView)).toHaveLength(1);
  });

  it("shows brainstorm summary dropdown collapsed by default", async () => {
    const entry = {
      id: 890,
      title: "Brainstorm summary",
      description:
        "## Key points/decisions\n- Picked launch angle.\n\n## Follow-up actions\n- Draft landing page copy.",
    };
    getLinkedBrainstormSessionId.mockResolvedValue("session-890");
    readBrainstormSession.mockResolvedValue({
      id: "session-890",
      lifecycle: "ended",
      messages: [
        { role: "assistant", content: "Conversation stays available." },
      ],
    });

    const { getByTestId, queryByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    await waitFor(() => {
      expect(getByTestId("brainstorm-summary-toggle")).toBeTruthy();
      expect(getByTestId("brainstorm-conversation-toggle")).toBeTruthy();
    });
    expect(queryByText("Key points/decisions")).toBeNull();
    expect(queryByText("Picked launch angle.")).toBeNull();
  });

  it("renders brainstorm summary markdown when expanded", async () => {
    const entry = {
      id: 891,
      title: "Brainstorm summary markdown",
      description:
        "## Key points/decisions\n- **Picked** launch angle.\n\n## Follow-up actions\n- Draft landing page copy.",
    };
    getLinkedBrainstormSessionId.mockResolvedValue("session-891");
    readBrainstormSession.mockResolvedValue({
      id: "session-891",
      lifecycle: "ended",
      messages: [
        { role: "assistant", content: "Conversation stays available." },
      ],
    });

    const { getByTestId, getByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    await waitFor(() => {
      expect(getByTestId("brainstorm-summary-toggle")).toBeTruthy();
    });
    fireEvent.press(getByTestId("brainstorm-summary-toggle"));

    expect(getByText("Key points/decisions")).toBeTruthy();
    expect(getByText("Picked")).toBeTruthy();
    expect(getByText("Follow-up actions")).toBeTruthy();
    expect(getByText("Draft landing page copy.")).toBeTruthy();
    expect(getByTestId("brainstorm-conversation-toggle")).toBeTruthy();
  });

  it("unwraps JSON summary payload in details rendering", async () => {
    const entry = {
      id: 8921,
      title: "Legacy title",
      description:
        '``` json\n{"description":"# Conversation Summary\\nOne human and AI discussed app ideas.","title":"Knowledge App Brainstorming","summary":"A human and AI discussed marketing ideas.","content":"Conversation cleaned note."}\n```',
    };
    getLinkedBrainstormSessionId.mockResolvedValue("session-8921");
    readBrainstormSession.mockResolvedValue({
      id: "session-8921",
      lifecycle: "ended",
      messages: [{ role: "assistant", content: "Conversation available." }],
    });

    const { getByTestId, getByText, queryByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    await waitFor(() => {
      expect(getByTestId("brainstorm-summary-toggle")).toBeTruthy();
    });

    expect(getByText("Knowledge App Brainstorming")).toBeTruthy();
    expect(getByText("A human and AI discussed marketing ideas.")).toBeTruthy();
    expect(queryByText(/```/)).toBeNull();

    fireEvent.press(getByTestId("brainstorm-summary-toggle"));
    expect(getByText("Conversation Summary")).toBeTruthy();
    expect(getByText("One human and AI discussed app ideas.")).toBeTruthy();
  });

  it("unwraps fenced JSON when payload is stored in summary", async () => {
    const entry = {
      id: 8922,
      title: "Legacy title",
      description: "Plain fallback description",
      summary:
        '```json\n{"description":"# Conversation Summary\\nSummary from JSON payload.","title":"JSON Summary Title","summary":"JSON summary line.","content":"Clean content."}\n```',
    };
    getLinkedBrainstormSessionId.mockResolvedValue("session-8922");
    readBrainstormSession.mockResolvedValue({
      id: "session-8922",
      lifecycle: "ended",
      messages: [{ role: "assistant", content: "Conversation available." }],
    });

    const { getByText, queryByText, getByTestId } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    await waitFor(() => {
      expect(getByTestId("brainstorm-summary-toggle")).toBeTruthy();
    });

    expect(getByText("JSON Summary Title")).toBeTruthy();
    expect(getByText("JSON summary line.")).toBeTruthy();
    expect(queryByText(/```json/)).toBeNull();
  });

  it("unwraps fenced JSON when payload is stored in content", async () => {
    const entry = {
      id: 8923,
      title: "Legacy title",
      description: "Plain fallback description",
      content:
        '```json\n{"description":"# Conversation Summary\\nContent payload summary.","title":"JSON Content Title","summary":"JSON content summary line.","content":"Clean content body."}\n```',
    };
    getLinkedBrainstormSessionId.mockResolvedValue("session-8923");
    readBrainstormSession.mockResolvedValue({
      id: "session-8923",
      lifecycle: "ended",
      messages: [{ role: "assistant", content: "Conversation available." }],
    });

    const { getByText, queryByText, getByTestId } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    await waitFor(() => {
      expect(getByTestId("brainstorm-summary-toggle")).toBeTruthy();
    });

    expect(getByText("JSON Content Title")).toBeTruthy();
    expect(getByText("JSON content summary line.")).toBeTruthy();
    expect(queryByText(/```json/)).toBeNull();
  });

  it("unwraps raw structured JSON when payload is stored in raw_text", async () => {
    const entry = {
      id: 8924,
      title: "Legacy title",
      raw_text: `{
  "title": "Raw Text JSON Title",
  "summary": "Raw text JSON summary.",
  "description": "# Conversation Summary
Raw text JSON description."
}`,
    };
    getLinkedBrainstormSessionId.mockResolvedValue("session-8924");
    readBrainstormSession.mockResolvedValue({
      id: "session-8924",
      lifecycle: "ended",
      messages: [{ role: "assistant", content: "Conversation available." }],
    });

    const { getByText, queryByText, getByTestId } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    await waitFor(() => {
      expect(getByTestId("brainstorm-summary-toggle")).toBeTruthy();
    });

    expect(getByText("Raw Text JSON Title")).toBeTruthy();
    expect(getByText("Raw text JSON summary.")).toBeTruthy();
    expect(queryByText(/"title"/)).toBeNull();
  });

  it("does not show summary dropdown for brainstorm notes that never ended", async () => {
    const entry = {
      id: 892,
      title: "Brainstorm without end",
      description:
        "## Key points/decisions\n- Draft text exists.\n\n## Follow-up actions\n- None.",
    };
    getLinkedBrainstormSessionId.mockResolvedValue("session-892");
    readBrainstormSession.mockResolvedValue({
      id: "session-892",
      lifecycle: "wip-saved",
      finalizeGuards: { ended: false, wipSaved: true },
      messages: [{ role: "assistant", content: "Conversation is available." }],
    });

    const { getByTestId, queryByTestId } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    await waitFor(() => {
      expect(getByTestId("brainstorm-conversation-toggle")).toBeTruthy();
    });
    expect(queryByTestId("brainstorm-summary-toggle")).toBeNull();
  });

  it("shows summary dropdown for resumed brainstorm notes that previously ended", async () => {
    const entry = {
      id: 893,
      title: "Brainstorm resumed after end",
      description:
        "## Key points/decisions\n- Persisted summary.\n\n## Follow-up actions\n- Follow through.",
    };
    getLinkedBrainstormSessionId.mockResolvedValue("session-893");
    readBrainstormSession.mockResolvedValue({
      id: "session-893",
      lifecycle: "active",
      hasEndedSummary: true,
      finalizeGuards: { ended: false, wipSaved: false },
      messages: [{ role: "assistant", content: "Conversation is available." }],
    });

    const { getByTestId } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    await waitFor(() => {
      expect(getByTestId("brainstorm-summary-toggle")).toBeTruthy();
      expect(getByTestId("brainstorm-conversation-toggle")).toBeTruthy();
    });
  });

  it("keeps brainstorm conversation hidden by default when collapsed", async () => {
    const entry = {
      id: 188,
      title: "Collapsed by default",
      raw_text: "User: seed",
    };
    getLinkedBrainstormSessionId.mockResolvedValue("session-hidden");
    readBrainstormSession.mockResolvedValue({
      id: "session-hidden",
      messages: [
        { role: "user", content: "Hidden brainstorm user message" },
        { role: "assistant", content: "Hidden brainstorm assistant message" },
      ],
    });

    const { getByTestId, queryByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    await waitFor(() => {
      expect(getByTestId("brainstorm-conversation-toggle")).toBeTruthy();
    });
    expect(queryByText("Hidden brainstorm user message")).toBeNull();
    expect(queryByText("Hidden brainstorm assistant message")).toBeNull();
    expect(queryByText("You")).toBeNull();
    expect(queryByText("Assistant")).toBeNull();
  });

  it("hides brainstorm conversation again after collapsing from expanded state", async () => {
    const entry = {
      id: 189,
      title: "Collapse toggle behavior",
      raw_text: "User: seed",
    };
    getLinkedBrainstormSessionId.mockResolvedValue("session-toggle");
    readBrainstormSession.mockResolvedValue({
      id: "session-toggle",
      messages: [
        { role: "user", content: "Toggle user message" },
        { role: "assistant", content: "Toggle assistant message" },
      ],
    });

    const { getByTestId, getByText, queryByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    await waitFor(() => {
      expect(getByTestId("brainstorm-conversation-toggle")).toBeTruthy();
    });

    fireEvent.press(getByTestId("brainstorm-conversation-toggle"));
    await waitFor(() => {
      expect(getByText("Toggle user message")).toBeTruthy();
    });
    expect(getByText("Toggle assistant message")).toBeTruthy();

    fireEvent.press(getByTestId("brainstorm-conversation-toggle"));
    await waitFor(() => {
      expect(queryByText("Toggle user message")).toBeNull();
    });
    expect(queryByText("Toggle assistant message")).toBeNull();
    expect(queryByText("You")).toBeNull();
    expect(queryByText("Assistant")).toBeNull();
  });

  it("prefers imported chat payload over linked brainstorm session messages", async () => {
    const entry = {
      id: 501,
      title: "Imported chat wins",
      raw_text: JSON.stringify({
        _format: "chat_conversation_v1",
        messages: [
          { sender: "human", text: "Imported human message" },
          { sender: "assistant", text: "Imported assistant message" },
        ],
      }),
    };
    getLinkedBrainstormSessionId.mockResolvedValue("session-ignored");
    readBrainstormSession.mockResolvedValue({
      id: "session-ignored",
      messages: [
        { role: "user", content: "Brainstorm user message" },
        { role: "assistant", content: "Brainstorm assistant message" },
      ],
    });

    const { getByText, queryByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    expect(getByText("Imported human message")).toBeTruthy();
    expect(getByText("Imported assistant message")).toBeTruthy();
    await waitFor(() => {
      expect(readBrainstormSession).not.toHaveBeenCalled();
    });
    expect(queryByText("Brainstorm user message")).toBeNull();
    expect(queryByText("Brainstorm assistant message")).toBeNull();
  });

  it("falls back to raw body when no linked brainstorm session exists", async () => {
    const entry = {
      id: 777,
      title: "No linked session",
      raw_text: "Raw transcript fallback text",
    };
    getLinkedBrainstormSessionId.mockResolvedValue("");

    const { getByText, queryByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    await waitFor(() => {
      expect(getLinkedBrainstormSessionId).toHaveBeenCalledWith(777);
    });
    expect(readBrainstormSession).not.toHaveBeenCalled();
    expect(getByText("Raw transcript fallback text")).toBeTruthy();
    expect(queryByText("You")).toBeNull();
    expect(queryByText("Assistant")).toBeNull();
  });

  it("filters empty brainstorm session messages before rendering", async () => {
    const entry = {
      id: 909,
      title: "Filter empty messages",
      raw_text: "Raw body should not render",
    };
    getLinkedBrainstormSessionId.mockResolvedValue("session-909");
    readBrainstormSession.mockResolvedValue({
      id: "session-909",
      messages: [
        { role: "user", content: "   " },
        { role: "assistant", content: "Useful assistant response" },
      ],
    });

    const { getAllByText, getByTestId, queryByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    await waitFor(() => {
      expect(getByTestId("brainstorm-conversation-toggle")).toBeTruthy();
    });
    expect(queryByText("Raw body should not render")).toBeNull();
    expect(queryByText("Useful assistant response")).toBeNull();

    fireEvent.press(getByTestId("brainstorm-conversation-toggle"));
    await waitFor(() => {
      expect(getAllByText("Useful assistant response").length).toBeGreaterThan(
        0,
      );
    });
    expect(queryByText(/^You$/)).toBeNull();
    expect(getAllByText("Assistant").length).toBeGreaterThan(0);
  });

  it("renders brainstorm transcript-style entry text as conversation bubbles", async () => {
    const entry = {
      id: 1201,
      title: "Transcript fallback",
      description:
        "User: I need launch messaging ideas.\n\nAssistant: Start with customer pain points.\n\nUser: Give me examples.",
    };
    getLinkedBrainstormSessionId.mockResolvedValue("");

    const { getAllByText, getByTestId, queryByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    await waitFor(() => {
      expect(getByTestId("brainstorm-conversation-toggle")).toBeTruthy();
    });
    expect(queryByText("I need launch messaging ideas.")).toBeNull();
    expect(queryByText("Start with customer pain points.")).toBeNull();
    expect(queryByText("Give me examples.")).toBeNull();

    fireEvent.press(getByTestId("brainstorm-conversation-toggle"));
    expect(
      getAllByText("Start with customer pain points.").length,
    ).toBeGreaterThan(0);
    expect(getAllByText("Give me examples.").length).toBeGreaterThan(0);
    expect(getAllByText(/^You$/).length).toBeGreaterThan(1);
    expect(getAllByText("Assistant").length).toBeGreaterThan(0);
    expect(queryByText("User: I need launch messaging ideas.")).toBeNull();
  });

  it("supports multiline brainstorm transcript chunks", async () => {
    const entry = {
      id: 1202,
      title: "Multiline transcript",
      description:
        "User: I need a plan.\nThis is extra context.\n\nAssistant: Here are options.\n1) Option one\n2) Option two",
    };
    getLinkedBrainstormSessionId.mockResolvedValue("");

    const { getAllByText, getByTestId } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    await waitFor(() => {
      expect(getByTestId("brainstorm-conversation-toggle")).toBeTruthy();
    });

    fireEvent.press(getByTestId("brainstorm-conversation-toggle"));
    expect(getAllByText("This is extra context.").length).toBeGreaterThan(0);
    expect(getAllByText("Here are options.").length).toBeGreaterThan(0);
    expect(getAllByText("1) Option one").length).toBeGreaterThan(0);
    expect(getAllByText("2) Option two").length).toBeGreaterThan(0);
  });

  it("parses transcript fallback from raw_text when description is missing", async () => {
    const entry = {
      id: 1204,
      title: "Raw text transcript",
      raw_text: "Human: First thought\n\nAssistant: Helpful response",
    };
    getLinkedBrainstormSessionId.mockResolvedValue("");

    const { getAllByText, getByTestId, queryByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    await waitFor(() => {
      expect(getByTestId("brainstorm-conversation-toggle")).toBeTruthy();
    });
    expect(queryByText("First thought")).toBeNull();
    expect(queryByText("Helpful response")).toBeNull();

    fireEvent.press(getByTestId("brainstorm-conversation-toggle"));
    await waitFor(() => {
      expect(getAllByText("First thought").length).toBeGreaterThan(0);
    });
    expect(getAllByText("Helpful response").length).toBeGreaterThan(0);
    expect(getAllByText("You").length).toBeGreaterThan(0);
    expect(getAllByText("Assistant").length).toBeGreaterThan(0);
  });

  it("falls back to raw body when transcript chunks do not use role prefixes", async () => {
    const entry = {
      id: 1205,
      title: "No role prefixes",
      description: "Idea one\n\nIdea two\n\nIdea three",
    };
    getLinkedBrainstormSessionId.mockResolvedValue("");

    const { getByText, queryByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    await waitFor(() => {
      expect(getByText("Idea one")).toBeTruthy();
    });
    expect(getByText("Idea two")).toBeTruthy();
    expect(getByText("Idea three")).toBeTruthy();
    expect(queryByText("Assistant")).toBeNull();
  });

  it("renders transcript fallback when linked brainstorm session exists but has no valid messages", async () => {
    const entry = {
      id: 1206,
      title: "Session empty transcript fallback",
      description: "User: Plan launch\n\nAssistant: Draft launch pillars",
    };
    getLinkedBrainstormSessionId.mockResolvedValue("session-empty");
    readBrainstormSession.mockResolvedValue({
      id: "session-empty",
      messages: [{ role: "user", content: "   " }],
    });

    const { getAllByText, getByTestId, queryByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    await waitFor(() => {
      expect(getByTestId("brainstorm-conversation-toggle")).toBeTruthy();
    });
    expect(queryByText("Plan launch")).toBeNull();
    expect(queryByText("Draft launch pillars")).toBeNull();

    fireEvent.press(getByTestId("brainstorm-conversation-toggle"));
    await waitFor(() => {
      expect(getAllByText("Plan launch").length).toBeGreaterThan(0);
    });
    expect(getAllByText("Draft launch pillars").length).toBeGreaterThan(0);
  });

  it("does not force conversation rendering for a single-role transcript-like body", async () => {
    const entry = {
      id: 1203,
      title: "Single-role transcript",
      raw_text: "User: Just one message without assistant response.",
    };
    getLinkedBrainstormSessionId.mockResolvedValue("");

    const { getByText, queryByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    await waitFor(() => {
      expect(
        getByText("User: Just one message without assistant response."),
      ).toBeTruthy();
    });
    expect(queryByText(/^You$/)).toBeNull();
    expect(queryByText("Assistant")).toBeNull();
  });

  it("navigates to edit entry screen when Edit is pressed", () => {
    const navigate = jest.fn();
    const entry = { id: 7, title: "Entry" };
    const { getByText, pressHeaderActionButton } = renderWithHeaderAction({
      entry,
      navigationOverrides: { navigate },
    });

    pressHeaderActionButton();
    fireEvent.press(getByText("Edit"));

    expect(navigate).toHaveBeenCalledWith("SecondBrainEditEntry", {
      entryId: 7,
      entry: { id: 7, title: "Entry" },
    });
  });

  it("replaces with edit entry screen when replace is available", () => {
    const navigate = jest.fn();
    const replace = jest.fn();
    const entry = { id: 9, title: "Entry 9" };
    const { getByText, pressHeaderActionButton } = renderWithHeaderAction({
      entry,
      navigationOverrides: { navigate, replace },
    });

    pressHeaderActionButton();
    fireEvent.press(getByText("Edit"));

    expect(replace).toHaveBeenCalledWith("SecondBrainEditEntry", {
      entryId: 9,
      entry: { id: 9, title: "Entry 9" },
    });
    expect(navigate).not.toHaveBeenCalled();
  });

  it("navigates to brainstorm screen from continue action", () => {
    const navigate = jest.fn();
    const entry = { id: 91, title: "Entry 91", raw_text: "Body text" };
    const { getByText, pressHeaderActionButton } = renderWithHeaderAction({
      entry,
      navigationOverrides: { navigate },
    });

    pressHeaderActionButton();
    fireEvent.press(getByText("Continue Brainstorming"));

    expect(navigate).toHaveBeenCalledWith("SecondBrainBrainstorm", {
      seedEntry: entry,
    });
  });

  it("navigates to brainstorm talk screen from continue action for brainstorm conversation entries", () => {
    const navigate = jest.fn();
    const entry = {
      id: 92,
      title: "Brainstorm Conversation",
      raw_text: "User: Hi",
      tags: ["brainstorm-conversation"],
    };
    const { getByText, pressHeaderActionButton } = renderWithHeaderAction({
      entry,
      navigationOverrides: { navigate },
    });

    pressHeaderActionButton();
    fireEvent.press(getByText("Continue Brainstorming"));

    expect(navigate).toHaveBeenCalledWith("SecondBrainBrainstormTalk", {
      seedEntry: entry,
    });
  });

  it("shows Delete in the action drawer and prompts for confirmation", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const entry = { id: 11, title: "Entry 11", category: "note" };
    const { getByText, pressHeaderActionButton } = renderWithHeaderAction({
      entry,
      token: "token",
    });

    pressHeaderActionButton();

    expect(getByText("Edit")).toBeTruthy();
    expect(getByText("Archive")).toBeTruthy();
    expect(getByText("Delete")).toBeTruthy();

    fireEvent.press(getByText("Delete"));
    expect(alertSpy).toHaveBeenCalledWith(
      "Delete entry?",
      "This action cannot be undone.",
      expect.any(Array),
    );
    alertSpy.mockRestore();
  });

  it("shows 'Mark done?' confirmation when archiving a reminder", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const entry = {
      id: 19,
      title: "Take medicine",
      category: "reminder",
      is_archived: false,
    };
    const { getByText, pressHeaderActionButton } = renderWithHeaderAction({
      entry,
      token: "token",
    });

    pressHeaderActionButton();
    fireEvent.press(getByText("Mark Done"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Mark done?",
      "This will move the entry to Archived/Done.",
      expect.any(Array),
    );
    alertSpy.mockRestore();
  });

  it("closes inline actions when tapping outside the menu", async () => {
    const entry = {
      id: 15,
      title: "Outside tap",
      summary: "Tap this to dismiss",
      raw_text: "Body",
      category: "note",
    };

    const { getByTestId, getByText, queryByTestId, pressHeaderActionButton } =
      renderWithHeaderAction({ entry });

    pressHeaderActionButton();
    expect(getByText("Edit")).toBeTruthy();

    fireEvent.press(getByTestId("entry-actions-dismiss-overlay"));
    act(() => {
      jest.runOnlyPendingTimers();
    });
    await waitFor(() => {
      expect(queryByTestId("entry-actions-dismiss-overlay")).toBeNull();
    });
  });

  it("keeps the title visible when opening actions on large screens", () => {
    const useWindowDimensionsSpy = jest
      .spyOn(ReactNative, "useWindowDimensions")
      .mockReturnValue({
        width: 1024,
        height: 768,
        scale: 1,
        fontScale: 1,
      });
    const entry = { id: 22, title: "Persistent title", category: "note" };

    const { getByTestId, getByText, pressHeaderActionButton } =
      renderWithHeaderAction({ entry });

    pressHeaderActionButton();

    expect(getByText("Persistent title")).toBeTruthy();
    expect(getByText("Edit")).toBeTruthy();
    expect(getByTestId("entry-actions-dropdown")).toBeTruthy();
    useWindowDimensionsSpy.mockRestore();
  });

  it("keeps large-screen title row height stable when actions are toggled", () => {
    const useWindowDimensionsSpy = jest
      .spyOn(ReactNative, "useWindowDimensions")
      .mockReturnValue({
        width: 1024,
        height: 768,
        scale: 1,
        fontScale: 1,
      });
    const entry = { id: 23, title: "Stable summary spacing", category: "note" };

    const { getByTestId, pressHeaderActionButton } = renderWithHeaderAction({
      entry,
    });

    const titleRowBefore = getByTestId("entry-title-row");
    pressHeaderActionButton();
    const titleRowAfter = getByTestId("entry-title-row");

    expect(titleRowBefore.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ minHeight: 32 })]),
    );
    expect(titleRowAfter.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ minHeight: 32 })]),
    );
    useWindowDimensionsSpy.mockRestore();
  });

  it("loads entry by route entryId and renders fetched title", async () => {
    apiRequest.mockResolvedValueOnce({
      id: 42,
      title: "Loaded entry title",
      summary: "Loaded summary",
      raw_text: "Loaded body",
    });

    const { getByText } = render(
      <SecondBrainEntryDetailsScreen
        route={{ params: { entryId: 42 } }}
        token="token"
      />,
    );

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith("/entries?id=42", {
        token: "token",
      });
      expect(getByText("Loaded entry title")).toBeTruthy();
    });
  });

  it("renders clicked entry title immediately while entryId fetch is still pending", () => {
    const entry = {
      id: 42,
      title: "Clicked entry title",
      summary: "Clicked summary",
      raw_text: "Clicked body",
    };

    apiRequest.mockImplementation(() => new Promise(() => {}));

    const { getByText, queryByText } = render(
      <SecondBrainEntryDetailsScreen
        route={{ params: { entryId: 42, entry } }}
        token="token"
      />,
    );

    expect(getByText("Clicked entry title")).toBeTruthy();
    expect(queryByText("Untitled")).toBeNull();
  });
});
