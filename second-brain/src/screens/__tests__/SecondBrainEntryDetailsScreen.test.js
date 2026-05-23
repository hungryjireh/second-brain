import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import * as ReactNative from "react-native";
import { Alert } from "react-native";
import SecondBrainEntryDetailsScreen from "../SecondBrainEntryDetailsScreen";
import { apiRequest } from "../../api";
import { theme } from "../../theme";

jest.mock("../../api", () => ({
  apiRequest: jest.fn(),
}));

describe("SecondBrainEntryDetailsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
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

  it("shows created and updated timestamps below the summary", () => {
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
    expect(getByText(/Updated /)).toBeTruthy();
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

    const { getByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    expect(getByText("You")).toBeTruthy();
    expect(getByText("Assistant")).toBeTruthy();
    expect(getByText("Please summarize this")).toBeTruthy();
    expect(getByText("Here is a summary.")).toBeTruthy();
    expect(getByText("Attachments:")).toBeTruthy();
    expect(getByText("Attachment 1")).toBeTruthy();
  });

  it("renders assistant conversation bubble with bgBase background", () => {
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
    let foundBgBase = false;
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
            part.backgroundColor === theme.colors.bgBase,
        )
      ) {
        foundBgBase = true;
        break;
      }
      node = node.parent;
    }

    expect(foundBgBase).toBe(true);
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

  it("navigates to edit entry screen when Edit is pressed", () => {
    const navigate = jest.fn();
    const entry = { id: 7, title: "Entry" };
    const { getByLabelText, getByText } = render(
      <SecondBrainEntryDetailsScreen
        route={{ params: { entry } }}
        navigation={{ navigate }}
      />,
    );

    fireEvent.press(getByLabelText("Open entry actions"));
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
    const { getByLabelText, getByText } = render(
      <SecondBrainEntryDetailsScreen
        route={{ params: { entry } }}
        navigation={{ navigate, replace }}
      />,
    );

    fireEvent.press(getByLabelText("Open entry actions"));
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
    const { getByLabelText, getByText } = render(
      <SecondBrainEntryDetailsScreen
        route={{ params: { entry } }}
        navigation={{ navigate }}
      />,
    );

    fireEvent.press(getByLabelText("Open entry actions"));
    fireEvent.press(getByText("Continue Brainstorming"));

    expect(navigate).toHaveBeenCalledWith("SecondBrainBrainstorm", {
      seedEntry: entry,
    });
  });

  it("shows Delete in the action drawer and prompts for confirmation", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const entry = { id: 11, title: "Entry 11", category: "note" };
    const { getByLabelText, getByText } = render(
      <SecondBrainEntryDetailsScreen
        route={{ params: { entry } }}
        token="token"
      />,
    );

    fireEvent.press(getByLabelText("Open entry actions"));

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
    const { getByLabelText, getByText } = render(
      <SecondBrainEntryDetailsScreen
        route={{ params: { entry } }}
        token="token"
      />,
    );

    fireEvent.press(getByLabelText("Open entry actions"));
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

    const { getByLabelText, getByTestId, getByText, queryByTestId } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    fireEvent.press(getByLabelText("Open entry actions"));
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

    const { getByLabelText, getByTestId, getByText } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    fireEvent.press(getByLabelText("Open entry actions"));

    expect(getByText("Persistent title")).toBeTruthy();
    expect(getByText("Edit")).toBeTruthy();
    expect(getByTestId("entry-inline-actions-large")).toBeTruthy();
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

    const { getByLabelText, getByTestId } = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    const titleRowBefore = getByTestId("entry-title-row");
    fireEvent.press(getByLabelText("Open entry actions"));
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
      entries: [
        { id: 10, title: "Other entry" },
        {
          id: 42,
          title: "Loaded entry title",
          summary: "Loaded summary",
          raw_text: "Loaded body",
        },
      ],
    });

    const { getByText } = render(
      <SecondBrainEntryDetailsScreen
        route={{ params: { entryId: 42 } }}
        token="token"
      />,
    );

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith("/entries?limit=60", {
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
