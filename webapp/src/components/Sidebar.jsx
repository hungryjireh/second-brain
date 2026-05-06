import React from 'react';

export default function Sidebar({
  onOpenSettings,
  onOpenImportConversations,
  importingConversations = false,
  isMobile = false,
}) {
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
      {!isMobile && (
        <>
          <button
            onClick={onOpenImportConversations}
            disabled={importingConversations}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 16px', margin: '0 8px',
              borderRadius: 6, border: 'none', cursor: importingConversations ? 'not-allowed' : 'pointer',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontFamily: 'inherit', fontSize: 12,
              transition: 'color .12s',
              flexShrink: 0,
              opacity: importingConversations ? 0.7 : 1,
              textAlign: 'left',
            }}
            onMouseEnter={e => { if (!importingConversations) e.currentTarget.style.color = 'var(--text-secondary)'; }}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <span
              aria-hidden="true"
              style={{
                width: 14,
                display: 'inline-flex',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 14,
                lineHeight: 1,
              }}
            >
              ⬆
            </span>
            <span>{importingConversations ? 'Importing…' : 'Import LLM conversations'}</span>
          </button>

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
            <span
              aria-hidden="true"
              style={{
                width: 14,
                display: 'inline-flex',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 14,
                lineHeight: 1,
              }}
            >
              ⚙
            </span>
            <span>Settings</span>
          </button>
        </>
      )}
    </aside>
  );
}
