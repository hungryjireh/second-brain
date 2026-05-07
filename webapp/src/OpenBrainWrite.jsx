import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const MAX_CHARS = 280;
const API = import.meta.env.VITE_API_URL || '/api';
const PROMPT_ENDPOINTS = ['/api/thought-prompts', '/api/static/thought-prompts.json', '/thought-prompts.json'];
const THANK_YOU_PROMPT_ENDPOINTS = [
  '/api/thank-you-for-sharing-prompt',
  '/api/static/thank-you-for-sharing-prompt.json',
  '/thank-you-for-sharing-prompt.json',
];

function formatTodayLabel(date) {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  return `${dayName} ${day} ${month}`;
}

function formatTimeLabel(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function flattenPrompts(payload) {
  if (!payload || typeof payload !== 'object') return [];
  return Object.values(payload)
    .flatMap(group => (Array.isArray(group) ? group : []))
    .filter(prompt => typeof prompt === 'string' && prompt.trim().length > 0);
}

function getRandomPrompt(prompts, currentPrompt = '') {
  if (!Array.isArray(prompts) || prompts.length === 0) return '';
  if (prompts.length === 1) return prompts[0];

  let next = currentPrompt;
  while (next === currentPrompt) {
    next = prompts[Math.floor(Math.random() * prompts.length)];
  }
  return next;
}

async function loadThoughtPrompts() {
  for (const endpoint of PROMPT_ENDPOINTS) {
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

async function loadThankYouPrompts() {
  for (const endpoint of THANK_YOU_PROMPT_ENDPOINTS) {
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

export default function OpenBrainWrite({ embedded = false }) {
  const thoughtTextareaRef = useRef(null);
  const [thought, setThought] = useState('');
  const [isPosted, setIsPosted] = useState(false);
  const [visibility, setVisibility] = useState('public');
  const [promptPool, setPromptPool] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [thankYouPromptPool, setThankYouPromptPool] = useState([]);
  const [postedTitle, setPostedTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [streakCount, setStreakCount] = useState(0);
  const [showStreakLabel, setShowStreakLabel] = useState(false);
  const navigate = useNavigate();
  const todayLabel = useMemo(() => formatTodayLabel(new Date()), []);
  const timeLabel = useMemo(() => formatTimeLabel(new Date()), []);
  const remaining = MAX_CHARS - thought.length;
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
      const prompts = await loadThoughtPrompts();
      if (!isMounted) return;

      setPromptPool(prompts);
      setPrompt(getRandomPrompt(prompts));
    };

    fetchPrompts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchThankYouPrompts = async () => {
      const prompts = await loadThankYouPrompts();
      if (!isMounted) return;
      setThankYouPromptPool(prompts);
    };

    fetchThankYouPrompts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('authToken');
    if (!token) return undefined;

    const loadProfile = async () => {
      try {
        const res = await fetch(`${API}/open-brain/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!isMounted || !res.ok) return;
        const data = await res.json();
        if (!isMounted) return;
        setStreakCount(Number.isInteger(data?.profile?.streak_count) ? data.profile.streak_count : 0);
      } catch {
        // noop
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('authToken');
    if (!token) return undefined;

    const loadTodaysThought = async () => {
      try {
        const res = await fetch(`${API}/open-brain/thoughts`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!isMounted) return;
        if (res.status === 401) {
          localStorage.removeItem('authToken');
          navigate('/login', { replace: true });
          return;
        }
        if (!res.ok) return;

        const data = await res.json().catch(() => ({}));
        if (!isMounted || !data?.has_posted_today || !data?.thought) return;

        const postedThoughtText = typeof data.thought?.content?.text === 'string'
          ? data.thought.content.text
          : '';
        setThought(postedThoughtText);
        setVisibility(data.thought?.visibility === 'private' ? 'private' : 'public');
        setIsPosted(true);
      } catch {
        // noop
      }
    };

    loadTodaysThought();
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const refreshPrompt = useCallback(() => {
    setPrompt(current => getRandomPrompt(promptPool, current));
  }, [promptPool]);

  useEffect(() => {
    if (!isPosted) return;
    setPostedTitle(current => getRandomPrompt(thankYouPromptPool, current));
  }, [isPosted, thankYouPromptPool]);

  const handleChange = event => {
    const next = event.target.value.slice(0, MAX_CHARS);
    setThought(next);
  };

  useEffect(() => {
    const textarea = thoughtTextareaRef.current;
    if (!textarea || isPosted) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [thought, isPosted]);

  const handleDone = async () => {
    if (!thought.trim() || isSaving) return;
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const res = await fetch(`${API}/open-brain/thoughts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          thought: thought.trim(),
          visibility,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        localStorage.removeItem('authToken');
        navigate('/login', { replace: true });
        return;
      }
      if (!res.ok) throw new Error(data?.error || `API error ${res.status}`);

      setIsPosted(true);
      setStreakCount(Number.isInteger(data?.profile?.streak_count) ? data.profile.streak_count : streakCount);
    } catch (err) {
      setError(err?.message || 'Failed to save thought');
    } finally {
      setIsSaving(false);
    }
  };

  const mainCard = (
    <main
      style={{
        width: '100%',
        maxWidth: embedded ? '100%' : 760,
        minHeight: embedded ? undefined : 'calc(100vh - 120px)',
        border: '0.5px solid var(--border)',
        borderRadius: 16,
        background: 'var(--bg-surface)',
        boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
        display: 'grid',
        gridTemplateRows: '1fr auto',
      }}
    >
      <section style={{ padding: '20px clamp(14px, 2.2vw, 20px) 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <p
            style={{
              margin: 0,
              color: 'var(--text-secondary)',
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {todayLabel} • {timeLabel}
          </p>
          <button
            type="button"
            aria-label={`Streak: ${streakCount}`}
            title={`Streak: ${streakCount}`}
            onMouseEnter={() => setShowStreakLabel(true)}
            onMouseLeave={() => setShowStreakLabel(false)}
            onFocus={() => setShowStreakLabel(true)}
            onBlur={() => setShowStreakLabel(false)}
            onClick={() => setShowStreakLabel(current => !current)}
            style={{
              margin: 0,
              color: 'var(--text-secondary)',
              fontSize: 11,
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {showStreakLabel ? `Streak: ${streakCount}` : `🔥︎ ${streakCount}`}
          </button>
        </div>

          <h1
            style={{
              margin: '12px 0 0',
              fontFamily: 'DM Serif Display, serif',
              fontSize: 'clamp(24px, 2.4vw, 30px)',
              lineHeight: 1.12,
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
            }}
          >
            {isPosted ? (postedTitle || "What's on your mind?") : "What's on your mind?"}
          </h1>

          {!isPosted && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <p
                style={{
                  margin: 0,
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                  fontStyle: 'italic',
                  minHeight: 20,
                }}
              >
                {prompt || 'Loading prompt...'}
              </p>
              <button
                type="button"
                onClick={refreshPrompt}
                disabled={promptPool.length < 2}
                aria-label="Load a new thought prompt"
                title="Load a new prompt"
                style={{
                  border: '0.5px solid var(--border)',
                  borderRadius: 999,
                  background: 'var(--bg-raised)',
                  color: 'var(--text-secondary)',
                  width: 24,
                  height: 24,
                  display: 'inline-grid',
                  placeItems: 'center',
                  fontSize: 13,
                  lineHeight: 1,
                  cursor: promptPool.length < 2 ? 'not-allowed' : 'pointer',
                  padding: 0,
                }}
              >
                ↻
              </button>
            </div>
          )}

          <div style={{ borderTop: '0.5px solid var(--border)', marginTop: 16, paddingTop: 12 }}>
            {isPosted ? (
              <>
                <article
                  style={{
                    margin: 0,
                    minHeight: 120,
                    borderRadius: 10,
                    border: '0.5px solid var(--border)',
                    background: 'var(--bg-raised)',
                    padding: '12px 14px',
                    fontFamily: 'DM Serif Display, serif',
                    fontSize: 'clamp(16px, 1.5vw, 19px)',
                    lineHeight: 1.5,
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {thought}
                </article>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  {!embedded ? (
                    <button
                      type="button"
                      onClick={() => navigate('/open-brain')}
                      style={{
                        border: '0.5px solid var(--border)',
                        borderRadius: 10,
                        background: 'var(--bg-raised)',
                        color: 'var(--text-primary)',
                        padding: '8px 12px',
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      Visit home
                    </button>
                  ) : <span />}
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12 }}>
                    you can&apos;t edit or delete this. it&apos;s yours now.
                  </p>
                </div>
              </>
            ) : (
              <textarea
                ref={thoughtTextareaRef}
                value={thought}
                onChange={handleChange}
                placeholder="Write your thought for today..."
                aria-label="Daily thought"
                style={{
                  width: '100%',
                  minHeight: 120,
                  borderRadius: 10,
                  border: '0.5px solid var(--border)',
                  background: 'var(--bg-raised)',
                  color: 'var(--text-primary)',
                  fontFamily: 'DM Serif Display, serif',
                  fontSize: 'clamp(16px, 1.5vw, 19px)',
                  lineHeight: 1.5,
                  padding: '12px 14px',
                  resize: 'none',
                  overflow: 'hidden',
                }}
              />
            )}
          </div>
        </section>

        <footer
          style={{
            borderTop: '0.5px solid var(--border)',
            padding: '10px clamp(14px, 2.2vw, 20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{remaining} left</p>
            <button
              type="button"
              onClick={() => setVisibility(current => (current === 'public' ? 'private' : 'public'))}
              disabled={isPosted}
              aria-label={`Visibility: ${visibility}`}
              aria-pressed={visibility === 'private'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                border: '0.5px solid var(--border)',
                borderRadius: 999,
                background: 'var(--bg-raised)',
                color: 'var(--text-secondary)',
                padding: '4px 10px 4px 6px',
                fontSize: 12,
                fontWeight: 600,
                cursor: isPosted ? 'not-allowed' : 'pointer',
              }}
            >
              <span
                style={{
                  position: 'relative',
                  width: 34,
                  height: 18,
                  borderRadius: 999,
                  background: visibility === 'public' ? 'rgba(29,158,117,0.3)' : 'rgba(255,255,255,0.12)',
                  transition: 'background .18s ease',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: visibility === 'public' ? 18 : 2,
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: visibility === 'public' ? 'var(--brand)' : 'var(--text-secondary)',
                    transition: 'left .18s ease, background .18s ease',
                  }}
                />
              </span>
              <span style={{ textTransform: 'capitalize', color: 'var(--text-primary)' }}>{visibility}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleDone}
            disabled={isPosted || isSaving || !thought.trim()}
            style={{
              border: '0.5px solid var(--border)',
              borderRadius: 10,
              background: isPosted || isSaving || !thought.trim() ? 'rgba(255,255,255,0.04)' : 'transparent',
              color: isPosted || isSaving || !thought.trim() ? 'var(--text-secondary)' : 'var(--text-primary)',
              padding: '9px 16px',
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1,
              fontFamily: 'DM Sans, sans-serif',
              cursor: isPosted || isSaving || !thought.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {isSaving ? 'Saving...' : isPosted ? '✓' : 'Done'}
          </button>
        </footer>
        {error && (
          <p
            style={{
              margin: 0,
              padding: '8px 12px 12px',
              color: '#f87171',
              fontSize: 12,
            }}
          >
            {error}
          </p>
        )}
    </main>
  );

  if (embedded) return mainCard;

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
                navigate('/open-brain/write');
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
                navigate('/open-brain/you');
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
                navigate('/open-brain/update-profile');
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
      {mainCard}
    </div>
  );
}
