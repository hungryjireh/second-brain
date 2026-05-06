import test from 'node:test';
import assert from 'node:assert/strict';

async function importFresh(path, tag) {
  return import(`${path}?t=${Date.now()}-${tag}`);
}

test('telegram link key embeds provided auth token', async () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-secret';

  try {
    const {
      createTelegramLinkKey,
      verifyTelegramLinkKey,
    } = await importFresh('../../lib/auth.js', 'telegram-session-token');

    const linkKey = createTelegramLinkKey('123e4567-e89b-42d3-a456-426614174000', 'short-lived-login-token');
    const { userId, authToken } = verifyTelegramLinkKey(linkKey);
    assert.equal(userId, '123e4567-e89b-42d3-a456-426614174000');
    assert.equal(authToken, 'short-lived-login-token');
  } finally {
    process.env.JWT_SECRET = originalJwtSecret;
  }
});
