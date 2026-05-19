function createAsyncStorageMock() {
  return {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    getAllKeys: jest.fn(),
    multiRemove: jest.fn(),
  };
}

function createSecureStoreMock() {
  return {
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
  };
}

function loadApiWith({ apiUrl, hostUri }) {
  jest.resetModules();
  const previousApiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (typeof apiUrl === 'string') process.env.EXPO_PUBLIC_API_URL = apiUrl;
  else delete process.env.EXPO_PUBLIC_API_URL;

  jest.doMock('@react-native-async-storage/async-storage', () => createAsyncStorageMock());
  jest.doMock('expo-secure-store', () => createSecureStoreMock());
  jest.doMock('expo-constants', () => ({
    expoConfig: hostUri ? { hostUri } : undefined,
    manifest2: undefined,
  }));

  const api = require('../api');
  const asyncStorage = require('@react-native-async-storage/async-storage');

  if (typeof previousApiUrl === 'string') process.env.EXPO_PUBLIC_API_URL = previousApiUrl;
  else delete process.env.EXPO_PUBLIC_API_URL;

  return { ...api, asyncStorage };
}

describe('getApiBase transport security', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('upgrades non-local configured http URL to https', () => {
    const { getApiBase } = loadApiWith({ apiUrl: 'http://api.example.com' });
    expect(getApiBase()).toBe('https://api.example.com/api');
  });

  it('preserves localhost configured http URL', () => {
    const { getApiBase } = loadApiWith({ apiUrl: 'http://localhost:3000' });
    expect(getApiBase()).toBe('http://localhost:3000/api');
  });

  it('upgrades Expo host-derived non-local URL to https', () => {
    const { getApiBase } = loadApiWith({ hostUri: '10.0.0.5:8081' });
    expect(getApiBase()).toBe('https://10.0.0.5:3000/api');
  });
});

describe('cache key token handling', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('does not include raw token text in cache key names', async () => {
    const { readCachedApiData, asyncStorage } = loadApiWith({});
    const token = 'secret-token-123';

    await readCachedApiData('/open-brain/feed', { token });
    const cacheKey = asyncStorage.getItem.mock.calls[0][0];

    expect(cacheKey).toContain('tokenScope');
    expect(cacheKey).not.toContain(token);
  });

  it('generates different cache keys for different tokens', async () => {
    const { readCachedApiData, asyncStorage } = loadApiWith({});

    await readCachedApiData('/open-brain/feed', { token: 'token-A' });
    await readCachedApiData('/open-brain/feed', { token: 'token-B' });

    const firstKey = asyncStorage.getItem.mock.calls[0][0];
    const secondKey = asyncStorage.getItem.mock.calls[1][0];
    expect(firstKey).not.toBe(secondKey);
  });

  it('invalidates only the matching token-scoped cache keys', async () => {
    const { readCachedApiData, invalidateApiCache, asyncStorage } = loadApiWith({});

    await readCachedApiData('/entries', { token: 'token-A' });
    await readCachedApiData('/entries', { token: 'token-B' });
    const tokenAKey = asyncStorage.getItem.mock.calls[0][0];
    const tokenBKey = asyncStorage.getItem.mock.calls[1][0];
    asyncStorage.getAllKeys.mockResolvedValue([tokenAKey, tokenBKey]);

    await invalidateApiCache({ token: 'token-A', exactPaths: ['/entries'] });

    expect(asyncStorage.multiRemove).toHaveBeenCalledWith([tokenAKey]);
    expect(asyncStorage.multiRemove).not.toHaveBeenCalledWith([tokenBKey]);
  });
});
