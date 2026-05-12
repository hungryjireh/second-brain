import { fireEvent, render, waitFor } from '@testing-library/react-native';
import LoginScreen from '../LoginScreen';
import { login, setToken } from '../../api';

const mockReplace = jest.fn();

jest.mock('../../api', () => ({
  login: jest.fn(),
  setToken: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    replace: mockReplace,
  }),
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setToken.mockResolvedValue(undefined);
  });

  it('submits credentials and calls onLoggedIn on success', async () => {
    const onLoggedIn = jest.fn();
    login.mockResolvedValueOnce({ token: 'token-123' });

    const { getByPlaceholderText, getByText } = render(<LoginScreen onLoggedIn={onLoggedIn} />);

    fireEvent.changeText(getByPlaceholderText('Email'), 'jireh@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('jireh@example.com', 'password123');
      expect(setToken).toHaveBeenCalledWith('token-123');
      expect(onLoggedIn).toHaveBeenCalledWith('token-123');
      expect(mockReplace).toHaveBeenCalledWith('Apps');
    });
  });

  it('shows API error and does not call onLoggedIn on failed login', async () => {
    const onLoggedIn = jest.fn();
    login.mockRejectedValueOnce(new Error('Invalid credentials'));

    const { getByPlaceholderText, getByText, findByText } = render(<LoginScreen onLoggedIn={onLoggedIn} />);

    fireEvent.changeText(getByPlaceholderText('Email'), 'jireh@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'wrong');
    fireEvent.press(getByText('Sign In'));

    expect(await findByText('Invalid credentials')).toBeTruthy();
    expect(onLoggedIn).not.toHaveBeenCalled();
  });

  it('keeps sign in button disabled until both fields are filled', async () => {
    login.mockResolvedValue({ token: 'token-disabled' });

    const { getByText, getByPlaceholderText } = render(<LoginScreen onLoggedIn={jest.fn()} />);

    fireEvent.press(getByText('Sign In'));
    expect(login).not.toHaveBeenCalled();

    fireEvent.changeText(getByPlaceholderText('Email'), 'jireh@example.com');
    fireEvent.press(getByText('Sign In'));
    expect(login).not.toHaveBeenCalled();

    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Sign In'));
    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('jireh@example.com', 'password123');
    });
  });
});
