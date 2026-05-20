import { fireEvent, render } from "@testing-library/react-native";
import SecondBrainSettingsModal from "../SecondBrainSettingsModal";

jest.mock("../TimezoneDropdown", () => {
  const { Pressable, Text } = require("react-native");

  return function MockTimezoneDropdown({ onChange }) {
    return (
      <Pressable
        testID="timezone-dropdown"
        onPress={() => onChange?.("America/New_York")}
      >
        <Text>Timezone dropdown</Text>
      </Pressable>
    );
  };
});

const styles = {
  editOverlay: {},
  settingsPanel: {},
  settingsScroll: {},
  settingsScrollContent: {},
  settingsTitle: {},
  settingsLabel: {},
  settingsDropdownWrapper: {},
  settingsDropdown: {},
  settingsDropdownText: {},
  settingsDropdownChevronIcon: {},
  settingsDropdownList: {},
  settingsDropdownListContent: {},
  settingsDropdownSearchInput: {},
  settingsDropdownOption: {},
  settingsDropdownOptionSelected: {},
  settingsDropdownOptionText: {},
  settingsDropdownOptionTextSelected: {},
  settingsNoResults: {},
  error: {},
  settingsCard: {},
  settingsCardLabel: {},
  settingsActionButton: {},
  typebarButtonDisabled: {},
  settingsActionButtonText: {},
  settingsKeyText: {},
  settingsCopyButton: {},
  settingsCopyButtonText: {},
  settingsHintText: {},
  settingsHintLink: {},
  settingsActionsRow: {},
  settingsSecondaryButton: {},
  settingsSecondaryButtonText: {},
  editSaveButton: {},
  buttonText: {},
};

describe("SecondBrainSettingsModal", () => {
  function renderModal(overrides = {}) {
    const props = {
      visible: true,
      onRequestClose: jest.fn(),
      styles,
      timezoneDraft: "UTC",
      onTimezoneChange: jest.fn(),
      timezoneError: "",
      loadingTelegramLinkKey: false,
      onGenerateTelegramLinkKey: jest.fn(),
      telegramLinkKey: "",
      onCopyTelegramLinkKey: jest.fn(),
      telegramCopyStatus: "",
      telegramLinkError: "",
      importingConversations: false,
      onOpenImportDialog: jest.fn(),
      onImportChatGptShareUrl: jest.fn(),
      savingSettings: false,
      onSave: jest.fn(),
      ...overrides,
    };

    return {
      ...render(<SecondBrainSettingsModal {...props} />),
      props,
    };
  }

  it("calls handlers for timezone change and settings actions", () => {
    const { getByTestId, getByText, props } = renderModal();

    fireEvent.press(getByTestId("timezone-dropdown"));
    fireEvent.press(getByText("Generate Telegram link key"));
    fireEvent.press(getByText("Import LLM conversations"));
    fireEvent.press(getByText("Import ChatGPT share URL"));
    fireEvent.press(getByText("Save"));
    fireEvent.press(getByText("Cancel"));

    expect(props.onTimezoneChange).toHaveBeenCalledWith("America/New_York");
    expect(props.onGenerateTelegramLinkKey).toHaveBeenCalledTimes(1);
    expect(props.onOpenImportDialog).toHaveBeenCalledTimes(1);
    expect(props.onImportChatGptShareUrl).toHaveBeenCalledTimes(1);
    expect(props.onSave).toHaveBeenCalledTimes(1);
    expect(props.onRequestClose).toHaveBeenCalledTimes(1);
  });

  it("shows key, copy state, and inline errors", () => {
    const { getByText } = renderModal({
      timezoneError: "Invalid timezone",
      telegramLinkKey: "abc123",
      telegramCopyStatus: "Copied",
      telegramLinkError: "Could not generate key",
    });

    expect(getByText("Invalid timezone")).toBeTruthy();
    expect(getByText("abc123")).toBeTruthy();
    expect(getByText("✓ Copied")).toBeTruthy();
    expect(getByText("Could not generate key")).toBeTruthy();
  });

  it("disables save and cancel while settings are saving", () => {
    const { getByText, props } = renderModal({
      savingSettings: true,
    });

    expect(props.onSave).not.toHaveBeenCalled();
    expect(props.onRequestClose).not.toHaveBeenCalled();
    expect(getByText("Cancel")).toBeTruthy();
    expect(getByText("Saving…")).toBeTruthy();
  });
});
