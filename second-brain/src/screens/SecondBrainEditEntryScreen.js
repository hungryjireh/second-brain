import { useCallback, useEffect, useMemo, useState } from "react";
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
  normalizeTagValue,
  parseTagInput,
  tagsToInput,
} from "../utils/secondBrainTagUtils";
import {
  datetimeLocalToUnix,
  unixToDatetimeLocal,
} from "../utils/dateTimeUtils";
import styles from "./SecondBrainScreen.styles";

const TITLE_MIN_INPUT_HEIGHT = 60;
const SUMMARY_MIN_INPUT_HEIGHT = 80;

export default function SecondBrainEditEntryScreen({
  route,
  navigation,
  token: tokenFromProps,
}) {
  const entryFromRoute = route?.params?.entry ?? null;
  const entryId = route?.params?.entryId ?? entryFromRoute?.id ?? null;
  const token = tokenFromProps ?? null;
  const [entry, setEntry] = useState(entryFromRoute);
  const initialEditText =
    entry?.description ||
    entry?.rawText ||
    entry?.content ||
    entry?.raw_text ||
    entry?.summary ||
    "";

  const [editCategory, setEditCategory] = useState(entry?.category || "note");
  const [editTitle, setEditTitle] = useState(entry?.title || "");
  const [editSummary, setEditSummary] = useState(entry?.summary || "");
  const [editText, setEditText] = useState(initialEditText);
  const [editRawText, setEditRawText] = useState(
    entry?.rawText || entry?.raw_text || initialEditText,
  );
  const [editRemindAt, setEditRemindAt] = useState(
    entry?.remind_at ? unixToDatetimeLocal(entry.remind_at) : "",
  );
  const [editPriority, setEditPriority] = useState(
    String(Number.isInteger(entry?.priority) ? entry.priority : 0),
  );
  const [editTags, setEditTags] = useState(tagsToInput(entry?.tags));
  const [editTagDraft, setEditTagDraft] = useState("");
  const [editTagError, setEditTagError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [titleInputHeight, setTitleInputHeight] = useState(
    TITLE_MIN_INPUT_HEIGHT,
  );
  const [summaryInputHeight, setSummaryInputHeight] = useState(
    SUMMARY_MIN_INPUT_HEIGHT,
  );
  const [isMarkdownPreviewEnabled, setIsMarkdownPreviewEnabled] =
    useState(false);

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
      if (entry?.id === entryId) return;
      try {
        const data = await apiRequest("/entries?limit=60", { token });
        const list = Array.isArray(data?.entries)
          ? data.entries
          : Array.isArray(data)
            ? data
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
  }, [entry?.id, entryId, token]);

  useEffect(() => {
    if (!entry) return;
    setEditCategory(entry.category || "note");
    setEditTitle(entry.title || "");
    setEditSummary(entry.summary || "");
    setEditText(
      entry.description ||
        entry.rawText ||
        entry.content ||
        entry.raw_text ||
        entry.summary ||
        "",
    );
    setEditRawText(
      entry.rawText ||
        entry.raw_text ||
        entry.description ||
        entry.content ||
        entry.summary ||
        "",
    );
    setEditRemindAt(
      entry.remind_at ? unixToDatetimeLocal(entry.remind_at) : "",
    );
    setEditPriority(
      String(Number.isInteger(entry.priority) ? entry.priority : 0),
    );
    setEditTags(tagsToInput(entry.tags));
    setEditTagDraft("");
    setEditTagError("");
    setError("");
  }, [entry]);

  const parsedEditTags = useMemo(() => parseTagInput(editTags), [editTags]);

  const addEditTag = useCallback(() => {
    const nextTag = normalizeTagValue(editTagDraft);
    if (!nextTag) return;
    setEditTagError("");
    const merged = parseTagInput([...parsedEditTags, nextTag].join(","));
    setEditTags(merged.join(","));
    setEditTagDraft("");
  }, [editTagDraft, parsedEditTags]);

  const removeEditTag = useCallback(
    (tagToRemove) => {
      setEditTags(
        parsedEditTags.filter((tag) => tag !== tagToRemove).join(","),
      );
      setEditTagError("");
    },
    [parsedEditTags],
  );

  async function saveEdit() {
    const entryId = entry?.id ?? entry?.entry_id;
    if (!entryId || !editText.trim() || busy) return;

    const priority = Number(editPriority);
    const tags = parseTagInput(editTags);
    if (!Number.isInteger(priority) || priority < 0 || priority > 10) {
      setError("Priority must be an integer from 0 to 10.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const normalizedDescription = editText.trim();
      const normalizedRawText = editRawText.trim();
      const updatedEntry = await apiRequest(`/entries?id=${entryId}`, {
        method: "PATCH",
        token,
        body: {
          category: editCategory,
          title: editTitle.trim(),
          summary: editSummary.trim(),
          description: normalizedDescription,
          rawText: normalizedRawText,
          // Backward-compatible alias for older deployments expecting `content`.
          content: normalizedDescription,
          remind_at:
            editCategory === "reminder"
              ? datetimeLocalToUnix(editRemindAt)
              : null,
          priority,
          tags,
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
        <Text style={styles.editLabel}>Summary</Text>
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
          <View
            testID="description-markdown-preview"
            style={styles.editMarkdownPreview}
          >
            <MarkdownBody text={editText} styles={styles} />
          </View>
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
        <Text style={styles.editLabel}>Raw text</Text>
        <TextInput
          testID="raw-text-input"
          value={editRawText}
          onChangeText={setEditRawText}
          multiline
          style={styles.editInput}
          placeholder="Raw text"
          placeholderTextColor={theme.colors.textSecondary}
        />
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
        <Text style={styles.editLabel}>Tags</Text>
        <View style={styles.tagInputRow}>
          <TextInput
            value={editTagDraft}
            onChangeText={(value) => {
              setEditTagDraft(value);
              setEditTagError("");
            }}
            style={[styles.editField, styles.tagInput]}
            placeholder="Type a tag"
            placeholderTextColor={theme.colors.textSecondary}
          />
          <Pressable style={styles.secondaryButton} onPress={addEditTag}>
            <Text style={styles.secondaryButtonText}>Add</Text>
          </Pressable>
        </View>
        {editTagError ? (
          <Text style={[styles.tagCountText, { color: theme.colors.danger }]}>
            {editTagError}
          </Text>
        ) : null}
        <View style={styles.editTagsRow}>
          {parsedEditTags.map((tag) => (
            <Pressable
              key={tag}
              style={styles.itemTagPill}
              onPress={() => removeEditTag(tag)}
            >
              <Text style={styles.itemTagText}>{`#${tag} ×`}</Text>
            </Pressable>
          ))}
        </View>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.editActionRow}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.goBack()}
          >
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
