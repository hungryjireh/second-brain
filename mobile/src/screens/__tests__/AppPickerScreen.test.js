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
      expect(apiRequest).toHaveBeenCalledWith('/settings', expect.objectContaining({ token: 'token-123' }));
    });
  });

  it('navigates to selected app screens', () => {
    const navigate = jest.fn();
    const { getByText } = render(<AppPickerScreen token="token-123" navigation={{ navigate }} />);

    fireEvent.press(getByText('secondbrain'));
    fireEvent.press(getByText('openbrain'));

    expect(navigate).toHaveBeenNthCalledWith(1, 'SecondBrain');
    expect(navigate).toHaveBeenNthCalledWith(2, 'OpenBrainFeed');
  });

  it('logs out and redirects to login on native', async () => {
    const reset = jest.fn();
    const onLogout = jest.fn().mockResolvedValueOnce();
    const { getByText } = render(
      <AppPickerScreen
        token="token-123"
        onLogout={onLogout}
        navigation={{ navigate: jest.fn(), reset }}
      />
    );

    fireEvent.press(getByText('Logout'));

    await waitFor(() => {
      expect(onLogout).toHaveBeenCalledTimes(1);
      expect(reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    });
  });

  it('redirects unauthenticated users away from apps', async () => {
    const reset = jest.fn();
    render(<AppPickerScreen token={null} navigation={{ navigate: jest.fn(), reset }} />);

    await waitFor(() => {
      expect(reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    });
    expect(apiRequest).not.toHaveBeenCalled();
  });
});
