import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const TOKEN_KEY = 'authToken';
let authExpiredHandler = null;

export function setAuthExpiredHandler(handler) {
  authExpiredHandler = handler;
}

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token) {
  return AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken() {
  return AsyncStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const errorMessage = String(data.error || `Request failed (${response.status})`);
    const lowerMessage = errorMessage.toLowerCase();
    const authExpired =
      response.status === 401 ||
      (response.status === 403 && (lowerMessage.includes('expired') || lowerMessage.includes('jwt')));

    if (authExpired && typeof authExpiredHandler === 'function') {
      await authExpiredHandler();
    }

    throw new Error(errorMessage);
  }

  return data;
}

export async function login(email, password) {
  return apiRequest('/auth/login', { method: 'POST', body: { email, password } });
}

export async function sendFollowNotification(token, followedUserId) {
  const targetUserId = String(followedUserId || '').trim();
  if (!token || !targetUserId) return;

  try {
    await apiRequest('/open-brain/notifications', {
      method: 'POST',
      token,
      body: {
        user_id: targetUserId,
        type: 'follow',
      },
    });
  } catch {
    // Follow should still succeed even if notification delivery fails.
  }
}
