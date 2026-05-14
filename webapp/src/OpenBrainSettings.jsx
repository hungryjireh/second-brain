import { useNavigate } from 'react-router-dom';
import { theme } from './constants/theme';

const cardStyle = {
  width: '100%',
  maxWidth: 560,
  background: 'var(--bg-surface)',
  border: '0.5px solid var(--border)',
  borderRadius: 16,
  padding: 24,
  boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
  display: 'grid',
  gap: 12,
};

const navButtonStyle = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 10,
  border: '0.5px solid var(--border)',
  background: 'var(--bg-raised)',
  color: 'var(--text-primary)',
  fontWeight: 600,
  fontSize: 14,
  fontFamily: 'inherit',
  cursor: 'pointer',
  textAlign: 'left',
};

export default function OpenBrainSettings() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 20,
        background:
          'radial-gradient(circle at 15% 15%, rgba(29,158,117,0.08), transparent 40%), var(--bg-base)',
      }}
    >
      <section style={cardStyle}>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: theme.colors.accent, fontWeight: 600 }}>
          Open-brain settings
        </p>
        <h1 style={{ margin: 0, fontFamily: theme.fonts.serif, fontSize: 34, lineHeight: 1.1 }}>
          Account settings
        </h1>
        <p style={{ marginTop: 0, marginBottom: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
          Manage your profile and credentials.
        </p>

        <button
          type="button"
          onClick={() => navigate('/open-brain/settings/updateprofile')}
          style={navButtonStyle}
        >
          Update profile
        </button>

        <button
          type="button"
          onClick={() => navigate('/open-brain/settings/reset-password')}
          style={navButtonStyle}
        >
          Reset password
        </button>

        <button
          type="button"
          onClick={() => navigate('/open-brain')}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: 10,
            border: '0.5px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: 14,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          Back to feed
        </button>
      </section>
    </div>
  );
}
