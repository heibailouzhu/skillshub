import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RegisterPage from '../RegisterPage';

// Mock API function
const mockRegister = vi.fn();

vi.mock('../../api/auth', () => ({
  register: () => mockRegister(),
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

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders registration form correctly', () => {
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>
    );

    // Check for header text
    const registerTexts = screen.getAllByText(/注册/i);
    expect(registerTexts.length).toBeGreaterThan(0);

    expect(screen.getByLabelText(/用户名/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/用户名/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/邮箱/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/邮箱/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/密码/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/密码/i)).toBeInTheDocument();
  });

  it('shows validation error for short username', async () => {
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>
    );

    const usernameInput = screen.getByLabelText(/用户名/i);
    const registerForm = usernameInput.closest('form');

    if (registerForm) {
      fireEvent.change(usernameInput, { target: { value: 'ab' } });
      fireEvent.submit(registerForm);
    }

    await waitFor(() => {
      expect(screen.getByText(/用户名长度必须在 3-50 个字符之间/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid email', async () => {
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText(/邮箱/i);
    const registerForm = emailInput.closest('form');

    if (registerForm) {
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.submit(registerForm);
    }

    await waitFor(() => {
      expect(screen.getByText(/请输入有效的邮箱地址/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for short password', async () => {
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>
    );

    const passwordInput = screen.getByLabelText(/密码/i);
    const registerForm = passwordInput.closest('form');

    if (registerForm) {
      fireEvent.change(passwordInput, { target: { value: '123' } });
      fireEvent.submit(registerForm);
    }

    await waitFor(() => {
      expect(screen.getByText(/密码长度不能少于 6 个字符/i)).toBeInTheDocument();
    });
  });

  it('handles registration successfully', async () => {
    mockRegister.mockResolvedValue({
      user_id: '123',
      username: 'testuser',
    });

    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>
    );

    const usernameInput = screen.getByLabelText(/用户名/i);
    const emailInput = screen.getByLabelText(/邮箱/i);
    const passwordInput = screen.getByLabelText(/密码/i);
    const registerForm = usernameInput.closest('form');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    if (registerForm) {
      fireEvent.submit(registerForm);
    }

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'token',
        expect.any(String)
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'user',
        expect.any(String)
      );
      expect(navigateMock).toHaveBeenCalledWith('/');
    });
  });

  it('handles registration error', async () => {
    mockRegister.mockRejectedValue(
      new Error('Username already exists')
    );

    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>
    );

    const usernameInput = screen.getByLabelText(/用户名/i);
    const emailInput = screen.getByLabelText(/邮箱/i);
    const passwordInput = screen.getByLabelText(/密码/i);
    const registerForm = usernameInput.closest('form');

    fireEvent.change(usernameInput, { target: { value: 'existinguser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    if (registerForm) {
      fireEvent.submit(registerForm);
    }

    await waitFor(() => {
      expect(screen.getByText(/注册失败/i)).toBeInTheDocument();
    });
  });

  it('navigates to login page when clicking login link', () => {
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>
    );

    const loginLink = screen.getByText(/已有账户/i).nextElementSibling;
    expect(loginLink?.textContent).toContain('登录');
  });

  it('shows loading state during registration', async () => {
    mockRegister.mockReturnValue(new Promise(() => {}));

    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>
    );

    const usernameInput = screen.getByLabelText(/用户名/i);
    const emailInput = screen.getByLabelText(/邮箱/i);
    const passwordInput = screen.getByLabelText(/密码/i);
    const registerForm = usernameInput.closest('form');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    if (registerForm) {
      fireEvent.submit(registerForm);
    }

    await waitFor(() => {
      expect(screen.getByText(/注册中\.\.\./i)).toBeInTheDocument();
    });
  });
});
