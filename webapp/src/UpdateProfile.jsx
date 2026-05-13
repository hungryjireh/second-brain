import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { theme } from './constants/theme';

const API = import.meta.env.VITE_API_URL || '/api';

export default function UpdateProfile({ embedded = false }) {
  const navigate = useNavigate();
  const defaultTimezone = 'Asia/Singapore';
  const timezoneOptions = useMemo(
    () => ['Asia/Singapore', 'UTC', 'Asia/Manila', 'Asia/Jakarta', 'Asia/Bangkok', 'Asia/Tokyo', 'America/Los_Angeles', 'America/New_York', 'Europe/London'],
    []
  );
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const menuItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 16px',
    margin: '0 8px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontFamily: 'inherit',
    fontSize: 12,
    transition: 'color .12s',
    textAlign: 'left',
  };

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      const token = localStorage.getItem('authToken');
      if (!token) {
        navigate('/login', { replace: true });
        return;
      }

      try {
        const res = await fetch(`${API}/open-brain/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json().catch(() => ({}));
        if (!isMounted) return;

        if (res.status === 401) {
          localStorage.removeItem('authToken');
          navigate('/login', { replace: true });
          return;
        }

        if (res.status === 404) {
          navigate('/open-brain/create-profile', { replace: true });
          return;
        }

        if (!res.ok) throw new Error(data.error || `API error ${res.status}`);

        setUsername(String(data.profile?.username || ''));
        setAvatarUrl(String(data.profile?.avatar_url || ''));
        setTimezone(String(data.profile?.timezone || defaultTimezone));
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load your profile.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [defaultTimezone, navigate]);

  async function handleUpdateProfile(event) {
    event.preventDefault();
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API}/open-brain/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          avatar_url: avatarUrl,
          timezone,
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        localStorage.removeItem('authToken');
        navigate('/login', { replace: true });
        return;
      }
      if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update your profile.');
    } finally {
      setSaving(false);
    }
  }

  const form = (
    <form
      onSubmit={handleUpdateProfile}
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
        Open-brain profile
      </p>
      <h1 style={{ margin: 0, fontFamily: theme.fonts.serif, fontSize: 34, lineHeight: 1.1 }}>
        Update your profile
      </h1>
      <p style={{ marginTop: 0, marginBottom: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
        Keep your profile details up to date.
      </p>

      <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
        Username
        <input
          type="text"
          value={username}
          placeholder="e.g. jireh"
          maxLength={24}
          required
          disabled
          style={{
            padding: '11px 12px',
            background: 'var(--bg-raised)',
            border: '0.5px solid var(--border)',
            borderRadius: 10,
            color: 'var(--text-muted)',
            fontSize: 14,
            fontFamily: 'inherit',
            cursor: 'not-allowed',
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
        <select
          value={timezone}
          onChange={e => setTimezone(e.target.value)}
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
        >
          {timezoneOptions.map(tz => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        disabled={saving || !username.trim() || !timezone.trim()}
        style={{
          marginTop: 8,
          width: '100%',
          padding: '11px 14px',
          borderRadius: 10,
          border: '0.5px solid transparent',
          background: saving || !username.trim() || !timezone.trim() ? 'var(--bg-hover)' : theme.colors.accentStrong,
          color: saving || !username.trim() || !timezone.trim() ? 'var(--text-muted)' : '#f2fbff',
          fontWeight: 600,
          fontSize: 14,
          fontFamily: 'inherit',
          cursor: saving || !username.trim() || !timezone.trim() ? 'not-allowed' : 'pointer',
        }}
      >
        {saving ? 'Saving profile...' : 'Update Profile'}
      </button>

      <button
        type="button"
        onClick={() => navigate('/open-brain')}
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
        Cancel
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

      {success && (
        <p
          style={{
            margin: 0,
            color: '#86efac',
            fontSize: 12,
            background: 'rgba(34,197,94,0.12)',
            border: '0.5px solid rgba(34,197,94,0.35)',
            borderRadius: 8,
            padding: '8px 10px',
          }}
        >
          {success}
        </p>
      )}
    </form>
  );

  const loadingView = (
    <div
      style={{
        width: '100%',
        maxWidth: 560,
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
        display: 'grid',
        gap: 10,
      }}
    >
      <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: theme.colors.accent, fontWeight: 600 }}>
        Open-brain profile
      </p>
      <h1 style={{ margin: 0, fontFamily: theme.fonts.serif, fontSize: 34, lineHeight: 1.1 }}>
        Update your profile
      </h1>
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>Loading profile…</p>
    </div>
  );

  if (embedded) {
    return loading ? loadingView : form;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 20,
        background:
          `radial-gradient(circle at 15% 15%, ${theme.colors.accentBg}, transparent 40%), var(--bg-base)`,
      }}
    >
      <button
        type="button"
        onClick={() => setIsDrawerOpen(prev => !prev)}
        aria-label="Open menu"
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          width: 28,
          height: 28,
          border: '0.5px solid var(--border)',
          borderRadius: 7,
          background: 'var(--bg-raised)',
          color: 'var(--text-secondary)',
          fontSize: 15,
          lineHeight: 1,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          zIndex: 40,
        }}
      >
        ☰
      </button>

      {isDrawerOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setIsDrawerOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              border: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 45,
            }}
          />
          <aside
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: 'min(82vw, 168px)',
              borderRight: '0.5px solid var(--border)',
              background: 'var(--bg-surface)',
              boxShadow: '10px 0 30px rgba(0,0,0,0.3)',
              padding: '16px 0',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setIsDrawerOpen(false);
                navigate('/open-brain');
              }}
              style={menuItemStyle}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
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
                ⌂
              </span>
              <span>Home</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsDrawerOpen(false);
                navigate('/open-brain?card=write');
              }}
              style={menuItemStyle}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
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
                ≡
              </span>
              <span>Write</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsDrawerOpen(false);
                navigate('/open-brain?card=you');
              }}
              style={menuItemStyle}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
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
                ◉
              </span>
              <span>You</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsDrawerOpen(false);
                navigate('/open-brain?card=update-profile');
              }}
              style={menuItemStyle}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
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
              <span>Update profile</span>
            </button>
            <div style={{ marginTop: 'auto', paddingTop: 8 }}>
              <div
                aria-hidden="true"
                style={{
                  height: 1,
                  margin: '0 12px 8px',
                  background: 'var(--border)',
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  navigate('/apps');
                }}
                style={menuItemStyle}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
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
                  ◫
                </span>
                <span>Apps</span>
              </button>
            </div>
          </aside>
        </>
      )}

      {loading ? loadingView : form}
    </div>
  );
}
