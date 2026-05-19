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
    apiRequest.mockResolvedValueOnce({ tags: ["work"] }).mockResolvedValueOnce({
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
        expect.objectContaining({ method: "PATCH" }),
      );
    });
    expect(navigate).toHaveBeenCalledWith(
      "SecondBrainEntryDetails",
      expect.objectContaining({
        entryId: 42,
        entry: expect.objectContaining({ id: 42 }),
      }),
    );
  });

  it("shows validation error and skips PATCH when priority is out of range", async () => {
    const goBack = jest.fn();
    apiRequest.mockResolvedValueOnce({ tags: ["work"] });

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
    expect(goBack).not.toHaveBeenCalled();
  });

  it("disables description input and renders markdown preview when toggle is enabled", async () => {
    const goBack = jest.fn();
    apiRequest.mockResolvedValueOnce({ tags: ["work"] });
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

  it("uses multiline title and summary inputs when values are long", async () => {
    apiRequest.mockResolvedValueOnce({ tags: ["work"] });
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
  });

  it("expands title and summary input heights as content grows", async () => {
    apiRequest.mockResolvedValueOnce({ tags: ["work"] });

    const { getByPlaceholderText } = render(
      <SecondBrainEditEntryScreen
        route={{ params: { entry, token } }}
        navigation={{ goBack: jest.fn() }}
      />,
    );

    const titleInput = getByPlaceholderText("Title");
    const summaryInput = getByPlaceholderText("Summary");

    fireEvent(titleInput, "contentSizeChange", {
      nativeEvent: { contentSize: { height: 150 } },
    });
    fireEvent(summaryInput, "contentSizeChange", {
      nativeEvent: { contentSize: { height: 190 } },
    });

    expect(titleInput.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ height: 150 })]),
    );
    expect(summaryInput.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ height: 190 })]),
    );
  });

  it("renders centralized reminder picker without action buttons and hides web reminder input", async () => {
    apiRequest.mockResolvedValueOnce({ tags: ["work"] });
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

    apiRequest.mockResolvedValueOnce({ tags: ["work"] });

    const { queryByPlaceholderText: queryWebPlaceholderText } = render(
      <SecondBrainEditEntryScreen
        route={{ params: { entry: reminderEntry, token } }}
        navigation={{ goBack: jest.fn() }}
      />,
    );

    expect(queryWebPlaceholderText("Select reminder date and time")).toBeNull();
  });
});
