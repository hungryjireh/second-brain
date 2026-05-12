import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Sidebar from './components/Sidebar.jsx';
import StatsBar from './components/StatsBar.jsx';
import EntryCard from './components/EntryCard.jsx';
import {
  CATEGORIES,
  GLOBALLY_PERMISSIVE_TAGS_NORMALIZED,
  MAX_ENTRY_TAGS,
  MAX_USER_TAGS,
} from './constants/tags.js';

const API = import.meta.env.VITE_API_URL || '/api';
const PRIORITY_LEVELS = [
  { key: 'high', label: 'High (8-10)' },
  { key: 'medium', label: 'Medium (4-7)' },
  { key: 'low', label: 'Low (0-3)' },
];

function renderInlineMarkdown(text, keyPrefix = 'inline') {
  const source = String(text ?? '');
  const out = [];
  const pattern = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    if (match.index > lastIndex) out.push(source.slice(lastIndex, match.index));
    if (match[2] && match[3]) {
      out.push(
        <a key={`${keyPrefix}-link-${match.index}`} href={match[3]} target="_blank" rel="noreferrer">
          {match[2]}
        </a>
      );
    } else if (match[4]) {
      out.push(<strong key={`${keyPrefix}-strong-${match.index}`}>{match[4]}</strong>);
    } else if (match[5]) {
      out.push(<em key={`${keyPrefix}-em-${match.index}`}>{match[5]}</em>);
    } else if (match[6]) {
      out.push(
        <code key={`${keyPrefix}-code-${match.index}`} style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 4px', borderRadius: 4 }}>
          {match[6]}
        </code>
      );
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < source.length) out.push(source.slice(lastIndex));
  return out;
}

function parseMarkdownTableRow(line) {
  const trimmed = String(line ?? '').trim();
  if (!trimmed.includes('|')) return null;
  const normalized = trimmed.replace(/^\|/, '').replace(/\|$/, '');
  const cells = normalized.split('|').map(cell => cell.trim());
  return cells.length > 0 ? cells : null;
}

function isMarkdownTableSeparator(line, expectedCols) {
  const cells = parseMarkdownTableRow(line);
  if (!cells || cells.length !== expectedCols) return false;
  return cells.every(cell => /^:?-{3,}:?$/.test(cell));
}

function renderMarkdownContent(markdown) {
  const textStyles = {
    paragraph: { margin: '0 0 14px', whiteSpace: 'pre-wrap', lineHeight: 1.85 },
    headingBase: { margin: '16px 0 8px', lineHeight: 1.3, letterSpacing: '-0.01em' },
    list: { margin: '0 0 14px', paddingLeft: 24, lineHeight: 1.8 },
    listItem: { margin: '0 0 6px' },
    quote: {
      margin: '0 0 14px',
      padding: '4px 0 4px 12px',
      borderLeft: '2px solid var(--border)',
      color: 'var(--text-secondary)',
      lineHeight: 1.8,
    },
  };
  const lines = String(markdown ?? '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (line.startsWith('```')) {
      const fence = line.slice(3).trim();
      const codeLines = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push(
        <pre key={`code-${i}`} style={{ margin: '8px 0', padding: 10, borderRadius: 8, overflowX: 'auto', background: 'rgba(0,0,0,0.25)' }}>
          <code>{codeLines.join('\n')}{fence ? '\n' : ''}</code>
        </pre>
      );
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2];
      const HeadingTag = `h${level}`;
      blocks.push(
        <HeadingTag key={`heading-${i}`} style={{ ...textStyles.headingBase, fontSize: `${Math.max(20 - level * 2, 13)}px` }}>
          {renderInlineMarkdown(text, `h-${i}`)}
        </HeadingTag>
      );
      i += 1;
      continue;
    }
    const tableHeader = parseMarkdownTableRow(line);
    if (
      tableHeader &&
      i + 1 < lines.length &&
      isMarkdownTableSeparator(lines[i + 1], tableHeader.length)
    ) {
      const rows = [];
      i += 2;
      while (i < lines.length) {
        const row = parseMarkdownTableRow(lines[i]);
        if (!row) break;
        if (row.length !== tableHeader.length) break;
        rows.push(row);
        i += 1;
      }
      blocks.push(
        <div key={`table-${i}`} style={{ margin: '10px 0', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {tableHeader.map((cell, idx) => (
                  <th
                    key={`th-${i}-${idx}`}
                    style={{
                      border: '0.5px solid var(--border)',
                      padding: '6px 8px',
                      textAlign: 'left',
                      background: 'rgba(255,255,255,0.03)',
                    }}
                  >
                    {renderInlineMarkdown(cell, `th-${i}-${idx}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr key={`tr-${i}-${rowIdx}`}>
                  {row.map((cell, cellIdx) => (
                    <td
                      key={`td-${i}-${rowIdx}-${cellIdx}`}
                      style={{ border: '0.5px solid var(--border)', padding: '6px 8px', verticalAlign: 'top' }}
                    >
                      {renderInlineMarkdown(cell, `td-${i}-${rowIdx}-${cellIdx}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      blocks.push(<hr key={`hr-${i}`} style={{ border: 0, borderTop: '0.5px solid var(--border)', margin: '10px 0' }} />);
      i += 1;
      continue;
    }
    const bullet = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (bullet) {
      const items = [];
      while (i < lines.length) {
        const itemMatch = lines[i].match(/^(\s*)[-*]\s+(.+)$/);
        if (!itemMatch) break;
        items.push(itemMatch[2]);
        i += 1;
      }
      blocks.push(
        <ul key={`ul-${i}`} style={textStyles.list}>
          {items.map((item, idx) => (
            <li key={`li-${i}-${idx}`} style={textStyles.listItem}>
              {renderInlineMarkdown(item, `li-${i}-${idx}`)}
            </li>
          ))}
        </ul>
      );
      continue;
    }
    const numbered = line.match(/^\d+\.\s+(.+)$/);
    if (numbered) {
      const items = [];
      while (i < lines.length) {
        const itemMatch = lines[i].match(/^\d+\.\s+(.+)$/);
        if (!itemMatch) break;
        items.push(itemMatch[1]);
        i += 1;
      }
      blocks.push(
        <ol key={`ol-${i}`} style={textStyles.list}>
          {items.map((item, idx) => (
            <li key={`oli-${i}-${idx}`} style={textStyles.listItem}>
              {renderInlineMarkdown(item, `oli-${i}-${idx}`)}
            </li>
          ))}
        </ol>
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
        <blockquote
          key={`quote-${i}`}
          style={textStyles.quote}
        >
          {renderInlineMarkdown(quoteLines.join('\n'), `q-${i}`)}
        </blockquote>
      );
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith('```')) {
      if (/^(#{1,6})\s+(.+)$/.test(lines[i])) break;
      if (/^(\s*)[-*]\s+(.+)$/.test(lines[i])) break;
      if (/^\d+\.\s+(.+)$/.test(lines[i])) break;
      if (/^>\s?(.+)$/.test(lines[i])) break;
      if (/^(-{3,}|\*{3,})$/.test(lines[i].trim())) break;
      para.push(lines[i]);
      i += 1;
    }
    if (para.length) {
      blocks.push(
        <p key={`p-${i}`} style={textStyles.paragraph}>
          {renderInlineMarkdown(para.join('\n'), `p-${i}`)}
        </p>
      );
    }
  }
  return blocks;
}

function getPriorityLevel(priority) {
  const value = Number.isFinite(priority) ? priority : 0;
  if (value >= 8) return 'high';
  if (value >= 4) return 'medium';
  return 'low';
}

function unixToDatetimeLocal(unixTs) {
  if (!unixTs) return '';
  const d = new Date(unixTs * 1000);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function datetimeLocalToUnix(value) {
  if (!value) return null;
  return Math.floor(new Date(value).getTime() / 1000);
}

function parseTagInput(value) {
  const seen = new Set();
  const tags = [];
  for (const raw of String(value ?? '').split(',')) {
    const normalized = normalizeTagValue(raw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    tags.push(normalized);
  }
  return tags.slice(0, MAX_ENTRY_TAGS);
}

function tagsToInput(tags) {
  return normalizeTagList(tags).join(', ');
}

function normalizeTagValue(tag) {
  const source = typeof tag === 'object' && tag !== null
    ? String(tag.normalized_name ?? tag.name ?? '')
    : String(tag ?? '');

  return source
    .trim()
    .replace(/^#+/, '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 32);
}

function normalizeTagList(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return [];
  const seen = new Set();
  const out = [];
  for (const raw of tags) {
    const normalized = normalizeTagValue(raw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function countBillableGlobalTags(tags) {
  return new Set(
    tags
      .map(tag => normalizeTagValue(tag))
      .filter(tag => tag && !GLOBALLY_PERMISSIVE_TAGS_NORMALIZED.has(tag))
  ).size;
}

function sortTagsByUsage(tags, usageCounts) {
  return [...tags].sort((a, b) => {
    const aHasEntries = usageCounts.has(a);
    const bHasEntries = usageCounts.has(b);
    if (aHasEntries !== bHasEntries) return aHasEntries ? -1 : 1;
    return a.localeCompare(b, 'en', { sensitivity: 'base' });
  });
}

function normalizeEntryTags(entry) {
  if (!entry || typeof entry !== 'object') return entry;
  return {
    ...entry,
    tags: normalizeTagList(entry.tags),
  };
}

function sortEntriesByPriorityDesc(entries) {
  return [...entries].sort((a, b) => {
    const priorityDiff = (b.priority ?? 0) - (a.priority ?? 0);
    if (priorityDiff !== 0) return priorityDiff;
    return (b.created_at ?? 0) - (a.created_at ?? 0);
  });
}

function parseImportedConversationFromEntry(entry) {
  const rawText = String(entry?.raw_text ?? '').trim();
  if (!rawText.startsWith('{')) return null;

  try {
    const parsed = JSON.parse(rawText);
    if (parsed?._format !== 'chat_conversation_v1') return null;
    if (!Array.isArray(parsed.messages) || parsed.messages.length === 0) return null;
    return {
      source: parsed.source ?? 'unknown',
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

function groupByDate(entries) {
  const groups = {};
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = todayStart - 6 * 86400000;

  for (const e of entries) {
    const ts = e.created_at * 1000;
    let group;
    if (ts >= todayStart) group = 'Today';
    else if (ts >= todayStart - 86400000) group = 'Yesterday';
    else if (ts >= weekStart) group = 'Earlier this week';
    else group = 'Older';

    if (!groups[group]) groups[group] = [];
    groups[group].push(e);
  }
  return groups;
}

function getTimezoneOptions() {
  if (typeof Intl.supportedValuesOf === 'function') {
    return Intl.supportedValuesOf('timeZone');
  }
  return ['Asia/Singapore'];
}

export default function App({ authToken, onUnauthorized }) {
  const mainScrollRef = useRef(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 900);
  const [isCompactMobile, setIsCompactMobile] = useState(() => window.innerWidth <= 480);
  const [entries, setEntries] = useState([]);
  const [userTags, setUserTags] = useState([]);
  const [userTagsLoaded, setUserTagsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [activePriorityLevel, setActivePriorityLevel] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [inputText, setInputText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editCategory, setEditCategory] = useState('note');
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editRemindAt, setEditRemindAt] = useState('');
  const [editPriority, setEditPriority] = useState(0);
  const [editTags, setEditTags] = useState('');
  const [editTagDraft, setEditTagDraft] = useState('');
  const [editTagError, setEditTagError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [timezone, setTimezone] = useState('Asia/Singapore');
  const [timezoneDraft, setTimezoneDraft] = useState('Asia/Singapore');
  const [timezoneError, setTimezoneError] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [telegramLinkKey, setTelegramLinkKey] = useState('');
  const [loadingTelegramLinkKey, setLoadingTelegramLinkKey] = useState(false);
  const [telegramLinkError, setTelegramLinkError] = useState(null);
  const [telegramCopyStatus, setTelegramCopyStatus] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [entryCopyStatus, setEntryCopyStatus] = useState('');
  const [entryCopyHoverField, setEntryCopyHoverField] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const importFileInputRef = useRef(null);
  const editDescriptionRef = useRef(null);
  const [importingConversations, setImportingConversations] = useState(false);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 900);
      setIsCompactMobile(window.innerWidth <= 480);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setMobileMenuOpen(false);
      setMobileFilterOpen(false);
    }
  }, [isMobile]);

  const today = new Date().toLocaleDateString('en-SG', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
    ...(isMobile ? {} : { year: 'numeric' }),
  });

  const authedFetch = useCallback(async (url, options = {}) => {
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${authToken}`);

    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      onUnauthorized?.();
      throw new Error('Unauthorized');
    }
    return res;
  }, [authToken, onUnauthorized]);

  // ── Fetch entries ────────────────────────────────────────────────────────────
  const fetchEntries = useCallback(async () => {
    try {
      const res = await authedFetch(`${API}/entries`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setEntries(sortEntriesByPriorityDesc(data.map(normalizeEntryTags)));

      const tagsRes = await authedFetch(`${API}/tags`);
      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        setUserTags(normalizeTagList(tagsData?.tags));
        setUserTagsLoaded(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authedFetch]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await authedFetch(`${API}/settings`);
        if (!res.ok) throw new Error(`API error ${res.status}`);
        const data = await res.json();
        if (data?.timezone) {
          setTimezone(data.timezone);
          setTimezoneDraft(data.timezone);
        }
      } catch (err) {
        setTimezoneError(err.message);
      }
    }
    fetchSettings();
  }, [authedFetch]);

  // ── Counts ───────────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c = { reminder: 0, todo: 0, thought: 0, note: 0 };
    for (const e of entries) {
      if (e.is_deleted) continue;
      if (e.is_archived) continue;
      if (c[e.category] !== undefined) c[e.category]++;
    }
    return c;
  }, [entries]);

  const tagUsageCounts = useMemo(() => {
    const counts = new Map();
    for (const entry of entries) {
      if (entry.is_deleted) continue;
      if (entry.is_archived) continue;
      if (!Array.isArray(entry.tags)) continue;
      for (const tag of entry.tags) {
        const value = normalizeTagValue(tag);
        if (!value) continue;
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    }
    return counts;
  }, [entries]);

  const availableTags = useMemo(() => {
    return Array.from(tagUsageCounts.keys())
      .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  }, [tagUsageCounts]);
  const globalTags = useMemo(() => {
    if (!userTagsLoaded) return availableTags;
    const sortedUserTags = sortTagsByUsage(userTags, tagUsageCounts);
    return sortedUserTags.length > 0 ? sortedUserTags : availableTags;
  }, [userTagsLoaded, userTags, availableTags, tagUsageCounts]);

  useEffect(() => {
    if (!activeTag) return;
    const exists = availableTags.some(tag => tag.toLowerCase() === activeTag.toLowerCase());
    if (!exists) setActiveTag('');
  }, [activeTag, availableTags]);

  // ── Filtered + searched entries ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = !activeCategory
      ? entries
      : entries.filter(e => e.category === activeCategory);

    list = list.filter(e => !e.is_deleted);
    list = list.filter(e => showArchived ? e.is_archived : !e.is_archived);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        e =>
          (e.title || '').toLowerCase().includes(q) ||
          (e.summary || '').toLowerCase().includes(q) ||
          (e.description || e.raw_text || '').toLowerCase().includes(q) ||
          (Array.isArray(e.tags) && e.tags.some(tag => tag.toLowerCase().includes(q)))
      );
    }

    if (activePriorityLevel) {
      list = list.filter(e => getPriorityLevel(e.priority ?? 0) === activePriorityLevel);
    }

    if (activeTag) {
      const selectedTag = activeTag.toLowerCase();
      list = list.filter(
        e => Array.isArray(e.tags) && e.tags.some(tag => tag.toLowerCase() === selectedTag)
      );
    }
    return list;
  }, [entries, activeCategory, search, activePriorityLevel, showArchived, activeTag]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);
  const groupOrder = ['Today', 'Yesterday', 'Earlier this week', 'Older'];
  const virtualRows = useMemo(() => {
    const rows = [];
    for (const group of groupOrder) {
      const items = grouped[group];
      if (!items || items.length === 0) continue;
      rows.push({
        type: 'header',
        key: `header-${group}`,
        group,
        count: items.length,
      });
      for (const entry of items) {
        rows.push({
          type: 'entry',
          key: `entry-${entry.id}`,
          entry,
        });
      }
    }
    return rows;
  }, [grouped]);
  const rowVirtualizer = useVirtualizer({
    count: virtualRows.length,
    getScrollElement: () => mainScrollRef.current,
    estimateSize: index => (virtualRows[index]?.type === 'header' ? 30 : (isMobile ? 190 : 170)),
    overscan: 8,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();
  const editTagList = useMemo(() => parseTagInput(editTags), [editTags]);
  const canAddMoreTags = editTagList.length < MAX_ENTRY_TAGS;
  const timezoneOptions = useMemo(() => {
    const options = getTimezoneOptions();
    return options.includes(timezoneDraft) ? options : [timezoneDraft, ...options];
  }, [timezoneDraft]);

  // ── Delete ───────────────────────────────────────────────────────────────────
  function handleDelete(id) {
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  function handleArchive(updatedEntry) {
    setEntries(prev => sortEntriesByPriorityDesc(
      prev.map(e => (e.id === updatedEntry.id ? updatedEntry : e))
    ));
  }

  function handleOpenEdit(entry) {
    setEditingEntry(entry);
    setEditCategory(entry.category);
    setEditTitle(entry.title ?? '');
    setEditSummary(entry.summary ?? '');
    setEditContent(entry.description ?? entry.raw_text ?? entry.content ?? '');
    setEditRemindAt(unixToDatetimeLocal(entry.remind_at));
    setEditPriority(Number.isInteger(entry.priority) ? entry.priority : 0);
    setEditTags(tagsToInput(entry.tags));
    setEditTagDraft('');
    setEditTagError('');
  }

  function handleCloseEdit() {
    if (savingEdit) return;
    setEditingEntry(null);
    setEditTagError('');
  }

  function handleRemoveEditTag(tagToRemove) {
    const remainingTags = parseTagInput(editTags).filter(tag => tag !== tagToRemove);
    setEditTags(tagsToInput(remainingTags));
    setEditTagError('');
  }

  function handleAddEditTag() {
    const nextTag = normalizeTagValue(editTagDraft);
    if (!nextTag || !canAddMoreTags) return;
    setEditTagError('');
    const existingGlobalTags = new Set(globalTags.map(tag => normalizeTagValue(tag)));
    const isNewGlobalTag = !existingGlobalTags.has(nextTag);
    const isNewBillableTag = isNewGlobalTag && !GLOBALLY_PERMISSIVE_TAGS_NORMALIZED.has(nextTag);
    if (isNewBillableTag && countBillableGlobalTags(globalTags) >= MAX_USER_TAGS) {
      setEditTagError(`A maximum of ${MAX_USER_TAGS} tags is allowed per user.`);
      return;
    }
    const mergedTags = parseTagInput([...parseTagInput(editTags), nextTag].join(','));
    setEditTags(tagsToInput(mergedTags));
    setEditTagDraft('');
  }

  function handleEditTagDraftKeyDown(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    handleAddEditTag();
  }

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

  function handleAddDescriptionBulletPoint() {
    const textarea = editDescriptionRef.current;
    if (!textarea) {
      setEditContent(prev => (prev ? `${prev}\n- ` : '- '));
      return;
    }

    const value = editContent;
    const selectionStart = textarea.selectionStart ?? value.length;
    const selectionEnd = textarea.selectionEnd ?? value.length;
    const lineStart = value.lastIndexOf('\n', Math.max(selectionStart - 1, 0)) + 1;
    const hasContentBeforeCursor = value.slice(lineStart, selectionStart).trim().length > 0;
    const prefix = hasContentBeforeCursor ? '\n- ' : '- ';
    const nextValue = `${value.slice(0, selectionStart)}${prefix}${value.slice(selectionEnd)}`;
    const nextCaret = selectionStart + prefix.length;

    setEditContent(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCaret, nextCaret);
    });
  }

  function handleOpenSettings() {
    setTimezoneDraft(timezone);
    setTimezoneError(null);
    setTelegramLinkKey('');
    setTelegramLinkError(null);
    setTelegramCopyStatus('');
    setSettingsOpen(true);
  }

  function handleCloseSettings() {
    if (savingSettings) return;
    setSettingsOpen(false);
  }

  async function handleGenerateTelegramLinkKey() {
    if (loadingTelegramLinkKey) return;
    setLoadingTelegramLinkKey(true);
    setTelegramLinkError(null);
    setTelegramCopyStatus('');
    try {
      const res = await authedFetch(`${API}/telegram/link-key`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `API error ${res.status}`);
      }
      const data = await res.json();
      setTelegramLinkKey(data.key || '');
    } catch (err) {
      setTelegramLinkError(err.message);
    } finally {
      setLoadingTelegramLinkKey(false);
    }
  }

  async function handleCopyTelegramLinkKey() {
    if (!telegramLinkKey) return;
    try {
      await navigator.clipboard.writeText(telegramLinkKey);
      setTelegramCopyStatus('Copied');
    } catch {
      setTelegramCopyStatus('Copy failed');
    }
  }

  async function handleCopyEntryField(label, value) {
    try {
      await navigator.clipboard.writeText(String(value ?? ''));
      setEntryCopyStatus(`${label} copied`);
    } catch {
      setEntryCopyStatus(`Copy ${label.toLowerCase()} failed`);
    }
  }

  function handleCloseSelectedEntry() {
    setSelectedEntry(null);
    setEntryCopyStatus('');
    setEntryCopyHoverField('');
  }

  async function handleSaveSettings() {
    if (savingSettings) return;
    const timezoneToSave = timezoneDraft;
    if (!timezoneToSave) {
      setTimezoneError('Timezone is required.');
      return;
    }

    setSavingSettings(true);
    setTimezoneError(null);
    try {
      const res = await authedFetch(`${API}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: timezoneToSave }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `API error ${res.status}`);
      }
      const updated = await res.json();
      setTimezone(updated.timezone);
      setTimezoneDraft(updated.timezone);
      setSettingsOpen(false);
    } catch (err) {
      setTimezoneError(err.message);
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleSaveEdit() {
    if (!editingEntry || savingEdit) return;
    const content = editContent.trim();
    const title = editTitle.trim();
    const summary = editSummary.trim();
    const priority = Number(editPriority);
    const tags = parseTagInput(editTags);
    if (!content) {
      alert('Description is required.');
      return;
    }
    if (!Number.isInteger(priority) || priority < 0 || priority > 10) {
      alert('Priority must be an integer from 0 to 10.');
      return;
    }
    if (!validateGlobalTagLimit(tags)) return;

    setSavingEdit(true);
    try {
      const remindAt = editCategory === 'reminder'
        ? datetimeLocalToUnix(editRemindAt)
        : null;
      const res = await authedFetch(`${API}/entries?id=${editingEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: editCategory,
          title,
          summary,
          description: content,
          remind_at: remindAt,
          priority,
          tags,
        }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const updatedEntry = await res.json();
      setEntries(prev => sortEntriesByPriorityDesc(
        prev.map(e => (e.id === updatedEntry.id ? normalizeEntryTags(updatedEntry) : e))
      ));
      setEditingEntry(null);
    } catch (err) {
      alert('Failed to update entry: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  // ── Text submit ──────────────────────────────────────────────────────────────
  async function handleSubmit() {
    const text = inputText.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      const res = await authedFetch(`${API}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: text,
        }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const newEntry = await res.json();
      setEntries(prev => sortEntriesByPriorityDesc([normalizeEntryTags(newEntry), ...prev]));
      setInputText('');
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleSelectCategory(category) {
    setActiveCategory(prev => (prev === category ? '' : category));
  }

  function handleSelectTag(tag) {
    setActiveTag(prev => (prev.toLowerCase() === String(tag).toLowerCase() ? '' : tag));
  }

  function handleOpenImportDialog() {
    if (importingConversations) return;
    importFileInputRef.current?.click();
  }

  async function handleImportClaudeJsonFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || importingConversations) return;

    setImportingConversations(true);
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const conversations = Array.isArray(parsed) ? parsed : [parsed];
      const res = await authedFetch(`${API}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          import_format: 'llm_conversations',
          conversations,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `API error ${res.status}`);
      }

      const created = Array.isArray(body.created) ? body.created : [];
      if (created.length === 0) {
        alert('No valid conversations were found in the uploaded JSON.');
        return;
      }
      setEntries(prev => sortEntriesByPriorityDesc([...created.map(normalizeEntryTags), ...prev]));
      alert(`Imported ${created.length} conversation${created.length === 1 ? '' : 's'}.`);
    } catch (err) {
      alert(`Failed to import JSON: ${err.message}`);
    } finally {
      setImportingConversations(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: isMobile ? '100dvh' : '100vh',
        background: 'var(--bg-base)',
        overflow: 'hidden',
      }}
    >
      {/* ── Topbar ── */}
      <header
        style={{
          position: 'relative',
          background: 'var(--bg-surface)',
          borderBottom: '0.5px solid var(--border)',
          padding: isMobile
            ? 'calc(8px + env(safe-area-inset-top, 0px)) 12px 10px'
            : '13px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 8 : 16,
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, order: isMobile ? 1 : 'unset' }}>
          {isMobile && (
            <>
              <button
                onClick={() => {
                  setMobileFilterOpen(false);
                  setMobileMenuOpen(prev => !prev);
                }}
                aria-label="Open menu"
                style={{
                  width: 28,
                  height: 28,
                  border: '0.5px solid var(--border)',
                  borderRadius: 7,
                  background: 'var(--bg-raised)',
                  color: 'var(--text-secondary)',
                  fontSize: 15,
                  lineHeight: 1,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                ☰
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setMobileFilterOpen(prev => !prev);
                }}
                aria-label="Open filters"
                style={{
                  border: '0.5px solid var(--border)',
                  borderRadius: 7,
                  background: 'var(--bg-raised)',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  lineHeight: 1,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontFamily: 'inherit',
                  padding: '0 9px',
                  height: 28,
                }}
              >
                Filter
              </button>
            </>
          )}

          <span
            style={{
              fontFamily: 'DM Serif Display, serif',
              fontSize: 18,
              color: 'var(--text-primary)',
              letterSpacing: '-0.3px',
              flexShrink: 0,
            }}
          >
            second<span style={{ color: 'var(--brand)' }}>brain</span>
          </span>
        </div>

        <input
          type="text"
          placeholder="Search your mind…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: isMobile ? '1 1 100%' : 1,
            maxWidth: isMobile ? '100%' : 280,
            minWidth: 0,
            order: isMobile ? 3 : 'unset',
            background: 'var(--bg-raised)',
            border: '0.5px solid var(--border)',
            borderRadius: 20,
            padding: '6px 14px',
            fontSize: 13,
            color: 'var(--text-primary)',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isCompactMobile ? 6 : 8,
          flexShrink: 0,
          marginLeft: 'auto',
          order: isMobile ? 2 : 'unset',
        }}>
          <span style={{
            fontSize: isCompactMobile ? 11 : 12,
            color: 'var(--text-muted)',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}>
            {today}
          </span>

          {/* Live indicator */}
          {!isCompactMobile && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              flexShrink: 0,
            }}>
              <span
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--brand)',
                  boxShadow: '0 0 0 0 var(--brand)',
                  animation: 'pulse 2s infinite',
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>live</span>
            </div>
          )}
        </div>

        {isMobile && mobileMenuOpen && (
          <div
            style={{
              order: 4,
              flex: '1 1 100%',
              width: '100%',
              marginTop: 2,
              background: 'var(--bg-surface)',
              border: '0.5px solid var(--border)',
              borderRadius: 10,
              padding: 6,
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            <button
              onClick={() => {
                setActiveCategory('');
                setMobileMenuOpen(false);
              }}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                textAlign: 'left',
                borderRadius: 7,
                padding: '8px 10px',
                fontFamily: 'inherit',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Home
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleOpenImportDialog();
              }}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                textAlign: 'left',
                borderRadius: 7,
                padding: '8px 10px',
                fontFamily: 'inherit',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {importingConversations ? 'Importing…' : 'Import LLM conversations'}
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleOpenSettings();
              }}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                textAlign: 'left',
                borderRadius: 7,
                padding: '8px 10px',
                fontFamily: 'inherit',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Settings
            </button>
            <div style={{ marginTop: 'auto', paddingTop: 8 }}>
              <div
                aria-hidden="true"
                style={{
                  height: 1,
                  margin: '0 6px 6px',
                  background: 'var(--border)',
                }}
              />
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  window.location.assign('/apps');
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  textAlign: 'left',
                  borderRadius: 7,
                  padding: '8px 10px',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Apps
              </button>
            </div>
          </div>
        )}

        {isMobile && mobileFilterOpen && (
          <div
            style={{
              order: 4,
              flex: '1 1 100%',
              width: '100%',
              marginTop: 2,
              background: 'var(--bg-surface)',
              border: '0.5px solid var(--border)',
              borderRadius: 10,
              padding: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                alignSelf: 'flex-end',
                gap: 6,
                fontSize: 11,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={showArchived}
                onChange={e => setShowArchived(e.target.checked)}
              />
              Show Archived/Done
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontWeight: 500,
                }}
              >
                Priority
              </span>
              {PRIORITY_LEVELS.map(level => {
                const active = activePriorityLevel === level.key;
                return (
                  <button
                    key={level.key}
                    onClick={() => setActivePriorityLevel(prev => (prev === level.key ? '' : level.key))}
                    style={{
                      border: `0.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                      background: active ? 'var(--brand-dim)' : 'var(--bg-surface)',
                      color: active ? 'var(--brand-text)' : 'var(--text-secondary)',
                      borderRadius: 999,
                      padding: '4px 10px',
                      fontSize: 11,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      transition: 'all .15s',
                    }}
                  >
                    {level.label}
                  </button>
                );
              })}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontWeight: 500,
                }}
              >
                {`Tags (${countBillableGlobalTags(globalTags)}/${MAX_USER_TAGS})`}
              </span>
              {globalTags.map(tag => {
                const active = activeTag.toLowerCase() === tag.toLowerCase();
                const isDisabled = !tagUsageCounts.has(tag);
                return (
                  <button
                    key={tag}
                    disabled={isDisabled}
                    onClick={() => handleSelectTag(tag)}
                    style={{
                      border: `0.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                      background: active ? 'var(--brand-dim)' : 'var(--bg-surface)',
                      color: active ? 'var(--brand-text)' : (isDisabled ? 'var(--text-muted)' : 'var(--text-secondary)'),
                      borderRadius: 999,
                      padding: '4px 10px',
                      fontSize: 11,
                      fontFamily: 'inherit',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      opacity: isDisabled ? 0.55 : 1,
                      transition: 'all .15s',
                    }}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* ── Body ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: isMobile ? 'column' : 'row' }}>
        {!isMobile && (
          <Sidebar
            active={activeCategory}
            onSelect={handleSelectCategory}
            activeTag={activeTag}
            onSelectTag={handleSelectTag}
            availableTags={availableTags}
            counts={counts}
            onOpenImportConversations={handleOpenImportDialog}
            importingConversations={importingConversations}
            onOpenSettings={handleOpenSettings}
            onOpenApps={() => window.location.assign('/apps')}
            isMobile={false}
          />
        )}

        {/* ── Main content ── */}
        <main
          ref={mainScrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isMobile ? '12px' : '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? 14 : 20,
          }}
        >
          <StatsBar
            counts={counts}
            isMobile={isMobile}
            activeCategory={activeCategory}
            onSelectCategory={handleSelectCategory}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: -8 }}>
            <div style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontWeight: 500,
                }}
              >
                FILTER
              </span>
              <label
                style={{
                  display: isMobile ? 'none' : 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  marginLeft: 'auto',
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={e => setShowArchived(e.target.checked)}
                />
                Show Archived/Done
              </label>
            </div>
            <div
              style={{
                display: isMobile ? 'none' : 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontWeight: 500,
                }}
              >
                Priority
              </span>
              {PRIORITY_LEVELS.map(level => {
                const active = activePriorityLevel === level.key;
                return (
                  <button
                    key={level.key}
                    onClick={() => setActivePriorityLevel(prev => (prev === level.key ? '' : level.key))}
                    style={{
                      border: `0.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                      background: active ? 'var(--brand-dim)' : 'var(--bg-surface)',
                      color: active ? 'var(--brand-text)' : 'var(--text-secondary)',
                      borderRadius: 999,
                      padding: '4px 10px',
                      fontSize: 11,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      transition: 'all .15s',
                    }}
                  >
                    {level.label}
                  </button>
                );
              })}
            </div>
            <div
              style={{
                display: isMobile ? 'none' : 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontWeight: 500,
                }}
              >
                {`Tags (${countBillableGlobalTags(globalTags)}/${MAX_USER_TAGS})`}
              </span>
              {globalTags.map(tag => {
                const active = activeTag.toLowerCase() === tag.toLowerCase();
                const isDisabled = !tagUsageCounts.has(tag);
                return (
                  <button
                    key={tag}
                    disabled={isDisabled}
                    onClick={() => handleSelectTag(tag)}
                    style={{
                      border: `0.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                      background: active ? 'var(--brand-dim)' : 'var(--bg-surface)',
                      color: active ? 'var(--brand-text)' : (isDisabled ? 'var(--text-muted)' : 'var(--text-secondary)'),
                      borderRadius: 999,
                      padding: '4px 10px',
                      fontSize: 11,
                      fontFamily: 'inherit',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      opacity: isDisabled ? 0.55 : 1,
                      transition: 'all .15s',
                    }}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          </div>

          {loading && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>
              Loading entries…
            </div>
          )}

          {error && (
            <div
              style={{
                background: 'rgba(220,60,60,0.1)',
                border: '0.5px solid rgba(220,60,60,0.25)',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13,
                color: '#f87171',
              }}
            >
              ⚠ Could not reach API: {error}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: 'var(--text-muted)',
                fontSize: 13,
              }}
            >
              {search
                ? `No results for "${search}"`
                : !activeCategory
                ? (showArchived
                  ? 'No archived/done entries yet.'
                  : 'No active entries — click "Show Archived/Done" to view completed items.')
                : `No ${activeCategory}s at this priority level${showArchived ? ' in archived/done' : ' (excluding archived/done)'} yet.`}
            </div>
          )}

          {virtualRows.length > 0 && (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: 'relative',
                width: '100%',
              }}
            >
              {virtualItems.map(virtualItem => {
                const row = virtualRows[virtualItem.index];
                if (!row) return null;

                return (
                  <div
                    key={row.key}
                    ref={rowVirtualizer.measureElement}
                    data-index={virtualItem.index}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    {row.type === 'header' ? (
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: 'var(--text-muted)',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          margin: 0,
                        }}
                      >
                        {row.group} · {row.count}
                      </p>
                    ) : (
                      <EntryCard
                        entry={row.entry}
                        onDelete={handleDelete}
                        onArchive={handleArchive}
                        onEdit={handleOpenEdit}
                        onOpenDescription={setSelectedEntry}
                        apiBase={API}
                        authToken={authToken}
                        timezone={timezone}
                        isMobile={isMobile}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* ── Input row ── */}
      <div
        style={{
          position: isMobile ? 'sticky' : 'static',
          bottom: isMobile ? 0 : 'auto',
          zIndex: isMobile ? 15 : 'auto',
          background: 'var(--bg-surface)',
          borderTop: '0.5px solid var(--border)',
          padding: isMobile ? '10px 12px calc(10px + env(safe-area-inset-bottom, 0px))' : '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <textarea
          rows={1}
          placeholder="Type a note, reminder or thought…"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            background: 'var(--bg-raised)',
            border: '0.5px solid var(--border)',
            borderRadius: 20,
            padding: '8px 16px',
            fontSize: 13,
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
            outline: 'none',
            resize: 'none',
            lineHeight: 1.5,
            overflowY: 'hidden',
            transition: 'border-color .15s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--brand)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <button
          onClick={handleSubmit}
          disabled={!inputText.trim() || submitting}
          title="Save (Enter)"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '0.5px solid var(--border)',
            background: inputText.trim() && !submitting
              ? 'var(--brand)'
              : 'var(--bg-raised)',
            color: inputText.trim() && !submitting
              ? '#fff'
              : 'var(--text-muted)',
            cursor: inputText.trim() && !submitting ? 'pointer' : 'not-allowed',
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background .15s, color .15s',
          }}
        >
          {submitting ? '…' : '↗'}
        </button>
        <input
          ref={importFileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleImportClaudeJsonFile}
          style={{ display: 'none' }}
        />
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%   { box-shadow: 0 0 0 0 rgba(29,158,117,.6); }
          70%  { box-shadow: 0 0 0 5px rgba(29,158,117,0); }
          100% { box-shadow: 0 0 0 0 rgba(29,158,117,0); }
        }
      `}</style>

      {editingEntry && (
        <div
          onClick={handleCloseEdit}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(6, 10, 12, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 999,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 520,
              background: 'var(--bg-surface)',
              border: '0.5px solid var(--border)',
              borderRadius: 12,
              padding: isMobile ? 12 : 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              maxHeight: '88vh',
              overflowY: 'auto',
            }}
          >
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>
              Edit entry
            </p>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Category</span>
              <select
                value={editCategory}
                onChange={e => setEditCategory(e.target.value)}
                style={{
                  background: 'var(--bg-raised)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                }}
              >
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Title</span>
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                style={{
                  background: 'var(--bg-raised)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Summary</span>
              <textarea
                rows={2}
                value={editSummary}
                onChange={e => setEditSummary(e.target.value)}
                style={{
                  background: 'var(--bg-raised)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Description</span>
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <button
                  type="button"
                  onClick={handleAddDescriptionBulletPoint}
                  aria-label="Add bullet point"
                  title="Add bullet point"
                  style={{
                    border: '0.5px solid var(--border)',
                    borderRadius: 8,
                    padding: '6px 8px',
                    fontSize: 12,
                    fontWeight: 600,
                    background: 'var(--bg-raised)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    width="18"
                    height="14"
                    viewBox="0 0 18 14"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <circle cx="2" cy="2.5" r="1.25" fill="currentColor" />
                    <circle cx="2" cy="7" r="1.25" fill="currentColor" />
                    <circle cx="2" cy="11.5" r="1.25" fill="currentColor" />
                    <rect x="5" y="1.5" width="11.5" height="1.75" rx="0.875" fill="currentColor" />
                    <rect x="5" y="6" width="11.5" height="1.75" rx="0.875" fill="currentColor" />
                    <rect x="5" y="10.5" width="11.5" height="1.75" rx="0.875" fill="currentColor" />
                  </svg>
                </button>
              </div>
              <textarea
                ref={editDescriptionRef}
                rows={4}
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                style={{
                  background: 'var(--bg-raised)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </label>
            {editCategory === 'reminder' && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Reminder time</span>
                <input
                  type="datetime-local"
                  value={editRemindAt}
                  onChange={e => setEditRemindAt(e.target.value)}
                  style={{
                    background: 'var(--bg-raised)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 8,
                    padding: '8px 10px',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                  }}
                />
              </label>
            )}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Priority (0-10)</span>
              <input
                type="number"
                min={0}
                max={10}
                step={1}
                value={editPriority}
                onChange={e => setEditPriority(e.target.value === '' ? '' : Number(e.target.value))}
                style={{
                  background: 'var(--bg-raised)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tags</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={editTagDraft}
                  onChange={e => {
                    setEditTagDraft(e.target.value);
                    setEditTagError('');
                  }}
                  onKeyDown={handleEditTagDraftKeyDown}
                  placeholder={canAddMoreTags ? 'Type a tag and press Enter' : `Maximum ${MAX_ENTRY_TAGS} tags reached`}
                  disabled={!canAddMoreTags}
                  style={{
                    flex: 1,
                    background: 'var(--bg-raised)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 20,
                    padding: '8px 14px',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddEditTag}
                  disabled={!normalizeTagValue(editTagDraft) || !canAddMoreTags}
                  style={{
                    border: '0.5px solid var(--border)',
                    background: normalizeTagValue(editTagDraft) && canAddMoreTags ? 'var(--brand)' : 'var(--bg-raised)',
                    color: normalizeTagValue(editTagDraft) && canAddMoreTags ? '#fff' : 'var(--text-muted)',
                    borderRadius: 999,
                    padding: '6px 10px',
                    fontSize: 12,
                    cursor: normalizeTagValue(editTagDraft) && canAddMoreTags ? 'pointer' : 'not-allowed',
                  }}
                >
                  Add
                </button>
              </div>
              {editTagError ? (
                <span style={{ fontSize: 11, color: 'var(--danger)' }}>{editTagError}</span>
              ) : null}
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {editTagList.length}/{MAX_ENTRY_TAGS} tags
              </span>
              {editTagList.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {editTagList.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleRemoveEditTag(tag)}
                      title={`Remove ${tag}`}
                      style={{
                        border: '0.5px solid var(--border)',
                        background: 'var(--bg-raised)',
                        color: 'var(--text-secondary)',
                        borderRadius: 999,
                        padding: '4px 10px',
                        fontSize: 12,
                        cursor: 'pointer',
                        transition: 'border-color 120ms ease, color 120ms ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--danger)';
                        e.currentTarget.style.color = 'var(--danger)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }}
                    >
                      {tag} ×
                    </button>
                  ))}
                </div>
              )}
              {editTagList.length === 0 && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No tags</span>
              )}
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={handleCloseEdit}
                disabled={savingEdit}
                style={{
                  border: '0.5px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  borderRadius: 8,
                  padding: '7px 12px',
                  fontSize: 12,
                  cursor: savingEdit ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                style={{
                  border: '0.5px solid var(--brand)',
                  background: 'var(--brand)',
                  color: '#fff',
                  borderRadius: 8,
                  padding: '7px 12px',
                  fontSize: 12,
                  cursor: savingEdit ? 'not-allowed' : 'pointer',
                }}
              >
                {savingEdit ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedEntry && (
        (() => {
          const importedConversation = parseImportedConversationFromEntry(selectedEntry);
          return (
        <div
          onClick={handleCloseSelectedEntry}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(6, 10, 12, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 1000,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 560,
              background: 'var(--bg-surface)',
              border: '0.5px solid var(--border)',
              borderRadius: 12,
              padding: isMobile ? 12 : 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              maxHeight: '88vh',
              overflowY: 'auto',
            }}
          >
            <div
              onMouseEnter={() => setEntryCopyHoverField('title')}
              onMouseLeave={() => setEntryCopyHoverField('')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <p style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)', fontWeight: 700 }}>
                {selectedEntry.title || selectedEntry.content || 'Untitled'}
              </p>
              <button
                onClick={() => handleCopyEntryField('Title', selectedEntry.title || selectedEntry.content || '')}
                aria-label="Copy title"
                title="Copy title"
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  padding: 0,
                  lineHeight: 1,
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                  opacity: entryCopyHoverField === 'title' ? 1 : 0,
                  pointerEvents: entryCopyHoverField === 'title' ? 'auto' : 'none',
                }}
              >
                ⧉
              </button>
            </div>
            <div
              onMouseEnter={() => setEntryCopyHoverField('summary')}
              onMouseLeave={() => setEntryCopyHoverField('')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                {selectedEntry.summary || selectedEntry.content || ''}
              </p>
              <button
                onClick={() => handleCopyEntryField('Summary', selectedEntry.summary || selectedEntry.content || '')}
                aria-label="Copy summary"
                title="Copy summary"
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  padding: 0,
                  lineHeight: 1,
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                  opacity: entryCopyHoverField === 'summary' ? 1 : 0,
                  pointerEvents: entryCopyHoverField === 'summary' ? 'auto' : 'none',
                }}
              >
                ⧉
              </button>
            </div>
            {entryCopyStatus && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{entryCopyStatus}</span>
            )}
            {Array.isArray(selectedEntry.tags) && selectedEntry.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selectedEntry.tags.map(tag => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 11,
                      color: 'var(--brand-text)',
                      background: 'var(--brand-dim)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 999,
                      padding: '2px 8px',
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            <div
              onMouseEnter={() => setEntryCopyHoverField('raw_text')}
              onMouseLeave={() => setEntryCopyHoverField('')}
              style={{
                background: 'var(--bg-raised)',
                border: '0.5px solid var(--border)',
                borderRadius: 10,
                padding: '14px 16px',
                maxHeight: '50vh',
                overflowY: 'auto',
                fontSize: 15,
                lineHeight: 1.85,
                color: 'var(--text-primary)',
                position: 'relative',
              }}
            >
              <button
                onClick={() => handleCopyEntryField('Raw text', selectedEntry.raw_text || '')}
                aria-label="Copy raw text"
                title="Copy raw text"
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  padding: 0,
                  lineHeight: 1,
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                  opacity: entryCopyHoverField === 'raw_text' ? 1 : 0,
                  pointerEvents: entryCopyHoverField === 'raw_text' ? 'auto' : 'none',
                }}
              >
                ⧉
              </button>
              {importedConversation
                ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {importedConversation.messages.map((msg, idx) => {
                      const fromHuman = msg.sender === 'human';
                      return (
                        <div key={`${msg.sender}-${idx}`} style={{ display: 'flex', justifyContent: fromHuman ? 'flex-end' : 'flex-start' }}>
                          <div
                            style={{
                              maxWidth: '92%',
                              borderRadius: 12,
                              padding: '8px 10px',
                              background: fromHuman ? 'rgba(29,158,117,0.18)' : 'rgba(255,255,255,0.03)',
                              border: `0.5px solid ${fromHuman ? 'rgba(29,158,117,0.38)' : 'var(--border)'}`,
                            }}
                          >
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                              {fromHuman ? 'You' : 'Assistant'}
                            </div>
                            <div style={{ maxWidth: '70ch' }}>{renderMarkdownContent(msg.text)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
                : (
                  <div style={{ maxWidth: '72ch', margin: '0 auto' }}>
                    {renderMarkdownContent(selectedEntry.description || selectedEntry.raw_text || selectedEntry.content || '')}
                  </div>
                )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCloseSelectedEntry}
                style={{
                  border: '0.5px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  borderRadius: 8,
                  padding: '7px 12px',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
          );
        })()
      )}

      {settingsOpen && (
        <div
          onClick={handleCloseSettings}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(6, 10, 12, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 1000,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 520,
              background: 'var(--bg-surface)',
              border: '0.5px solid var(--border)',
              borderRadius: 12,
              padding: isMobile ? 12 : 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              maxHeight: '88vh',
              overflowY: 'auto',
            }}
          >
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>
              Settings
            </p>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Timezone</span>
              <select
                value={timezoneDraft}
                onChange={e => setTimezoneDraft(e.target.value)}
                style={{
                  background: 'var(--bg-raised)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                }}
              >
                {timezoneOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            {timezoneError && (
              <div style={{ color: '#f87171', fontSize: 12 }}>
                {timezoneError}
              </div>
            )}
            <div
              style={{
                border: '0.5px solid var(--border)',
                borderRadius: 10,
                padding: 10,
                background: 'var(--bg-raised)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                Telegram account linking
              </p>
              <button
                onClick={handleGenerateTelegramLinkKey}
                disabled={loadingTelegramLinkKey}
                style={{
                  border: '0.5px solid var(--brand)',
                  background: loadingTelegramLinkKey ? 'var(--bg-hover)' : 'var(--brand-dim)',
                  color: loadingTelegramLinkKey ? 'var(--text-muted)' : 'var(--brand-text)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontSize: 12,
                  fontFamily: 'inherit',
                  cursor: loadingTelegramLinkKey ? 'not-allowed' : 'pointer',
                  alignSelf: 'flex-start',
                }}
              >
                {loadingTelegramLinkKey ? 'Generating…' : 'Generate Telegram link key'}
              </button>
              {telegramLinkKey && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      onClick={handleCopyTelegramLinkKey}
                      style={{
                        border: '0.5px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        borderRadius: 8,
                        padding: '6px 10px',
                        fontSize: 11,
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        alignSelf: 'flex-start',
                      }}
                    >
                      Copy key
                    </button>
                    {telegramCopyStatus && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {telegramCopyStatus}
                      </span>
                    )}
                  </div>
                  <code
                    style={{
                      display: 'block',
                      background: 'rgba(0,0,0,0.25)',
                      border: '0.5px solid var(--border)',
                      borderRadius: 8,
                      padding: '8px 10px',
                      color: 'var(--text-primary)',
                      fontSize: 11,
                      overflowX: 'auto',
                      wordBreak: 'break-all',
                    }}
                  >
                    {telegramLinkKey}
                  </code>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)' }}>
                    Send this in Telegram: <code>/link {'<your-key>'}</code>. This key expires in 10 minutes.
                  </p>
                </div>
              )}
              {telegramLinkError && (
                <div style={{ color: '#f87171', fontSize: 12 }}>
                  {telegramLinkError}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={handleCloseSettings}
                disabled={savingSettings}
                style={{
                  border: '0.5px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 12,
                  cursor: savingSettings ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                style={{
                  border: '0.5px solid var(--brand)',
                  background: 'var(--brand)',
                  color: '#fff',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 12,
                  cursor: savingSettings ? 'not-allowed' : 'pointer',
                }}
              >
                {savingSettings ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
