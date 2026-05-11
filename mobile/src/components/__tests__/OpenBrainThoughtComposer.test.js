import { fireEvent, render } from '@testing-library/react-native';
import OpenBrainThoughtComposer from '../OpenBrainThoughtComposer';

describe('OpenBrainThoughtComposer', () => {
  it('renders value and submits when button is pressed', () => {
    const onChangeText = jest.fn();
    const onSubmit = jest.fn();

    const { getByPlaceholderText, getByText } = render(
      <OpenBrainThoughtComposer
        value="hello"
        onChangeText={onChangeText}
        placeholder="Type here"
        buttonLabel="Send"
        onSubmit={onSubmit}
      />
    );

    const input = getByPlaceholderText('Type here');
    expect(input.props.value).toBe('hello');

    fireEvent.changeText(input, 'updated');
    expect(onChangeText).toHaveBeenCalledWith('updated');

    fireEvent.press(getByText('Send'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('renders posted thought with title/quote formatting and keeps one-line thoughts as paragraph', () => {
    const multiLine = 'Softer Hearts > Better Seeds\n\nPastor Tyler prayed this.\n\n"Lord, give us softer hearts."';
    const { getByText, getAllByText, rerender } = render(
      <OpenBrainThoughtComposer
        value={multiLine}
        onChangeText={() => {}}
        placeholder="Type here"
        buttonLabel="Send"
        onSubmit={() => {}}
        isPosted
      />
    );

    expect(getByText('Softer Hearts > Better Seeds')).toBeTruthy();
    expect(getByText('Pastor Tyler prayed this.')).toBeTruthy();
    expect(getByText('"Lord, give us softer hearts."')).toBeTruthy();

    rerender(
      <OpenBrainThoughtComposer
        value="Only one line"
        onChangeText={() => {}}
        placeholder="Type here"
        buttonLabel="Send"
        onSubmit={() => {}}
        isPosted
      />
    );

    expect(getByText('Only one line')).toBeTruthy();
    expect(getAllByText('Only one line').length).toBe(1);
  });
});
