import React from 'react';
import { theme } from '../constants/theme';

const STATS = [
  { key: 'reminder', label: 'Reminders', color: theme.colors.second, dimColor: theme.colors.secondDim },
  { key: 'todo',     label: 'TODOs',     color: theme.colors.todo, dimColor: theme.colors.todoDim },
  { key: 'thought',  label: 'Thoughts',  color: theme.colors.thought, dimColor: theme.colors.thoughtDim },
  { key: 'note',     label: 'Notes',     color: theme.colors.note, dimColor: theme.colors.noteDim },
];

export default function StatsBar({
  counts,
  isMobile = false,
  activeCategory = '',
  onSelectCategory = () => {},
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: isMobile ? 6 : 8,
      }}
    >
      {STATS.map(({ key, label, color, dimColor }) => {
        const isActive = activeCategory === key;
        return (
        <button
          key={key}
          onClick={() => onSelectCategory(key)}
          aria-pressed={isActive}
          style={{
            background: isActive ? 'var(--brand-dim)' : 'var(--bg-surface)',
            border: `0.5px solid ${isActive ? 'var(--brand)' : 'var(--border)'}`,
            borderRadius: 10,
            padding: isMobile ? '8px 6px' : '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? 3 : 4,
            position: 'relative',
            overflow: 'hidden',
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'inherit',
            transition: 'all .15s',
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
              fontFamily: theme.fonts.serif,
              fontSize: isMobile ? 20 : 26,
              color: isActive ? 'var(--brand-text)' : color,
              lineHeight: 1,
            }}
          >
            {counts[key] ?? 0}
          </span>
          <span
            style={{
              fontSize: isMobile ? 9 : 10,
              color: isActive ? 'var(--brand-text)' : 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: isMobile ? '0.05em' : '0.07em',
              fontWeight: 500,
            }}
          >
            {label}
          </span>
        </button>
      )})}
    </div>
  );
}
