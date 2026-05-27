import { fireEvent, render, waitFor } from "@testing-library/react-native";
import SecondBrainVoiceCaptureScreen from "../SecondBrainVoiceCaptureScreen";
import { useVoiceCapture } from "../../hooks/useVoiceCapture";

jest.mock("../../hooks/useVoiceCapture", () => ({
  useVoiceCapture: jest.fn(),
}));

describe("SecondBrainVoiceCaptureScreen", () => {
  const token = "token";
  let latestVoiceHookOptions = null;

  function setup({
    recording = false,
    voiceBusy = false,
    voiceStarting = false,
    voiceElapsedMs = 0,
    voiceMaxDurationMs = 120000,
    startVoiceCapture = jest.fn(),
    stopVoiceCaptureAndSubmit = jest.fn(async () => {}),
    cancelVoiceCapture = jest.fn(async () => {}),
  } = {}) {
    useVoiceCapture.mockImplementation((options) => {
      latestVoiceHookOptions = options;
      return {
        voiceBusy,
        voiceStarting,
        voiceElapsedMs,
        voiceMaxDurationMs,
        recording,
        startVoiceCapture,
        stopVoiceCaptureAndSubmit,
        cancelVoiceCapture,
      };
    });

    const navigation = { goBack: jest.fn() };
    const utils = render(
      <SecondBrainVoiceCaptureScreen token={token} navigation={navigation} />,
    );
    return {
      ...utils,
      navigation,
      startVoiceCapture,
      stopVoiceCaptureAndSubmit,
      cancelVoiceCapture,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    latestVoiceHookOptions = null;
  });

  it("renders the idle prompt and starts recording when mic is pressed", () => {
    const { getByText, getByLabelText, startVoiceCapture } = setup();

    expect(getByText("Voice capture")).toBeTruthy();
    expect(getByText("Tap to start recording")).toBeTruthy();
    fireEvent.press(getByLabelText("Record voice note"));

    expect(startVoiceCapture).toHaveBeenCalledTimes(1);
  });

  it("renders elapsed timer when recording", () => {
    const { getByText } = setup({
      recording: true,
      voiceElapsedMs: 65000,
      voiceMaxDurationMs: 120000,
    });

    expect(getByText("Tap to stop and submit")).toBeTruthy();
    expect(getByText("1:05/2:00")).toBeTruthy();
  });

  it("stops recording and goes back after successful submission", async () => {
    const stopVoiceCaptureAndSubmit = jest.fn(async () => {
      latestVoiceHookOptions?.onVoiceEntryCreated?.({ id: 42 });
    });
    const { getByLabelText, navigation } = setup({
      recording: true,
      stopVoiceCaptureAndSubmit,
    });

    fireEvent.press(getByLabelText("Stop and submit voice note"));

    await waitFor(() => {
      expect(stopVoiceCaptureAndSubmit).toHaveBeenCalledTimes(1);
      expect(navigation.goBack).toHaveBeenCalledTimes(1);
    });
  });

  it("does not go back if submission finishes without success callback", async () => {
    const stopVoiceCaptureAndSubmit = jest.fn(async () => {});
    const { getByLabelText, navigation } = setup({
      recording: true,
      stopVoiceCaptureAndSubmit,
    });

    fireEvent.press(getByLabelText("Stop and submit voice note"));

    await waitFor(() => {
      expect(stopVoiceCaptureAndSubmit).toHaveBeenCalledTimes(1);
    });
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it("cancels active recording when back is pressed", async () => {
    const cancelVoiceCapture = jest.fn(async () => {});
    const { getByLabelText, navigation } = setup({
      recording: true,
      voiceBusy: false,
      cancelVoiceCapture,
    });

    fireEvent.press(getByLabelText("Back"));

    await waitFor(() => {
      expect(cancelVoiceCapture).toHaveBeenCalledTimes(1);
      expect(navigation.goBack).toHaveBeenCalledTimes(1);
    });
  });

  it("skips cancel on back press while voice submission is busy", () => {
    const cancelVoiceCapture = jest.fn(async () => {});
    const { getByLabelText, navigation } = setup({
      recording: true,
      voiceBusy: true,
      cancelVoiceCapture,
    });

    fireEvent.press(getByLabelText("Back"));

    expect(cancelVoiceCapture).not.toHaveBeenCalled();
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  it("cancels active recording on unmount cleanup", async () => {
    const cancelVoiceCapture = jest.fn(async () => {});
    const { unmount } = setup({
      recording: true,
      voiceBusy: false,
      cancelVoiceCapture,
    });

    unmount();

    await waitFor(() => {
      expect(cancelVoiceCapture).toHaveBeenCalledTimes(1);
    });
  });

  it("does not cancel recording on unmount when already busy", () => {
    const cancelVoiceCapture = jest.fn(async () => {});
    const { unmount } = setup({
      recording: true,
      voiceBusy: true,
      cancelVoiceCapture,
    });

    unmount();

    expect(cancelVoiceCapture).not.toHaveBeenCalled();
  });
});
