import { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { apiRequest } from "../api";
import MarkdownBody from "../components/MarkdownBody";
import { CATEGORIES } from "../constants/tags";
import { theme } from "../theme";
import {
  parseBrainstormTranscriptFromText,
  parseImportedConversationFromText,
} from "../utils/secondBrainConversationParsers";
import {
  datetimeLocalToUnix,
  unixToDatetimeLocal,
} from "../utils/dateTimeUtils";
import styles from "./SecondBrainScreen.styles";

const TITLE_MIN_INPUT_HEIGHT = 60;
const SUMMARY_MIN_INPUT_HEIGHT = 80;
const CONTENT_MIN_INPUT_HEIGHT = 80;

export default function SecondBrainEditEntryScreen({
  route,
  navigation,
  token: tokenFromProps,
}) {
  const entryFromRoute = route?.params?.entry ?? null;
  const entryId = route?.params?.entryId ?? entryFromRoute?.id ?? null;
  const token = tokenFromProps ?? null;
  const [entry, setEntry] = useState(entryFromRoute);

  const [editCategory, setEditCategory] = useState(entry?.category || "note");
  const [editTitle, setEditTitle] = useState(entry?.title || "");
  const [editSummary, setEditSummary] = useState(entry?.summary || "");
  const [editContent, setEditContent] = useState(entry?.content || "");
  const [editText, setEditText] = useState(
    entry?.raw_text || entry?.description || "",
  );
  const [editRemindAt, setEditRemindAt] = useState(
    entry?.remind_at ? unixToDatetimeLocal(entry.remind_at) : "",
  );
  const [editPriority, setEditPriority] = useState(
    String(Number.isInteger(entry?.priority) ? entry.priority : 0),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [titleInputHeight, setTitleInputHeight] = useState(
    TITLE_MIN_INPUT_HEIGHT,
  );
  const [summaryInputHeight, setSummaryInputHeight] = useState(
    SUMMARY_MIN_INPUT_HEIGHT,
  );
  const [contentInputHeight, setContentInputHeight] = useState(
    CONTENT_MIN_INPUT_HEIGHT,
  );
  const [isMarkdownPreviewEnabled, setIsMarkdownPreviewEnabled] =
    useState(false);
  const previewConversation = useMemo(() => {
    const importedConversation = parseImportedConversationFromText(editText);
    if (importedConversation) return importedConversation;

    const transcriptFromEditor = parseBrainstormTranscriptFromText(editText);
    if (transcriptFromEditor) return transcriptFromEditor;

    return parseBrainstormTranscriptFromText(entry?.description);
  }, [editText, entry?.description]);

  const reminderPickerDate = useMemo(() => {
    const unixTimestamp = datetimeLocalToUnix(editRemindAt);
    if (Number.isInteger(unixTimestamp)) {
      return new Date(unixTimestamp * 1000);
    }
    return new Date();
  }, [editRemindAt]);

  useEffect(() => {
    setEntry(entryFromRoute);
  }, [entryFromRoute]);

  useEffect(() => {
    async function loadEntryById() {
      if (!entryId || !token) return;
      try {
        const data = await apiRequest(`/entries?id=${entryId}`, { token });
        const directEntry = Array.isArray(data)
          ? data.find((item) => String(item?.id) === String(entryId))
          : data && typeof data === "object"
            ? data
            : null;
        if (directEntry) {
          setEntry(directEntry);
          return;
        }

        // Backward-compatible fallback for environments that only return list payloads.
        const fallbackData = await apiRequest("/entries?limit=60", { token });
        const list = Array.isArray(fallbackData?.entries)
          ? fallbackData.entries
          : Array.isArray(fallbackData)
            ? fallbackData
            : [];
        const nextEntry = list.find(
          (item) => String(item?.id) === String(entryId),
        );
        if (nextEntry) setEntry(nextEntry);
      } catch {
        // Keep existing entry state when fetch fails.
      }
    }
    loadEntryById();
  }, [entryId, token]);

  useEffect(() => {
    if (!entry) return;
    setEditCategory(entry.category || "note");
    setEditTitle(entry.title || "");
    setEditSummary(entry.summary || "");
    setEditContent(entry.content || "");
    setEditText(entry.raw_text || entry.description || "");
    setEditRemindAt(
      entry.remind_at ? unixToDatetimeLocal(entry.remind_at) : "",
    );
    setEditPriority(
      String(Number.isInteger(entry.priority) ? entry.priority : 0),
    );
    setError("");
  }, [entry]);

  async function saveEdit() {
    const entryId = entry?.id ?? entry?.entry_id;
    if (!entryId || !editText.trim() || busy) return;

    const priority = Number(editPriority);
    if (!Number.isInteger(priority) || priority < 0 || priority > 10) {
      setError("Priority must be an integer from 0 to 10.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const normalizedRawText = editText.trim();
      const updatedEntry = await apiRequest(`/entries?id=${entryId}`, {
        method: "PATCH",
        token,
        body: {
          category: editCategory,
          title: editTitle.trim(),
          summary: editSummary.trim(),
          content: editContent.trim(),
          raw_text: normalizedRawText,
          remind_at:
            editCategory === "reminder"
              ? datetimeLocalToUnix(editRemindAt)
              : null,
          priority,
        },
      });
      const nextEntry =
        updatedEntry && typeof updatedEntry === "object"
          ? { ...entry, ...updatedEntry, id: entryId }
          : { ...entry, id: entryId };
      if (navigation?.replace) {
        navigation.replace("SecondBrainEntryDetails", {
          entryId,
          entry: nextEntry,
        });
      } else {
        navigation?.navigate?.("SecondBrainEntryDetails", {
          entryId,
          entry: nextEntry,
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleCancelPress() {
    const canGoBackFn = navigation?.canGoBack;
    if (typeof canGoBackFn !== "function" || canGoBackFn()) {
      navigation?.goBack?.();
      return;
    }
    navigation?.navigate?.("SecondBrain");
  }

  function updateReminderDate(nextDate) {
    if (!(nextDate instanceof Date) || Number.isNaN(nextDate.getTime())) return;
    setEditRemindAt(unixToDatetimeLocal(Math.floor(nextDate.getTime() / 1000)));
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.editScroll}
        contentContainerStyle={styles.editScrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
        <Text style={styles.editLabel}>Category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
          keyboardShouldPersistTaps="handled"
        >
          {CATEGORIES.map((category) => {
            const isActive = editCategory === category;
            return (
              <Pressable
                key={category}
                style={[styles.pill, isActive && styles.pillActive]}
                onPress={() => setEditCategory(category)}
              >
                <Text
                  style={[styles.pillText, isActive && styles.pillTextActive]}
                >
                  {category}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Text style={styles.editLabel}>Title</Text>
        <TextInput
          value={editTitle}
          onChangeText={setEditTitle}
          multiline
          onContentSizeChange={(event) => {
            const nextHeight = Math.max(
              TITLE_MIN_INPUT_HEIGHT,
              Math.ceil(event?.nativeEvent?.contentSize?.height || 0),
            );
            setTitleInputHeight((currentHeight) =>
              currentHeight === nextHeight ? currentHeight : nextHeight,
            );
          }}
          style={[styles.editInputCompact, { height: titleInputHeight }]}
          placeholder="Title"
          placeholderTextColor={theme.colors.textSecondary}
        />
        <Text style={styles.editLabel}>Summary (one-sentence)</Text>
        <TextInput
          value={editSummary}
          onChangeText={setEditSummary}
          multiline
          onContentSizeChange={(event) => {
            const nextHeight = Math.max(
              SUMMARY_MIN_INPUT_HEIGHT,
              Math.ceil(event?.nativeEvent?.contentSize?.height || 0),
            );
            setSummaryInputHeight((currentHeight) =>
              currentHeight === nextHeight ? currentHeight : nextHeight,
            );
          }}
          style={[styles.editInputCompact, { height: summaryInputHeight }]}
          placeholder="Summary"
          placeholderTextColor={theme.colors.textSecondary}
        />
        <Text style={styles.editLabel}>
          Content (cleaned, concise version of the note)
        </Text>
        <TextInput
          value={editContent}
          onChangeText={setEditContent}
          multiline
          onContentSizeChange={(event) => {
            const nextHeight = Math.max(
              CONTENT_MIN_INPUT_HEIGHT,
              Math.ceil(event?.nativeEvent?.contentSize?.height || 0),
            );
            setContentInputHeight((currentHeight) =>
              currentHeight === nextHeight ? currentHeight : nextHeight,
            );
          }}
          style={[styles.editInputCompact, { height: contentInputHeight }]}
          placeholder="Content"
          placeholderTextColor={theme.colors.textSecondary}
        />
        <View style={styles.editLabelRow}>
          <Text style={styles.editLabel}>Description</Text>
          <View style={styles.editLabelToggleRow}>
            <Text style={styles.editToggleText}>Render Markdown</Text>
            <Switch
              testID="description-markdown-toggle"
              value={isMarkdownPreviewEnabled}
              onValueChange={setIsMarkdownPreviewEnabled}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.brand,
              }}
              thumbColor={theme.colors.bg}
              ios_backgroundColor={theme.colors.border}
            />
          </View>
        </View>
        {isMarkdownPreviewEnabled ? (
          <>
            {previewConversation ? null : (
              <View
                testID="description-markdown-preview"
                style={styles.editMarkdownPreview}
              >
                <MarkdownBody text={editText} styles={styles} />
              </View>
            )}
            {previewConversation ? (
              <View
                testID="description-conversation-preview"
                style={styles.conversationWrap}
              >
                {previewConversation.messages.map((item, index) => {
                  const fromHuman = item.sender === "human";
                  return (
                    <View
                      key={`${item.sender}-${index}`}
                      style={[
                        styles.conversationRow,
                        fromHuman
                          ? styles.conversationRowHuman
                          : styles.conversationRowAssistant,
                      ]}
                    >
                      <View
                        style={[
                          styles.conversationBubble,
                          fromHuman
                            ? styles.conversationBubbleHuman
                            : styles.conversationBubbleAssistant,
                        ]}
                      >
                        <Text style={styles.conversationSender}>
                          {fromHuman ? "You" : "Assistant"}
                        </Text>
                        <MarkdownBody
                          text={item.text}
                          fileUrls={item.fileUrls}
                          styles={styles}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </>
        ) : (
          <TextInput
            testID="description-input"
            value={editText}
            onChangeText={setEditText}
            multiline
            style={styles.editInput}
            placeholder="Description"
            placeholderTextColor={theme.colors.textSecondary}
          />
        )}
        {editCategory === "reminder" ? (
          <>
            <Text style={styles.editLabel}>Reminder date and time</Text>
            {Platform.OS === "web" ? null : (
              <View style={{ alignItems: "center", marginBottom: 8 }}>
                {Platform.OS === "ios" ? (
                  <DateTimePicker
                    value={reminderPickerDate}
                    mode="datetime"
                    display="compact"
                    onChange={(_, selectedDate) => {
                      if (!selectedDate) return;
                      updateReminderDate(selectedDate);
                    }}
                  />
                ) : (
                  <>
                    <DateTimePicker
                      value={reminderPickerDate}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        if (event?.type === "dismissed" || !selectedDate)
                          return;
                        const nextDate = new Date(selectedDate);
                        nextDate.setHours(reminderPickerDate.getHours());
                        nextDate.setMinutes(reminderPickerDate.getMinutes());
                        nextDate.setSeconds(0);
                        nextDate.setMilliseconds(0);
                        updateReminderDate(nextDate);
                      }}
                    />
                    <DateTimePicker
                      value={reminderPickerDate}
                      mode="time"
                      display="default"
                      onChange={(event, selectedDate) => {
                        if (event?.type === "dismissed" || !selectedDate)
                          return;
                        const nextDate = new Date(reminderPickerDate);
                        nextDate.setHours(selectedDate.getHours());
                        nextDate.setMinutes(selectedDate.getMinutes());
                        nextDate.setSeconds(0);
                        nextDate.setMilliseconds(0);
                        updateReminderDate(nextDate);
                      }}
                    />
                  </>
                )}
              </View>
            )}
          </>
        ) : null}
        <Text style={styles.editLabel}>Priority (0-10)</Text>
        <TextInput
          value={editPriority}
          onChangeText={setEditPriority}
          style={styles.editField}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={theme.colors.textSecondary}
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.editActionRow}>
          <Pressable style={styles.secondaryButton} onPress={handleCancelPress}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.editSaveButton} onPress={saveEdit}>
            <Text style={styles.buttonText}>
              {busy ? "Saving..." : "Save changes"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
