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

  it('applies bold markdown from the toolbar to selected text', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText, getAllByText } = render(
      <OpenBrainThoughtComposer
        value="hello world"
        onChangeText={onChangeText}
        placeholder="Type here"
        buttonLabel="Send"
        onSubmit={() => {}}
      />
    );

    const input = getByPlaceholderText('Type here');
    fireEvent(input, 'selectionChange', { nativeEvent: { selection: { start: 0, end: 5 } } });
    fireEvent.press(getAllByText('B')[0]);

    expect(onChangeText).toHaveBeenCalledWith('**hello** world');
  });

  it('applies italic markdown from the toolbar to selected text', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText, getAllByText } = render(
      <OpenBrainThoughtComposer
        value="hello world"
        onChangeText={onChangeText}
        placeholder="Type here"
        buttonLabel="Send"
        onSubmit={() => {}}
      />
    );

    const input = getByPlaceholderText('Type here');
    fireEvent(input, 'selectionChange', { nativeEvent: { selection: { start: 0, end: 5 } } });
    fireEvent.press(getAllByText('I')[0]);

    expect(onChangeText).toHaveBeenCalledWith('*hello* world');
  });

  it('applies underline markdown from the toolbar to selected text', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText, getAllByText } = render(
      <OpenBrainThoughtComposer
        value="hello world"
        onChangeText={onChangeText}
        placeholder="Type here"
        buttonLabel="Send"
        onSubmit={() => {}}
      />
    );

    const input = getByPlaceholderText('Type here');
    fireEvent(input, 'selectionChange', { nativeEvent: { selection: { start: 0, end: 5 } } });
    fireEvent.press(getAllByText('U')[0]);

    expect(onChangeText).toHaveBeenCalledWith('__hello__ world');
  });

  it('applies bullet list markdown from the toolbar to selected lines', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText, getAllByText } = render(
      <OpenBrainThoughtComposer
        value={'first line\nsecond line'}
        onChangeText={onChangeText}
        placeholder="Type here"
        buttonLabel="Send"
        onSubmit={() => {}}
      />
    );

    const input = getByPlaceholderText('Type here');
    fireEvent(input, 'selectionChange', { nativeEvent: { selection: { start: 0, end: 22 } } });
    fireEvent.press(getAllByText('•')[0]);

    expect(onChangeText).toHaveBeenCalledWith('- first line\n- second line');
  });

  it('applies numbered list markdown from the toolbar to selected lines', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText, getAllByText } = render(
      <OpenBrainThoughtComposer
        value={'first line\nsecond line'}
        onChangeText={onChangeText}
        placeholder="Type here"
        buttonLabel="Send"
        onSubmit={() => {}}
      />
    );

    const input = getByPlaceholderText('Type here');
    fireEvent(input, 'selectionChange', { nativeEvent: { selection: { start: 0, end: 22 } } });
    fireEvent.press(getAllByText('1.')[0]);

    expect(onChangeText).toHaveBeenCalledWith('1. first line\n2. second line');
  });
});
