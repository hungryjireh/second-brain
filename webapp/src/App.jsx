import { useState, useEffect, useMemo, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import StatsBar from './components/StatsBar.jsx';
import EntryCard from './components/EntryCard.jsx';

const API = import.meta.env.VITE_API_URL || '/api';
const CATEGORIES = ['reminder', 'todo', 'thought', 'note'];
const PRIORITY_LEVELS = [
  { key: 'all', label: 'All priorities' },
  { key: 'high', label: 'High (8-10)' },
  { key: 'medium', label: 'Medium (4-7)' },
  { key: 'low', label: 'Low (0-3)' },
];

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

function sortEntriesByPriorityDesc(entries) {
  return [...entries].sort((a, b) => {
    const priorityDiff = (b.priority ?? 0) - (a.priority ?? 0);
    if (priorityDiff !== 0) return priorityDiff;
    return (b.created_at ?? 0) - (a.created_at ?? 0);
  });
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

export default function App({ authToken, onUnauthorized }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activePriorityLevel, setActivePriorityLevel] = useState('all');
  const [search, setSearch] = useState('');
  const [inputText, setInputText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editCategory, setEditCategory] = useState('note');
  const [editContent, setEditContent] = useState('');
  const [editRemindAt, setEditRemindAt] = useState('');
  const [editPriority, setEditPriority] = useState(0);
  const [savingEdit, setSavingEdit] = useState(false);
  const [timezone, setTimezone] = useState('Asia/Singapore');
  const [timezoneDraft, setTimezoneDraft] = useState('Asia/Singapore');
  const [timezoneError, setTimezoneError] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const today = new Date().toLocaleDateString('en-SG', {
    timeZone: timezone,
    month: 'short', day: 'numeric', year: 'numeric',
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
      setEntries(sortEntriesByPriorityDesc(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authedFetch]);

  useEffect(() => {
    fetchEntries();
    // Poll every 30s to pick up new bot entries
    const interval = setInterval(fetchEntries, 30_000);
    return () => clearInterval(interval);
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
    for (const e of entries) if (c[e.category] !== undefined) c[e.category]++;
    return c;
  }, [entries]);

  // ── Filtered + searched entries ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = activeCategory === 'all'
      ? entries
      : entries.filter(e => e.category === activeCategory);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        e =>
          e.content.toLowerCase().includes(q) ||
          e.raw_text.toLowerCase().includes(q)
      );
    }

    if (activePriorityLevel !== 'all') {
      list = list.filter(e => getPriorityLevel(e.priority ?? 0) === activePriorityLevel);
    }
    return list;
  }, [entries, activeCategory, search, activePriorityLevel]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);
  const groupOrder = ['Today', 'Yesterday', 'Earlier this week', 'Older'];

  // ── Delete ───────────────────────────────────────────────────────────────────
  function handleDelete(id) {
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  function handleOpenEdit(entry) {
    setEditingEntry(entry);
    setEditCategory(entry.category);
    setEditContent(entry.content);
    setEditRemindAt(unixToDatetimeLocal(entry.remind_at));
    setEditPriority(Number.isInteger(entry.priority) ? entry.priority : 0);
  }

  function handleCloseEdit() {
    if (savingEdit) return;
    setEditingEntry(null);
  }

  function handleOpenSettings() {
    setTimezoneDraft(timezone);
    setTimezoneError(null);
    setSettingsOpen(true);
  }

  function handleCloseSettings() {
    if (savingSettings) return;
    setSettingsOpen(false);
  }

  async function handleSaveSettings() {
    if (savingSettings) return;
    const timezoneToSave = timezoneDraft.trim();
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
    const priority = Number(editPriority);
    if (!content) {
      alert('Content is required.');
      return;
    }
    if (!Number.isInteger(priority) || priority < 0 || priority > 10) {
      alert('Priority must be an integer from 0 to 10.');
      return;
    }

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
          content,
          remind_at: remindAt,
          priority,
        }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const updatedEntry = await res.json();
      setEntries(prev => sortEntriesByPriorityDesc(
        prev.map(e => (e.id === updatedEntry.id ? updatedEntry : e))
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
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const newEntry = await res.json();
      setEntries(prev => sortEntriesByPriorityDesc([newEntry, ...prev]));
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

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--bg-base)',
        overflow: 'hidden',
      }}
    >
      {/* ── Topbar ── */}
      <header
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '0.5px solid var(--border)',
          padding: '13px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexShrink: 0,
        }}
      >
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

        <input
          type="text"
          placeholder="Search your mind…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1,
            maxWidth: 280,
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

        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
          {today}
        </span>

        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
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
      </header>

      {/* ── Body ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          active={activeCategory}
          onSelect={setActiveCategory}
          counts={counts}
          onOpenSettings={handleOpenSettings}
        />

        {/* ── Main content ── */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <StatsBar counts={counts} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              marginTop: -8,
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
              Priority filter
            </span>
            {PRIORITY_LEVELS.map(level => {
              const active = activePriorityLevel === level.key;
              return (
                <button
                  key={level.key}
                  onClick={() => setActivePriorityLevel(level.key)}
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
                : activeCategory === 'all'
                ? 'No entries yet — send a voice note or type below.'
                : `No ${activeCategory}s at this priority level yet.`}
            </div>
          )}

          {groupOrder.map(group => {
            const items = grouped[group];
            if (!items || items.length === 0) return null;
            return (
              <section key={group} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                  {group} · {items.length}
                </p>
                {items.map(entry => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    onDelete={handleDelete}
                    onEdit={handleOpenEdit}
                    apiBase={API}
                    authToken={authToken}
                    timezone={timezone}
                  />
                ))}
              </section>
            );
          })}
        </main>
      </div>

      {/* ── Input row ── */}
      <div
        style={{
          background: 'var(--bg-surface)',
          borderTop: '0.5px solid var(--border)',
          padding: '12px 20px',
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
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
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
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Content</span>
              <textarea
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
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
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
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>
              Settings
            </p>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Timezone</span>
              <input
                type="text"
                value={timezoneDraft}
                onChange={e => setTimezoneDraft(e.target.value)}
                placeholder="e.g. Asia/Singapore"
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
            {timezoneError && (
              <div style={{ color: '#f87171', fontSize: 12 }}>
                {timezoneError}
              </div>
            )}
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
