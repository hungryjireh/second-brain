import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { openBrainStyle } from './constants/openbrainStyle';

const API = import.meta.env.VITE_API_URL || '/api';

export default function CreateProfile() {
  const navigate = useNavigate();
  const defaultTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', []);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreateProfile(event) {
    event.preventDefault();
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}/open-brain/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username,
          avatar_url: avatarUrl,
          timezone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
      navigate('/open-brain', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
          `radial-gradient(circle at 15% 15%, ${openBrainStyle.accentBg}, transparent 40%), var(--bg-base)`,
      }}
    >
      <form
        onSubmit={handleCreateProfile}
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
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: openBrainStyle.accent, fontWeight: 600 }}>
          Open-brain setup
        </p>
        <h1 style={{ margin: 0, fontFamily: 'DM Serif Display, serif', fontSize: 34, lineHeight: 1.1 }}>
          Create your profile
        </h1>
        <p style={{ marginTop: 0, marginBottom: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
          You need a profile before posting your daily thought.
        </p>

        <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
          Username
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="e.g. jireh"
            maxLength={24}
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

        <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
          Avatar URL (optional)
          <input
            type="url"
            value={avatarUrl}
            onChange={e => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
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

        <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
          Timezone
          <input
            type="text"
            value={timezone}
            onChange={e => setTimezone(e.target.value)}
            placeholder="UTC"
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
          disabled={loading || !username.trim() || !timezone.trim()}
          style={{
            marginTop: 8,
            width: '100%',
            padding: '11px 14px',
            borderRadius: 10,
            border: '0.5px solid transparent',
            background: loading || !username.trim() || !timezone.trim() ? 'var(--bg-hover)' : openBrainStyle.accentStrong,
            color: loading || !username.trim() || !timezone.trim() ? 'var(--text-muted)' : '#f2fbff',
            fontWeight: 600,
            fontSize: 14,
            fontFamily: 'inherit',
            cursor: loading || !username.trim() || !timezone.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Saving profile...' : 'Create Profile'}
        </button>

        {error && (
          <p
            style={{
              margin: 0,
              color: '#f87171',
              fontSize: 12,
              background: 'rgba(220,60,60,0.1)',
              border: '0.5px solid rgba(220,60,60,0.28)',
              borderRadius: 8,
              padding: '8px 10px',
            }}
          >
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
