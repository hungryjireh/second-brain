import React from 'react';

const STATS = [
  { key: 'reminder', label: 'Reminders', color: '#1D9E75', dimColor: 'rgba(29,158,117,0.12)' },
  { key: 'todo',     label: 'TODOs',     color: '#378ADD', dimColor: 'rgba(55,138,221,0.12)' },
  { key: 'thought',  label: 'Thoughts',  color: '#7F77DD', dimColor: 'rgba(127,119,221,0.12)' },
  { key: 'note',     label: 'Notes',     color: '#EF9F27', dimColor: 'rgba(239,159,39,0.12)' },
];

export default function StatsBar({ counts }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
      }}
    >
      {STATS.map(({ key, label, color, dimColor }) => (
        <div
          key={key}
          style={{
            background: 'var(--bg-surface)',
            border: '0.5px solid var(--border)',
            borderRadius: 10,
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Accent glow top-left */}
          <div
            style={{
              position: 'absolute',
              top: -10,
              left: -10,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: dimColor,
              filter: 'blur(12px)',
              pointerEvents: 'none',
            }}
          />
          <span
            style={{
              fontFamily: 'DM Serif Display, serif',
              fontSize: 26,
              color,
              lineHeight: 1,
            }}
          >
            {counts[key] ?? 0}
          </span>
          <span
            style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              fontWeight: 500,
            }}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
