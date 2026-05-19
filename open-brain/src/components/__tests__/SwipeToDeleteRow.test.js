import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import SwipeToDeleteRow from '../SwipeToDeleteRow';

const styles = {
  swipeRow: {},
  swipeActionWrap: {},
  swipeDeleteAction: {},
  swipeDeleteText: {},
  swipeCardWrap: {},
};

describe('SwipeToDeleteRow', () => {
  it('renders child content and fires delete action', () => {
    const onOpen = jest.fn();
    const onActionPress = jest.fn();

    const { getByText, getByTestId } = render(
      <SwipeToDeleteRow
        id={42}
        onOpen={onOpen}
        isOpen={false}
        actionLabel="Delete"
        onActionPress={onActionPress}
        actionWidth={72}
        styles={styles}
      >
        <Text>Row content</Text>
      </SwipeToDeleteRow>
    );

    expect(getByText('Row content')).toBeTruthy();
    fireEvent.press(getByTestId('entry-swipe-delete-42'));
    expect(onActionPress).toHaveBeenCalledTimes(1);
  });
});
