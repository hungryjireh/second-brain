import { useCallback, useEffect, useMemo, useState } from 'react';
import { Keyboard, Platform, Pressable, ScrollView, Switch, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import { apiRequest } from '../api';
import SecondBrainEntryPageLayout from '../components/SecondBrainEntryPageLayout';
import MarkdownBody from '../components/MarkdownBody';
import { CACHE_TTL_MS } from '../constants/cache';
import {
  CATEGORIES,
  GLOBALLY_PERMISSIVE_TAGS_NORMALIZED,
  MAX_ENTRY_TAGS,
  MAX_USER_TAGS,
} from '../constants/tags';
import { theme } from '../theme';
import {
  countBillableGlobalTags,
  normalizeTagValue,
  parseTagInput,
  tagsToInput,
} from '../utils/secondBrainTagUtils';
import { datetimeLocalToUnix, unixToDatetimeLocal } from '../utils/dateUtils';
import styles from './SecondBrainScreen.styles';

export default function SecondBrainEditEntryScreen({ route, navigation, token: tokenFromProps }) {
  const entryFromRoute = route?.params?.entry ?? null;
  const entryId = route?.params?.entryId ?? entryFromRoute?.id ?? null;
  const token = tokenFromProps ?? null;
  const [entry, setEntry] = useState(entryFromRoute);
  const initialEditText = entry?.description || entry?.content || entry?.raw_text || entry?.summary || '';

  const [editCategory, setEditCategory] = useState(entry?.category || 'note');
  const [editTitle, setEditTitle] = useState(entry?.title || '');
  const [editSummary, setEditSummary] = useState(entry?.summary || '');
  const [editText, setEditText] = useState(initialEditText);
  const [editRemindAt, setEditRemindAt] = useState(entry?.remind_at ? unixToDatetimeLocal(entry.remind_at) : '');
  const [editPriority, setEditPriority] = useState(String(Number.isInteger(entry?.priority) ? entry.priority : 0));
  const [editTags, setEditTags] = useState(tagsToInput(entry?.tags));
  const [editTagDraft, setEditTagDraft] = useState('');
  const [editTagError, setEditTagError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [globalTags, setGlobalTags] = useState([]);
  const [isMarkdownPreviewEnabled, setIsMarkdownPreviewEnabled] = useState(false);

  useEffect(() => {
    setEntry(entryFromRoute);
  }, [entryFromRoute]);

  useEffect(() => {
    async function loadEntryById() {
      if (!entryId || !token) return;
      if (entry?.id === entryId) return;
      try {
        const data = await apiRequest('/entries?limit=60', { token });
        const list = Array.isArray(data?.entries) ? data.entries : Array.isArray(data) ? data : [];
        const nextEntry = list.find(item => String(item?.id) === String(entryId));
        if (nextEntry) setEntry(nextEntry);
      } catch {
        // Keep existing entry state when fetch fails.
      }
    }
    loadEntryById();
  }, [entry?.id, entryId, token]);

  useEffect(() => {
    async function loadTags() {
      try {
        const tagsData = await apiRequest('/tags', { token, cache: { ttlMs: CACHE_TTL_MS.SETTINGS } });
        const normalizedUserTags = (Array.isArray(tagsData?.tags) ? tagsData.tags : [])
          .map(tag => normalizeTagValue(tag))
          .filter(Boolean);
        setGlobalTags(Array.from(new Set(normalizedUserTags)).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })));
      } catch {
        setGlobalTags([]);
      }
    }

    loadTags();
  }, [token]);

  useEffect(() => {
    if (!entry) return;
    setEditCategory(entry.category || 'note');
    setEditTitle(entry.title || '');
    setEditSummary(entry.summary || '');
    setEditText(entry.description || entry.content || entry.raw_text || entry.summary || '');
    setEditRemindAt(entry.remind_at ? unixToDatetimeLocal(entry.remind_at) : '');
    setEditPriority(String(Number.isInteger(entry.priority) ? entry.priority : 0));
    setEditTags(tagsToInput(entry.tags));
    setEditTagDraft('');
    setEditTagError('');
    setError('');
  }, [entry]);

  const parsedEditTags = useMemo(() => parseTagInput(editTags), [editTags]);

  const addEditTag = useCallback(() => {
    const nextTag = normalizeTagValue(editTagDraft);
    if (!nextTag) return;
    setEditTagError('');
    const existingGlobalTags = new Set(globalTags.map(tag => normalizeTagValue(tag)));
    const isNewGlobalTag = !existingGlobalTags.has(nextTag);
    const isNewBillableTag = isNewGlobalTag && !GLOBALLY_PERMISSIVE_TAGS_NORMALIZED.has(nextTag);
    if (isNewBillableTag && countBillableGlobalTags(globalTags) >= MAX_USER_TAGS) {
      setEditTagError(`A maximum of ${MAX_USER_TAGS} tags is allowed per user.`);
      return;
    }
    const merged = parseTagInput([...parsedEditTags, nextTag].join(','));
    setEditTags(merged.join(','));
    setEditTagDraft('');
  }, [editTagDraft, globalTags, parsedEditTags]);

  const removeEditTag = useCallback(tagToRemove => {
    setEditTags(parsedEditTags.filter(tag => tag !== tagToRemove).join(','));
    setEditTagError('');
  }, [parsedEditTags]);

  function validateGlobalTagLimit(nextTags) {
    const existingGlobalTags = new Set(globalTags.map(tag => normalizeTagValue(tag)));
    const newBillableGlobalTags = nextTags.filter(tag => (
      !existingGlobalTags.has(tag) && !GLOBALLY_PERMISSIVE_TAGS_NORMALIZED.has(tag)
    ));
    if (newBillableGlobalTags.length === 0) return true;
    if (countBillableGlobalTags(globalTags) + newBillableGlobalTags.length > MAX_USER_TAGS) {
      setEditTagError(`A maximum of ${MAX_USER_TAGS} tags is allowed per user.`);
      return false;
    }
    return true;
  }

  async function saveEdit() {
    const entryId = entry?.id ?? entry?.entry_id;
    if (!entryId || !editText.trim() || busy) return;

    const priority = Number(editPriority);
    const tags = parseTagInput(editTags);
    if (!Number.isInteger(priority) || priority < 0 || priority > 10) {
      setError('Priority must be an integer from 0 to 10.');
      return;
    }

    if (!validateGlobalTagLimit(tags)) return;

    setBusy(true);
    setError('');
    try {
      const normalizedDescription = editText.trim();
      const updatedEntry = await apiRequest(`/entries?id=${entryId}`, {
        method: 'PATCH',
        token,
        body: {
          category: editCategory,
          title: editTitle.trim(),
          summary: editSummary.trim(),
          description: normalizedDescription,
          // Backward-compatible alias for older deployments expecting `content`.
          content: normalizedDescription,
          remind_at: editCategory === 'reminder' ? datetimeLocalToUnix(editRemindAt) : null,
          priority,
          tags,
        },
      });
      const nextEntry = updatedEntry && typeof updatedEntry === 'object'
        ? { ...entry, ...updatedEntry, id: entryId }
        : { ...entry, id: entryId };
      if (navigation?.replace) {
        navigation.replace('SecondBrainEntryDetails', { entryId, entry: nextEntry });
      } else {
        navigation?.navigate?.('SecondBrainEntryDetails', { entryId, entry: nextEntry });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SecondBrainEntryPageLayout navigation={navigation} submenuLabel="Edit entry">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          style={styles.editScroll}
          contentContainerStyle={styles.editScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.editLabel}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
            keyboardShouldPersistTaps="handled"
          >
            {CATEGORIES.map(category => {
              const isActive = editCategory === category;
              return (
                <Pressable
                  key={category}
                  style={[styles.pill, isActive && styles.pillActive]}
                  onPress={() => setEditCategory(category)}
                >
                  <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{category}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Text style={styles.editLabel}>Title</Text>
          <TextInput value={editTitle} onChangeText={setEditTitle} style={styles.editField} placeholder="Title" placeholderTextColor={theme.colors.textSecondary} />
          <Text style={styles.editLabel}>Summary</Text>
          <TextInput value={editSummary} onChangeText={setEditSummary} multiline style={styles.editInputCompact} placeholder="Summary" placeholderTextColor={theme.colors.textSecondary} />
          <View style={styles.editLabelRow}>
            <Text style={styles.editLabel}>Description</Text>
            <View style={styles.editLabelToggleRow}>
              <Text style={styles.editToggleText}>Render Markdown</Text>
              <Switch
                testID="description-markdown-toggle"
                value={isMarkdownPreviewEnabled}
                onValueChange={setIsMarkdownPreviewEnabled}
                trackColor={{ false: theme.colors.border, true: theme.colors.brand }}
                thumbColor={theme.colors.bg}
                ios_backgroundColor={theme.colors.border}
              />
            </View>
          </View>
          {isMarkdownPreviewEnabled ? (
            <View testID="description-markdown-preview" style={styles.editMarkdownPreview}>
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
          {editCategory === 'reminder' ? (
            <>
              <Text style={styles.editLabel}>Reminder date and time</Text>
              <TextInput
                value={editRemindAt}
                onChangeText={setEditRemindAt}
                style={styles.editField}
                placeholder="Select reminder date and time"
                placeholderTextColor={theme.colors.textSecondary}
                {...(Platform.OS === 'web' ? { type: 'datetime-local' } : {})}
              />
            </>
          ) : null}
          <Text style={styles.editLabel}>Priority (0-10)</Text>
          <TextInput value={editPriority} onChangeText={setEditPriority} style={styles.editField} keyboardType="numeric" placeholder="0" placeholderTextColor={theme.colors.textSecondary} />
          <Text style={styles.editLabel}>Tags</Text>
          <View style={styles.tagInputRow}>
            <TextInput
              value={editTagDraft}
              onChangeText={value => {
                setEditTagDraft(value);
                setEditTagError('');
              }}
              style={[styles.editField, styles.tagInput]}
              placeholder={parsedEditTags.length >= MAX_ENTRY_TAGS ? `Maximum ${MAX_ENTRY_TAGS} tags reached` : 'Type a tag'}
              placeholderTextColor={theme.colors.textSecondary}
              editable={parsedEditTags.length < MAX_ENTRY_TAGS}
            />
            <Pressable style={styles.secondaryButton} onPress={addEditTag}>
              <Text style={styles.secondaryButtonText}>Add</Text>
            </Pressable>
          </View>
          {editTagError ? <Text style={[styles.tagCountText, { color: theme.colors.danger }]}>{editTagError}</Text> : null}
          <Text style={styles.tagCountText}>{`${parsedEditTags.length}/${MAX_ENTRY_TAGS} tags`}</Text>
          <View style={styles.tagsRow}>
            {parsedEditTags.map(tag => (
              <Pressable key={tag} style={styles.itemTagPill} onPress={() => removeEditTag(tag)}>
                <Text style={styles.itemTagText}>{`#${tag} ×`}</Text>
              </Pressable>
            ))}
          </View>
          {!!error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.editActionRow}>
            <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.editSaveButton} onPress={saveEdit}>
              <Text style={styles.buttonText}>{busy ? 'Saving...' : 'Save changes'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </SecondBrainEntryPageLayout>
  );
}
