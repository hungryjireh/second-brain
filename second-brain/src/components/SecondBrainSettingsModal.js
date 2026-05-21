import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { theme } from "../theme";
import TimezoneDropdown from "./TimezoneDropdown";

export default function SecondBrainSettingsModal({
  visible,
  onRequestClose,
  styles,
  timezoneDraft,
  onTimezoneChange,
  timezoneError,
  loadingTelegramLinkKey,
  onGenerateTelegramLinkKey,
  telegramLinkKey,
  onCopyTelegramLinkKey,
  telegramCopyStatus,
  telegramLinkError,
  importingConversations,
  importError,
  onOpenImportDialog,
  onImportChatGptShareUrl,
  savingSettings,
  onSave,
  onLogout,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <Pressable style={styles.editOverlay} onPress={onRequestClose}>
        <Pressable
          style={styles.settingsPanel}
          onPress={(event) => event.stopPropagation()}
        >
          <ScrollView
            style={styles.settingsScroll}
            contentContainerStyle={styles.settingsScrollContent}
          >
            <Text style={styles.settingsTitle}>Settings</Text>
            <Text style={styles.settingsLabel}>Timezone</Text>
            <View style={styles.settingsDropdownWrapper}>
              <TimezoneDropdown
                value={timezoneDraft}
                onChange={onTimezoneChange}
                placeholderTextColor={theme.colors.textMuted}
                styles={{
                  dropdown: styles.settingsDropdown,
                  dropdownText: styles.settingsDropdownText,
                  dropdownChevronIcon: styles.settingsDropdownChevronIcon,
                  dropdownList: styles.settingsDropdownList,
                  dropdownListContent: styles.settingsDropdownListContent,
                  searchInput: styles.settingsDropdownSearchInput,
                  dropdownOption: styles.settingsDropdownOption,
                  dropdownOptionSelected: styles.settingsDropdownOptionSelected,
                  dropdownOptionText: styles.settingsDropdownOptionText,
                  dropdownOptionTextSelected:
                    styles.settingsDropdownOptionTextSelected,
                  noResults: styles.settingsNoResults,
                }}
              />
            </View>
            {!!timezoneError && (
              <Text style={styles.error}>{timezoneError}</Text>
            )}
            <View style={styles.settingsCard}>
              <Text style={styles.settingsCardLabel}>
                Telegram account linking
              </Text>
              <Pressable
                style={[
                  styles.settingsActionButton,
                  loadingTelegramLinkKey && styles.typebarButtonDisabled,
                ]}
                onPress={onGenerateTelegramLinkKey}
                disabled={loadingTelegramLinkKey}
              >
                <Text style={styles.settingsActionButtonText}>
                  {loadingTelegramLinkKey
                    ? "Generating…"
                    : "Generate Telegram link key"}
                </Text>
              </Pressable>
              {!!telegramLinkKey && (
                <>
                  <Text style={styles.settingsKeyText} selectable>
                    {telegramLinkKey}
                  </Text>
                  <Pressable
                    style={styles.settingsCopyButton}
                    onPress={onCopyTelegramLinkKey}
                  >
                    <Text style={styles.settingsCopyButtonText}>
                      {telegramCopyStatus === "Copied"
                        ? "✓ Copied"
                        : telegramCopyStatus || "Copy key"}
                    </Text>
                  </Pressable>
                  <Text style={styles.settingsHintText}>
                    Send this in{" "}
                    <Text
                      style={styles.settingsHintLink}
                      onPress={() =>
                        Linking.openURL("https://t.me/AccessiBrainBot")
                      }
                    >
                      Telegram
                    </Text>
                    : /link &lt;your-key&gt;. This key expires in 10 minutes.
                  </Text>
                </>
              )}
              {!!telegramLinkError && (
                <Text style={styles.error}>{telegramLinkError}</Text>
              )}
            </View>
            <View style={styles.settingsCard}>
              <Text style={styles.settingsCardLabel}>Imports</Text>
              <Pressable
                style={[
                  styles.settingsActionButton,
                  importingConversations && styles.typebarButtonDisabled,
                ]}
                onPress={onOpenImportDialog}
                disabled={importingConversations}
              >
                <Text style={styles.settingsActionButtonText}>
                  {importingConversations
                    ? "Importing…"
                    : "Import LLM conversations"}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.settingsActionButton,
                  importingConversations && styles.typebarButtonDisabled,
                ]}
                onPress={onImportChatGptShareUrl}
                disabled={importingConversations}
              >
                <Text style={styles.settingsActionButtonText}>
                  {importingConversations
                    ? "Importing…"
                    : "Import LLM Conversation History"}
                </Text>
              </Pressable>
              {!!importError && <Text style={styles.error}>{importError}</Text>}
            </View>
            <View style={styles.settingsActionsRow}>
              <Pressable
                style={styles.settingsSecondaryButton}
                onPress={onLogout}
                disabled={savingSettings}
                accessibilityRole="button"
                accessibilityLabel="Log out"
              >
                <Text
                  style={[
                    styles.settingsSecondaryButtonText,
                    styles.settingsLogoutButtonText,
                  ]}
                >
                  Log out
                </Text>
              </Pressable>
              <Pressable
                style={styles.settingsSecondaryButton}
                onPress={onRequestClose}
                disabled={savingSettings}
              >
                <Text style={styles.settingsSecondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.editSaveButton,
                  savingSettings && styles.typebarButtonDisabled,
                ]}
                onPress={onSave}
                disabled={savingSettings}
              >
                <Text style={styles.buttonText}>
                  {savingSettings ? "Saving…" : "Save"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
