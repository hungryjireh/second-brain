import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, View, Text, TextInput, Pressable, FlatList, ScrollView, Modal, Platform, PanResponder, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../api';
import { theme } from '../theme';
import styles, { SWIPE_ACTION_WIDTH } from './SecondBrainScreen.styles';

const PRIORITY_LEVELS = [
  { key: 'high', label: 'High (8-10)' },
  { key: 'medium', label: 'Medium (4-7)' },
  { key: 'low', label: 'Low (0-3)' },
];

const TAG_STYLES = {
  reminder: { bg: 'rgba(29,158,117,0.15)', color: '#2ecf9a', label: 'Reminder' },
  todo: { bg: 'rgba(55,138,221,0.15)', color: '#6ab4f5', label: 'TODO' },
  thought: { bg: 'rgba(127,119,221,0.15)', color: '#a8a3f0', label: 'Thought' },
  note: { bg: 'rgba(239,159,39,0.15)', color: '#f5bf6a', label: 'Note' },
};

const CATEGORY_ICONS = {
  reminder: '⏰',
  todo: '✅',
  thought: '💡',
  note: '📝',
};

const STATS = [
  { key: 'reminder', label: 'Reminders', color: '#1D9E75', dimColor: 'rgba(29,158,117,0.12)' },
  { key: 'todo', label: 'TODOs', color: '#378ADD', dimColor: 'rgba(55,138,221,0.12)' },
  { key: 'thought', label: 'Thoughts', color: '#7F77DD', dimColor: 'rgba(127,119,221,0.12)' },
  { key: 'note', label: 'Notes', color: '#EF9F27', dimColor: 'rgba(239,159,39,0.12)' },
];

const TYPEBAR_MIN_HEIGHT = 38;
const CATEGORIES = ['reminder', 'todo', 'thought', 'note'];
const MAX_ENTRY_TAGS = 10;
const SWIPE_OPEN_THRESHOLD = 44;

function SwipeToDeleteRow({ id, onOpen, isOpen, actionLabel, onActionPress, children }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const currentOffsetRef = useRef(0);

  const animateTo = useCallback((value, immediate = false) => {
    currentOffsetRef.current = value;
    if (immediate) {
      translateX.setValue(value);
      return;
    }
    Animated.spring(translateX, {
      toValue: value,
      useNativeDriver: true,
      bounciness: 0,
      speed: 20,
    }).start();
  }, [translateX]);

  useEffect(() => {
    animateTo(isOpen ? -SWIPE_ACTION_WIDTH : 0);
  }, [animateTo, isOpen]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const horizontalMove = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
          return horizontalMove && (gestureState.dx < -8 || (isOpen && gestureState.dx > 8));
        },
        onPanResponderMove: (_, gestureState) => {
          const next = Math.max(-SWIPE_ACTION_WIDTH, Math.min(0, currentOffsetRef.current + gestureState.dx));
          translateX.setValue(next);
        },
        onPanResponderRelease: (_, gestureState) => {
          const shouldOpen = gestureState.dx < -SWIPE_OPEN_THRESHOLD || (isOpen && gestureState.dx < SWIPE_OPEN_THRESHOLD);
          if (shouldOpen) onOpen(id);
          else animateTo(0);
        },
        onPanResponderTerminate: () => {
          animateTo(isOpen ? -SWIPE_ACTION_WIDTH : 0);
        },
      }),
    [animateTo, id, isOpen, onOpen, translateX]
  );

  return (
    <View style={styles.swipeRow}>
      <View style={styles.swipeActionWrap}>
        <Pressable testID={`entry-swipe-delete-${id}`} style={styles.swipeDeleteAction} onPress={onActionPress}>
          <Text style={styles.swipeDeleteText}>{actionLabel}</Text>
        </Pressable>
      </View>
      <Animated.View style={[styles.swipeCardWrap, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

function getEntryBody(entry) {
  return entry.raw_text || entry.summary || '';
}

function parseImportedConversationFromEntry(entry) {
  const rawText = String(entry?.raw_text ?? '').trim();
  if (!rawText.startsWith('{')) return null;

  try {
    const parsed = JSON.parse(rawText);
    if (parsed?._format !== 'chat_conversation_v1') return null;
    if (!Array.isArray(parsed.messages) || parsed.messages.length === 0) return null;
    return {
      messages: parsed.messages
        .map(msg => ({
          sender: msg?.sender === 'human' ? 'human' : 'assistant',
          text: String(msg?.text ?? '').trim(),
        }))
        .filter(msg => msg.text),
    };
  } catch {
    return null;
  }
}

function renderInlineMarkdown(text) {
  const source = String(text ?? '');
  const segments = [];
  const pattern = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    if (match.index > lastIndex) segments.push({ key: `text-${match.index}`, type: 'text', text: source.slice(lastIndex, match.index) });
    if (match[2] && match[3]) segments.push({ key: `link-${match.index}`, type: 'link', text: match[2] });
    else if (match[4]) segments.push({ key: `bold-${match.index}`, type: 'bold', text: match[4] });
    else if (match[5]) segments.push({ key: `italic-${match.index}`, type: 'italic', text: match[5] });
    else if (match[6]) segments.push({ key: `code-${match.index}`, type: 'code', text: match[6] });
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < source.length) segments.push({ key: `text-end-${lastIndex}`, type: 'text', text: source.slice(lastIndex) });
  return segments;
}

function MarkdownText({ text, style }) {
  const segments = renderInlineMarkdown(text);
  return (
    <Text style={style}>
      {segments.map(segment => {
        if (segment.type === 'bold') return <Text key={segment.key} style={styles.markdownBold}>{segment.text}</Text>;
        if (segment.type === 'italic') return <Text key={segment.key} style={styles.markdownItalic}>{segment.text}</Text>;
        if (segment.type === 'code') return <Text key={segment.key} style={styles.markdownCode}>{segment.text}</Text>;
        if (segment.type === 'link') return <Text key={segment.key} style={styles.markdownLink}>{segment.text}</Text>;
        return <Text key={segment.key}>{segment.text}</Text>;
      })}
    </Text>
  );
}

function MarkdownBody({ text }) {
  const lines = String(text ?? '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (line.startsWith('```')) {
      const codeLines = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push(
        <View key={`code-${i}`} style={styles.markdownCodeBlock}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.markdownCodeScrollContent}>
            <Text style={styles.markdownCodeBlockText}>{codeLines.join('\n')}</Text>
          </ScrollView>
        </View>
      );
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      blocks.push(<MarkdownText key={`heading-${i}`} text={heading[2]} style={[styles.markdownParagraph, styles.markdownHeading]} />);
      i += 1;
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      const items = [];
      while (i < lines.length) {
        const itemMatch = lines[i].match(/^[-*]\s+(.+)$/);
        if (!itemMatch) break;
        items.push(itemMatch[1]);
        i += 1;
      }
      blocks.push(
        <View key={`ul-${i}`} style={styles.markdownList}>
          {items.map((item, idx) => (
            <View key={`li-${i}-${idx}`} style={styles.markdownListItem}>
              <Text style={styles.markdownListBullet}>•</Text>
              <MarkdownText text={item} style={styles.markdownParagraph} />
            </View>
          ))}
        </View>
      );
      continue;
    }
    const quote = line.match(/^>\s?(.+)$/);
    if (quote) {
      const quoteLines = [];
      while (i < lines.length) {
        const itemMatch = lines[i].match(/^>\s?(.+)$/);
        if (!itemMatch) break;
        quoteLines.push(itemMatch[1]);
        i += 1;
      }
      blocks.push(
        <View key={`quote-${i}`} style={styles.markdownQuote}>
          <MarkdownText text={quoteLines.join('\n')} style={[styles.markdownParagraph, styles.markdownQuoteText]} />
        </View>
      );
      continue;
    }
    blocks.push(<MarkdownText key={`p-${i}`} text={line} style={styles.markdownParagraph} />);
    i += 1;
  }
  return <View style={styles.markdownBody}>{blocks}</View>;
}

function tagsToInput(tags) {
  if (!Array.isArray(tags)) return '';
  return tags.map(tag => String(tag).trim()).filter(Boolean).join(',');
}

function parseTagInput(input) {
  const seen = new Set();
  return String(input || '')
    .split(',')
    .map(part => part.trim().replace(/^#/, '').toLowerCase())
    .filter(tag => {
      if (!tag || seen.has(tag)) return false;
      seen.add(tag);
      return true;
    })
    .slice(0, MAX_ENTRY_TAGS);
}

function normalizeTagValue(input) {
  return String(input || '').trim().replace(/^#/, '').toLowerCase();
}

function getPriorityColor(priority) {
  if (priority >= 8) return '#ef4444';
  if (priority >= 4) return '#f59e0b';
  return theme.colors.textSecondary;
}

function getPriorityLevel(priority) {
  if (priority >= 8) return 'high';
  if (priority >= 4) return 'medium';
  return 'low';
}

function getDateKey(date, timezone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatDate(unixTs, timezone = 'Asia/Singapore') {
  if (!unixTs) return null;
  const d = new Date(unixTs * 1000);
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);
  const dayKey = getDateKey(d, timezone);
  const todayKey = getDateKey(now, timezone);
  const yesterdayKey = getDateKey(yesterday, timezone);
  const time = d.toLocaleTimeString('en-SG', { timeZone: timezone, hour: '2-digit', minute: '2-digit' });

  if (dayKey === todayKey) return `Today · ${time}`;
  if (dayKey === yesterdayKey) return `Yesterday · ${time}`;
  return `${d.toLocaleDateString('en-SG', { timeZone: timezone, month: 'short', day: 'numeric' })} · ${time}`;
}

function formatRemindAt(unixTs, timezone = 'Asia/Singapore') {
  if (!unixTs) return null;
  const d = new Date(unixTs * 1000);
  const now = new Date();
  const dayKey = getDateKey(d, timezone);
  const todayKey = getDateKey(now, timezone);
  const time = d.toLocaleTimeString('en-SG', { timeZone: timezone, hour: '2-digit', minute: '2-digit' });

  if (dayKey === todayKey) return `${time} tonight`;
  return `${d.toLocaleDateString('en-SG', { timeZone: timezone, weekday: 'short', month: 'short', day: 'numeric' })} · ${time}`;
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

function groupByDate(entries) {
  const groups = {};
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = todayStart - 6 * 86400000;

  for (const entry of entries) {
    const ts = (entry.created_at ?? 0) * 1000;
    let group;
    if (ts >= todayStart) group = 'Today';
    else if (ts >= todayStart - 86400000) group = 'Yesterday';
    else if (ts >= weekStart) group = 'Earlier this week';
    else group = 'Older';

    if (!groups[group]) groups[group] = [];
    groups[group].push(entry);
  }

  return groups;
}

function getTimezoneOptions() {
  if (typeof Intl.supportedValuesOf === 'function') {
    return Intl.supportedValuesOf('timeZone');
  }
  return ['Asia/Singapore', 'UTC'];
}

export default function SecondBrainScreen({ token }) {
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editCategory, setEditCategory] = useState('note');
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editText, setEditText] = useState('');
  const [editRemindAt, setEditRemindAt] = useState('');
  const [editPriority, setEditPriority] = useState('0');
  const [editTags, setEditTags] = useState('');
  const [editTagDraft, setEditTagDraft] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [activeCategory, setActiveCategory] = useState('');
  const [activePriorityLevel, setActivePriorityLevel] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [typebarInputHeight, setTypebarInputHeight] = useState(TYPEBAR_MIN_HEIGHT);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [openSwipeId, setOpenSwipeId] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [importingConversations, setImportingConversations] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Singapore');
  const [timezoneDraft, setTimezoneDraft] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Singapore');
  const [timezoneMenuOpen, setTimezoneMenuOpen] = useState(false);
  const [timezoneError, setTimezoneError] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [telegramLinkKey, setTelegramLinkKey] = useState('');
  const [loadingTelegramLinkKey, setLoadingTelegramLinkKey] = useState(false);
  const [telegramLinkError, setTelegramLinkError] = useState('');
  const confirmDeleteTimeoutRef = useRef(null);
  const selectedImportedConversation = useMemo(
    () => (selectedEntry ? parseImportedConversationFromEntry(selectedEntry) : null),
    [selectedEntry]
  );

  const typebarBottom = 10 + Math.max(insets.bottom, 0);
  const listBottomPadding = typebarBottom + typebarInputHeight + 20;

  const loadEntries = useCallback(async () => {
    try {
      setError('');
      const data = await apiRequest('/entries?limit=60', { token });
      const list = Array.isArray(data.entries) ? data.entries : Array.isArray(data) ? data : [];
      setEntries(list);
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await apiRequest('/settings', { token });
        if (data?.timezone) {
          setTimezone(data.timezone);
          setTimezoneDraft(data.timezone);
        }
      } catch (err) {
        setTimezoneError(err.message);
      }
    }
    loadSettings();
  }, [token]);

  useEffect(() => () => {
    if (confirmDeleteTimeoutRef.current) {
      clearTimeout(confirmDeleteTimeoutRef.current);
      confirmDeleteTimeoutRef.current = null;
    }
  }, []);

  async function createEntry() {
    if (!draft.trim()) return;
    try {
      await apiRequest('/entries', { method: 'POST', token, body: { description: draft.trim() } });
      setDraft('');
      setTypebarInputHeight(TYPEBAR_MIN_HEIGHT);
      await loadEntries();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleImportConversationFile(file) {
    if (!file || importingConversations) return;

    setImportingConversations(true);
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const conversations = Array.isArray(parsed) ? parsed : [parsed];
      const response = await apiRequest('/entries', {
        method: 'POST',
        token,
        body: {
          import_format: 'llm_conversations',
          conversations,
        },
      });

      const created = Array.isArray(response?.created) ? response.created : [];
      if (created.length === 0) {
        Alert.alert('Import LLM conversations', 'No valid conversations were found in the uploaded JSON.');
        return;
      }

      setEntries(prev => [...created, ...prev]);
      Alert.alert('Import LLM conversations', `Imported ${created.length} conversation${created.length === 1 ? '' : 's'}.`);
    } catch (err) {
      Alert.alert('Import LLM conversations', `Failed to import JSON: ${err.message}`);
    } finally {
      setImportingConversations(false);
    }
  }

  function handleOpenImportDialog() {
    if (importingConversations) return;

    if (Platform.OS !== 'web') {
      Alert.alert('Import LLM conversations', 'Uploading JSON is currently available on web.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async event => {
      const file = event?.target?.files?.[0];
      if (!file) return;
      await handleImportConversationFile(file);
      input.value = '';
    };
    input.click();
  }

  async function toggleArchive(entry) {
    setBusyId(entry.id);
    try {
      const updated = await apiRequest(`/entries?id=${entry.id}`, {
        method: 'PATCH',
        token,
        body: { is_archived: !entry.is_archived },
      });
      setEntries(prev => prev.map(item => (item.id === entry.id ? updated : item)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function deleteEntry(entryId) {
    setBusyId(entryId);
    try {
      await apiRequest(`/entries?id=${entryId}`, { method: 'DELETE', token });
      setEntries(prev => prev.filter(item => item.id !== entryId));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  function requestDelete(entryId) {
    setOpenSwipeId(entryId);
    if (confirmDeleteId !== entryId) {
      setConfirmDeleteId(entryId);
      if (confirmDeleteTimeoutRef.current) clearTimeout(confirmDeleteTimeoutRef.current);
      confirmDeleteTimeoutRef.current = setTimeout(() => {
        setConfirmDeleteId(null);
        confirmDeleteTimeoutRef.current = null;
      }, 2500);
      return;
    }

    if (confirmDeleteTimeoutRef.current) {
      clearTimeout(confirmDeleteTimeoutRef.current);
      confirmDeleteTimeoutRef.current = null;
    }
    setConfirmDeleteId(null);
    deleteEntry(entryId);
  }

  async function downloadIcs(entryId) {
    try {
      await apiRequest(`/ics?id=${entryId}`, { token });
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(entry) {
    setEditingEntry(entry);
    setEditCategory(entry.category || 'note');
    setEditTitle(entry.title || '');
    setEditSummary(entry.summary || '');
    setEditText(getEntryBody(entry));
    setEditRemindAt(entry.remind_at ? unixToDatetimeLocal(entry.remind_at) : '');
    setEditPriority(String(Number.isInteger(entry.priority) ? entry.priority : 0));
    setEditTags(tagsToInput(entry.tags));
    setEditTagDraft('');
  }

  function closeEdit() {
    setEditingEntry(null);
    setEditCategory('note');
    setEditTitle('');
    setEditSummary('');
    setEditText('');
    setEditRemindAt('');
    setEditPriority('0');
    setEditTags('');
    setEditTagDraft('');
  }

  function openEntry(entry) {
    setSelectedEntry(entry);
  }

  function closeEntry() {
    setSelectedEntry(null);
  }

  function openSettings() {
    setTimezoneDraft(timezone);
    setTimezoneMenuOpen(false);
    setTimezoneError('');
    setTelegramLinkKey('');
    setTelegramLinkError('');
    setSettingsOpen(true);
  }

  function closeSettings() {
    if (savingSettings) return;
    setTimezoneMenuOpen(false);
    setSettingsOpen(false);
  }

  async function saveSettings() {
    if (savingSettings) return;
    const timezoneToSave = String(timezoneDraft || '').trim();
    if (!timezoneToSave) {
      setTimezoneError('Timezone is required.');
      return;
    }
    setSavingSettings(true);
    setTimezoneError('');
    try {
      const updated = await apiRequest('/settings', {
        method: 'PATCH',
        token,
        body: { timezone: timezoneToSave },
      });
      if (updated?.timezone) {
        setTimezone(updated.timezone);
        setTimezoneDraft(updated.timezone);
      }
      setSettingsOpen(false);
    } catch (err) {
      setTimezoneError(err.message);
    } finally {
      setSavingSettings(false);
    }
  }

  async function generateTelegramLinkKey() {
    if (loadingTelegramLinkKey) return;
    setLoadingTelegramLinkKey(true);
    setTelegramLinkError('');
    try {
      const data = await apiRequest('/telegram/link-key', { token });
      setTelegramLinkKey(data?.key || '');
    } catch (err) {
      setTelegramLinkError(err.message);
    } finally {
      setLoadingTelegramLinkKey(false);
    }
  }

  function addEditTag() {
    const nextTag = normalizeTagValue(editTagDraft);
    if (!nextTag) return;
    const merged = parseTagInput([...parseTagInput(editTags), nextTag].join(','));
    setEditTags(merged.join(','));
    setEditTagDraft('');
  }

  function removeEditTag(tagToRemove) {
    setEditTags(parseTagInput(editTags).filter(tag => tag !== tagToRemove).join(','));
  }

  async function saveEdit() {
    if (!editingEntry || !editText.trim()) return;
    const priority = Number(editPriority);
    if (!Number.isInteger(priority) || priority < 0 || priority > 10) {
      setError('Priority must be an integer from 0 to 10.');
      return;
    }
    setBusyId(editingEntry.id);
    try {
      const updated = await apiRequest(`/entries?id=${editingEntry.id}`, {
        method: 'PATCH',
        token,
        body: {
          category: editCategory,
          title: editTitle.trim(),
          summary: editSummary.trim(),
          description: editText.trim(),
          remind_at: editCategory === 'reminder' ? datetimeLocalToUnix(editRemindAt) : null,
          priority,
          tags: parseTagInput(editTags),
        },
      });
      setEntries(prev => prev.map(item => (item.id === editingEntry.id ? updated : item)));
      closeEdit();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const counts = useMemo(() => {
    const base = { reminder: 0, todo: 0, thought: 0, note: 0 };
    for (const entry of entries) {
      if (entry.is_archived) continue;
      const key = entry.category;
      if (Object.prototype.hasOwnProperty.call(base, key)) base[key] += 1;
    }
    return base;
  }, [entries]);

  const visibleEntries = useMemo(() => {
    let list = entries.filter(entry => (showArchived ? Boolean(entry.is_archived) : !entry.is_archived));
    if (activeCategory) list = list.filter(entry => entry.category === activeCategory);
    if (activePriorityLevel) {
      list = list.filter(entry => getPriorityLevel(entry.priority ?? 0) === activePriorityLevel);
    }
    if (activeTag) {
      const selectedTag = activeTag.toLowerCase();
      list = list.filter(entry =>
        Array.isArray(entry.tags) && entry.tags.some(tag => String(tag).toLowerCase() === selectedTag)
      );
    }
    return list;
  }, [entries, showArchived, activeCategory, activePriorityLevel, activeTag]);

  const availableTags = useMemo(() => {
    const unique = new Set();
    for (const entry of entries) {
      if (!Array.isArray(entry.tags)) continue;
      for (const tag of entry.tags) {
        const value = String(tag).trim();
        if (value) unique.add(value);
      }
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const groupedEntries = useMemo(() => groupByDate(visibleEntries), [visibleEntries]);
  const timezoneOptions = useMemo(() => {
    const options = getTimezoneOptions();
    return options.includes(timezoneDraft) ? options : [timezoneDraft, ...options];
  }, [timezoneDraft]);
  const groupedRows = useMemo(() => {
    const groupOrder = ['Today', 'Yesterday', 'Earlier this week', 'Older'];
    const rows = [];
    for (const group of groupOrder) {
      const items = groupedEntries[group];
      if (!items || items.length === 0) continue;
      rows.push({ type: 'header', key: `header-${group}`, group, count: items.length });
      for (const entry of items) {
        rows.push({ type: 'entry', key: `entry-${entry.id}`, entry });
      }
    }
    return rows;
  }, [groupedEntries]);

  return (
    <View style={styles.container}>
      <View style={styles.statsGrid}>
        {STATS.map(stat => {
          const isActive = activeCategory === stat.key;
          return (
            <Pressable
              key={stat.key}
              style={[styles.statCard, isActive && styles.statCardActive]}
              onPress={() => setActiveCategory(prev => (prev === stat.key ? '' : stat.key))}
            >
              <View style={[styles.statGlow, { backgroundColor: stat.dimColor }]} />
              <Text style={[styles.statCount, { color: isActive ? theme.colors.brandText : stat.color }]}>
                {counts[stat.key] ?? 0}
              </Text>
              <Text style={[styles.statLabel, isActive && styles.statLabelActive]}>{stat.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.filterSection}>
        <View style={styles.filterHeaderRow}>
          <Text style={styles.filterLabel}>FILTER</Text>
          <View style={styles.archivedToggle}>
            <Text style={styles.archivedToggleText}>Show Archived/Done</Text>
            <Switch
              value={showArchived}
              onValueChange={setShowArchived}
              trackColor={{ false: theme.colors.border, true: theme.colors.brand }}
              thumbColor={theme.colors.bg}
              ios_backgroundColor={theme.colors.border}
            />
          </View>
        </View>

        <View style={styles.filterRow}>
          <Text style={styles.filterRowLabel}>PRIORITY</Text>
          {PRIORITY_LEVELS.map(level => {
            const isActive = activePriorityLevel === level.key;
            return (
              <Pressable
                key={level.key}
                style={[styles.pill, isActive && styles.pillActive]}
                onPress={() => setActivePriorityLevel(prev => (prev === level.key ? '' : level.key))}
              >
                <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{level.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.filterRow}>
          <Text style={styles.filterRowLabel}>{`TAGS (${availableTags.length}/10)`}</Text>
          {availableTags.map(tag => {
            const isActive = activeTag.toLowerCase() === tag.toLowerCase();
            return (
              <Pressable
                key={tag}
                style={[styles.pill, isActive && styles.pillActive]}
                onPress={() => setActiveTag(prev => (prev.toLowerCase() === tag.toLowerCase() ? '' : tag))}
              >
                <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{`#${tag}`}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Modal
        visible={!!editingEntry}
        transparent
        animationType="fade"
        onRequestClose={closeEdit}
      >
        <Pressable style={styles.editOverlay} onPress={closeEdit}>
          <Pressable style={styles.editPanel} onPress={event => event.stopPropagation()}>
            <ScrollView style={styles.editScroll} contentContainerStyle={styles.editScrollContent}>
              <Text style={styles.editTitle}>Edit entry</Text>
              <Text style={styles.editLabel}>Category</Text>
              <View style={styles.categoryRow}>
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
              </View>
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
                  onChangeText={setEditTagDraft}
                  style={[styles.editField, styles.tagInput]}
                  placeholder={parseTagInput(editTags).length >= MAX_ENTRY_TAGS ? `Maximum ${MAX_ENTRY_TAGS} tags reached` : 'Type a tag'}
                  placeholderTextColor={theme.colors.textSecondary}
                  editable={parseTagInput(editTags).length < MAX_ENTRY_TAGS}
                />
                <Pressable style={styles.secondaryButton} onPress={addEditTag}>
                  <Text style={styles.secondaryButtonText}>Add</Text>
                </Pressable>
              </View>
              <Text style={styles.tagCountText}>{`${parseTagInput(editTags).length}/${MAX_ENTRY_TAGS} tags`}</Text>
              <View style={styles.tagsRow}>
                {parseTagInput(editTags).map(tag => (
                  <Pressable key={tag} style={styles.itemTagPill} onPress={() => removeEditTag(tag)}>
                    <Text style={styles.itemTagText}>{`#${tag} ×`}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.editActionRow}>
                <Pressable style={styles.secondaryButton} onPress={closeEdit}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.editSaveButton} onPress={saveEdit}>
                  <Text style={styles.buttonText}>Save changes</Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={settingsOpen}
        transparent
        animationType="fade"
        onRequestClose={closeSettings}
      >
        <Pressable style={styles.editOverlay} onPress={closeSettings}>
          <Pressable style={styles.settingsPanel} onPress={event => event.stopPropagation()}>
            <ScrollView style={styles.settingsScroll} contentContainerStyle={styles.settingsScrollContent}>
              <Text style={styles.settingsTitle}>Settings</Text>
              <Text style={styles.settingsLabel}>Timezone</Text>
              <Pressable
                style={styles.settingsDropdown}
                onPress={() => setTimezoneMenuOpen(prev => !prev)}
              >
                <Text style={styles.settingsDropdownText}>{timezoneDraft || 'Select timezone'}</Text>
                <Text style={styles.settingsDropdownChevron}>{timezoneMenuOpen ? '▲' : '▼'}</Text>
              </Pressable>
              {timezoneMenuOpen ? (
                <ScrollView
                  style={styles.settingsDropdownList}
                  showsVerticalScrollIndicator
                  contentContainerStyle={styles.settingsDropdownListContent}
                >
                  {timezoneOptions.map(option => {
                    const isSelected = option === timezoneDraft;
                    return (
                      <Pressable
                        key={option}
                        style={[styles.settingsDropdownOption, isSelected && styles.settingsDropdownOptionSelected]}
                        onPress={() => {
                          setTimezoneDraft(option);
                          setTimezoneMenuOpen(false);
                          setTimezoneError('');
                        }}
                      >
                        <Text style={[styles.settingsDropdownOptionText, isSelected && styles.settingsDropdownOptionTextSelected]}>
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : null}
              {!!timezoneError && <Text style={styles.error}>{timezoneError}</Text>}
              <View style={styles.settingsCard}>
                <Text style={styles.settingsCardLabel}>Telegram account linking</Text>
                <Pressable
                  style={[styles.settingsActionButton, loadingTelegramLinkKey && styles.typebarButtonDisabled]}
                  onPress={generateTelegramLinkKey}
                  disabled={loadingTelegramLinkKey}
                >
                  <Text style={styles.settingsActionButtonText}>
                    {loadingTelegramLinkKey ? 'Generating…' : 'Generate Telegram link key'}
                  </Text>
                </Pressable>
                {!!telegramLinkKey && (
                  <>
                    <Text style={styles.settingsKeyText}>{telegramLinkKey}</Text>
                    <Text style={styles.settingsHintText}>Send this in Telegram: /link &lt;your-key&gt;. This key expires in 10 minutes.</Text>
                  </>
                )}
                {!!telegramLinkError && <Text style={styles.error}>{telegramLinkError}</Text>}
              </View>
              <View style={styles.settingsCard}>
                <Text style={styles.settingsCardLabel}>Imports</Text>
                <Pressable
                  style={[styles.settingsActionButton, importingConversations && styles.typebarButtonDisabled]}
                  onPress={handleOpenImportDialog}
                  disabled={importingConversations}
                >
                  <Text style={styles.settingsActionButtonText}>
                    {importingConversations ? 'Importing…' : 'Import LLM conversations'}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.settingsActionsRow}>
                <Pressable style={styles.settingsSecondaryButton} onPress={closeSettings} disabled={savingSettings}>
                  <Text style={styles.settingsSecondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.editSaveButton, savingSettings && styles.typebarButtonDisabled]} onPress={saveSettings} disabled={savingSettings}>
                  <Text style={styles.buttonText}>{savingSettings ? 'Saving…' : 'Save'}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <FlatList
        data={groupedRows}
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPadding }]}
        keyExtractor={item => item.key}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return <Text style={styles.sectionHeaderText}>{`${item.group} · ${item.count}`}</Text>;
          }

          const entry = item.entry;
          if (!entry) return null;
          const isBusy = busyId === entry.id;
          const tag = TAG_STYLES[entry.category] ?? TAG_STYLES.note;
          const icon = CATEGORY_ICONS[entry.category] ?? '📝';
          const priority = Number.isInteger(entry.priority) ? entry.priority : 0;
          const archiveLabel = entry.category === 'reminder'
            ? (entry.is_archived ? 'Undo Done' : 'Mark Done')
            : (entry.is_archived ? 'Unarchive' : 'Archive');
          const isWeb = Platform.OS === 'web';
          const cardContent = (
            <Pressable
              style={styles.card}
              onPress={() => {
                if (!isWeb && openSwipeId === entry.id) {
                  setOpenSwipeId(null);
                  return;
                }
                openEntry(entry);
              }}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.cardMainCol}>
                  <View style={styles.cardMetaRow}>
                    <Text style={styles.cardIcon}>{icon}</Text>
                    <Text style={[styles.priorityText, { color: getPriorityColor(priority) }]}>P{priority}</Text>
                    <Text style={styles.cardTitle}>{entry.title || 'Untitled'}</Text>
                  </View>
                  <Text style={styles.cardBody}>{entry.summary || getEntryBody(entry)}</Text>
                </View>
                <View style={styles.cardActionCol}>
                  <View style={styles.cardActionRow}>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={event => {
                        event.stopPropagation();
                        startEdit(entry);
                      }}
                      disabled={isBusy}
                    >
                      <Text style={styles.secondaryButtonText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={event => {
                        event.stopPropagation();
                        toggleArchive(entry);
                      }}
                      disabled={isBusy}
                    >
                      <Text style={styles.secondaryButtonText}>{archiveLabel}</Text>
                    </Pressable>
                    {entry.category === 'reminder' && entry.remind_at ? (
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={event => {
                          event.stopPropagation();
                          downloadIcs(entry.id);
                        }}
                        disabled={isBusy}
                      >
                        <Text style={styles.secondaryButtonText}>.ics</Text>
                      </Pressable>
                    ) : null}
                    <View style={[styles.tagPill, { backgroundColor: tag.bg }]}>
                      <Text style={[styles.tagPillText, { color: tag.color }]}>{tag.label}</Text>
                    </View>
                    {isWeb ? (
                      <Pressable
                        style={[styles.deleteButton, confirmDeleteId === entry.id && styles.deleteButtonConfirm]}
                        onPress={event => {
                          event.stopPropagation();
                          requestDelete(entry.id);
                        }}
                        disabled={isBusy}
                      >
                        <Text style={[styles.deleteText, confirmDeleteId === entry.id && styles.deleteTextConfirm]}>
                          {isBusy ? '...' : (confirmDeleteId === entry.id ? '!' : '×')}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </View>

              <View style={styles.metaInfoRow}>
                {entry.remind_at ? (
                  <>
                    <View style={styles.reminderMetaPill}>
                      <Text style={styles.reminderMetaText}>⏰ {formatRemindAt(entry.remind_at, timezone)}</Text>
                    </View>
                    <Text style={styles.metaDot}>•</Text>
                  </>
                ) : null}
                <Text style={styles.metaText}>{formatDate(entry.created_at, timezone) || ''}</Text>
              </View>

              {Array.isArray(entry.tags) && entry.tags.length > 0 ? (
                <View style={styles.tagsRow}>
                  {entry.tags.map(tagName => (
                    <View key={tagName} style={styles.itemTagPill}>
                      <Text style={styles.itemTagText}>#{tagName}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </Pressable>
          );
          if (isWeb) return cardContent;
          return (
            <SwipeToDeleteRow
              id={entry.id}
              isOpen={openSwipeId === entry.id}
              onOpen={setOpenSwipeId}
              actionLabel={isBusy ? '...' : (confirmDeleteId === entry.id ? 'Confirm' : 'Delete')}
              onActionPress={() => requestDelete(entry.id)}
            >
              {cardContent}
            </SwipeToDeleteRow>
          );
        }}
      />

      {selectedEntry ? (
        <Pressable style={styles.entryOverlay} onPress={closeEntry}>
          <Pressable style={styles.entryPanel} onPress={event => event.stopPropagation()}>
            <Text style={styles.entryPanelTitle}>{selectedEntry.title || selectedEntry.content || 'Untitled'}</Text>
            <Text style={styles.entryPanelSummary}>{selectedEntry.summary || selectedEntry.content || ''}</Text>
            {Array.isArray(selectedEntry.tags) && selectedEntry.tags.length > 0 ? (
              <View style={styles.entryPanelTags}>
                {selectedEntry.tags.map(tagName => (
                  <View key={tagName} style={styles.itemTagPill}>
                    <Text style={styles.itemTagText}>#{tagName}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            <View style={styles.entryPanelBodyWrap}>
              <ScrollView style={styles.entryPanelBodyScroll} contentContainerStyle={styles.entryPanelBodyContent}>
              {selectedImportedConversation ? (
                <View style={styles.conversationWrap}>
                  {selectedImportedConversation.messages.map((msg, idx) => {
                    const fromHuman = msg.sender === 'human';
                    return (
                      <View key={`${msg.sender}-${idx}`} style={[styles.conversationRow, fromHuman ? styles.conversationRowHuman : styles.conversationRowAssistant]}>
                        <View style={[styles.conversationBubble, fromHuman ? styles.conversationBubbleHuman : styles.conversationBubbleAssistant]}>
                          <Text style={styles.conversationSender}>{fromHuman ? 'You' : 'Assistant'}</Text>
                          <MarkdownBody text={msg.text} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <MarkdownBody text={selectedEntry.description || selectedEntry.raw_text || selectedEntry.content || ''} />
              )}
              </ScrollView>
            </View>
            <View style={styles.entryPanelActions}>
              <Pressable style={styles.secondaryButton} onPress={closeEntry}>
                <Text style={styles.secondaryButtonText}>Close</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      ) : null}

      <View style={[styles.typebarRow, { bottom: typebarBottom }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a note, reminder or thought..."
          placeholderTextColor={theme.colors.textSecondary}
          style={[styles.typebarInput, { height: typebarInputHeight }]}
          multiline
          scrollEnabled={false}
          textAlignVertical="top"
          onContentSizeChange={event => {
            const contentHeight = event?.nativeEvent?.contentSize?.height ?? TYPEBAR_MIN_HEIGHT;
            const nextHeight = Math.max(TYPEBAR_MIN_HEIGHT, Math.ceil(contentHeight));
            setTypebarInputHeight(prev => (prev === nextHeight ? prev : nextHeight));
          }}
        />
        <Pressable
          style={[styles.typebarButton, !draft.trim() && styles.typebarButtonDisabled]}
          onPress={createEntry}
          disabled={!draft.trim()}
        >
          <Text style={[styles.typebarButtonText, !draft.trim() && styles.typebarButtonTextDisabled]}>↗</Text>
        </Pressable>
        <Pressable
          style={[styles.typebarButton, styles.typebarUploadButton]}
          onPress={openSettings}
          accessibilityLabel="Open settings"
        >
          <Text style={[styles.typebarButtonText, styles.typebarUploadButtonText]}>
            ⚙
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
