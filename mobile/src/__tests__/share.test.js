import { buildThoughtSharePayload } from '../share';

describe('buildThoughtSharePayload', () => {
  it('returns only url when share slug exists', () => {
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
    const payload = buildThoughtSharePayload({
      text: 'hello world',
      share_slug: '',
    });

    expect(payload).toEqual({
      message: 'hello world',
    });
  });

  it('returns null when text is empty', () => {
    const payload = buildThoughtSharePayload({
      text: '   ',
      share_slug: 'gD4GQswVXWo',
    });

    expect(payload).toBeNull();
  });
});
