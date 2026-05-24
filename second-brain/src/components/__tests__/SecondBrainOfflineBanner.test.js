import { render } from "@testing-library/react-native";
import SecondBrainOfflineBanner from "../SecondBrainOfflineBanner";

const styles = {
  offlineBanner: {},
  offlineBannerMessagePressable: {},
  offlineBannerDot: {},
  offlineBannerText: {},
  offlineBannerSyncButton: {},
  offlineBannerSyncButtonDisabled: {},
  offlineBannerSyncGroup: {},
  offlineBannerSyncButtonText: {},
  offlineBannerSyncArrow: {},
};

describe("SecondBrainOfflineBanner", () => {
  it("renders offline banner with fallback queued message when queue is empty", () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <SecondBrainOfflineBanner styles={styles} offlineQueueSize={0} />,
    );

    expect(getByTestId("offline-banner")).toBeTruthy();
    expect(getByText("Offline · no changes queued")).toBeTruthy();
    expect(getByText("Sync")).toBeTruthy();
    expect(queryByTestId("offline-banner-sync-arrow")).toBeNull();
  });

  it("renders singular queued change message", () => {
    const { getByText, queryByTestId, getByTestId } = render(
      <SecondBrainOfflineBanner styles={styles} offlineQueueSize={1} />,
    );

    expect(getByText("Offline · 1 change queued")).toBeTruthy();
    expect(queryByTestId("offline-banner-sync-arrow")).toBeTruthy();
    expect(getByTestId("offline-banner-sync-button")).toBeTruthy();
  });

  it("renders plural queued changes message", () => {
    const { getByText, getByTestId } = render(
      <SecondBrainOfflineBanner styles={styles} offlineQueueSize={2} />,
    );

    expect(getByText("Offline · 2 changes queued")).toBeTruthy();
    expect(getByTestId("offline-banner-sync-arrow")).toBeTruthy();
  });

  it("keeps arrow rendered as a separate element from the sync button label", () => {
    const { getByText, getByTestId } = render(
      <SecondBrainOfflineBanner styles={styles} offlineQueueSize={2} />,
    );

    expect(getByText("Sync")).toBeTruthy();
    expect(getByTestId("offline-banner-sync-button")).toBeTruthy();
    expect(getByTestId("offline-banner-sync-arrow")).toBeTruthy();
  });

  it("renders loading indicator while sync is in progress", () => {
    const { getByTestId, queryByText } = render(
      <SecondBrainOfflineBanner
        styles={styles}
        offlineQueueSize={2}
        syncInProgress
      />,
    );

    expect(getByTestId("offline-banner-sync-loading")).toBeTruthy();
    expect(queryByText("Sync")).toBeNull();
  });
});
