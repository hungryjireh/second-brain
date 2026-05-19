import { render } from "@testing-library/react-native";
import OpenBrainTopMenu from "../OpenBrainTopMenu";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 0, left: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
}));

jest.mock("../../api", () => ({
  apiRequest: jest.fn(),
  sendFollowNotification: jest.fn(),
}));

jest.mock("../../hooks/useOpenBrainSearch", () => ({
  useOpenBrainSearch: () => ({
    query: "",
    setQuery: jest.fn(),
    loading: false,
    error: "",
    didSearch: false,
    results: { users: [], thoughts: [] },
    setResults: jest.fn(),
    runSearch: jest.fn(),
    resetSearch: jest.fn(),
  }),
}));

describe("OpenBrainTopMenu safe area", () => {
  it("applies top safe area inset to the outer container", () => {
    const screen = render(
      <OpenBrainTopMenu
        token={null}
        navigation={{ replace: jest.fn(), navigate: jest.fn() }}
      />,
    );

    const tree = screen.toJSON();
    expect(tree.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ paddingTop: 24 })]),
    );
  });
});
