import { fireEvent, render } from "@testing-library/react-native";
import { View } from "react-native";
import SecondBrainTypebar from "../SecondBrainTypebar";

jest.mock("../SecondBrainSettingsModal", () => () => null);

const styles = {
  contentArea: {},
  contentAreaBlurred: {},
  typebarRow: {},
  typebarInput: {},
  typebarInputSmall: {},
  typebarActionWrap: {},
  typebarTooltip: {},
  typebarTooltipText: {},
  typebarRecordingMeta: {},
  typebarRecordingTimerBadge: {},
  typebarRecordingTimer: {},
  typebarCancelRecordingButton: {},
  typebarCancelRecordingIcon: {},
  typebarButton: {},
  typebarButtonDisabled: {},
  typebarButtonIcon: {},
  typebarButtonIconDisabled: {},
  typebarUploadButton: {},
  typebarUploadButtonIcon: {},
  voiceCaptureOverlay: {},
  typebarDismissOverlay: {},
  floatingMicWrap: {},
  floatingMicButton: {},
  floatingMicButtonIcon: {},
  plusButtonWrap: {},
  plusButton: {},
  plusButtonIcon: {},
};

describe("SecondBrainTypebar", () => {
  function renderTypebar(overrides = {}) {
    const props = {
      styles,
      bottom: 12,
      draft: "Buy groceries",
      onChangeDraft: jest.fn(),
      onSubmitDraft: jest.fn(),
      closeOpenActionDrawer: jest.fn(),
      setTypebarFocused: jest.fn(),
      isTypebarExpanded: true,
      setIsTypebarExpanded: jest.fn(),
      isSmallScreen: false,
      inputHeight: 38,
      setInputHeight: jest.fn(),
      hideTypebarSideActions: false,
      actionTooltip: "",
      setActionTooltip: jest.fn(),
      recording: false,
      isVoiceCaptureActive: false,
      voiceBusy: false,
      voiceStarting: false,
      loadingTelegramLinkKey: false,
      offlineMode: false,
      startVoiceCapture: jest.fn(),
      stopVoiceCaptureAndSubmit: jest.fn(),
      cancelVoiceCapture: jest.fn(),
      voiceElapsedMs: 0,
      voiceMaxDurationMs: 120000,
      openSettings: jest.fn(),
      settingsOpen: false,
      closeSettings: jest.fn(),
      timezoneDraft: "UTC",
      handleTimezoneChange: jest.fn(),
      timezoneError: "",
      generateTelegramLinkKey: jest.fn(),
      telegramLinkKey: "",
      copyTelegramLinkKey: jest.fn(),
      telegramCopyStatus: "",
      telegramLinkError: "",
      importingConversations: false,
      importError: "",
      handleOpenImportDialog: jest.fn(),
      handleImportChatGptShareUrl: jest.fn(),
      savingSettings: false,
      saveSettings: jest.fn(),
      ...overrides,
    };

    return {
      ...render(
        <SecondBrainTypebar {...props}>
          <View testID="content-child" />
        </SecondBrainTypebar>,
      ),
      props,
    };
  }

  it("handles input events and main actions", () => {
    const { getByPlaceholderText, getByLabelText, props } = renderTypebar();
    const input = getByPlaceholderText("Type a note, reminder or thought...");

    fireEvent.changeText(input, "New note");
    fireEvent(input, "focus");
    fireEvent(input, "blur");
    fireEvent(input, "contentSizeChange", {
      nativeEvent: { contentSize: { height: 54 } },
    });
    fireEvent.press(getByLabelText("Record voice note"));
    fireEvent.press(getByLabelText("Enter note"));
    fireEvent.press(getByLabelText("Open settings"));

    expect(props.onChangeDraft).toHaveBeenCalledWith("New note");
    expect(props.closeOpenActionDrawer).toHaveBeenCalledTimes(4);
    expect(props.setTypebarFocused).toHaveBeenCalledWith(true);
    expect(props.setTypebarFocused).toHaveBeenCalledWith(false);
    expect(props.setInputHeight).toHaveBeenCalledTimes(1);
    expect(props.startVoiceCapture).toHaveBeenCalledTimes(1);
    expect(props.onSubmitDraft).toHaveBeenCalledTimes(1);
    expect(props.openSettings).toHaveBeenCalledTimes(1);
  });

  it("shows recording controls and submits voice capture from mic button", () => {
    const { getByLabelText, getByText, props } = renderTypebar({
      recording: true,
    });

    expect(getByText("0:00/2:00")).toBeTruthy();
    fireEvent.press(getByLabelText("Cancel voice note recording"));
    fireEvent.press(getByLabelText("Stop and submit voice note"));

    expect(props.cancelVoiceCapture).toHaveBeenCalledTimes(1);
    expect(props.stopVoiceCaptureAndSubmit).toHaveBeenCalledTimes(1);
    expect(props.startVoiceCapture).not.toHaveBeenCalled();
  });

  it("hides mic and settings buttons when side actions are collapsed", () => {
    const { queryByLabelText, getByLabelText } = renderTypebar({
      hideTypebarSideActions: true,
    });

    expect(queryByLabelText("Record voice note")).toBeNull();
    expect(queryByLabelText("Open settings")).toBeNull();
    expect(getByLabelText("Enter note")).toBeTruthy();
  });

  it("keeps settings visible when side actions are collapsed and keepSettingsVisible is enabled", () => {
    const { queryByLabelText, getByLabelText } = renderTypebar({
      hideTypebarSideActions: true,
      keepSettingsVisible: true,
    });

    expect(queryByLabelText("Record voice note")).toBeNull();
    expect(getByLabelText("Open settings")).toBeTruthy();
    expect(getByLabelText("Enter note")).toBeTruthy();
  });

  it("renders collapsed plus button and expands on press", () => {
    const { getByLabelText, queryByPlaceholderText, props } = renderTypebar({
      isTypebarExpanded: false,
    });

    expect(
      queryByPlaceholderText("Type a note, reminder or thought..."),
    ).toBeNull();
    fireEvent.press(getByLabelText("Expand typebar"));
    expect(props.setIsTypebarExpanded).toHaveBeenCalledWith(true);
  });

  it("disables settings button while offline", () => {
    const { getByLabelText, props, queryByText } = renderTypebar({
      offlineMode: true,
    });

    const settingsButton = getByLabelText("Open settings");
    fireEvent.press(settingsButton);

    expect(props.openSettings).not.toHaveBeenCalled();
    expect(queryByText("Open settings")).toBeNull();
  });

  it("renders voice capture overlay when voice capture is active", () => {
    const { UNSAFE_getAllByType } = renderTypebar({
      isVoiceCaptureActive: true,
    });

    const overlay = UNSAFE_getAllByType(View).find(
      (node) => node.props.style === styles.voiceCaptureOverlay,
    );
    expect(overlay).toBeTruthy();
    expect(overlay.props.pointerEvents).toBe("auto");
  });

  it("does not render voice capture overlay when voice capture is inactive", () => {
    const { UNSAFE_getAllByType } = renderTypebar({
      isVoiceCaptureActive: false,
    });

    const overlay = UNSAFE_getAllByType(View).find(
      (node) => node.props.style === styles.voiceCaptureOverlay,
    );
    expect(overlay).toBeUndefined();
  });

  it("blurs and disables content area interactions during active voice capture", () => {
    const { UNSAFE_getAllByType } = renderTypebar({
      isVoiceCaptureActive: true,
    });

    const contentArea = UNSAFE_getAllByType(View).find(
      (node) =>
        Array.isArray(node.props.style) &&
        node.props.style[0] === styles.contentArea &&
        node.props.style[1] === styles.contentAreaBlurred,
    );
    expect(contentArea).toBeTruthy();
    expect(contentArea.props.pointerEvents).toBe("none");
  });

  it("keeps content area interactive when voice capture is inactive", () => {
    const { UNSAFE_getAllByType } = renderTypebar({
      isVoiceCaptureActive: false,
    });

    const contentArea = UNSAFE_getAllByType(View).find(
      (node) =>
        Array.isArray(node.props.style) &&
        node.props.style[0] === styles.contentArea,
    );
    expect(contentArea).toBeTruthy();
    expect(contentArea.props.pointerEvents).toBe("auto");
  });
});
