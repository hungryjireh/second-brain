describe('buildThoughtSharePayload', () => {
  function loadShareModule({
    apiUrl = 'http://localhost:3000/api',
    shareBaseUrl = '',
    webUrl = '',
  } = {}) {
    jest.resetModules();
    process.env.EXPO_PUBLIC_API_URL = apiUrl;
    process.env.EXPO_PUBLIC_SHARE_BASE_URL = shareBaseUrl;
    process.env.EXPO_PUBLIC_WEB_URL = webUrl;
    // eslint-disable-next-line global-require
    return require('../share');
  }

  afterEach(() => {
    jest.resetModules();
    delete process.env.EXPO_PUBLIC_API_URL;
    delete process.env.EXPO_PUBLIC_SHARE_BASE_URL;
    delete process.env.EXPO_PUBLIC_WEB_URL;
  });

  it('returns only url when share slug exists', () => {
    const { buildThoughtSharePayload } = loadShareModule();
    const payload = buildThoughtSharePayload({
      text: 'hello world',
      share_slug: 'gD4GQswVXWo',
    });

    expect(payload).toEqual({
      url: 'http://localhost:3000/shared-thought/gD4GQswVXWo',
    });
    expect(payload.message).toBeUndefined();
  });

  it('falls back to message when share slug is missing', () => {
    const { buildThoughtSharePayload } = loadShareModule();
    const payload = buildThoughtSharePayload({
      text: 'hello world',
      share_slug: '',
    });

    expect(payload).toEqual({
      message: 'hello world',
    });
  });

  it('returns null when text is empty', () => {
    const { buildThoughtSharePayload } = loadShareModule();
    const payload = buildThoughtSharePayload({
      text: '   ',
      share_slug: 'gD4GQswVXWo',
    });

    expect(payload).toBeNull();
  });

  it('upgrades non-local explicit share base URL from http to https', () => {
    const { buildSharedThoughtUrl } = loadShareModule({
      shareBaseUrl: 'http://openbrain.example.com',
    });

    expect(buildSharedThoughtUrl('gD4GQswVXWo')).toBe(
      'https://openbrain.example.com/shared-thought/gD4GQswVXWo'
    );
  });

  it('preserves localhost explicit share base URL', () => {
    const { buildSharedThoughtUrl } = loadShareModule({
      shareBaseUrl: 'http://localhost:8080',
    });

    expect(buildSharedThoughtUrl('gD4GQswVXWo')).toBe(
      'http://localhost:8080/shared-thought/gD4GQswVXWo'
    );
  });
});
