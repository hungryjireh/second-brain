import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

function isLocalHostName(hostname) {
  const host = String(hostname || "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function normalizeTransportSecurity(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (!raw.startsWith("http://")) return raw;
  try {
    const url = new URL(raw);
    if (isLocalHostName(url.hostname)) return raw;
  } catch {
    // If URL parsing fails, keep original and let fetch/reporting surface it.
    return raw;
  }
  return raw.replace(/^http:\/\//i, "https://");
}

function resolveApiBase() {
  const normalizeApiBase = (value) => {
    const secured = normalizeTransportSecurity(value);
    const trimmed = String(secured || "")
      .trim()
      .replace(/\/+$/, "");
    if (!trimmed) return "";
    return /\/api$/i.test(trimmed) ? trimmed : `${trimmed}/api`;
  };

  const configured = String(process.env.EXPO_PUBLIC_API_URL || "").trim();
  if (configured) return normalizeApiBase(configured);

  const hostUri =
    Constants?.expoConfig?.hostUri ||
    Constants?.manifest2?.extra?.expoGo?.hostUri ||
    "";
  const host = typeof hostUri === "string" ? hostUri.split(":")[0] : "";
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    return normalizeApiBase(`http://${host}:3000`);
  }

  return normalizeApiBase("http://localhost:3000");
}

const API_BASE = resolveApiBase();
const TOKEN_KEY = "authToken";
const REFRESH_TOKEN_KEY = "authRefreshToken";
const TOKEN_STORAGE_OPTIONS = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};
const CACHE_PREFIX = "apiCache:";
const cacheKeysByScope = new Map();
const loadedCacheScopes = new Set();
let authExpiredHandler = null;

function stableSerialize(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  const entries = keys.map(
    (key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`,
  );
  return `{${entries.join(",")}}`;
}

function toHex32(value) {
  return (value >>> 0).toString(16).padStart(8, "0");
}

function hashTokenForCacheScope(token) {
  const source = String(token || "");
  if (!source) return "anon";

  // FNV-1a 32-bit hash avoids storing raw bearer tokens in cache keys.
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `auth:${toHex32(hash)}`;
}

function buildCacheKey(path, token, cacheKey) {
  if (cacheKey) return `${CACHE_PREFIX}${cacheKey}`;
  return `${CACHE_PREFIX}${path}::${stableSerialize({ tokenScope: hashTokenForCacheScope(token) })}`;
}

function parseCachePathFromKey(cacheKey) {
  if (!cacheKey.startsWith(CACHE_PREFIX)) return "";
  const payload = cacheKey.slice(CACHE_PREFIX.length);
  const separatorIndex = payload.indexOf("::");
  if (separatorIndex < 0) return "";
  return payload.slice(0, separatorIndex);
}

function normalizeAuthToken(token) {
  const value = String(token || "").trim();
  if (!value) return "";
  return value.replace(/^Bearer\s+/i, "").trim();
}

export function buildApiUrl(path) {
  const normalizedPath = String(path || "").trim();
  if (!normalizedPath) return API_BASE;
  const withLeadingSlash = normalizedPath.startsWith("/")
    ? normalizedPath
    : `/${normalizedPath}`;
  return `${API_BASE}${withLeadingSlash}`;
}

export function createAuthHeaders(token) {
  const normalizedToken = normalizeAuthToken(token);
  if (!normalizedToken) return undefined;
  return { Authorization: `Bearer ${normalizedToken}` };
}

export function isLikelyOfflineError(err) {
  const message = String(err?.message || "").toLowerCase();
  return (
    message.includes("failed to fetch api") ||
    message.includes("network request failed") ||
    message.includes("network error") ||
    message.includes("offline")
  );
}

async function readCache(cacheKey) {
  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function readCachedApiData(path, { token, cacheKey } = {}) {
  const normalizedPath = String(path || "").trim();
  if (!normalizedPath) return null;
  const key = buildCacheKey(normalizedPath, token, cacheKey);
  const cached = await readCache(key);
  return cached?.data ?? null;
}

async function writeCache(cacheKey, data) {
  try {
    await AsyncStorage.setItem(
      cacheKey,
      JSON.stringify({ ts: Date.now(), data }),
    );
  } catch {
    // Cache writes are best-effort.
  }
}

function rememberCacheKeyForScope(cacheScope, cacheKey) {
  if (!cacheScope || !cacheKey) return;
  const knownKeys = cacheKeysByScope.get(cacheScope) || new Set();
  knownKeys.add(cacheKey);
  cacheKeysByScope.set(cacheScope, knownKeys);
}

async function getCacheKeysForScope(cacheScope) {
  if (!cacheScope) return [];
  if (!loadedCacheScopes.has(cacheScope)) {
    const scopeSuffix = `::${stableSerialize({ tokenScope: cacheScope })}`;
    const allKeys = await AsyncStorage.getAllKeys();
    const scopedKeys = (allKeys || []).filter(
      (key) => key.startsWith(CACHE_PREFIX) && key.endsWith(scopeSuffix),
    );
    cacheKeysByScope.set(cacheScope, new Set(scopedKeys));
    loadedCacheScopes.add(cacheScope);
  }
  return Array.from(cacheKeysByScope.get(cacheScope) || []);
}

export function setAuthExpiredHandler(handler) {
  authExpiredHandler = handler;
}

export async function getToken() {
  try {
    const secureToken = await SecureStore.getItemAsync(TOKEN_KEY);
    if (secureToken) return secureToken;
  } catch {
    // Fall back to AsyncStorage when SecureStore is unavailable.
  }

  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getRefreshToken() {
  try {
    const secureToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (secureToken) return secureToken;
  } catch {
    // Fall back to AsyncStorage when SecureStore is unavailable.
  }

  return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

async function setRefreshToken(refreshToken) {
  const normalizedRefreshToken = String(refreshToken || "");
  if (!normalizedRefreshToken) {
    await clearRefreshToken();
    return;
  }

  try {
    await SecureStore.setItemAsync(
      REFRESH_TOKEN_KEY,
      normalizedRefreshToken,
      TOKEN_STORAGE_OPTIONS,
    );
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    return;
  } catch {
    // Fall back to AsyncStorage when SecureStore is unavailable.
  }

  return AsyncStorage.setItem(REFRESH_TOKEN_KEY, normalizedRefreshToken);
}

export async function setToken(token) {
  const normalizedToken = String(token || "");
  if (!normalizedToken) {
    await clearToken();
    return;
  }

  try {
    await SecureStore.setItemAsync(
      TOKEN_KEY,
      normalizedToken,
      TOKEN_STORAGE_OPTIONS,
    );
    await AsyncStorage.removeItem(TOKEN_KEY);
    return;
  } catch {
    // Fall back to AsyncStorage when SecureStore is unavailable.
  }

  return AsyncStorage.setItem(TOKEN_KEY, normalizedToken);
}

export async function setSessionTokens({ token, refreshToken }) {
  await setToken(token);
  await setRefreshToken(refreshToken);
}

async function clearRefreshToken() {
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    // Keep clearing AsyncStorage even if SecureStore delete fails.
  }
  return AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function clearToken() {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // Keep clearing AsyncStorage even if SecureStore delete fails.
  }
  await clearRefreshToken();
  return AsyncStorage.removeItem(TOKEN_KEY);
}

function isNativeMobilePlatform() {
  return Platform.OS === "ios" || Platform.OS === "android";
}

async function refreshAccessToken() {
  if (!isNativeMobilePlatform()) return "";
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return "";

  const response = await fetch(buildApiUrl("/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : {};
  if (!response.ok) {
    return "";
  }

  const refreshedAccessToken = String(data?.token || "").trim();
  if (!refreshedAccessToken) return "";

  await setSessionTokens({
    token: refreshedAccessToken,
    refreshToken: String(data?.refreshToken || refreshToken),
  });
  return refreshedAccessToken;
}

export async function invalidateApiCache({
  token,
  exactPaths = [],
  pathPrefixes = [],
} = {}) {
  try {
    const targetPaths = new Set(
      exactPaths.map((path) => String(path || "").trim()).filter(Boolean),
    );
    const targetPrefixes = pathPrefixes
      .map((prefix) => String(prefix || "").trim())
      .filter(Boolean);
    const cacheScope = hashTokenForCacheScope(token);
    const keys = await getCacheKeysForScope(cacheScope);
    if (!keys.length) return;

    const removeKeys = keys.filter((key) => {
      if (!key.startsWith(CACHE_PREFIX)) return false;
      const cachePath = parseCachePathFromKey(key);
      if (!cachePath) return false;
      const cacheTokenSuffix = `::${stableSerialize({ tokenScope: cacheScope })}`;
      if (!key.endsWith(cacheTokenSuffix)) return false;
      if (targetPaths.has(cachePath)) return true;
      return targetPrefixes.some((prefix) => cachePath.startsWith(prefix));
    });

    if (removeKeys.length) {
      await AsyncStorage.multiRemove(removeKeys);
      const knownKeys = cacheKeysByScope.get(cacheScope) || new Set();
      for (const key of removeKeys) {
        knownKeys.delete(key);
      }
      cacheKeysByScope.set(cacheScope, knownKeys);
    }
  } catch {
    // Cache invalidation is best-effort.
  }
}

export async function apiRequest(
  path,
  { method = "GET", body, token, cache, _retryOnAuthFailure = true } = {},
) {
  const normalizedMethod = String(method || "GET").toUpperCase();
  const cacheEnabled = normalizedMethod === "GET" && cache?.enabled !== false;
  const ttlMs = Number.isFinite(cache?.ttlMs) ? Math.max(0, cache.ttlMs) : 0;
  const staleOnError = cache?.staleOnError !== false;
  const cacheKey = cacheEnabled ? buildCacheKey(path, token, cache?.key) : "";
  const cacheScope = hashTokenForCacheScope(token);
  const hasUsableCache = cacheEnabled && ttlMs > 0;
  const bypassCache = cache?.bypass === true;

  if (hasUsableCache && !bypassCache) {
    const cached = await readCache(cacheKey);
    if (cached && Date.now() - Number(cached.ts || 0) <= ttlMs) {
      return cached.data;
    }
  }

  const headers = { "Content-Type": "application/json" };
  const authHeaders = createAuthHeaders(token);
  if (authHeaders?.Authorization)
    headers.Authorization = authHeaders.Authorization;

  let response;
  let text = "";
  let data;
  try {
    response = await fetch(buildApiUrl(path), {
      method: normalizedMethod,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (hasUsableCache && staleOnError) {
      const cached = await readCache(cacheKey);
      if (cached?.data) return cached.data;
    }
    const baseHint = API_BASE.includes("localhost")
      ? ` (${API_BASE} is only reachable from the same device).`
      : "";
    const reason = String(err?.message || "").trim();
    if (reason)
      throw new Error(`Failed to fetch API: ${reason}${baseHint}`, {
        cause: err,
      });
    throw new Error(`Failed to fetch API${baseHint}`, { cause: err });
  }

  try {
    text = await response.text();
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    if (hasUsableCache && staleOnError && response.status >= 500) {
      const cached = await readCache(cacheKey);
      if (cached?.data) return cached.data;
    }

    const fallbackError =
      text && !data?.error
        ? text.slice(0, 200).trim()
        : `Request failed (${response.status})`;
    const errorMessage = String(data.error || fallbackError);
    const lowerMessage = errorMessage.toLowerCase();
    const authExpired =
      response.status === 401 ||
      (response.status === 403 &&
        (lowerMessage.includes("expired") || lowerMessage.includes("jwt")));

    if (authExpired && _retryOnAuthFailure && isNativeMobilePlatform()) {
      const refreshedAccessToken = await refreshAccessToken();
      if (refreshedAccessToken) {
        return apiRequest(path, {
          method: normalizedMethod,
          body,
          token: refreshedAccessToken,
          cache,
          _retryOnAuthFailure: false,
        });
      }
    }

    if (authExpired && typeof authExpiredHandler === "function") {
      await authExpiredHandler();
    }

    throw new Error(errorMessage);
  }

  if (hasUsableCache) {
    await writeCache(cacheKey, data);
    rememberCacheKeyForScope(cacheScope, cacheKey);
  }

  return data;
}

export function getApiBase() {
  return API_BASE;
}

export async function login(email, password) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function sendFollowNotification(token, followedUserId) {
  const targetUserId = String(followedUserId || "").trim();
  if (!token || !targetUserId) return;

  try {
    await apiRequest("/open-brain/notifications", {
      method: "POST",
      token,
      body: {
        user_id: targetUserId,
        type: "follow",
      },
    });
  } catch (err) {
    console.warn("Follow notification failed", {
      targetUserId,
      error: err?.message || "unknown error",
    });
    // Follow should still succeed even if notification delivery fails.
  }
}
