import { act, render } from "@testing-library/react-native";
import SecondBrainBrainstormScreen from "../SecondBrainBrainstormScreen";
import SecondBrainEditEntryScreen from "../SecondBrainEditEntryScreen";
import SecondBrainEntryDetailsScreen from "../SecondBrainEntryDetailsScreen";

jest.mock("@react-native-community/datetimepicker", () => {
  const { Text: MockText } = require("react-native");
  return function MockDateTimePicker() {
    return (
      <MockText testID="mock-datetime-picker">MockDateTimePicker</MockText>
    );
  };
});

jest.mock("../../components/SecondBrainEntryPageLayout", () => {
  const { View } = require("react-native");
  return function MockSecondBrainEntryPageLayout({ children }) {
    return <View testID="shared-entry-page-layout">{children}</View>;
  };
});

jest.mock("../../api", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("../../utils/brainstormSessions", () => ({
  createBrainstormSession: jest.fn(async () => ({
    id: "shared-layout-session",
    lifecycle: "active",
    updatedAt: new Date().toISOString(),
    finalizeGuards: { ended: false, wipSaved: false },
    messages: [],
  })),
  getLinkedBrainstormSessionId: jest.fn(async () => ""),
  linkEntryToBrainstormSession: jest.fn(async () => {}),
  readBrainstormSession: jest.fn(async () => null),
  toBrainstormTranscript: jest.fn((messages) =>
    (Array.isArray(messages) ? messages : [])
      .map((message) => String(message?.content || ""))
      .filter(Boolean)
      .join("\n"),
  ),
  writeBrainstormSession: jest.fn(async () => {}),
}));

describe("Second Brain shared layout", () => {
  it("renders brainstorm screen inside shared entry page layout", async () => {
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

    expect(view.getByTestId("shared-entry-page-layout")).toBeTruthy();
  });

  it("renders edit entry screen inside shared entry page layout", () => {
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

    const view = render(
      <SecondBrainEditEntryScreen
        route={{ params: { entry, token: "token" } }}
        navigation={{ goBack: jest.fn() }}
      />,
    );

    expect(view.getByTestId("shared-entry-page-layout")).toBeTruthy();
  });

  it("renders entry details screen inside shared entry page layout", () => {
    const entry = {
      id: 7,
      title: "Entry",
      summary: "Summary",
      raw_text: "Body",
      category: "note",
    };

    const view = render(
      <SecondBrainEntryDetailsScreen route={{ params: { entry } }} />,
    );

    expect(view.getByTestId("shared-entry-page-layout")).toBeTruthy();
  });
});
