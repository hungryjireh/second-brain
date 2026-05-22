import { render } from "@testing-library/react-native";
import SecondBrainOfflineBanner from "../SecondBrainOfflineBanner";

const styles = {
  offlineBanner: {},
  offlineBannerTitle: {},
  offlineBannerText: {},
  offlineBannerRow: {},
  offlineBannerArrow: {},
};

describe("SecondBrainOfflineBanner", () => {
  it("renders offline banner with fallback sync message when queue is empty", () => {
    const { getByTestId, getByText, queryByText } = render(
      <SecondBrainOfflineBanner styles={styles} offlineQueueSize={0} />,
    );

    expect(getByTestId("offline-banner")).toBeTruthy();
    expect(getByText("Offline mode")).toBeTruthy();
    expect(
      getByText("Showing saved entries. Changes will sync automatically."),
    ).toBeTruthy();
    expect(queryByText("→")).toBeNull();
  });

  it("renders singular queued change message", () => {
    const { getByText } = render(
      <SecondBrainOfflineBanner styles={styles} offlineQueueSize={1} />,
    );

    expect(getByText("1 change queued for sync.")).toBeTruthy();
    expect(getByText("→")).toBeTruthy();
  });

  it("renders plural queued changes message", () => {
    const { getByText } = render(
      <SecondBrainOfflineBanner styles={styles} offlineQueueSize={2} />,
    );

    expect(getByText("2 changes queued for sync.")).toBeTruthy();
    expect(getByText("→")).toBeTruthy();
  });
});
