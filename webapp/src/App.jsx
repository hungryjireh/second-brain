import { useState, useEffect, useMemo, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import StatsBar from './components/StatsBar.jsx';
import EntryCard from './components/EntryCard.jsx';

const API = import.meta.env.VITE_API_URL || '/api';

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

export default function App() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [inputText, setInputText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toLocaleDateString('en-SG', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  // ── Fetch entries ────────────────────────────────────────────────────────────
  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch(`${API}/entries`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setEntries(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
    // Poll every 30s to pick up new bot entries
    const interval = setInterval(fetchEntries, 30_000);
    return () => clearInterval(interval);
  }, [fetchEntries]);

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
    return list;
  }, [entries, activeCategory, search]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);
  const groupOrder = ['Today', 'Yesterday', 'Earlier this week', 'Older'];

  // ── Delete ───────────────────────────────────────────────────────────────────
  function handleDelete(id) {
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  // ── Text submit ──────────────────────────────────────────────────────────────
  async function handleSubmit() {
    const text = inputText.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const newEntry = await res.json();
      setEntries(prev => [newEntry, ...prev]);
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
                : `No ${activeCategory}s yet.`}
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
                  <EntryCard key={entry.id} entry={entry} onDelete={handleDelete} apiBase={API} />
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
    </div>
  );
}
