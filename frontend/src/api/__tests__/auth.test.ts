import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as auth from '../auth';
import apiClient from '../client';

// Mock apiClient
vi.mock('../client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('register', () => {
    it('should call POST /api/auth/register with correct data', async () => {
      const mockResponse = { data: { user_id: '123', username: 'testuser' } };
      (apiClient.post as any).mockResolvedValue(mockResponse);

      const registerData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      await auth.register(registerData);

      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/register', registerData);
    });

    it('should return response data on success', async () => {
      const mockResponse = { data: { user_id: '123', username: 'testuser' } };
      (apiClient.post as any).mockResolvedValue(mockResponse);

      const result = await auth.register({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Registration failed');
      (apiClient.post as any).mockRejectedValue(mockError);

      await expect(
        auth.register({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Registration failed');
    });
  });

  describe('login', () => {
    it('should call POST /api/auth/login with correct data', async () => {
      const mockResponse = { data: { token: 'fake-jwt-token', user_id: '123', username: 'testuser' } };
      (apiClient.post as any).mockResolvedValue(mockResponse);

      await auth.login({ username: 'testuser', password: 'password123' });

      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/login', {
        username: 'testuser',
        password: 'password123',
      });
    });

    it('should return response data on success', async () => {
      const mockResponse = { data: { token: 'fake-jwt-token', user_id: '123', username: 'testuser' } };
      (apiClient.post as any).mockResolvedValue(mockResponse);

      const result = await auth.login({ username: 'testuser', password: 'password123' });

      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error on failure', async () => {
      const mockError = new Error('Login failed');
      (apiClient.post as any).mockRejectedValue(mockError);

      await expect(
        auth.login({ username: 'testuser', password: 'password123' })
      ).rejects.toThrow('Login failed');
    });
  });

  describe('logout', () => {
    it('should remove token and user from localStorage', () => {
      localStorage.setItem('token', 'fake-jwt-token');
      localStorage.setItem('user', JSON.stringify({ id: '123', username: 'testuser' }));
      expect(localStorage.getItem('token')).toBe('fake-jwt-token');
      expect(localStorage.getItem('user')).not.toBeNull();

      auth.logout();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when token exists', () => {
      localStorage.setItem('token', 'fake-jwt-token');

      expect(auth.isAuthenticated()).toBe(true);
    });

    it('should return false when token does not exist', () => {
      expect(auth.isAuthenticated()).toBe(false);
    });

    it('should return false when token is empty', () => {
      localStorage.setItem('token', '');

      expect(auth.isAuthenticated()).toBe(false);
    });
  });
});
