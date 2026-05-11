import { fireEvent, render } from '@testing-library/react-native';
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
});
