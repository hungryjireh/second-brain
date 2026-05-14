import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { theme } from './constants/theme';

const API = import.meta.env.VITE_API_URL || '/api';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleResetPassword(event) {
    event.preventDefault();

    setSending(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
      setSuccess('If that email exists, a password reset link has been sent.');
    } catch (err) {
      setError(err.message || 'Unable to send password reset email.');
    } finally {
      setSending(false);
    }
  }

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
      <form
        onSubmit={handleResetPassword}
        style={{
          width: '100%',
          maxWidth: 560,
          background: 'var(--bg-surface)',
          border: '0.5px solid var(--border)',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
          display: 'grid',
          gap: 12,
        }}
      >
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: theme.colors.accent, fontWeight: 600 }}>
          Open-brain security
        </p>
        <h1 style={{ margin: 0, fontFamily: theme.fonts.serif, fontSize: 34, lineHeight: 1.1 }}>
          Reset your password
        </h1>
        <p style={{ marginTop: 0, marginBottom: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
          Enter your account email and we&apos;ll send a reset link.
        </p>

        <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            style={{
              padding: '11px 12px',
              background: 'var(--bg-raised)',
              border: '0.5px solid var(--border)',
              borderRadius: 10,
              color: 'var(--text-primary)',
              fontSize: 14,
              fontFamily: 'inherit',
            }}
          />
        </label>

        <button
          type="submit"
          disabled={sending || !email.trim()}
          style={{
            marginTop: 8,
            width: '100%',
            padding: '11px 14px',
            borderRadius: 10,
            border: '0.5px solid transparent',
            background: sending || !email.trim() ? 'var(--bg-hover)' : theme.colors.accentStrong,
            color: sending || !email.trim() ? 'var(--text-muted)' : '#f2fbff',
            fontWeight: 600,
            fontSize: 14,
            fontFamily: 'inherit',
            cursor: sending || !email.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {sending ? 'Sending reset link...' : 'Send reset link'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/open-brain/settings')}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: 10,
            border: '0.5px solid var(--border)',
            background: 'var(--bg-raised)',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: 14,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          Back to settings
        </button>

        {error && (
          <p
            style={{
              marginTop: 4,
              marginBottom: 0,
              color: theme.colors.dangerStrong,
              fontSize: 12,
              background: theme.colors.dangerBg,
              border: `0.5px solid ${theme.colors.dangerBorder}`,
              borderRadius: 8,
              padding: '8px 10px',
            }}
          >
            {error}
          </p>
        )}

        {success && (
          <p
            style={{
              marginTop: 4,
              marginBottom: 0,
              color: '#bef5cb',
              fontSize: 12,
              background: 'rgba(29, 158, 117, 0.15)',
              border: '0.5px solid rgba(29, 158, 117, 0.5)',
              borderRadius: 8,
              padding: '8px 10px',
            }}
          >
            {success}
          </p>
        )}
      </form>
    </div>
  );
}
