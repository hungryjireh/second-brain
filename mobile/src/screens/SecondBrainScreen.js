import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../api';
import { theme } from '../theme';

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
  const [selectedEntry, setSelectedEntry] = useState(null);
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
    setEditRemindAt(entry.remind_at ? String(entry.remind_at) : '');
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
          remind_at: editCategory === 'reminder' ? (editRemindAt ? Number(editRemindAt) : null) : null,
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
          <Pressable style={styles.archivedToggle} onPress={() => setShowArchived(prev => !prev)}>
            <View style={[styles.checkbox, showArchived && styles.checkboxChecked]}>
              {showArchived ? <Text style={styles.checkboxMark}>✓</Text> : null}
            </View>
            <Text style={styles.archivedToggleText}>Show Archived/Done</Text>
          </Pressable>
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

      {editingEntry ? (
        <View style={styles.editPanel}>
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
              <Text style={styles.editLabel}>Reminder time (unix seconds)</Text>
              <TextInput value={editRemindAt} onChangeText={setEditRemindAt} style={styles.editField} keyboardType="numeric" placeholder="e.g. 1760000000" placeholderTextColor={theme.colors.textSecondary} />
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
          <View style={styles.tagsRow}>
            {parseTagInput(editTags).map(tag => (
              <Pressable key={tag} style={styles.itemTagPill} onPress={() => removeEditTag(tag)}>
                <Text style={styles.itemTagText}>{`#${tag} ×`}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.row}>
            <Pressable style={styles.secondaryButton} onPress={closeEdit}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={saveEdit}>
              <Text style={styles.buttonText}>Save changes</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <FlatList
        data={visibleEntries}
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPadding }]}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => {
          const isBusy = busyId === item.id;
          const tag = TAG_STYLES[item.category] ?? TAG_STYLES.note;
          const icon = CATEGORY_ICONS[item.category] ?? '📝';
          const priority = Number.isInteger(item.priority) ? item.priority : 0;
          const archiveLabel = item.category === 'reminder'
            ? (item.is_archived ? 'Undo Done' : 'Mark Done')
            : (item.is_archived ? 'Unarchive' : 'Archive');
          return (
            <Pressable style={styles.card} onPress={() => openEntry(item)}>
              <View style={styles.cardTopRow}>
                <View style={styles.cardMainCol}>
                  <View style={styles.cardMetaRow}>
                    <Text style={styles.cardIcon}>{icon}</Text>
                    <Text style={[styles.priorityText, { color: getPriorityColor(priority) }]}>P{priority}</Text>
                    <Text style={styles.cardTitle}>{item.title || 'Untitled'}</Text>
                  </View>
                  <Text style={styles.cardBody}>{item.summary || getEntryBody(item)}</Text>
                </View>
                <View style={styles.cardActionCol}>
                  <View style={styles.cardActionRow}>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={event => {
                        event.stopPropagation();
                        startEdit(item);
                      }}
                      disabled={isBusy}
                    >
                      <Text style={styles.secondaryButtonText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={event => {
                        event.stopPropagation();
                        toggleArchive(item);
                      }}
                      disabled={isBusy}
                    >
                      <Text style={styles.secondaryButtonText}>{archiveLabel}</Text>
                    </Pressable>
                    {item.category === 'reminder' && item.remind_at ? (
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={event => {
                          event.stopPropagation();
                          downloadIcs(item.id);
                        }}
                        disabled={isBusy}
                      >
                        <Text style={styles.secondaryButtonText}>.ics</Text>
                      </Pressable>
                    ) : null}
                    <View style={[styles.tagPill, { backgroundColor: tag.bg }]}>
                      <Text style={[styles.tagPillText, { color: tag.color }]}>{tag.label}</Text>
                    </View>
                    <Pressable
                      style={[styles.deleteButton, confirmDeleteId === item.id && styles.deleteButtonConfirm]}
                      onPress={event => {
                        event.stopPropagation();
                        requestDelete(item.id);
                      }}
                      disabled={isBusy}
                    >
                      <Text style={[styles.deleteText, confirmDeleteId === item.id && styles.deleteTextConfirm]}>
                        {isBusy ? '...' : (confirmDeleteId === item.id ? '!' : '×')}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              <View style={styles.metaInfoRow}>
                {item.remind_at ? (
                  <>
                    <View style={styles.reminderMetaPill}>
                      <Text style={styles.reminderMetaText}>⏰ {formatRemindAt(item.remind_at)}</Text>
                    </View>
                    <Text style={styles.metaDot}>•</Text>
                  </>
                ) : null}
                <Text style={styles.metaText}>{formatDate(item.created_at) || ''}</Text>
              </View>

              {Array.isArray(item.tags) && item.tags.length > 0 ? (
                <View style={styles.tagsRow}>
                  {item.tags.map(tagName => (
                    <View key={tagName} style={styles.itemTagPill}>
                      <Text style={styles.itemTagText}>#{tagName}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </Pressable>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgBase,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 0,
  },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  filterSection: { gap: 8, marginBottom: 10 },
  filterHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  filterLabel: { fontSize: 11, color: theme.colors.textMuted, letterSpacing: 0.66, textTransform: 'uppercase', fontWeight: '500' },
  archivedToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkbox: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bgSurface,
  },
  checkboxChecked: { borderColor: theme.colors.brand, backgroundColor: theme.colors.brandDim },
  checkboxMark: { color: theme.colors.brandText, fontSize: 10, lineHeight: 10, fontWeight: '700' },
  archivedToggleText: { color: theme.colors.textSecondary, fontSize: 11 },
  filterRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  filterRowLabel: { fontSize: 11, color: theme.colors.textMuted, letterSpacing: 0.66, textTransform: 'uppercase', fontWeight: '500' },
  pill: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bgSurface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillActive: { borderColor: theme.colors.brand, backgroundColor: theme.colors.brandDim },
  pillText: { fontSize: 11, color: theme.colors.textSecondary },
  pillTextActive: { color: theme.colors.brandText },
  statCard: {
    width: '23.7%',
    minWidth: 70,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bgSurface,
    paddingVertical: 8,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  statCardActive: { borderColor: theme.colors.brand, backgroundColor: theme.colors.brandDim },
  statGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    width: 40,
    height: 40,
    borderRadius: 999,
  },
  statCount: { fontSize: 20, lineHeight: 22, fontWeight: '500' },
  statLabel: {
    fontSize: 9,
    lineHeight: 12,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  statLabelActive: { color: theme.colors.brandText },
  list: { flex: 1 },
  listContent: { paddingBottom: 84 },
  typebarRow: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 10,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  typebarInput: {
    flex: 1,
    backgroundColor: theme.colors.bgRaised,
    color: theme.colors.textPrimary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 38,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 13,
    lineHeight: 19,
  },
  typebarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typebarButtonDisabled: {
    backgroundColor: theme.colors.bgRaised,
  },
  typebarButtonText: { color: '#fff', fontWeight: '700', fontSize: 16, lineHeight: 16 },
  typebarButtonTextDisabled: { color: theme.colors.textMuted },
  button: {
    backgroundColor: theme.colors.brand,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 8,
    marginBottom: 10,
    minHeight: 36,
    flex: 1,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  secondaryButton: {
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 5,
    minHeight: 24,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  secondaryButtonText: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '500' },
  deleteButton: {
    borderColor: 'transparent',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 5,
    minHeight: 24,
    justifyContent: 'center',
  },
  deleteButtonConfirm: {
    backgroundColor: 'rgba(220,60,60,0.15)',
    borderColor: 'rgba(220,60,60,0.3)',
  },
  deleteText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '500' },
  deleteTextConfirm: { color: theme.colors.danger },
  card: {
    backgroundColor: theme.colors.bgSurface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  entryOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(6, 10, 12, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 50,
  },
  entryPanel: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '88%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.bgSurface,
    padding: 16,
    gap: 10,
  },
  entryPanelTitle: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 16, flexShrink: 1 },
  entryPanelSummary: { color: theme.colors.textSecondary, fontSize: 12, flexShrink: 1 },
  entryPanelTags: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  entryPanelBodyWrap: {
    flexShrink: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    backgroundColor: theme.colors.bgRaised,
    maxHeight: '100%',
    overflow: 'hidden',
  },
  entryPanelBodyScroll: {
    maxHeight: '100%',
  },
  entryPanelBodyContent: {
    padding: 12,
  },
  markdownBody: { gap: 8 },
  markdownParagraph: { color: theme.colors.textPrimary, fontSize: 13, lineHeight: 20, flexShrink: 1 },
  markdownHeading: { fontWeight: '700' },
  markdownBold: { color: theme.colors.textPrimary, fontWeight: '700' },
  markdownItalic: { color: theme.colors.textPrimary, fontStyle: 'italic' },
  markdownCode: { color: theme.colors.textPrimary, backgroundColor: 'rgba(255,255,255,0.07)' },
  markdownLink: { color: '#86b7ff', textDecorationLine: 'underline' },
  markdownCodeBlock: { borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.25)', padding: 10, minWidth: 0 },
  markdownCodeScrollContent: { minWidth: '100%' },
  markdownCodeBlockText: { color: theme.colors.textPrimary, fontSize: 12, lineHeight: 18, fontFamily: 'Courier', flexShrink: 1 },
  markdownList: { gap: 4 },
  markdownListItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  markdownListBullet: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 20, minWidth: 14 },
  markdownQuote: { borderLeftWidth: 2, borderLeftColor: theme.colors.border, paddingLeft: 10 },
  markdownQuoteText: { color: theme.colors.textSecondary },
  conversationWrap: { gap: 10, minWidth: 0 },
  conversationRow: { width: '100%' },
  conversationRowHuman: { alignItems: 'flex-end' },
  conversationRowAssistant: { alignItems: 'flex-start' },
  conversationBubble: { maxWidth: '92%', minWidth: 0, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1 },
  conversationBubbleHuman: { backgroundColor: 'rgba(29,158,117,0.18)', borderColor: 'rgba(29,158,117,0.38)' },
  conversationBubbleAssistant: { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: theme.colors.border },
  conversationSender: { color: theme.colors.textMuted, fontSize: 10, lineHeight: 12, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 },
  entryPanelActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  cardTopRow: { flexDirection: 'row', gap: 10 },
  cardMainCol: { flex: 1, minWidth: 0 },
  cardActionCol: { alignItems: 'flex-end', gap: 8, flexShrink: 0 },
  cardActionRow: { flexDirection: 'row', gap: 6, flexWrap: 'nowrap', justifyContent: 'flex-end' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 2 },
  cardIcon: { fontSize: 15, lineHeight: 15, marginTop: 1 },
  priorityText: { fontSize: 12, lineHeight: 12, fontWeight: '700', marginTop: 1 },
  tagPill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 8 },
  tagPillText: { fontSize: 11, lineHeight: 14, fontWeight: '500' },
  cardTitle: { flexShrink: 1, color: theme.colors.textPrimary, fontWeight: '700', fontSize: 14, lineHeight: 19 },
  cardBody: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 20 },
  metaInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    marginBottom: 6,
  },
  reminderMetaPill: {
    backgroundColor: theme.colors.brandDim,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  reminderMetaText: { color: theme.colors.brandText, fontSize: 11, lineHeight: 14 },
  metaDot: { color: theme.colors.textMuted, fontSize: 11 },
  metaText: { color: theme.colors.textMuted, fontSize: 11 },
  tagsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  itemTagPill: {
    backgroundColor: theme.colors.brandDim,
    borderRadius: 999,
    borderColor: theme.colors.border,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  itemTagText: { color: theme.colors.brandText, fontSize: 11, lineHeight: 14 },
  error: {
    color: '#f87171',
    marginVertical: 6,
    backgroundColor: 'rgba(220,60,60,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(220,60,60,0.25)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  editPanel: {
    backgroundColor: theme.colors.bgSurface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  editTitle: { color: theme.colors.textPrimary, fontWeight: '600', fontSize: 14, marginBottom: 8 },
  editLabel: { color: theme.colors.textMuted, fontSize: 11, marginBottom: 4 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  editField: {
    backgroundColor: theme.colors.bgRaised,
    color: theme.colors.textPrimary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    fontSize: 13,
  },
  editInputCompact: {
    backgroundColor: theme.colors.bgRaised,
    color: theme.colors.textPrimary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 60,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    fontSize: 13,
    lineHeight: 19,
  },
  editInput: {
    backgroundColor: theme.colors.bgRaised,
    color: theme.colors.textPrimary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 90,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    fontSize: 13,
    lineHeight: 19,
  },
  tagInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tagInput: { flex: 1, marginBottom: 0 },
});
