import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import OpenBrainTopMenu from "../OpenBrainTopMenu";

const mockApiRequest = jest.fn();

jest.mock("../../api", () => ({
  apiRequest: (...args) => mockApiRequest(...args),
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

describe("OpenBrainTopMenu header", () => {
  const createNavigation = () => ({
    replace: jest.fn(),
    navigate: jest.fn(),
  });

  beforeEach(() => {
    mockApiRequest.mockReset();
    mockApiRequest.mockResolvedValue({ notifications: [] });
  });

  it("renders back button by default and replaces to the default route", () => {
    const navigation = createNavigation();
    const screen = render(
      <OpenBrainTopMenu token={null} navigation={navigation} />,
    );

    fireEvent.press(screen.getByLabelText("Back"));
    expect(navigation.replace).toHaveBeenCalledWith("OpenBrainFeed");
  });

  it("uses a custom back route when provided", () => {
    const navigation = createNavigation();
    const screen = render(
      <OpenBrainTopMenu
        token={null}
        navigation={navigation}
        backRoute="OpenBrainSearch"
      />,
    );

    fireEvent.press(screen.getByLabelText("Back"));
    expect(navigation.replace).toHaveBeenCalledWith("OpenBrainSearch");
  });

  it("hides back button when showBackButton is false", () => {
    const screen = render(
      <OpenBrainTopMenu
        token={null}
        navigation={createNavigation()}
        showBackButton={false}
      />,
    );

    expect(screen.queryByLabelText("Back")).toBeNull();
  });

  it("navigates to OpenBrainFeed when pressing logo", () => {
    const navigation = createNavigation();
    const screen = render(
      <OpenBrainTopMenu token={null} navigation={navigation} />,
    );

    fireEvent.press(screen.getByLabelText("Go to feed"));
    expect(navigation.navigate).toHaveBeenCalledWith("OpenBrainFeed");
  });

  it("keeps the logo container horizontally centered", () => {
    const screen = render(
      <OpenBrainTopMenu token={null} navigation={createNavigation()} />,
    );

    const logoButton = screen.UNSAFE_getByProps({
      accessibilityLabel: "Go to feed",
    });
    const logoContainer = logoButton.parent;
    const centeredStyle = StyleSheet.flatten(logoContainer.props.style);

    expect(centeredStyle).toEqual(
      expect.objectContaining({
        position: "absolute",
        left: 0,
        right: 0,
        alignItems: "center",
      }),
    );
  });

  it("shows a capped unread notification badge label", async () => {
    mockApiRequest.mockResolvedValue({
      notifications: Array.from({ length: 120 }, (_, index) => ({
        id: `n-${index + 1}`,
        read_at: null,
      })),
    });

    const screen = render(
      <OpenBrainTopMenu token="token-value" navigation={createNavigation()} />,
    );

    await waitFor(() => {
      expect(screen.getByText("99+")).toBeTruthy();
    });
  });
});
