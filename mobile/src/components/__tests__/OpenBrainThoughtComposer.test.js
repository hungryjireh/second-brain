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
});
