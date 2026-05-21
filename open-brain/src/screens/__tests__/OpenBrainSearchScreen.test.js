import { fireEvent, render } from "@testing-library/react-native";
import OpenBrainSearchScreen from "../OpenBrainSearchScreen";

jest.mock("../../components/OpenBrainTopMenu", () => {
  const { Text } = require("react-native");
  return function MockOpenBrainTopMenu() {
    return <Text>Top Menu</Text>;
  };
});

jest.mock("../../hooks/useOpenBrainSearch", () => ({
  useOpenBrainSearch: jest.fn(),
}));

const { useOpenBrainSearch } = require("../../hooks/useOpenBrainSearch");

describe("OpenBrainSearchScreen", () => {
  it("renders rows from search results and opens profile from row presses", () => {
    const navigate = jest.fn();
    const runSearch = jest.fn();
    useOpenBrainSearch.mockReturnValue({
      query: "alpha",
      setQuery: jest.fn(),
      loading: false,
      error: "",
      didSearch: true,
      results: {
        users: [{ username: "alice", streak_count: 5 }],
        thoughts: [
          {
            text: "Thought body",
            profile: { username: "bob" },
          },
        ],
      },
      runSearch,
    });

    const { getByText } = render(
      <OpenBrainSearchScreen
        token="token"
        navigation={{ navigate }}
        route={{ params: { query: "alpha" } }}
      />,
    );

    expect(getByText("Users")).toBeTruthy();
    expect(getByText("Thoughts")).toBeTruthy();
    fireEvent.press(getByText("@alice"));
    expect(navigate).toHaveBeenCalledWith("OpenBrainProfile", {
      username: "alice",
    });
    fireEvent.press(getByText("Thought body"));
    expect(navigate).toHaveBeenCalledWith("OpenBrainProfile", {
      username: "bob",
    });
  });
});
