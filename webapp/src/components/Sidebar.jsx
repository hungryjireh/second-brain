import React from 'react';

const NAV = [
  { key: 'reminder', label: 'Reminders', color: '#1D9E75' },
  { key: 'todo',     label: 'TODOs',     color: '#378ADD' },
  { key: 'thought',  label: 'Thoughts',  color: '#7F77DD' },
  { key: 'note',     label: 'Notes',     color: '#EF9F27' },
];

export default function Sidebar({
  active,
  onSelect,
  counts,
  onOpenSettings,
  isMobile = false,
  activeTag = '',
  onSelectTag = () => {},
  availableTags = [],
}) {
  const safeTags = Array.isArray(availableTags) ? availableTags : [];

  const sectionTitleStyle = {
    fontSize: 11,
    color: 'var(--text-muted)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    fontWeight: 500,
    padding: isMobile ? '6px 8px 2px' : '0 16px 4px',
  };

  const itemStyle = isActive => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: isMobile ? '6px 10px' : '7px 16px',
    margin: isMobile ? 0 : '0 8px',
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
    width: isMobile ? 'auto' : 'calc(100% - 16px)',
    flexShrink: 0,
  });

  return (
    <aside
      className={isMobile ? 'mobile-category-scroll' : undefined}
      style={{
        width: isMobile ? '100%' : 168,
        flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: isMobile ? 'none' : '0.5px solid var(--border)',
        borderBottom: isMobile ? '0.5px solid var(--border)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        flexWrap: 'nowrap',
        overflowX: isMobile ? 'auto' : 'visible',
        overflowY: isMobile ? 'hidden' : 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: isMobile ? '8px' : '16px 0',
        gap: isMobile ? 6 : 2,
      }}
    >
      <span style={sectionTitleStyle}>Category</span>
      {NAV.map(({ key, label, color }) => {
        const isActive = active === key;
        const count = counts?.[key] ?? 0;

        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            style={itemStyle(isActive)}
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

      <div
        style={{
          height: 1,
          width: 'auto',
          background: 'var(--border)',
          margin: isMobile ? '6px 8px' : '10px 16px',
          flexShrink: 0,
        }}
      />

      <span style={sectionTitleStyle}>Tags</span>
      {safeTags.map(tag => {
        const isActive = activeTag.toLowerCase() === tag.toLowerCase();
        return (
          <button
            key={tag}
            onClick={() => onSelectTag(tag)}
            style={itemStyle(isActive)}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 8,
                color: '#666',
                opacity: isActive ? 1 : 0.5,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              •
            </span>
            <span style={{ flex: 1 }}>#{tag}</span>
          </button>
        );
      })}

      {!isMobile && (
        <>
          <div
            style={{
              height: 1,
              width: 'auto',
              background: 'var(--border)',
              margin: '10px 16px',
            }}
          />

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
              flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <span style={{ fontSize: 14 }}>⚙</span> Settings
          </button>
        </>
      )}
    </aside>
  );
}
