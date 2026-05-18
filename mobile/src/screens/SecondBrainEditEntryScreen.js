import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { apiRequest } from '../api';
import SecondBrainEntryPageLayout from '../components/SecondBrainEntryPageLayout';
import { CACHE_TTL_MS } from '../constants/cache';
import {
  CATEGORIES,
  GLOBALLY_PERMISSIVE_TAGS_NORMALIZED,
  MAX_ENTRY_TAGS,
  MAX_USER_TAGS,
} from '../constants/tags';
import { theme } from '../theme';
import styles from './SecondBrainScreen.styles';

function normalizeTagValue(input) {
  return String(input || '')
    .trim()
    .replace(/^#+/, '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 32);
}

function parseTagInput(input) {
  const seen = new Set();
  return String(input || '')
    .split(',')
    .map(part => normalizeTagValue(part))
    .filter(tag => {
      if (!tag || seen.has(tag)) return false;
      seen.add(tag);
      return true;
    })
    .slice(0, MAX_ENTRY_TAGS);
}

function tagsToInput(tags) {
  if (!Array.isArray(tags)) return '';
  return tags.map(tag => String(tag).trim()).filter(Boolean).join(',');
}

function unixToDatetimeLocal(unixTs) {
  if (!unixTs) return '';
  const date = new Date(unixTs * 1000);
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function datetimeLocalToUnix(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.floor(parsed.getTime() / 1000);
}

function countBillableGlobalTags(tags) {
  return new Set(
    tags
      .map(tag => normalizeTagValue(tag))
      .filter(tag => tag && !GLOBALLY_PERMISSIVE_TAGS_NORMALIZED.has(tag))
  ).size;
}

export default function SecondBrainEditEntryScreen({ route, navigation }) {
  const entry = route?.params?.entry;
  const token = route?.params?.token;

  const [editCategory, setEditCategory] = useState(entry?.category || 'note');
  const [editTitle, setEditTitle] = useState(entry?.title || '');
  const [editSummary, setEditSummary] = useState(entry?.summary || '');
  const [editText, setEditText] = useState(entry?.raw_text || entry?.summary || '');
  const [editRemindAt, setEditRemindAt] = useState(entry?.remind_at ? unixToDatetimeLocal(entry.remind_at) : '');
  const [editPriority, setEditPriority] = useState(String(Number.isInteger(entry?.priority) ? entry.priority : 0));
  const [editTags, setEditTags] = useState(tagsToInput(entry?.tags));
  const [editTagDraft, setEditTagDraft] = useState('');
  const [editTagError, setEditTagError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [globalTags, setGlobalTags] = useState([]);

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
    if (!entry || !editText.trim() || busy) return;

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
      await apiRequest(`/entries?id=${entry.id}`, {
        method: 'PATCH',
        token,
        body: {
          category: editCategory,
          title: editTitle.trim(),
          summary: editSummary.trim(),
          description: editText.trim(),
          remind_at: editCategory === 'reminder' ? datetimeLocalToUnix(editRemindAt) : null,
          priority,
          tags,
        },
      });
      navigation.goBack();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SecondBrainEntryPageLayout navigation={navigation} submenuLabel="Edit entry">
      <ScrollView style={styles.editScroll} contentContainerStyle={styles.editScrollContent}>
        <Text style={styles.editLabel}>Category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
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
        <Text style={styles.editLabel}>Description</Text>
        <TextInput value={editText} onChangeText={setEditText} multiline style={styles.editInput} placeholder="Description" placeholderTextColor={theme.colors.textSecondary} />
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
    </SecondBrainEntryPageLayout>
  );
}
