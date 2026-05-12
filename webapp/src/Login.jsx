import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { openBrainStyle } from './constants/openbrainStyle';

const API = import.meta.env.VITE_API_URL || '/api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function login() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
      localStorage.setItem('authToken', data.token);
      navigate('/apps', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !loading && email.trim() && password) {
      e.preventDefault();
      login();
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
          openBrainStyle.brandGlow,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: 'var(--bg-surface)',
          border: '0.5px solid var(--border)',
          borderRadius: 16,
          padding: 24,
          boxShadow: `0 18px 40px ${openBrainStyle.shadowStrong}`,
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
          Welcome back
        </p>
        <h1
          style={{
            marginTop: 8,
            marginBottom: 8,
            fontFamily: openBrainStyle.serifFamily,
            fontSize: 34,
            letterSpacing: '-0.4px',
            lineHeight: 1.1,
          }}
        >
          Sign in to second<span style={{ color: 'var(--brand)' }}>brain</span>
        </h1>
        <p style={{ marginTop: 0, marginBottom: 18, fontSize: 13, color: 'var(--text-secondary)' }}>
          Use your account credentials to continue.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="text"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              padding: '11px 12px',
              background: 'var(--bg-raised)',
              border: '0.5px solid var(--border)',
              borderRadius: 10,
              color: 'var(--text-primary)',
              fontSize: 14,
              fontFamily: 'inherit',
            }}
          />

          <input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              padding: '11px 12px',
              background: 'var(--bg-raised)',
              border: '0.5px solid var(--border)',
              borderRadius: 10,
              color: 'var(--text-primary)',
              fontSize: 14,
              fontFamily: 'inherit',
            }}
          />

          <button
            onClick={login}
            disabled={loading || !email.trim() || !password}
            style={{
              marginTop: 2,
              width: '100%',
              padding: '11px 14px',
              borderRadius: 10,
              border: '0.5px solid transparent',
              background: loading || !email.trim() || !password ? 'var(--bg-hover)' : 'var(--brand)',
              color: loading || !email.trim() || !password ? 'var(--text-muted)' : openBrainStyle.buttonTextOnBrand,
              fontWeight: 600,
              fontSize: 14,
              fontFamily: 'inherit',
              cursor: loading || !email.trim() || !password ? 'not-allowed' : 'pointer',
              transition: 'background .15s ease, color .15s ease',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>

        {error && (
          <p
            style={{
              marginTop: 12,
              marginBottom: 0,
              color: openBrainStyle.dangerStrong,
              fontSize: 12,
              background: openBrainStyle.dangerBg,
              border: `0.5px solid ${openBrainStyle.dangerBorder}`,
              borderRadius: 8,
              padding: '8px 10px',
            }}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
