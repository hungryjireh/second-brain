import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from '../Login.jsx';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Login', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockNavigate.mockReset();
    vi.stubGlobal('fetch', vi.fn());
    vi.spyOn(Storage.prototype, 'setItem');
  });

  it('submits credentials and navigates on successful login', async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'token-123' }),
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText('Email'), 'jireh@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(localStorage.setItem).toHaveBeenCalledWith('authToken', 'token-123');
      expect(mockNavigate).toHaveBeenCalledWith('/apps', { replace: true });
    });
  });

  it('shows API error and does not navigate on failed login', async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid credentials' }),
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText('Email'), 'jireh@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('keeps sign in button disabled until both fields are filled', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const button = screen.getByRole('button', { name: 'Sign In' });
    expect(button).toBeDisabled();

    await user.type(screen.getByPlaceholderText('Email'), 'jireh@example.com');
    expect(button).toBeDisabled();

    await user.type(screen.getByPlaceholderText('Password'), 'password123');
    expect(button).toBeEnabled();
  });

  it('submits on Enter when credentials are filled', async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'token-enter' }),
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText('Email'), 'jireh@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'password123{enter}');

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(localStorage.setItem).toHaveBeenCalledWith('authToken', 'token-enter');
      expect(mockNavigate).toHaveBeenCalledWith('/apps', { replace: true });
    });
  });
});
