import React, { useState } from 'react';

const TAG_STYLES = {
  reminder: { bg: 'rgba(29,158,117,0.15)', color: '#2ecf9a', label: 'Reminder' },
  todo:     { bg: 'rgba(55,138,221,0.15)', color: '#6ab4f5', label: 'TODO' },
  thought:  { bg: 'rgba(127,119,221,0.15)', color: '#a8a3f0', label: 'Thought' },
  note:     { bg: 'rgba(239,159,39,0.15)', color: '#f5bf6a', label: 'Note' },
};

const CATEGORY_ICONS = {
  reminder: '⏰',
  todo:     '✅',
  thought:  '💡',
  note:     '📝',
};

function formatDate(unixTs) {
  if (!unixTs) return null;
  const d = new Date(unixTs * 1000);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart - 86400000);

  const time = d.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' });

  if (d >= todayStart) return `Today · ${time}`;
  if (d >= yesterdayStart) return `Yesterday · ${time}`;
  return d.toLocaleDateString('en-SG', { month: 'short', day: 'numeric' }) + ` · ${time}`;
}

function formatRemindAt(unixTs) {
  if (!unixTs) return null;
  const d = new Date(unixTs * 1000);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const time = d.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' });

  if (d >= todayStart && d < new Date(todayStart.getTime() + 86400000)) {
    return `${time} tonight`;
  }
  return d.toLocaleDateString('en-SG', { weekday: 'short', month: 'short', day: 'numeric' }) + ` · ${time}`;
}

export default function EntryCard({ entry, onDelete, apiBase = '/api' }) {
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tag = TAG_STYLES[entry.category] ?? TAG_STYLES.note;
  const icon = CATEGORY_ICONS[entry.category] ?? '📝';

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 2500);
      return;
    }
    setDeleting(true);
    try {
      await fetch(`${apiBase}/entries?id=${entry.id}`, { method: 'DELETE' });
      onDelete(entry.id);
    } catch {
      setDeleting(false);
    }
  }

  function handleDownloadIcs() {
    window.open(`${apiBase}/ics?id=${entry.id}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 10,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        transition: 'border-color .15s, opacity .15s',
        opacity: deleting ? 0.4 : 1,
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 15, lineHeight: 1, marginTop: 1 }}>{icon}</span>
        <p
          style={{
            flex: 1,
            fontSize: 13,
            lineHeight: 1.55,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          {entry.content}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {entry.category === 'reminder' && entry.remind_at && (
            <button
              onClick={handleDownloadIcs}
              title="Download .ics"
              style={{
                background: 'transparent',
                border: '0.5px solid var(--border)',
                borderRadius: 6,
                height: 24,
                padding: '0 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                fontSize: 11,
                transition: 'all .15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--brand)';
                e.currentTarget.style.color = 'var(--brand-text)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              .ics
            </button>
          )}
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              padding: '2px 8px',
              borderRadius: 10,
              background: tag.bg,
              color: tag.color,
              letterSpacing: '0.01em',
            }}
          >
            {tag.label}
          </span>
          <button
            onClick={handleDelete}
            disabled={deleting}
            title={confirmDelete ? 'Click again to confirm' : 'Delete'}
            style={{
              background: confirmDelete ? 'rgba(220,60,60,0.15)' : 'transparent',
              border: '0.5px solid ' + (confirmDelete ? 'rgba(220,60,60,0.3)' : 'transparent'),
              borderRadius: 6,
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: deleting ? 'not-allowed' : 'pointer',
              color: confirmDelete ? '#f87171' : 'var(--text-muted)',
              fontSize: 13,
              transition: 'all .15s',
              padding: 0,
            }}
            onMouseEnter={e => { if (!confirmDelete) e.currentTarget.style.color = '#f87171'; }}
            onMouseLeave={e => { if (!confirmDelete) e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            {confirmDelete ? '!' : '×'}
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 11,
          color: 'var(--text-muted)',
        }}
      >
        {entry.remind_at && (
          <>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'var(--brand-dim)',
                color: 'var(--brand-text)',
                padding: '2px 8px',
                borderRadius: 10,
                fontSize: 11,
              }}
            >
              ⏰ {formatRemindAt(entry.remind_at)}
            </span>
            <span
              style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--border-strong)' }}
            />
          </>
        )}

        <span>{formatDate(entry.created_at)}</span>
      </div>
    </div>
  );
}
