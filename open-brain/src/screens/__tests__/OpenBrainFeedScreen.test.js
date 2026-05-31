import { fireEvent, render, waitFor } from "@testing-library/react-native";
import OpenBrainFeedScreen from "../OpenBrainFeedScreen";

jest.mock("../../api", () => ({
  apiRequest: jest.fn(),
  readCachedApiData: jest.fn(),
  sendFollowNotification: jest.fn(),
}));

jest.mock("../../components/OpenBrainTopMenu", () => {
  const { Text } = require("react-native");
  return function MockOpenBrainTopMenu() {
    return <Text>Top Menu</Text>;
  };
});

jest.mock("../../components/OpenBrainBottomNav", () => {
  const { Text } = require("react-native");
  return function MockOpenBrainBottomNav() {
    return <Text>Bottom Nav</Text>;
  };
});

jest.mock("../../components/OpenBrainThoughtCard", () => {
  const { Text } = require("react-native");
  return function MockOpenBrainThoughtCard({ item }) {
    return <Text>{item?.content?.text || item?.id}</Text>;
  };
});

jest.mock("../../utils/openBrainHelper", () => ({
  addThoughtToSecondBrainWithAlert: jest.fn(),
  shareThought: jest.fn(),
  groupThoughtsByDay: jest.fn((items) => ({
    todayItems: items,
    pastItems: [],
  })),
  buildThoughtSectionRows: jest.fn(({ todayItems, mapThoughtItem }) =>
    (todayItems || []).map((thought) =>
      mapThoughtItem({ thought, dateLabel: "" }),
    ),
  ),
}));

const { apiRequest, readCachedApiData } = require("../../api");

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("OpenBrainFeedScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("keeps existing feed visible during pull-to-refresh and updates after completion", async () => {
    readCachedApiData.mockResolvedValue({
      feed: {
        following: [{ id: "old-1", content: { text: "Old thought" } }],
        everyone: [],
      },
      page: {
        following: { has_more: false, next_cursor: null },
        everyone: { has_more: false, next_cursor: null },
      },
    });

    const refreshRequest = deferred();
    apiRequest
      .mockResolvedValueOnce({
        feed: {
          following: [{ id: "old-1", content: { text: "Old thought" } }],
          everyone: [],
        },
        page: {
          following: { has_more: false, next_cursor: null },
          everyone: { has_more: false, next_cursor: null },
        },
      })
      .mockReturnValueOnce(refreshRequest.promise);

    const screen = render(
      <OpenBrainFeedScreen
        token="token-1"
        navigation={{ navigate: jest.fn() }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Old thought")).toBeTruthy();
    });

    const list = screen.UNSAFE_getByType(require("react-native").FlatList);
    fireEvent(list, "refresh");

    await waitFor(() => {
      expect(apiRequest).toHaveBeenNthCalledWith(
        2,
        "/open-brain/feed",
        expect.objectContaining({ token: "token-1" }),
      );
    });

    expect(screen.getByText("Old thought")).toBeTruthy();
    expect(screen.queryByText("Loading feed...")).toBeNull();

    refreshRequest.resolve({
      feed: {
        following: [{ id: "new-1", content: { text: "New thought" } }],
        everyone: [],
      },
      page: {
        following: { has_more: false, next_cursor: null },
        everyone: { has_more: false, next_cursor: null },
      },
    });

    await waitFor(() => {
      expect(screen.getByText("New thought")).toBeTruthy();
    });
    expect(screen.queryByText("Old thought")).toBeNull();
  });

  it("keeps existing feed visible when pull-to-refresh fails", async () => {
    readCachedApiData.mockResolvedValue({
      feed: {
        following: [{ id: "old-1", content: { text: "Old thought" } }],
        everyone: [],
      },
      page: {
        following: { has_more: false, next_cursor: null },
        everyone: { has_more: false, next_cursor: null },
      },
    });

    apiRequest
      .mockResolvedValueOnce({
        feed: {
          following: [{ id: "old-1", content: { text: "Old thought" } }],
          everyone: [],
        },
        page: {
          following: { has_more: false, next_cursor: null },
          everyone: { has_more: false, next_cursor: null },
        },
      })
      .mockRejectedValueOnce(new Error("Refresh failed"));

    const screen = render(
      <OpenBrainFeedScreen
        token="token-1"
        navigation={{ navigate: jest.fn() }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Old thought")).toBeTruthy();
    });

    const list = screen.UNSAFE_getByType(require("react-native").FlatList);
    fireEvent(list, "refresh");

    await waitFor(() => {
      expect(screen.getByText("Refresh failed")).toBeTruthy();
    });
    expect(screen.getByText("Old thought")).toBeTruthy();
  });
});
