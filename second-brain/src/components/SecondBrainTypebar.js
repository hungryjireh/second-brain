import { useMemo } from "react";
import { View, Text, TextInput, Pressable, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { theme } from "../theme";
import { formatElapsedTime } from "../utils/dateTimeUtils";
import SecondBrainSettingsModal from "./SecondBrainSettingsModal";

const TYPEBAR_MIN_HEIGHT = 38;

export default function SecondBrainTypebar({
  styles,
  children,
  bottom,
  placeholder,
  draft,
  onChangeDraft,
  onSubmitDraft,
  closeOpenActionDrawer,
  setTypebarFocused,
  isSmallScreen,
  inputHeight,
  setInputHeight,
  hideTypebarSideActions,
  actionTooltip,
  setActionTooltip,
  recording,
  isVoiceCaptureActive,
  voiceBusy,
  voiceStarting,
  loadingTelegramLinkKey,
  offlineMode,
  startVoiceCapture,
  stopVoiceCaptureAndSubmit,
  cancelVoiceCapture,
  voiceElapsedMs,
  voiceMaxDurationMs,
  openSettings,
  settingsOpen,
  closeSettings,
  timezoneDraft,
  handleTimezoneChange,
  timezoneError,
  generateTelegramLinkKey,
  telegramLinkKey,
  copyTelegramLinkKey,
  telegramCopyStatus,
  telegramLinkError,
  importingConversations,
  importError,
  handleOpenImportDialog,
  handleImportChatGptShareUrl,
  savingSettings,
  saveSettings,
  onLogout,
}) {
  const isWeb = Platform.OS === "web";
  const typebarPlaceholder = isSmallScreen
    ? "Type here"
    : "Type a note, reminder or thought...";
  const voiceElapsedLabel = useMemo(
    () => formatElapsedTime(voiceElapsedMs),
    [voiceElapsedMs],
  );
  const voiceMaxDurationLabel = useMemo(
    () => formatElapsedTime(voiceMaxDurationMs),
    [voiceMaxDurationMs],
  );

  return (
    <>
      <View
        style={[
          styles.contentArea,
          isVoiceCaptureActive && styles.contentAreaBlurred,
        ]}
        pointerEvents={isVoiceCaptureActive ? "none" : "auto"}
      >
        {children}
      </View>
      {isVoiceCaptureActive ? (
        <View style={styles.voiceCaptureOverlay} pointerEvents="auto" />
      ) : null}
      <SecondBrainSettingsModal
        visible={settingsOpen}
        onRequestClose={closeSettings}
        styles={styles}
        timezoneDraft={timezoneDraft}
        onTimezoneChange={handleTimezoneChange}
        timezoneError={timezoneError}
        loadingTelegramLinkKey={loadingTelegramLinkKey}
        onGenerateTelegramLinkKey={generateTelegramLinkKey}
        telegramLinkKey={telegramLinkKey}
        onCopyTelegramLinkKey={copyTelegramLinkKey}
        telegramCopyStatus={telegramCopyStatus}
        telegramLinkError={telegramLinkError}
        importingConversations={importingConversations}
        importError={importError}
        onOpenImportDialog={handleOpenImportDialog}
        onImportChatGptShareUrl={handleImportChatGptShareUrl}
        savingSettings={savingSettings}
        onSave={saveSettings}
        onLogout={onLogout}
      />
      <View style={[styles.typebarRow, { bottom }]}>
        <TextInput
          value={draft}
          onChangeText={onChangeDraft}
          onSubmitEditing={onSubmitDraft}
          onFocus={() => {
            closeOpenActionDrawer();
            setTypebarFocused(true);
          }}
          onBlur={() => setTypebarFocused(false)}
          placeholder={placeholder || typebarPlaceholder}
          placeholderTextColor={theme.colors.textSecondary}
          style={[
            styles.typebarInput,
            isSmallScreen && styles.typebarInputSmall,
            { height: inputHeight },
          ]}
          multiline
          returnKeyType="send"
          enablesReturnKeyAutomatically
          scrollEnabled={false}
          textAlignVertical="top"
          onContentSizeChange={(event) => {
            const contentHeight =
              event?.nativeEvent?.contentSize?.height ?? TYPEBAR_MIN_HEIGHT;
            const nextHeight = Math.max(
              TYPEBAR_MIN_HEIGHT,
              Math.ceil(contentHeight),
            );
            setInputHeight((prev) => (prev === nextHeight ? prev : nextHeight));
          }}
        />
        {!hideTypebarSideActions ? (
          <View style={styles.typebarActionWrap}>
            {actionTooltip === "mic" && !recording ? (
              <View style={styles.typebarTooltip}>
                <Text style={styles.typebarTooltipText}>Record voice note</Text>
              </View>
            ) : null}
            {recording ? (
              <View style={styles.typebarRecordingMeta}>
                <View style={styles.typebarRecordingTimerBadge}>
                  <Text
                    style={styles.typebarRecordingTimer}
                    numberOfLines={1}
                    accessibilityLabel={`Voice memo running time ${voiceElapsedLabel} out of ${voiceMaxDurationLabel}`}
                  >
                    {`${voiceElapsedLabel}/${voiceMaxDurationLabel}`}
                  </Text>
                </View>
                <Pressable
                  style={[
                    styles.typebarCancelRecordingButton,
                    voiceBusy && styles.typebarButtonDisabled,
                  ]}
                  onPress={cancelVoiceCapture}
                  disabled={voiceBusy}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel voice note recording"
                >
                  <Feather
                    name="trash-2"
                    size={13}
                    style={[
                      styles.typebarCancelRecordingIcon,
                      voiceBusy && styles.typebarButtonIconDisabled,
                    ]}
                  />
                </Pressable>
              </View>
            ) : null}
            <Pressable
              style={[
                styles.typebarButton,
                (voiceBusy || voiceStarting || loadingTelegramLinkKey) &&
                  styles.typebarButtonDisabled,
              ]}
              onPress={() => {
                closeOpenActionDrawer();
                if (recording) {
                  stopVoiceCaptureAndSubmit();
                  return;
                }
                startVoiceCapture();
              }}
              disabled={voiceBusy || voiceStarting}
              accessibilityRole="button"
              accessibilityLabel={
                recording
                  ? "Stop and submit voice note"
                  : voiceStarting
                    ? "Preparing voice recorder"
                    : "Record voice note"
              }
              onHoverIn={() => setActionTooltip("mic")}
              onHoverOut={() => setActionTooltip("")}
              onLongPress={() => setActionTooltip("mic")}
              onPressOut={() => {
                if (!isWeb) setActionTooltip("");
              }}
            >
              <Feather
                name={voiceStarting ? "loader" : recording ? "square" : "mic"}
                size={15}
                style={[
                  styles.typebarButtonIcon,
                  (voiceBusy || voiceStarting) &&
                    styles.typebarButtonIconDisabled,
                ]}
              />
            </Pressable>
          </View>
        ) : null}
        <View style={styles.typebarActionWrap}>
          {actionTooltip === "enter" ? (
            <View style={styles.typebarTooltip}>
              <Text style={styles.typebarTooltipText}>Enter note</Text>
            </View>
          ) : null}
          <Pressable
            style={[
              styles.typebarButton,
              !draft.trim() && styles.typebarButtonDisabled,
            ]}
            onPress={() => {
              closeOpenActionDrawer();
              onSubmitDraft();
            }}
            disabled={!draft.trim()}
            accessibilityRole="button"
            accessibilityLabel="Enter note"
            onHoverIn={() => setActionTooltip("enter")}
            onHoverOut={() => setActionTooltip("")}
            onLongPress={() => setActionTooltip("enter")}
            onPressOut={() => {
              if (!isWeb) setActionTooltip("");
            }}
          >
            <Feather
              name="arrow-up-right"
              size={15}
              style={[
                styles.typebarButtonIcon,
                !draft.trim() && styles.typebarButtonIconDisabled,
              ]}
            />
          </Pressable>
        </View>
        {!hideTypebarSideActions ? (
          <View style={styles.typebarActionWrap}>
            {actionTooltip === "settings" ? (
              <View style={styles.typebarTooltip}>
                <Text style={styles.typebarTooltipText}>Open settings</Text>
              </View>
            ) : null}
            <Pressable
              style={[
                styles.typebarButton,
                styles.typebarUploadButton,
                offlineMode && styles.typebarButtonDisabled,
              ]}
              onPress={() => {
                closeOpenActionDrawer();
                openSettings();
              }}
              disabled={offlineMode}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
              onHoverIn={() => setActionTooltip("settings")}
              onHoverOut={() => setActionTooltip("")}
              onLongPress={() => setActionTooltip("settings")}
              onPressOut={() => {
                if (!isWeb) setActionTooltip("");
              }}
            >
              <Feather
                name="settings"
                style={[
                  styles.typebarUploadButtonIcon,
                  offlineMode && styles.typebarButtonIconDisabled,
                ]}
                size={15}
              />
            </Pressable>
          </View>
        ) : null}
      </View>
    </>
  );
}
