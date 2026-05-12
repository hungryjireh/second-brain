import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import OpenBrainProfile from './OpenBrainProfile.jsx';
import OpenBrainWrite from './OpenBrainWrite.jsx';
import UpdateProfile from './UpdateProfile.jsx';
import { openBrainStyle } from './constants/openbrainStyle';

const API = import.meta.env.VITE_API_URL || '/api';
const FEED_PROMPT_ENDPOINTS = ['/api/feed-prompts', '/api/static/feed-prompts.json', '/feed-prompts.json'];
const REACTIONS = [
  { key: 'felt_this', label: 'felt this' },
  { key: 'me_too', label: 'me too' },
  { key: 'made_me_think', label: 'made me think' },
];

function formatTimeLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

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

function flattenPrompts(payload) {
  if (!payload || typeof payload !== 'object') return [];
  return Object.values(payload)
    .flatMap(group => (Array.isArray(group) ? group : []))
    .filter(prompt => typeof prompt === 'string' && prompt.trim().length > 0);
}

function getRandomPrompt(prompts) {
  if (!Array.isArray(prompts) || prompts.length === 0) return 'feed';
  return prompts[Math.floor(Math.random() * prompts.length)];
}

async function loadFeedPrompts() {
  for (const endpoint of FEED_PROMPT_ENDPOINTS) {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) continue;
      const data = await response.json();
      const prompts = flattenPrompts(data);
      if (prompts.length > 0) return prompts;
    } catch {
      // Try the next endpoint.
    }
  }
  return [];
}

function ThoughtCard({ item, onReact, reactingKey, onToggleFollow, followBusyUserId, onOpenProfile }) {
  const name = item.profile?.username || 'unknown';
  const avatarUrl = item.profile?.avatar_url || '';
  const streak = Number.isInteger(item.profile?.streak_count) ? item.profile.streak_count : 0;
  const isSelf = Boolean(item.profile?.is_self);
  const isFollowing = Boolean(item.profile?.is_following);
  const followBusy = followBusyUserId === item.user_id;
  const thoughtText = typeof item.text === 'string'
    ? item.text
      .replace(/\r\n?/g, '\n')
      .replace(/\u2028|\u2029/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .trim()
    : '';

  return (
    <article
      style={{
        border: '1px solid rgba(255,255,255,0.03)',
        borderRadius: 24,
        padding: '22px 28px 24px',
        background: '#070809',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.02)',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {avatarUrl ? (
          <button
            type="button"
            onClick={() => onOpenProfile(name)}
            style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
          >
            <img src={avatarUrl} alt={`${name} avatar`} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onOpenProfile(name)}
            style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                display: 'inline-grid',
                placeItems: 'center',
                fontSize: 20,
                fontWeight: 700,
                background: mutedTint(name),
                color: '#f0ede8',
              }}
            >
              {initialsFromName(name)}
            </span>
          </button>
        )}

        <div style={{ display: 'grid', gap: 3, flex: 1 }}>
          <p style={{ margin: 0, fontSize: 'clamp(14px, 1.15vw, 19px)', color: '#f4f2ef', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={() => onOpenProfile(name)}
              style={{ border: 'none', background: 'transparent', color: '#f4f2ef', padding: 0, font: 'inherit', cursor: 'pointer' }}
            >
              @{name}
            </button>
            <span style={{ color: 'rgba(244,242,239,0.5)', fontWeight: 500, marginInline: 8 }}>·</span>
            <span style={{ fontSize: '0.78em', marginRight: 6 }}>🔥</span>
            <span style={{ color: 'rgba(244,242,239,0.78)', fontWeight: 600, fontSize: '0.9em' }}>{streak}</span>
          </p>
          <p style={{ margin: 0, fontSize: 'clamp(11px, 0.88vw, 13px)', color: 'rgba(244,242,239,0.5)', lineHeight: 1 }}>{formatTimeLabel(item.created_at)}</p>
        </div>
        {!isSelf ? (
          <button
            type="button"
            onClick={() => onToggleFollow(item.user_id, isFollowing)}
            disabled={followBusy}
            style={{
              border: '0.5px solid rgba(255,255,255,0.2)',
              borderRadius: 999,
              padding: '6px 11px',
              background: isFollowing ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.2)',
              color: '#f5f3ef',
              fontSize: 12,
              cursor: followBusy ? 'not-allowed' : 'pointer',
            }}
          >
            {isFollowing ? 'unfollow' : 'follow'}
          </button>
        ) : null}
      </header>

      <p
        style={{
          margin: 0,
          fontFamily: openBrainStyle.serifFamily,
          fontSize: 'clamp(20px, 1.7vw, 28px)',
          lineHeight: 2,
          fontWeight: 400,
          letterSpacing: '-0.014em',
          color: '#ede9e3',
          whiteSpace: 'pre-wrap',
        }}
      >
        {thoughtText}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        {REACTIONS.map(reaction => {
          const active = Boolean(item.reactions?.mine?.[reaction.key]);
          const count = Number(item.reactions?.[reaction.key] || 0);
          const busy = reactingKey === `${item.id}-${reaction.key}`;
          return (
            <button
              key={reaction.key}
              type="button"
              onClick={() => onReact(item.id, reaction.key, active)}
              disabled={busy}
              style={{
                border: 'none',
                borderRadius: 999,
                padding: '6px 12px',
                background: active ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.09)',
                color: active ? '#f5f3ef' : 'rgba(243,241,236,0.66)',
                fontSize: 'clamp(11px, 0.88vw, 13px)',
                fontWeight: 500,
                lineHeight: 1,
                cursor: busy ? 'not-allowed' : 'pointer',
                transition: 'background 140ms ease, color 140ms ease',
              }}
            >
              {reaction.label}
              {count > 0 ? ` ${count}` : ''}
            </button>
          );
        })}
      </div>
    </article>
  );
}

function MissingThoughtCard({ item }) {
  const name = item.profile?.username || 'unknown';
  const streak = Number.isInteger(item.profile?.streak_count) ? item.profile.streak_count : 0;

  return (
    <article
      style={{
        border: '0.5px solid var(--border)',
        borderRadius: 12,
        padding: '7px 8px',
        background: 'var(--bg-surface)',
        display: 'grid',
        gap: 4,
      }}
    >
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
        @{name} <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>· 🔥 {streak}</span>
      </p>
      <p style={{ margin: 0, color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 14 }}>no thought today</p>
    </article>
  );
}

export default function OpenBrainFeed() {
  const [tab, setTab] = useState('following');
  const [title, setTitle] = useState('feed');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [feed, setFeed] = useState({ following: [], everyone: [] });
  const [hasPostedToday, setHasPostedToday] = useState(false);
  const [reactingKey, setReactingKey] = useState('');
  const [followBusyUserId, setFollowBusyUserId] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeCard = searchParams.get('card');
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

    const fetchPrompts = async () => {
      const prompts = await loadFeedPrompts();
      if (!isMounted) return;
      setTitle(getRandomPrompt(prompts));
    };

    fetchPrompts();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('authToken');

    if (!token) {
      navigate('/login', { replace: true });
      return undefined;
    }

    const loadFeed = async () => {
      try {
        const res = await fetch(`${API}/open-brain/feed`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!isMounted) return;

        if (res.status === 401) {
          localStorage.removeItem('authToken');
          navigate('/login', { replace: true });
          return;
        }

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Unable to load feed');

        setFeed({
          following: Array.isArray(data.following) ? data.following : [],
          everyone: Array.isArray(data.everyone) ? data.everyone : [],
        });
        setHasPostedToday(Boolean(data.has_posted_today));
        setError('');
      } catch (err) {
        if (isMounted) setError(err?.message || 'Unable to load feed');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadFeed();
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const activeList = useMemo(() => (tab === 'following' ? feed.following : feed.everyone), [tab, feed]);
  const hasMultipleThoughts = activeList.length > 1;

  if (activeCard === 'update-profile') {
    return <UpdateProfile />;
  }

  if (activeCard === 'you') {
    return <OpenBrainProfile />;
  }

  if (activeCard === 'write') {
    return <OpenBrainWrite />;
  }

  const handleReact = async (thoughtId, type, currentlyActive) => {
    const token = localStorage.getItem('authToken');
    if (!token || !thoughtId) return;

    const key = `${thoughtId}-${type}`;
    setReactingKey(key);

    setFeed(current => {
      const next = structuredClone(current);
      for (const listName of ['following', 'everyone']) {
        next[listName] = next[listName].map(item => {
          if (item.id !== thoughtId || item.missing_today) return item;
          const mine = Boolean(item.reactions?.mine?.[type]);
          const shouldEnable = !mine;
          const delta = shouldEnable ? 1 : -1;
          return {
            ...item,
            reactions: {
              ...item.reactions,
              [type]: Math.max(0, Number(item.reactions?.[type] || 0) + delta),
              mine: {
                ...item.reactions?.mine,
                [type]: shouldEnable,
              },
            },
          };
        });
      }
      return next;
    });

    try {
      if (currentlyActive) {
        const response = await fetch(`${API}/open-brain/feed?thought_id=${encodeURIComponent(thoughtId)}&type=${encodeURIComponent(type)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to remove reaction');
      } else {
        const response = await fetch(`${API}/open-brain/feed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ thought_id: thoughtId, type }),
        });
        if (!response.ok) throw new Error('Failed to add reaction');
      }
    } catch {
      setFeed(current => {
        const next = structuredClone(current);
        for (const listName of ['following', 'everyone']) {
          next[listName] = next[listName].map(item => {
            if (item.id !== thoughtId || item.missing_today) return item;
            const mine = Boolean(item.reactions?.mine?.[type]);
            const shouldEnable = !mine;
            const delta = shouldEnable ? 1 : -1;
            return {
              ...item,
              reactions: {
                ...item.reactions,
                [type]: Math.max(0, Number(item.reactions?.[type] || 0) + delta),
                mine: {
                  ...item.reactions?.mine,
                  [type]: shouldEnable,
                },
              },
            };
          });
        }
        return next;
      });
    } finally {
      setReactingKey('');
    }
  };

  const handleToggleFollow = async (targetUserId, currentlyFollowing) => {
    const token = localStorage.getItem('authToken');
    if (!token || !targetUserId) return;

    setFollowBusyUserId(targetUserId);
    setFeed(current => {
      const next = structuredClone(current);
      for (const listName of ['following', 'everyone']) {
        next[listName] = next[listName].map(item => {
          if (item.user_id !== targetUserId || !item.profile) return item;
          return {
            ...item,
            profile: {
              ...item.profile,
              is_following: !currentlyFollowing,
            },
          };
        });
      }
      if (currentlyFollowing) {
        next.following = next.following.filter(item => item.user_id !== targetUserId);
      }
      return next;
    });

    try {
      if (currentlyFollowing) {
        const response = await fetch(`${API}/open-brain/follows?following_id=${encodeURIComponent(targetUserId)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to unfollow');
      } else {
        const response = await fetch(`${API}/open-brain/follows`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ following_id: targetUserId }),
        });
        if (!response.ok) throw new Error('Failed to follow');
      }
    } catch {
      setFeed(current => {
        const next = structuredClone(current);
        for (const listName of ['following', 'everyone']) {
          next[listName] = next[listName].map(item => {
            if (item.user_id !== targetUserId || !item.profile) return item;
            return {
              ...item,
              profile: {
                ...item.profile,
                is_following: currentlyFollowing,
              },
            };
          });
        }
        return next;
      });
    } finally {
      setFollowBusyUserId('');
    }
  };

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
                navigate('/open-brain?card=write');
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
                navigate('/open-brain?card=you');
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
                navigate('/open-brain?card=update-profile');
              }}
              style={menuItemStyle}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <span aria-hidden="true" style={{ width: 14, display: 'inline-flex', justifyContent: 'center', flexShrink: 0, fontSize: 14, lineHeight: 1 }}>⚙</span>
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
          maxWidth: 780,
          margin: '0 auto',
          border: '0.5px solid var(--border)',
          borderRadius: 16,
          boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
          overflow: 'hidden',
        }}
      >
        <header style={{ borderBottom: '0.5px solid var(--border)', padding: '14px 14px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontFamily: openBrainStyle.sansFamily }}>{title}</h1>
            {!hasPostedToday ? (
              <button
                type="button"
                onClick={() => {
                  navigate('/open-brain?card=write');
                }}
                aria-label="Open new draft card"
                title="New draft"
                style={{
                  border: '0.5px solid var(--border)',
                  borderRadius: 8,
                  background: 'var(--bg-raised)',
                  color: 'var(--text-secondary)',
                  width: 28,
                  height: 28,
                  display: 'inline-grid',
                  placeItems: 'center',
                  fontSize: 14,
                  lineHeight: 1,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                ✎
              </button>
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingBottom: 12 }}>
            {['following', 'everyone'].map(name => {
              const active = tab === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setTab(name)}
                  style={{
                    border: '0.5px solid var(--border)',
                    borderRadius: 999,
                    padding: '7px 12px',
                    background: active ? 'var(--bg-raised)' : 'transparent',
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    textTransform: 'capitalize',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </header>

        <section
          style={{
            padding: '12px 14px',
            display: 'grid',
            gap: 12,
            overflowY: hasMultipleThoughts ? 'auto' : 'visible',
            maxHeight: hasMultipleThoughts ? '62vh' : 'none',
          }}
        >
          {isLoading ? <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Loading feed…</p> : null}
          {!isLoading && error ? <p style={{ margin: 0, color: '#f87171', fontSize: 13 }}>{error}</p> : null}
          {!isLoading && !error && activeList.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontStyle: 'italic' }}>No posts yet today.</p>
          ) : null}
          {!isLoading && !error && activeList.map(item => (
            item.missing_today
              ? <MissingThoughtCard key={item.id} item={item} />
              : <ThoughtCard key={item.id} item={item} onReact={handleReact} reactingKey={reactingKey} onToggleFollow={handleToggleFollow} followBusyUserId={followBusyUserId} onOpenProfile={safeUsername => navigate(`/open-brain/u/${encodeURIComponent(safeUsername)}`)} />
          ))}
        </section>

      </main>
    </div>
  );
}
