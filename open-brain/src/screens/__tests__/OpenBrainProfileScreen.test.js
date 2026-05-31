import { render, waitFor } from "@testing-library/react-native";
import OpenBrainProfileScreen from "../OpenBrainProfileScreen";

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

jest.mock("../../components/ProfileAvatar", () => {
  const { Text } = require("react-native");
  return function MockProfileAvatar() {
    return <Text>Avatar</Text>;
  };
});

jest.mock("../../components/OpenBrainThoughtCard", () => {
  const { Text } = require("react-native");
  return function MockOpenBrainThoughtCard({ text }) {
    return <Text>{text}</Text>;
  };
});

jest.mock("../../components/OpenBrainSectionedThoughtList", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockOpenBrainSectionedThoughtList({
    data,
    renderThoughtItem,
    listEmptyComponent,
  }) {
    if (!Array.isArray(data) || data.length === 0) {
      return <View>{listEmptyComponent || null}</View>;
    }
    return (
      <View>
        {data.map((item) => (
          <React.Fragment key={item.id}>
            {renderThoughtItem({ item })}
          </React.Fragment>
        ))}
      </View>
    );
  };
});

jest.mock("../../utils/openBrainHelper", () => ({
  addThoughtToSecondBrainWithAlert: jest.fn(),
  shareThought: jest.fn(),
  groupThoughtsByDay: jest.fn((items) => ({
    todayItems: items,
    pastItems: [],
  })),
  buildThoughtSectionRows: jest.fn(({ todayItems }) =>
    (todayItems || []).map((thought) => ({
      type: "thought",
      id: String(thought.id),
      thought,
      dateLabel: "",
    })),
  ),
}));

const { apiRequest, readCachedApiData } = require("../../api");

describe("OpenBrainProfileScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("keeps cached profile data visible when refresh fails", async () => {
    readCachedApiData
      .mockResolvedValueOnce({
        profile: {
          id: "u-1",
          username: "alice",
          bio: "cached bio",
          streak_count: 3,
          is_self: false,
          is_following: false,
        },
      })
      .mockResolvedValueOnce({
        thoughts: [{ id: "t-1", text: "Cached thought" }],
      });

    apiRequest.mockRejectedValueOnce(new Error("Unable to refresh profile"));

    const screen = render(
      <OpenBrainProfileScreen
        token="token-1"
        route={{ params: { username: "alice" } }}
        navigation={{ navigate: jest.fn() }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("@alice")).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByText("Cached thought")).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByText("Unable to refresh profile")).toBeTruthy();
    });

    expect(screen.getByText("@alice")).toBeTruthy();
    expect(screen.getByText("Cached thought")).toBeTruthy();
  });
});
