import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../LoginPage';

// Mock API function
const mockLogin = vi.fn();

vi.mock('../../api/auth', () => ({
  login: () => mockLogin(),
}));

// Mock Router
const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as Storage;

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form correctly', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    // Get all login text elements and check if at least one is in the header
    const loginTexts = screen.getAllByText(/登录/i);
    expect(loginTexts.length).toBeGreaterThan(0);

    expect(screen.getByLabelText(/用户名/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/用户名/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/密码/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/密码/i)).toBeInTheDocument();
  });

  it('handles login successfully', async () => {
    mockLogin.mockResolvedValue({
      token: 'test-token',
      user_id: '123',
      username: 'testuser',
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const usernameInput = screen.getByLabelText(/用户名/i);
    const passwordInput = screen.getByLabelText(/密码/i);
    const loginForm = usernameInput.closest('form');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    if (loginForm) {
      fireEvent.submit(loginForm);
    }

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
      });
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'token',
        'test-token'
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'user',
        expect.any(String)
      );
      expect(navigateMock).toHaveBeenCalledWith('/');
    });
  });

  it('handles login error', async () => {
    mockLogin.mockRejectedValue({
      response: {
        data: {
          error: 'Invalid credentials'
        }
      }
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const usernameInput = screen.getByLabelText(/用户名/i);
    const passwordInput = screen.getByLabelText(/密码/i);
    const loginForm = usernameInput.closest('form');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

    if (loginForm) {
      fireEvent.submit(loginForm);
    }

    await waitFor(() => {
      expect(screen.getByText(/登录失败/i)).toBeInTheDocument();
    });
  });

  it('navigates to register page when clicking register link', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const registerLink = screen.getByText(/注册新账户/i);
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute('href', '/register');
  });

  it('shows loading state during login', async () => {
    mockLogin.mockReturnValue(new Promise(() => {}));

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const usernameInput = screen.getByLabelText(/用户名/i);
    const passwordInput = screen.getByLabelText(/密码/i);
    const loginForm = usernameInput.closest('form');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    if (loginForm) {
      fireEvent.submit(loginForm);
    }

    await waitFor(() => {
      expect(screen.getByText(/登录中\.\.\./i)).toBeInTheDocument();
    });
  });

  it('clears error message when user types', async () => {
    mockLogin.mockRejectedValue({
      response: {
        data: {
          error: 'Invalid credentials'
        }
      }
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const usernameInput = screen.getByLabelText(/用户名/i);
    const passwordInput = screen.getByLabelText(/密码/i);
    const loginForm = usernameInput.closest('form');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

    if (loginForm) {
      fireEvent.submit(loginForm);
    }

    await waitFor(() => {
      expect(screen.getByText(/登录失败/i)).toBeInTheDocument();
    });

    fireEvent.change(usernameInput, { target: { value: 'newuser' } });

    await waitFor(() => {
      expect(screen.queryByText(/登录失败/i)).not.toBeInTheDocument();
    });
  });
});
