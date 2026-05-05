import React from 'react';

const NAV = [
  { key: 'all',      label: 'All',       color: '#1D9E75' },
  { key: 'reminder', label: 'Reminders', color: '#1D9E75' },
  { key: 'todo',     label: 'TODOs',     color: '#378ADD' },
  { key: 'thought',  label: 'Thoughts',  color: '#7F77DD' },
  { key: 'note',     label: 'Notes',     color: '#EF9F27' },
];

export default function Sidebar({ active, onSelect, counts, onOpenSettings }) {
  return (
    <aside
      style={{
        width: 168,
        flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: '0.5px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 0',
        gap: 2,
      }}
    >
      {NAV.map(({ key, label, color }) => {
        const isActive = active === key;
        const count = key === 'all'
          ? Object.values(counts).reduce((a, b) => a + b, 0)
          : (counts[key] ?? 0);

        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 16px',
              margin: '0 8px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              background: isActive ? 'var(--bg-raised)' : 'transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: isActive ? 500 : 400,
              transition: 'background .12s, color .12s',
              textAlign: 'left',
              width: 'calc(100% - 16px)',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
          >
            <span
              style={{
                width: 7, height: 7,
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
                opacity: isActive ? 1 : 0.5,
              }}
            />
            <span style={{ flex: 1 }}>{label}</span>
            {count > 0 && (
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  background: 'var(--bg-raised)',
                  padding: '1px 6px',
                  borderRadius: 10,
                  border: '0.5px solid var(--border)',
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}

      <div style={{ height: 1, background: 'var(--border)', margin: '10px 16px' }} />

      <button
        onClick={onOpenSettings}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 16px', margin: '0 8px',
          borderRadius: 6, border: 'none', cursor: 'pointer',
          background: 'transparent',
          color: 'var(--text-muted)',
          fontFamily: 'inherit', fontSize: 12,
          transition: 'color .12s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <span style={{ fontSize: 14 }}>⚙</span> Settings
      </button>
    </aside>
  );
}
