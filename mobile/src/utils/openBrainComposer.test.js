import { loadOpenBrainComposerState } from './openBrainComposer';

describe('loadOpenBrainComposerState', () => {
  it('uses posted state only when has_posted_today is a boolean true', async () => {
    const apiRequest = jest.fn()
      .mockResolvedValueOnce({
        profile: { streak_count: 12, save_count: 7 },
      })
      .mockResolvedValueOnce({
        has_posted_today: true,
        thought: {
          visibility: 'private',
          content: { text: 'hello world' },
        },
      });

    const state = await loadOpenBrainComposerState({
      token: 'token',
      apiRequest,
      cacheProfileTtlMs: 1000,
      cacheThoughtsTtlMs: 1000,
    });

    expect(state.hasPostedToday).toBe(true);
    expect(state.draft).toBe('hello world');
    expect(state.visibility).toBe('private');
    expect(state.streakCount).toBe(12);
    expect(state.saveCount).toBe(7);
  });

  it('does not treat string has_posted_today as posted', async () => {
    const apiRequest = jest.fn()
      .mockResolvedValueOnce({
        profile: { streak_count: 2, save_count: 1 },
      })
      .mockResolvedValueOnce({
        has_posted_today: 'false',
        thought: {
          visibility: 'private',
          content: { text: 'should not be used' },
        },
      });

    const state = await loadOpenBrainComposerState({
      token: 'token',
      apiRequest,
      cacheProfileTtlMs: 1000,
      cacheThoughtsTtlMs: 1000,
    });

    expect(state.hasPostedToday).toBe(false);
    expect(state.draft).toBe('');
    expect(state.visibility).toBe('private');
  });
});
