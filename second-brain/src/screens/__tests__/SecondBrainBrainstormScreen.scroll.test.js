import { act, fireEvent, render } from "@testing-library/react-native";
import SecondBrainBrainstormScreen from "../SecondBrainBrainstormScreen";

jest.mock("../../api", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("../../utils/brainstormSessions", () => ({
  createBrainstormSession: jest.fn(
    async ({ entryId = null, seedText = "" } = {}) => ({
      id: "session-1",
      entryId,
      lifecycle: "active",
      updatedAt: new Date().toISOString(),
      finalizeGuards: { ended: false, wipSaved: false },
      messages: seedText
        ? [
            {
              id: "seed-1",
              role: "assistant",
              content: String(seedText),
              createdAt: new Date().toISOString(),
            },
          ]
        : [],
    }),
  ),
  getLinkedBrainstormSessionId: jest.fn(async () => ""),
  linkEntryToBrainstormSession: jest.fn(async () => {}),
  readBrainstormSession: jest.fn(async () => null),
  toBrainstormTranscript: jest.fn(() => ""),
  writeBrainstormSession: jest.fn(async () => {}),
}));

const mockScrollToOffset = jest.fn();
const mockScrollToEnd = jest.fn();
const capturedProps = {
  current: null,
};

jest.mock("../../components/SecondBrainConversationList", () => {
  return function MockSecondBrainConversationList(props) {
    capturedProps.current = props;
    if (props.listRef && typeof props.listRef === "object") {
      props.listRef.current = {
        scrollToOffset: mockScrollToOffset,
        scrollToEnd: mockScrollToEnd,
      };
    }
    return null;
  };
});

describe("SecondBrainBrainstormScreen scroll behavior", () => {
  beforeEach(() => {
    mockScrollToOffset.mockClear();
    mockScrollToEnd.mockClear();
    capturedProps.current = null;
  });

  it("scrolls to exact list bottom offset on focus when assistant messages exist", async () => {
    const view = render(
      <SecondBrainBrainstormScreen
        route={{
          params: { seedEntry: { id: 101, raw_text: "Assistant seeded" } },
        }}
        navigation={{ goBack: jest.fn() }}
        token="token"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      capturedProps.current.onListLayout({
        nativeEvent: { layout: { height: 300 } },
      });
      capturedProps.current.onListContentSizeChange(0, 920);
    });

    fireEvent(
      view.getByPlaceholderText("Share your thought, or type /end"),
      "focus",
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockScrollToOffset).toHaveBeenCalledWith({
      offset: 620,
      animated: false,
    });
  });

  it("does not scroll when there are no assistant messages", async () => {
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

    act(() => {
      capturedProps.current.onListLayout({
        nativeEvent: { layout: { height: 300 } },
      });
      capturedProps.current.onListContentSizeChange(0, 920);
    });

    fireEvent(
      view.getByPlaceholderText("Share your thought, or type /end"),
      "focus",
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockScrollToOffset).not.toHaveBeenCalled();
    expect(mockScrollToEnd).not.toHaveBeenCalled();
  });
});
