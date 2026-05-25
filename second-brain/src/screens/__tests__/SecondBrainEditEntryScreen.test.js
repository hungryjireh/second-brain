import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";
import SecondBrainEditEntryScreen from "../SecondBrainEditEntryScreen";
import { apiRequest } from "../../api";

jest.mock("../../api", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("@react-native-community/datetimepicker", () => {
  const { Text: MockText } = require("react-native");

  function MockDateTimePicker() {
    return (
      <MockText testID="native-datetime-picker">MockDateTimePicker</MockText>
    );
  }

  return MockDateTimePicker;
});

describe("SecondBrainEditEntryScreen", () => {
  const token = "token";
  const entry = {
    id: 42,
    title: "Ship tests",
    summary: "Write behavior checks",
    content: "Write behavior checks in detail",
    raw_text: "Write behavior checks",
    category: "note",
    priority: 3,
    tags: ["work"],
    is_archived: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "ios",
    });
  });

  it("saves edited text and navigates to entry details", async () => {
    const navigate = jest.fn();
    apiRequest.mockResolvedValueOnce({
      ...entry,
      raw_text: "Updated text",
      summary: "Updated text",
    });

    const { getByPlaceholderText, getByText } = render(
      <SecondBrainEditEntryScreen
        route={{ params: { entry, token } }}
        navigation={{ navigate }}
      />,
    );

    fireEvent.changeText(getByPlaceholderText("Description"), "Updated text");
    fireEvent.press(getByText("Save changes"));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/entries?id=42",
        expect.objectContaining({
          method: "PATCH",
          body: expect.objectContaining({ raw_text: "Updated text" }),
        }),
      );
    });
    expect(apiRequest).not.toHaveBeenCalledWith("/tags", expect.anything());
    expect(navigate).toHaveBeenCalledWith(
      "SecondBrainEntryDetails",
      expect.objectContaining({
        entryId: 42,
        entry: expect.objectContaining({ id: 42 }),
      }),
    );
  });

  it("initializes description input from raw_text", () => {
    const entryWithRawText = {
      ...entry,
      raw_text: "Raw text from snake_case field",
    };

    const { getByPlaceholderText } = render(
      <SecondBrainEditEntryScreen
        route={{ params: { entry: entryWithRawText, token } }}
        navigation={{ goBack: jest.fn() }}
      />,
    );

    expect(getByPlaceholderText("Description").props.value).toBe(
      "Raw text from snake_case field",
    );
  });

  it("initializes content input from content", () => {
    const entryWithContent = {
      ...entry,
      content: "Detailed content from content field",
    };

    const { getByPlaceholderText } = render(
      <SecondBrainEditEntryScreen
        route={{ params: { entry: entryWithContent, token } }}
        navigation={{ goBack: jest.fn() }}
      />,
    );

    expect(getByPlaceholderText("Content").props.value).toBe(
      "Detailed content from content field",
    );
  });

  it("renders a single description input without a dedicated raw text input", () => {
    const { getByPlaceholderText, getByTestId, queryByPlaceholderText } =
      render(
        <SecondBrainEditEntryScreen
          route={{ params: { entry, token } }}
          navigation={{ goBack: jest.fn() }}
        />,
      );

    expect(getByPlaceholderText("Description")).toBeTruthy();
    expect(getByTestId("description-input")).toBeTruthy();
    expect(queryByPlaceholderText("Raw text")).toBeNull();
  });

  it("does not render the tags field controls", () => {
    const { queryByText, queryByPlaceholderText } = render(
      <SecondBrainEditEntryScreen
        route={{ params: { entry, token } }}
        navigation={{ goBack: jest.fn() }}
      />,
    );

    expect(queryByText("Tags")).toBeNull();
    expect(queryByPlaceholderText("Type a tag")).toBeNull();
    expect(queryByText("Add")).toBeNull();
  });

  it("sends raw_text from the description field when saving", async () => {
    const navigate = jest.fn();
    apiRequest.mockResolvedValueOnce({
      ...entry,
      raw_text: "Updated payload text",
    });

    const { getByPlaceholderText, getByText } = render(
      <SecondBrainEditEntryScreen
        route={{ params: { entry, token } }}
        navigation={{ navigate }}
      />,
    );

    fireEvent.changeText(
      getByPlaceholderText("Description"),
      "Updated payload text",
    );
    fireEvent.press(getByText("Save changes"));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/entries?id=42",
        expect.objectContaining({
          method: "PATCH",
          body: expect.objectContaining({
            raw_text: "Updated payload text",
            summary: "Write behavior checks",
            content: "Write behavior checks in detail",
          }),
        }),
      );
    });
    const patchCall = apiRequest.mock.calls.find(
      ([url, options]) =>
        url === "/entries?id=42" && options?.method === "PATCH",
    );
    expect(patchCall?.[1]?.body).not.toHaveProperty("tags");
  });

  it("keeps description value editable", () => {
    const { getByPlaceholderText } = render(
      <SecondBrainEditEntryScreen
        route={{ params: { entry, token } }}
        navigation={{ goBack: jest.fn() }}
      />,
    );

    const descriptionInput = getByPlaceholderText("Description");

    fireEvent.changeText(descriptionInput, "Description only");
    expect(descriptionInput.props.value).toBe("Description only");
  });

  it("sends updated content from the content field when saving", async () => {
    const navigate = jest.fn();
    apiRequest.mockResolvedValueOnce({
      ...entry,
      content: "Updated content details",
    });

    const { getByPlaceholderText, getByText } = render(
      <SecondBrainEditEntryScreen
        route={{ params: { entry, token } }}
        navigation={{ navigate }}
      />,
    );

    fireEvent.changeText(
      getByPlaceholderText("Content"),
      "Updated content details",
    );
    fireEvent.press(getByText("Save changes"));

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/entries?id=42",
        expect.objectContaining({
          method: "PATCH",
          body: expect.objectContaining({
            content: "Updated content details",
          }),
        }),
      );
    });
  });

  it("shows validation error and skips PATCH when priority is out of range", async () => {
    const goBack = jest.fn();

    const { getByPlaceholderText, getByText, findByText } = render(
      <SecondBrainEditEntryScreen
        route={{ params: { entry, token } }}
        navigation={{ goBack }}
      />,
    );

    fireEvent.changeText(getByPlaceholderText("0"), "11");
    fireEvent.press(getByText("Save changes"));

    expect(
      await findByText("Priority must be an integer from 0 to 10."),
    ).toBeTruthy();
    expect(apiRequest).not.toHaveBeenCalledWith(
      "/entries?id=42",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(apiRequest).not.toHaveBeenCalledWith("/tags", expect.anything());
    expect(goBack).not.toHaveBeenCalled();
  });

  it("does not request global tags on mount", () => {
    render(
      <SecondBrainEditEntryScreen
        route={{ params: { entry, token } }}
        navigation={{ goBack: jest.fn() }}
      />,
    );

    expect(apiRequest).not.toHaveBeenCalledWith("/tags", expect.anything());
  });

  it("disables description input and renders markdown preview when toggle is enabled", async () => {
    const goBack = jest.fn();
    const markdownEntry = {
      ...entry,
      raw_text: "**Bold** line",
    };

    const { getByTestId, getByText, queryByTestId } = render(
      <SecondBrainEditEntryScreen
        route={{ params: { entry: markdownEntry, token } }}
        navigation={{ goBack }}
      />,
    );

    fireEvent(getByTestId("description-markdown-toggle"), "valueChange", true);

    expect(queryByTestId("description-input")).toBeNull();
    expect(getByTestId("description-markdown-preview")).toBeTruthy();
    expect(getByText("Bold")).toBeTruthy();
  });

  it("renders conversation-form raw_text preview when markdown toggle is enabled", () => {
    const goBack = jest.fn();
    const conversationEntry = {
      ...entry,
      raw_text: JSON.stringify({
        _format: "chat_conversation_v1",
        messages: [
          { sender: "human", text: "How do we start?" },
          { sender: "assistant", text: "Start with the smallest step." },
        ],
      }),
    };

    const { getByTestId, getByText, queryByTestId } = render(
      <SecondBrainEditEntryScreen
        route={{ params: { entry: conversationEntry, token } }}
        navigation={{ goBack }}
      />,
    );

    fireEvent(getByTestId("description-markdown-toggle"), "valueChange", true);

    expect(getByTestId("description-conversation-preview")).toBeTruthy();
    expect(queryByTestId("description-markdown-preview")).toBeNull();
    expect(getByText("You")).toBeTruthy();
    expect(getByText("Assistant")).toBeTruthy();
    expect(getByText("How do we start?")).toBeTruthy();
    expect(getByText("Start with the smallest step.")).toBeTruthy();
  });

  it("renders brainstorm transcript-form raw_text as conversation when markdown toggle is enabled", () => {
    const goBack = jest.fn();
    const transcriptEntry = {
      ...entry,
      raw_text:
        "User: I need launch ideas.\n\nAssistant: Start with pain points.\n\nHuman: Give me examples.",
    };

    const { getByTestId, getAllByText, getByText, queryByText, queryByTestId } =
      render(
        <SecondBrainEditEntryScreen
          route={{ params: { entry: transcriptEntry, token } }}
          navigation={{ goBack }}
        />,
      );

    fireEvent(getByTestId("description-markdown-toggle"), "valueChange", true);

    expect(getByTestId("description-conversation-preview")).toBeTruthy();
    expect(queryByTestId("description-markdown-preview")).toBeNull();
    expect(getAllByText(/^You$/).length).toBe(2);
    expect(getByText("Assistant")).toBeTruthy();
    expect(getByText("I need launch ideas.")).toBeTruthy();
    expect(getByText("Start with pain points.")).toBeTruthy();
    expect(getByText("Give me examples.")).toBeTruthy();
    expect(
      queryByText(
        "User: I need launch ideas.\n\nAssistant: Start with pain points.\n\nHuman: Give me examples.",
      ),
    ).toBeNull();
  });

  it("renders conversation bubbles from description when raw_text is not a transcript", () => {
    const goBack = jest.fn();
    const transcriptInDescriptionEntry = {
      ...entry,
      raw_text: "Plain note text",
      description:
        "User: Can you draft a launch plan?\nAssistant: Yes. Start with a one-week beta.",
    };

    const { getByTestId, getByText, queryByTestId } = render(
      <SecondBrainEditEntryScreen
        route={{ params: { entry: transcriptInDescriptionEntry, token } }}
        navigation={{ goBack }}
      />,
    );

    fireEvent(getByTestId("description-markdown-toggle"), "valueChange", true);

    expect(getByTestId("description-conversation-preview")).toBeTruthy();
    expect(queryByTestId("description-markdown-preview")).toBeNull();
    expect(getByText("You")).toBeTruthy();
    expect(getByText("Assistant")).toBeTruthy();
    expect(getByText("Can you draft a launch plan?")).toBeTruthy();
    expect(getByText("Yes. Start with a one-week beta.")).toBeTruthy();
  });

  it("renders markdown preview only for non-conversation text when markdown toggle is enabled", () => {
    const goBack = jest.fn();
    const plainMarkdownEntry = {
      ...entry,
      raw_text: "## Heading\n\nA regular markdown paragraph.",
    };

    const { getByTestId, getByText, queryByTestId } = render(
      <SecondBrainEditEntryScreen
        route={{ params: { entry: plainMarkdownEntry, token } }}
        navigation={{ goBack }}
      />,
    );

    fireEvent(getByTestId("description-markdown-toggle"), "valueChange", true);

    expect(getByTestId("description-markdown-preview")).toBeTruthy();
    expect(queryByTestId("description-conversation-preview")).toBeNull();
    expect(getByText("Heading")).toBeTruthy();
    expect(getByText("A regular markdown paragraph.")).toBeTruthy();
  });

  it("renders bubbles for pasted brainstorm text with unicode separators and attachment placeholder chars", () => {
    const goBack = jest.fn();
    const transcriptEntry = {
      ...entry,
      raw_text:
        "User: I want to create an app.\u2028\u2028\uFFFC\u2028\u2028Assistant: That's a fascinating concept for the app.",
    };

    const { getByTestId, getByText } = render(
      <SecondBrainEditEntryScreen
        route={{ params: { entry: transcriptEntry, token } }}
        navigation={{ goBack }}
      />,
    );

    fireEvent(getByTestId("description-markdown-toggle"), "valueChange", true);

    expect(getByTestId("description-conversation-preview")).toBeTruthy();
    expect(getByText("I want to create an app.")).toBeTruthy();
    expect(getByText("That's a fascinating concept for the app.")).toBeTruthy();
  });

  it("renders bubbles for the long open brain transcript shape from pasted notes", () => {
    const goBack = jest.fn();
    const transcriptEntry = {
      ...entry,
      raw_text:
        "User: I want to create an app.\n￼\nAssistant: That's a fascinating concept for the app.",
    };

    const { getByTestId, getByText } = render(
      <SecondBrainEditEntryScreen
        route={{ params: { entry: transcriptEntry, token } }}
        navigation={{ goBack }}
      />,
    );

    fireEvent(getByTestId("description-markdown-toggle"), "valueChange", true);

    expect(getByTestId("description-conversation-preview")).toBeTruthy();
    expect(getByText("I want to create an app.")).toBeTruthy();
    expect(getByText("That's a fascinating concept for the app.")).toBeTruthy();
  });

  it("renders bubbles for the provided open brain user-assistant transcript sample", () => {
    const goBack = jest.fn();
    const transcriptEntry = {
      ...entry,
      raw_text:
        "User: I want to create an app.\n￼\n\nAssistant: That's a fascinating concept for the app.",
    };

    const { getByTestId, getByText } = render(
      <SecondBrainEditEntryScreen
        route={{ params: { entry: transcriptEntry, token } }}
        navigation={{ goBack }}
      />,
    );

    fireEvent(getByTestId("description-markdown-toggle"), "valueChange", true);

    expect(getByTestId("description-conversation-preview")).toBeTruthy();
    expect(getByText("You")).toBeTruthy();
    expect(getByText("Assistant")).toBeTruthy();
    expect(getByText("I want to create an app.")).toBeTruthy();
    expect(getByText("That's a fascinating concept for the app.")).toBeTruthy();
  });

  it("uses multiline title and summary inputs when values are long", async () => {
    const longEntry = {
      ...entry,
      title:
        "This is a deliberately long title that should switch to multiline input mode",
      summary:
        "This is a deliberately long summary that should also switch to multiline mode in the edit form field.",
    };

    const { getByPlaceholderText } = render(
      <SecondBrainEditEntryScreen
        route={{ params: { entry: longEntry, token } }}
        navigation={{ goBack: jest.fn() }}
      />,
    );

    expect(getByPlaceholderText("Title").props.multiline).toBe(true);
    expect(getByPlaceholderText("Summary").props.multiline).toBe(true);
    expect(getByPlaceholderText("Content").props.multiline).toBe(true);
  });

  it("expands title, summary, and content input heights as content grows", async () => {
    const { getByPlaceholderText } = render(
      <SecondBrainEditEntryScreen
        route={{ params: { entry, token } }}
        navigation={{ goBack: jest.fn() }}
      />,
    );

    const titleInput = getByPlaceholderText("Title");
    const summaryInput = getByPlaceholderText("Summary");
    const contentInput = getByPlaceholderText("Content");

    fireEvent(titleInput, "contentSizeChange", {
      nativeEvent: { contentSize: { height: 150 } },
    });
    fireEvent(summaryInput, "contentSizeChange", {
      nativeEvent: { contentSize: { height: 190 } },
    });
    fireEvent(contentInput, "contentSizeChange", {
      nativeEvent: { contentSize: { height: 210 } },
    });

    expect(titleInput.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ height: 150 })]),
    );
    expect(summaryInput.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ height: 190 })]),
    );
    expect(contentInput.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ height: 210 })]),
    );
  });

  it("renders centralized reminder picker without action buttons and hides web reminder input", async () => {
    const reminderEntry = {
      ...entry,
      category: "reminder",
      remind_at: 1798763400,
    };

    const { queryByText, queryByPlaceholderText, getAllByTestId, unmount } =
      render(
        <SecondBrainEditEntryScreen
          route={{ params: { entry: reminderEntry, token } }}
          navigation={{ goBack: jest.fn() }}
        />,
      );

    expect(queryByText("Set date & time")).toBeNull();
    expect(queryByText("Done")).toBeNull();
    expect(queryByPlaceholderText("Select reminder date and time")).toBeNull();
    expect(getAllByTestId("native-datetime-picker").length).toBe(1);

    unmount();

    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "web",
    });

    const { queryByPlaceholderText: queryWebPlaceholderText } = render(
      <SecondBrainEditEntryScreen
        route={{ params: { entry: reminderEntry, token } }}
        navigation={{ goBack: jest.fn() }}
      />,
    );

    expect(queryWebPlaceholderText("Select reminder date and time")).toBeNull();
  });
});
