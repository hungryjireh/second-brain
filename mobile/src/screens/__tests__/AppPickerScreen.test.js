import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AppPickerScreen from '../AppPickerScreen';
import { apiRequest } from '../../api';

jest.mock('../../api', () => ({
  apiRequest: jest.fn(),
}));

describe('AppPickerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('verifies session on mount with provided token', async () => {
    apiRequest.mockResolvedValueOnce({});

    render(<AppPickerScreen token="token-123" navigation={{ navigate: jest.fn() }} />);

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith('/settings', { token: 'token-123' });
    });
  });

  it('navigates to selected app screens', () => {
    const navigate = jest.fn();
    const { getByText } = render(<AppPickerScreen token="token-123" navigation={{ navigate }} />);

    fireEvent.press(getByText('secondbrain'));
    fireEvent.press(getByText('openbrain'));

    expect(navigate).toHaveBeenNthCalledWith(1, 'SecondBrain');
    expect(navigate).toHaveBeenNthCalledWith(2, 'OpenBrain');
  });
});
