import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import App from './App.jsx';
import CreateProfile from './CreateProfile.jsx';
import Login from './Login.jsx';
import OpenBrainFeed from './OpenBrainFeed.jsx';
import OpenBrainProfile from './OpenBrainProfile.jsx';
import SharedThoughtPage from './SharedThoughtPage.jsx';
import NotFoundPage from './NotFoundPage.jsx';
import './index.css';

const API = import.meta.env.VITE_API_URL || '/api';

function AppLogo({ name }) {
  if (name === 'second-brain') {
    return (
      <span
        style={{
          fontFamily: 'DM Serif Display, serif',
          fontSize: 25,
          letterSpacing: '-0.3px',
          color: 'var(--text-primary)',
        }}
      >
        second<span style={{ color: 'var(--brand)' }}>brain</span>
      </span>
    );
  }

  return (
    <span
      style={{
        fontFamily: 'DM Serif Display, serif',
        fontSize: 25,
        letterSpacing: '-0.3px',
        color: 'var(--text-primary)',
      }}
    >
      open<span style={{ color: '#7ec8ff' }}>brain</span>
    </span>
  );
}

function AppHome() {
  const token = localStorage.getItem('authToken');

  if (!token) return <Navigate to="/login" replace />;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 20,
        background:
          'radial-gradient(circle at 15% 15%, rgba(29,158,117,0.13), transparent 38%), var(--bg-base)',
      }}
    >
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
          gap: 14,
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
          Choose app
        </p>
        <h1
          style={{
            marginTop: 4,
            marginBottom: 8,
            fontFamily: 'DM Serif Display, serif',
            fontSize: 34,
            letterSpacing: '-0.4px',
            lineHeight: 1.1,
          }}
        >
          Where do you want to go?
        </h1>

        <Link
          to="/second-brain"
          aria-label="Visit second-brain"
          style={{
            display: 'block',
            padding: '14px 16px',
            borderRadius: 10,
            border: '0.5px solid var(--border)',
            background: 'var(--bg-raised)',
            textDecoration: 'none',
          }}
        >
          <AppLogo name="second-brain" />
        </Link>

        <Link
          to="/open-brain"
          aria-label="Visit open-brain"
          style={{
            display: 'block',
            padding: '14px 16px',
            borderRadius: 10,
            border: '0.5px solid var(--border)',
            background: 'var(--bg-raised)',
            textDecoration: 'none',
          }}
        >
          <AppLogo name="open-brain" />
        </Link>
      </div>
    </div>
  );
}

function ProtectedOpenBrain() {
  const [status, setStatus] = React.useState('loading');
  const token = localStorage.getItem('authToken');

  if (!token) return <Navigate to="/login" replace />;

  React.useEffect(() => {
    let isMounted = true;

    async function checkProfile() {
      try {
        const res = await fetch(`${API}/open-brain/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!isMounted) return;
        if (res.status === 404) {
          setStatus('missing');
          return;
        }
        if (res.status === 401) {
          localStorage.removeItem('authToken');
          setStatus('unauthorized');
          return;
        }
        if (!res.ok) {
          setStatus('error');
          return;
        }

        setStatus('ready');
      } catch {
        if (isMounted) setStatus('error');
      }
    }

    checkProfile();

    return () => {
      isMounted = false;
    };
  }, [token]);

  if (status === 'loading') return null;
  if (status === 'unauthorized') return <Navigate to="/login" replace />;
  if (status === 'missing') return <Navigate to="/open-brain/create-profile" replace />;

  return <OpenBrainFeed />;
}

function ProtectedCreateProfile() {
  const [status, setStatus] = React.useState('loading');
  const token = localStorage.getItem('authToken');

  if (!token) return <Navigate to="/login" replace />;

  React.useEffect(() => {
    let isMounted = true;

    async function checkProfile() {
      try {
        const res = await fetch(`${API}/open-brain/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!isMounted) return;
        if (res.status === 404) {
          setStatus('missing');
          return;
        }
        if (res.status === 401) {
          localStorage.removeItem('authToken');
          setStatus('unauthorized');
          return;
        }
        if (!res.ok) {
          setStatus('error');
          return;
        }

        setStatus('has-profile');
      } catch {
        if (isMounted) setStatus('error');
      }
    }

    checkProfile();

    return () => {
      isMounted = false;
    };
  }, [token]);

  if (status === 'loading') return null;
  if (status === 'unauthorized') return <Navigate to="/login" replace />;
  if (status === 'has-profile') return <Navigate to="/open-brain" replace />;

  return <CreateProfile />;
}

function ProtectedApp() {
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');

  if (!token) return <Navigate to="/login" replace />;

  return (
    <App
      authToken={token}
      onUnauthorized={() => {
        localStorage.removeItem('authToken');
        navigate('/login', { replace: true });
      }}
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/apps" element={<AppHome />} />
        <Route path="/open-brain" element={<ProtectedOpenBrain />} />
        <Route path="/open-brain/feed" element={<OpenBrainFeed />} />
        <Route path="/open-brain/u/:username" element={<OpenBrainProfile />} />
        <Route path="/open-brain/t/:slug" element={<SharedThoughtPage />} />
        <Route path="/open-brain/create-profile" element={<ProtectedCreateProfile />} />
        <Route path="/second-brain/*" element={<ProtectedApp />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
