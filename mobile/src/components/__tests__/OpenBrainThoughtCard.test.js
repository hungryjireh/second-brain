import { fireEvent, render, waitFor } from '@testing-library/react-native';
import OpenBrainThoughtCard from '../OpenBrainThoughtCard';

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

  it('shows add response and still allows another add click', async () => {
    const onAddToSecondBrain = jest.fn();
    const item = {
      id: 1,
      text: 'A thought to save',
      profile: { username: 'jireh', streak_count: 1, is_self: true },
    };
    const { getByLabelText, getByText } = render(
      <OpenBrainThoughtCard
        item={item}
        onShare={jest.fn()}
        onAddToSecondBrain={onAddToSecondBrain}
      />
    );

    fireEvent.press(getByLabelText('Add to SecondBrain'));
    expect(onAddToSecondBrain).toHaveBeenCalledWith(item);

    await waitFor(() => expect(getByLabelText('Added to SecondBrain')).toBeTruthy());
    expect(getByText('Added to SecondBrain.')).toBeTruthy();
    fireEvent.press(getByLabelText('Added to SecondBrain'));
    expect(onAddToSecondBrain).toHaveBeenCalledTimes(2);
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

  it('still allows add when viewer has already saved the thought', () => {
    const onAddToSecondBrain = jest.fn();
    const item = {
      id: 3,
      text: 'Already saved thought',
      profile: { username: 'jireh', streak_count: 2, is_self: false },
      viewer_has_added_to_second_brain: true,
    };
    const { getByLabelText } = render(
      <OpenBrainThoughtCard
        item={item}
        onShare={jest.fn()}
        onAddToSecondBrain={onAddToSecondBrain}
      />
    );

    fireEvent.press(getByLabelText('Added to SecondBrain'));
    expect(onAddToSecondBrain).toHaveBeenCalledWith(item);
  });
});
