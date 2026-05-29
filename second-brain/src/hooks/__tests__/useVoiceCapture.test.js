import { useEffect } from "react";
import { act, render, waitFor } from "@testing-library/react-native";
import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { apiRequest } from "../../api";
import { useVoiceCapture } from "../useVoiceCapture";

jest.mock("../../api", () => ({
  apiRequest: jest.fn(),
}));

describe("useVoiceCapture", () => {
  let latestValue = null;
  const token = "token";
  const onError = jest.fn();
  const onVoiceEntryCreated = jest.fn();
  const onReloadEntries = jest.fn();
  const onSubmissionStart = jest.fn();
  const onSubmissionEnd = jest.fn();

  function Harness() {
    const value = useVoiceCapture({
      token,
      onError,
      onVoiceEntryCreated,
      onReloadEntries,
      onSubmissionStart,
      onSubmissionEnd,
    });

    useEffect(() => {
      latestValue = value;
    }, [value]);

    return null;
  }

  beforeEach(() => {
    latestValue = null;
    jest.clearAllMocks();
    useAudioRecorderState.mockImplementation(() => ({ isRecording: false }));
    requestRecordingPermissionsAsync.mockResolvedValue({ granted: true });
    apiRequest.mockResolvedValue({});
  });

  it("starts recording when permission is granted", async () => {
    render(<Harness />);
    const recorder = useAudioRecorder();

    await act(async () => {
      await latestValue.startVoiceCapture();
    });

    expect(requestRecordingPermissionsAsync).toHaveBeenCalled();
    expect(setAudioModeAsync).toHaveBeenCalledWith({
      allowsRecording: true,
      playsInSilentMode: true,
    });
    expect(recorder.prepareToRecordAsync).toHaveBeenCalled();
    expect(recorder.record).toHaveBeenCalled();
  });

  it("re-enables recording mode on every start attempt", async () => {
    let recordingState = false;
    useAudioRecorderState.mockImplementation(() => ({
      isRecording: recordingState,
    }));
    const view = render(<Harness />);
    const recorder = useAudioRecorder();

    await act(async () => {
      await latestValue.startVoiceCapture();
    });

    recordingState = true;
    view.rerender(<Harness />);
    await act(async () => {
      await Promise.resolve();
    });

    recordingState = false;
    view.rerender(<Harness />);
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await latestValue.startVoiceCapture();
    });

    expect(setAudioModeAsync).toHaveBeenNthCalledWith(1, {
      allowsRecording: true,
      playsInSilentMode: true,
    });
    expect(setAudioModeAsync).toHaveBeenNthCalledWith(2, {
      allowsRecording: true,
      playsInSilentMode: true,
    });
    expect(recorder.record).toHaveBeenCalledTimes(2);
  });

  it("shows error and does not record when permission is denied", async () => {
    requestRecordingPermissionsAsync.mockResolvedValue({ granted: false });
    render(<Harness />);
    const recorder = useAudioRecorder();

    await act(async () => {
      await latestValue.startVoiceCapture();
    });

    expect(onError).toHaveBeenCalledWith("Microphone permission is required.");
    expect(recorder.record).not.toHaveBeenCalled();
  });

  it("submits voice recording and emits created entry callback", async () => {
    useAudioRecorderState.mockReturnValue({ isRecording: true });
    apiRequest.mockResolvedValue({ entry: { id: 99, title: "Voice note" } });
    render(<Harness />);
    const recorder = useAudioRecorder();

    await act(async () => {
      await latestValue.stopVoiceCaptureAndSubmit();
    });

    expect(recorder.stop).toHaveBeenCalled();
    expect(apiRequest).toHaveBeenCalledWith(
      "/voice",
      expect.objectContaining({
        method: "POST",
        token,
        body: expect.objectContaining({
          audio_base64: "ZmFrZQ==",
          extension: "m4a",
          duration_seconds: expect.any(Number),
        }),
      }),
    );
    expect(onSubmissionStart).toHaveBeenCalledTimes(1);
    expect(onVoiceEntryCreated).toHaveBeenCalledWith(
      expect.objectContaining({ id: 99 }),
    );
    expect(onReloadEntries).not.toHaveBeenCalled();
    expect(onSubmissionEnd).toHaveBeenCalledTimes(1);
    expect(setAudioModeAsync).toHaveBeenCalledWith({ allowsRecording: false });
  });

  it("reloads entries when voice endpoint returns no entry", async () => {
    useAudioRecorderState.mockReturnValue({ isRecording: true });
    apiRequest.mockResolvedValue({});
    onReloadEntries.mockResolvedValue(undefined);
    render(<Harness />);

    await act(async () => {
      await latestValue.stopVoiceCaptureAndSubmit();
    });

    await waitFor(() => {
      expect(onReloadEntries).toHaveBeenCalledTimes(1);
    });
  });

  it("cancels recording and resets audio mode", async () => {
    useAudioRecorderState.mockReturnValue({ isRecording: true });
    render(<Harness />);
    const recorder = useAudioRecorder();

    await act(async () => {
      await latestValue.cancelVoiceCapture();
    });

    expect(recorder.stop).toHaveBeenCalled();
    expect(setAudioModeAsync).toHaveBeenCalledWith({ allowsRecording: false });
  });
});
