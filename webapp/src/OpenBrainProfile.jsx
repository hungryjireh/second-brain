import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '/api';

function initialsFromName(name) {
  const cleaned = String(name || '').trim();
  if (!cleaned) return '?';
  return cleaned.slice(0, 1).toUpperCase();
}

function mutedTint(seed = '') {
  const palette = ['#514876', '#495072', '#5a465f', '#425467', '#5c4f46', '#4f4f70'];
  const total = Array.from(seed).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return palette[total % palette.length];
}

export default function OpenBrainProfile() {
  const navigate = useNavigate();
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [thoughts, setThoughts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFollowBusy, setIsFollowBusy] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const isOwnProfileRoute = !username;
  const menuItemStyle = useMemo(
    () => ({
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
    }),
    []
  );

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('authToken');
    if (isOwnProfileRoute && !token) {
      navigate('/login', { replace: true });
      return undefined;
    }

    const loadProfile = async () => {
      try {
        const query = isOwnProfileRoute ? '' : `?username=${encodeURIComponent(username)}`;
        const res = await fetch(`${API}/open-brain/profile${query}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!isMounted) return;
        if (res.status === 401) {
          localStorage.removeItem('authToken');
          navigate('/login', { replace: true });
          return;
        }
        if (res.status === 404) {
          setError('Profile not found.');
          setProfile(null);
          return;
        }

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to load profile');
        const loadedProfile = data?.profile || null;
        setProfile(loadedProfile);

        if (loadedProfile?.id) {
          const thoughtsRes = await fetch(`${API}/open-brain/public-thoughts?user_id=${encodeURIComponent(loadedProfile.id)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          const thoughtsData = await thoughtsRes.json().catch(() => ({}));
          if (thoughtsRes.ok) {
            setThoughts(Array.isArray(thoughtsData?.thoughts) ? thoughtsData.thoughts : []);
          } else {
            setThoughts([]);
          }
        } else {
          setThoughts([]);
        }
      } catch (err) {
        if (isMounted) setError(err?.message || 'Failed to load profile');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [isOwnProfileRoute, navigate, username]);

  const handleToggleFollow = async () => {
    if (!profile || profile.is_self || isFollowBusy) return;
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const currentlyFollowing = Boolean(profile.is_following);
    setIsFollowBusy(true);
    setProfile(current => (current ? { ...current, is_following: !currentlyFollowing } : current));

    try {
      if (currentlyFollowing) {
        const res = await fetch(`${API}/open-brain/follows?following_id=${encodeURIComponent(profile.id)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to unfollow');
      } else {
        const res = await fetch(`${API}/open-brain/follows`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ following_id: profile.id }),
        });
        if (!res.ok) throw new Error('Failed to follow');
      }
    } catch {
      setProfile(current => (current ? { ...current, is_following: currentlyFollowing } : current));
    } finally {
      setIsFollowBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: 20, background: 'var(--bg-base)' }}>
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
              <span aria-hidden="true" style={{ width: 14, display: 'inline-flex', justifyContent: 'center', flexShrink: 0, fontSize: 14, lineHeight: 1 }}>⌂</span>
              <span>Home</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsDrawerOpen(false);
                navigate('/open-brain/write');
              }}
              style={menuItemStyle}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <span aria-hidden="true" style={{ width: 14, display: 'inline-flex', justifyContent: 'center', flexShrink: 0, fontSize: 14, lineHeight: 1 }}>≡</span>
              <span>Write</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsDrawerOpen(false);
                navigate('/open-brain/you');
              }}
              style={menuItemStyle}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <span aria-hidden="true" style={{ width: 14, display: 'inline-flex', justifyContent: 'center', flexShrink: 0, fontSize: 14, lineHeight: 1 }}>◉</span>
              <span>You</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsDrawerOpen(false);
                navigate('/open-brain/update-profile');
              }}
              style={menuItemStyle}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <span aria-hidden="true" style={{ width: 14, display: 'inline-flex', justifyContent: 'center', flexShrink: 0, fontSize: 14, lineHeight: 1 }}>⚙</span>
              <span>Update profile</span>
            </button>
            <div style={{ marginTop: 'auto', paddingTop: 8 }}>
              <div aria-hidden="true" style={{ height: 1, margin: '0 12px 8px', background: 'var(--border)' }} />
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
                <span aria-hidden="true" style={{ width: 14, display: 'inline-flex', justifyContent: 'center', flexShrink: 0, fontSize: 14, lineHeight: 1 }}>◫</span>
                <span>Apps</span>
              </button>
            </div>
          </aside>
        </>
      )}
      <main
        style={{
          width: '100%',
          maxWidth: 620,
          margin: '0 auto',
          border: '0.5px solid var(--border)',
          borderRadius: 16,
          background: 'var(--bg-surface)',
          boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
          overflow: 'hidden',
        }}
      >
        <section style={{ padding: 18, display: 'grid', gap: 16 }}>
          {isLoading ? <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Loading profile…</p> : null}
          {!isLoading && error ? <p style={{ margin: 0, color: '#f87171', fontSize: 13 }}>{error}</p> : null}
          {!isLoading && !error && profile ? (
            <article style={{ border: '0.5px solid var(--border)', borderRadius: 14, padding: 16, background: 'var(--bg-raised)', display: 'grid', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={`${profile.username} avatar`} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <span
                    aria-hidden="true"
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      display: 'inline-grid',
                      placeItems: 'center',
                      fontSize: 24,
                      fontWeight: 700,
                      background: mutedTint(profile.username),
                      color: '#f0ede8',
                    }}
                  >
                    {initialsFromName(profile.username)}
                  </span>
                )}
                <div style={{ display: 'grid', gap: 4, flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 22, color: 'var(--text-primary)', fontWeight: 700 }}>@{profile.username}</p>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>🔥 streak {Number.isInteger(profile.streak_count) ? profile.streak_count : 0}</p>
                </div>
                {!profile.is_self ? (
                  <button
                    type="button"
                    onClick={handleToggleFollow}
                    disabled={isFollowBusy}
                    style={{
                      border: '0.5px solid var(--border)',
                      borderRadius: 999,
                      padding: '7px 12px',
                      background: profile.is_following ? 'var(--bg-hover)' : '#2f9de4',
                      color: profile.is_following ? 'var(--text-secondary)' : '#f2fbff',
                      fontSize: 12,
                      cursor: isFollowBusy ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {profile.is_following ? 'unfollow' : 'follow'}
                  </button>
                ) : null}
              </div>
            </article>
          ) : null}
          {!isLoading && !error && profile ? (
            <section style={{ display: 'grid', gap: 10 }}>
              {thoughts.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontStyle: 'italic' }}>No public thoughts yet.</p>
              ) : (
                thoughts.map(thought => (
                  <article
                    key={thought.id}
                    style={{
                      border: '0.5px solid var(--border)',
                      borderRadius: 12,
                      padding: '12px 14px',
                      background: 'var(--bg-surface)',
                      display: 'grid',
                      gap: 8,
                    }}
                  >
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 12 }}>
                      {new Date(thought.created_at).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontFamily: 'DM Serif Display, serif',
                        fontSize: 'clamp(18px, 1.5vw, 24px)',
                        lineHeight: 1.8,
                        color: 'var(--text-primary)',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {thought.text}
                    </p>
                  </article>
                ))
              )}
            </section>
          ) : null}
        </section>
      </main>
    </div>
  );
}
