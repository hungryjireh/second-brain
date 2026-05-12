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

  it('calls add to second brain handler from action button and disables after add', async () => {
    const onAddToSecondBrain = jest.fn();
    const item = {
      id: 1,
      text: 'A thought to save',
      profile: { username: 'jireh', streak_count: 1, is_self: true },
    };
    const { getByLabelText } = render(
      <OpenBrainThoughtCard
        item={item}
        onShare={jest.fn()}
        onAddToSecondBrain={onAddToSecondBrain}
      />
    );

    fireEvent.press(getByLabelText('Add to SecondBrain'));
    expect(onAddToSecondBrain).toHaveBeenCalledWith(item);

    await waitFor(() => expect(getByLabelText('Added to SecondBrain')).toBeTruthy());
    fireEvent.press(getByLabelText('Added to SecondBrain'));
    expect(onAddToSecondBrain).toHaveBeenCalledTimes(1);
  });
});
