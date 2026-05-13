import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import NotFoundPage from './NotFoundPage.jsx';
import { theme } from './constants/theme';

const API = import.meta.env.VITE_API_URL || '/api';
const SHARE_PROMPT_ENDPOINTS = [`${API}/share-prompts`, '/api/static/share-prompts.json', '/share-prompts.json'];

function formatPublished(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function SharedThoughtPage() {
  const { slug = '' } = useParams();
  const [status, setStatus] = useState('loading');
  const [thought, setThought] = useState(null);
  const [copied, setCopied] = useState(false);
  const [ctaPrompt, setCtaPrompt] = useState('Explore Openbrain');

  useEffect(() => {
    let isMounted = true;

    async function loadThought() {
      const safeSlug = String(slug || '').trim();
      if (!safeSlug) {
        if (isMounted) setStatus('not-found');
        return;
      }

      try {
        const res = await fetch(`${API}/open-brain/shared-thought?slug=${encodeURIComponent(safeSlug)}`);
        if (!isMounted) return;

        if (res.status === 404) {
          setStatus('not-found');
          return;
        }

        if (!res.ok) {
          setStatus('error');
          return;
        }

        const data = await res.json().catch(() => ({}));
        if (!isMounted || !data?.thought) {
          setStatus('not-found');
          return;
        }

        setThought(data);
        setStatus('ready');
      } catch {
        if (isMounted) setStatus('error');
      }
    }

    loadThought();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  useEffect(() => {
    let isMounted = true;

    async function loadSharePrompt() {
      for (const endpoint of SHARE_PROMPT_ENDPOINTS) {
        try {
          const response = await fetch(endpoint);
          if (!response.ok) continue;
          const payload = await response.json();
          const prompts = Object.values(payload || {})
            .flatMap(group => (Array.isArray(group) ? group : []))
            .filter(prompt => typeof prompt === 'string' && prompt.trim().length > 0);
          if (!isMounted || prompts.length === 0) continue;

          const replacedPrompts = [...prompts];
          const replaceIndex = Math.floor(Math.random() * replacedPrompts.length);
          replacedPrompts[replaceIndex] = 'Open Openbrain';

          const next = replacedPrompts[Math.floor(Math.random() * replacedPrompts.length)];
          setCtaPrompt(next);
          return;
        } catch {
          // Try next endpoint.
        }
      }
    }

    loadSharePrompt();

    return () => {
      isMounted = false;
    };
  }, []);

  const publishedLabel = useMemo(
    () => formatPublished(thought?.thought?.created_at),
    [thought?.thought?.created_at]
  );

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    if (!shareUrl) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'OpenBrain Thought',
          text: thought?.thought?.text || '',
          url: shareUrl,
        });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      // noop
    }
  };

  if (status === 'not-found') return <NotFoundPage />;

  if (status === 'error') {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Unable to load this thought right now.</p>
      </div>
    );
  }

  if (status === 'loading' || status !== 'ready') return null;

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
      <article
        style={{
          width: '100%',
          maxWidth: 560,
          border: '0.5px solid var(--border)',
          borderRadius: 16,
          background: 'var(--bg-surface)',
          boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
          padding: '24px 22px',
          display: 'grid',
          gap: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <p
            aria-label="openbrain"
            style={{
              margin: 0,
              fontFamily: theme.fonts.serif,
              fontSize: 40,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              fontWeight: 700,
            }}
          >
            <span style={{ color: '#f0f1f2' }}>open</span>
            <span style={{ color: '#78c0ff' }}>brain</span>
          </p>
        </div>

        <h1
          style={{
            margin: 0,
            fontFamily: theme.fonts.serif,
            fontSize: 34,
            lineHeight: 1.1,
            letterSpacing: '-0.4px',
            padding: '8px 4px',
          }}
        >
          {thought.thought.text}
        </h1>

        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
          {thought.author?.username ? `by @${thought.author.username}` : 'by anonymous'}
          {publishedLabel ? ` • ${publishedLabel}` : ''}
        </p>

        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            to="/open-brain"
            style={{
              border: '0.5px solid var(--border)',
              borderRadius: 10,
              textDecoration: 'none',
              padding: '9px 14px',
              color: 'var(--text-primary)',
              background: 'var(--bg-raised)',
              fontSize: 13,
              display: 'inline-block',
            }}
          >
            {ctaPrompt}
          </Link>

          <button
            type="button"
            onClick={handleShare}
            style={{
              border: '0.5px solid var(--border)',
              borderRadius: 10,
              padding: '9px 14px',
              color: 'var(--text-primary)',
              background: 'var(--bg-raised)',
              fontSize: 13,
              cursor: 'pointer',
            }}
            aria-label="Share thought"
          >
            {copied ? 'Copied' : 'Share'}
          </button>
        </div>
      </article>
    </div>
  );
}
