import { Link } from 'react-router-dom';
import { openBrainStyle } from './constants/openbrainStyle';

export default function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 20,
        background:
          'radial-gradient(circle at 15% 15%, rgba(29,158,117,0.11), transparent 40%), var(--bg-base)',
      }}
    >
      <main
        style={{
          width: '100%',
          maxWidth: 520,
          border: '0.5px solid var(--border)',
          borderRadius: 16,
          background: 'var(--bg-surface)',
          boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
          padding: '26px 24px',
          display: 'grid',
          gap: 14,
          textAlign: 'center',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 11,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--brand-text)',
            fontWeight: 600,
          }}
        >
          Error 404
        </p>

        <h1
          style={{
            margin: 0,
            fontFamily: openBrainStyle.serifFamily,
            fontSize: 34,
            lineHeight: 1.1,
            letterSpacing: '-0.4px',
          }}
        >
          Thought not found
        </h1>

        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.55 }}>
          This link is invalid, expired, or points to a private thought.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
          <Link
            to="/login"
            style={{
              border: '0.5px solid var(--border)',
              borderRadius: 10,
              textDecoration: 'none',
              padding: '9px 16px',
              color: 'var(--text-primary)',
              background: 'var(--bg-raised)',
              fontSize: 13,
            }}
          >
            Go to login
          </Link>
        </div>
      </main>
    </div>
  );
}
