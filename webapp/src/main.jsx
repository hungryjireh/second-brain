import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import App from './App.jsx';
import Login from './Login.jsx';
import './index.css';

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
        <Route path="*" element={<ProtectedApp />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
