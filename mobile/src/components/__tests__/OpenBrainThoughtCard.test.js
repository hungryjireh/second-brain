import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import OpenBrainThoughtCard from '../OpenBrainThoughtCard';

function pressAddToSecondBrain(screen) {
  const directButton = screen.queryByLabelText('Add to SecondBrain') || screen.queryByLabelText('Added to SecondBrain');
  if (directButton) {
    fireEvent.press(directButton);
    return;
  }
  fireEvent.press(screen.getByLabelText('Thought actions'));
  fireEvent.press(screen.getByText(/Add to SecondBrain|Added to SecondBrain/));
}

describe('OpenBrainThoughtCard', () => {
  it('renders metadata and calls onPress', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <OpenBrainThoughtCard
        text="Body text"
        topMeta="Top"
        bottomMeta="Bottom"
        date="2026-05-09"
        onPress={onPress}
      />
    );

    expect(getByText('Top')).toBeTruthy();
    expect(getByText('Body text')).toBeTruthy();
    expect(getByText('Bottom')).toBeTruthy();

    fireEvent.press(getByText('Body text'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('truncates long thoughts and expands on press', () => {
    const longText = `${'Long thought '.repeat(30)}ending`;
    const { getByText, queryByText } = render(
      <OpenBrainThoughtCard
        text={longText}
        topMeta="Top"
      />
    );

    expect(queryByText(longText)).toBeNull();
    const preview = getByText(/\.{3}$/);
    fireEvent.press(preview);
    expect(getByText(longText)).toBeTruthy();
  });

  it('treats first line as title and renders quoted paragraph text', () => {
    const text = 'Softer Hearts > Better Seeds\n\nPastor Tyler prayed this.\n\n"Lord, we do not want better seeds, we want softer hearts."';
    const { getByText } = render(
      <OpenBrainThoughtCard
        text={text}
        topMeta="Top"
      />
    );

    expect(getByText('Softer Hearts > Better Seeds')).toBeTruthy();
    expect(getByText('Pastor Tyler prayed this.')).toBeTruthy();
    expect(getByText('"Lord, we do not want better seeds, we want softer hearts."')).toBeTruthy();
  });

  it('shows confirmation before adding again when already added after first save', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onAddToSecondBrain = jest.fn();
    const item = {
      id: 1,
      text: 'A thought to save',
      profile: { username: 'jireh', streak_count: 1, is_self: true },
    };
    const screen = render(
      <OpenBrainThoughtCard
        item={item}
        onShare={jest.fn()}
        onAddToSecondBrain={onAddToSecondBrain}
      />
    );

    pressAddToSecondBrain(screen);
    expect(onAddToSecondBrain).toHaveBeenCalledWith(item);

    await waitFor(() => expect(screen.getByLabelText('Added to SecondBrain')).toBeTruthy());
    expect(screen.getByText('Added to SecondBrain.')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Added to SecondBrain'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Add to SecondBrain again?',
      'This thought is already in your SecondBrain.',
      expect.any(Array)
    );
    expect(onAddToSecondBrain).toHaveBeenCalledTimes(1);
    const [, addAgainAction] = alertSpy.mock.calls[0][2];
    addAgainAction.onPress();
    expect(onAddToSecondBrain).toHaveBeenCalledTimes(2);
    alertSpy.mockRestore();
  });

  it('shows streak metric in feed metadata and uses thought-level save count', () => {
    const item = {
      id: 2,
      text: 'Another thought',
      save_count: 7,
      profile: { username: 'jireh', streak_count: 3, save_count: 5, is_self: true },
    };
    const { getByLabelText, getByText, queryByLabelText } = render(
      <OpenBrainThoughtCard
        item={item}
      />
    );

    expect(getByLabelText('Streak')).toBeTruthy();
    expect(getByLabelText('Saves')).toBeTruthy();
    expect(queryByLabelText('Saved to SecondBrain')).toBeNull();
    expect(getByText('3')).toBeTruthy();
    expect(getByText('7')).toBeTruthy();
  });

  it('does not use profile save count when thought-level save count is missing', () => {
    const item = {
      id: 4,
      text: 'No thought-level save count',
      profile: { username: 'jireh', streak_count: 4, save_count: 9, is_self: true },
    };
    const { getByText } = render(
      <OpenBrainThoughtCard
        item={item}
      />
    );

    expect(getByText('4')).toBeTruthy();
    expect(getByText('0')).toBeTruthy();
  });

  it('shows confirmation when viewer has already saved the thought', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onAddToSecondBrain = jest.fn();
    const item = {
      id: 3,
      text: 'Already saved thought',
      profile: { username: 'jireh', streak_count: 2, is_self: false },
      viewer_has_added_to_second_brain: true,
    };
    const screen = render(
      <OpenBrainThoughtCard
        item={item}
        onShare={jest.fn()}
        onAddToSecondBrain={onAddToSecondBrain}
      />
    );

    pressAddToSecondBrain(screen);
    expect(alertSpy).toHaveBeenCalledWith(
      'Add to SecondBrain again?',
      'This thought is already in your SecondBrain.',
      expect.any(Array)
    );
    expect(onAddToSecondBrain).not.toHaveBeenCalled();
    const [, addAgainAction] = alertSpy.mock.calls[0][2];
    addAgainAction.onPress();
    expect(onAddToSecondBrain).toHaveBeenCalledWith(item);
    alertSpy.mockRestore();
  });

  it('shows follow button when is_self comes as string false', () => {
    const item = {
      id: 5,
      user_id: 'user-2',
      text: 'Thought from another person',
      profile: { username: 'alex', streak_count: 1, is_self: 'false', is_following: 'false' },
    };
    const { getByText } = render(<OpenBrainThoughtCard item={item} />);

    expect(getByText('Follow')).toBeTruthy();
  });
});
