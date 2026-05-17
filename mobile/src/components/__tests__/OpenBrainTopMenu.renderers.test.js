jest.mock('../../api', () => ({
  apiRequest: jest.fn(),
  sendFollowNotification: jest.fn(),
}));

import { __testables } from '../OpenBrainTopMenu';

describe('OpenBrainTopMenu notification view models', () => {
  it('builds follow notification model deterministically', () => {
    const model = __testables.buildNotificationViewModel({
      type: 'follow',
      profiles: { username: 'alice' },
      actor_id: 'actor-1',
    });

    expect(model).toEqual({
      username: 'alice',
      segments: [
        { type: 'actor', text: '@alice' },
        { type: 'text', text: ' is now following your thoughts' },
      ],
      action: null,
    });
  });

  it('builds reaction notification model with normalized reaction label', () => {
    const item = {
      id: 'n-1',
      type: 'reaction',
      profiles: { username: 'alice' },
      payload: { reaction_type: 'made_me_think' },
    };
    const model = __testables.buildNotificationViewModel(item);

    expect(model).toEqual({
      username: 'alice',
      segments: [
        { type: 'actor', text: '@alice' },
        { type: 'text', text: ' has reacted "made me think" to your ' },
        { type: 'thought', text: 'thought' },
      ],
      action: { type: 'open_thought', thought: item },
    });
  });

  it('builds default model for unknown notification types', () => {
    const model = __testables.buildNotificationViewModel({
      type: 'mention',
      actor_id: 'unknown-user',
    });

    expect(model).toEqual({
      username: 'unknown-user',
      segments: [
        { type: 'actor', text: '@unknown-user' },
        { type: 'text', text: ' sent a mention' },
      ],
      action: null,
    });
  });
});
