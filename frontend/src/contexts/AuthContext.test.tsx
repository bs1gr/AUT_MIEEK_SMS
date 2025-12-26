import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import authService from '@/services/authService';
import apiClient from '@/api/api';
import type { ReactNode } from 'react';

// Mock dependencies
vi.mock('@/services/authService');
vi.mock('@/api/api');

const mockAuthService = authService as unknown as {
  getAccessToken: ReturnType<typeof vi.fn>;
  clearAccessToken: ReturnType<typeof vi.fn>;
  refreshAccessToken: ReturnType<typeof vi.fn>;
};

const mockApiClient = apiClient as unknown as {
  post: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockAuthService.getAccessToken.mockReturnValue(null);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('initialization', () => {
    it('starts with null user and accessToken when localStorage is empty', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toBeNull();
      expect(result.current.accessToken).toBeNull();
    });

    it('restores user from localStorage on mount', () => {
      const savedUser = { id: 1, email: 'test@example.com', role: 'user' };
      localStorage.setItem('sms_user_v1', JSON.stringify(savedUser));

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toEqual(savedUser);
    });

    it('handles corrupted localStorage data gracefully', () => {
      localStorage.setItem('sms_user_v1', 'invalid-json{');

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toBeNull();
    });

    it('initializes accessToken from authService', () => {
      mockAuthService.getAccessToken.mockReturnValue('initial-token-123');

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.accessToken).toBe('initial-token-123');
    });
  });

  describe('login', () => {
    it('successfully logs in user', async () => {
      const mockResponse = {
        data: {
          access_token: 'new-access-token',
          user: { id: 1, email: 'user@test.com', role: 'student' },
        },
      };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('user@test.com', 'password123'); // pragma: allowlist secret
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/auth/login',
        { email: 'user@test.com', password: 'password123' }, // pragma: allowlist secret
        expect.objectContaining({ withCredentials: true })
      );
      expect(result.current.user).toEqual({ id: 1, email: 'user@test.com', role: 'student' });
      expect(result.current.accessToken).toBe('new-access-token');
    });

    it('persists user to localStorage after login', async () => {
      const mockUser = { id: 2, email: 'admin@test.com', role: 'admin' };
      mockApiClient.post.mockResolvedValue({
        data: { access_token: 'token-456', user: mockUser },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('admin@test.com', 'admin-pass');
      });

      const stored = localStorage.getItem('sms_user_v1');
      expect(stored).toBe(JSON.stringify(mockUser));
    });

    it('throws error when login fails', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Invalid credentials'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.login('wrong@test.com', 'wrong-pass');
        })
      ).rejects.toThrow('Invalid credentials');

      expect(result.current.user).toBeNull();
      expect(result.current.accessToken).toBeNull();
    });

    it('throws error when access_token is missing in response', async () => {
      mockApiClient.post.mockResolvedValue({
        data: { user: { id: 1, email: 'user@test.com' } },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.login('user@test.com', 'password');
        })
      ).rejects.toThrow('Login failed');

      expect(result.current.accessToken).toBeNull();
      expect(result.current.user).toBeNull();
    });

    it('fetches user from /auth/me when not in login response', async () => {
      mockApiClient.post.mockResolvedValue({
        data: { access_token: 'token-123' },
      });
      mockApiClient.get.mockResolvedValue({
        data: { id: 1, email: 'user@test.com', role: 'student' },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('user@test.com', 'password');
      });

      expect(mockApiClient.get).toHaveBeenCalledWith('/auth/me', { withCredentials: true });
      expect(result.current.accessToken).toBe('token-123');
      expect(result.current.user).toEqual({ id: 1, email: 'user@test.com', role: 'student' });
    });
  });

  describe('logout', () => {
    it('successfully logs out user', async () => {
      const mockUser = { id: 1, email: 'user@test.com', role: 'user' };
      localStorage.setItem('sms_user_v1', JSON.stringify(mockUser));
      mockAuthService.getAccessToken.mockReturnValue('token-123');
      mockApiClient.post.mockResolvedValue({ data: {} });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initialization
      await waitFor(() => expect(result.current.user).toEqual(mockUser));

      await act(async () => {
        await result.current.logout();
      });

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/logout', {}, { withCredentials: true });
      expect(mockAuthService.clearAccessToken).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.accessToken).toBeNull();
      expect(localStorage.getItem('sms_user_v1')).toBeNull();
    });

    it('clears state even if API call fails', async () => {
      mockAuthService.getAccessToken.mockReturnValue('token-123');
      mockApiClient.post.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockAuthService.clearAccessToken).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.accessToken).toBeNull();
    });

    it('removes user from localStorage on logout', async () => {
      localStorage.setItem('sms_user_v1', JSON.stringify({ id: 1, email: 'test@test.com' }));
      mockApiClient.post.mockResolvedValue({ data: {} });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.logout();
      });

      expect(localStorage.getItem('sms_user_v1')).toBeNull();
    });
  });

  describe('refresh', () => {
    it('successfully refreshes access token', async () => {
      mockAuthService.refreshAccessToken.mockResolvedValue('new-refreshed-token');

      const { result } = renderHook(() => useAuth(), { wrapper });

      let refreshResult: boolean = false;
      await act(async () => {
        refreshResult = await result.current.refresh();
      });

      expect(refreshResult).toBe(true);
      expect(result.current.accessToken).toBe('new-refreshed-token');
    });

    it('logs out user when refresh fails', async () => {
      mockAuthService.refreshAccessToken.mockResolvedValue(null);
      mockApiClient.post.mockResolvedValue({ data: {} });

      const mockUser = { id: 1, email: 'user@test.com' };
      localStorage.setItem('sms_user_v1', JSON.stringify(mockUser));

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for user to be loaded
      await waitFor(() => expect(result.current.user).toEqual(mockUser));

      let refreshResult: boolean = false;
      await act(async () => {
        refreshResult = await result.current.refresh();
      });

      expect(refreshResult).toBe(false);
      expect(mockAuthService.clearAccessToken).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.accessToken).toBeNull();
    });
  });

  describe('useAuth hook', () => {
    it('throws error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within AuthProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('localStorage edge cases', () => {
    it('handles localStorage.setItem failure gracefully during login', async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      mockApiClient.post.mockResolvedValue({
        data: { access_token: 'token', user: { id: 1, email: 'test@test.com' } },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Should not throw, just silently fail to persist
      await act(async () => {
        await result.current.login('test@test.com', 'password');
      });

      expect(result.current.user).toEqual({ id: 1, email: 'test@test.com' });

      setItemSpy.mockRestore();
    });

    it('handles localStorage.removeItem failure gracefully during logout', async () => {
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      mockApiClient.post.mockResolvedValue({ data: {} });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Should not throw, just silently fail to remove
      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();

      removeItemSpy.mockRestore();
    });
  });

  describe('state consistency', () => {
    it('maintains consistent state across login and logout cycles', async () => {
      mockApiClient.post.mockResolvedValue({
        data: { access_token: 'token-1', user: { id: 1, email: 'user1@test.com' } },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Login
      await act(async () => {
        await result.current.login('user1@test.com', 'pass1');
      });
      expect(result.current.user).toEqual({ id: 1, email: 'user1@test.com' });

      // Logout
      mockApiClient.post.mockResolvedValue({ data: {} });
      await act(async () => {
        await result.current.logout();
      });
      expect(result.current.user).toBeNull();

      // Login again
      mockApiClient.post.mockResolvedValue({
        data: { access_token: 'token-2', user: { id: 2, email: 'user2@test.com' } },
      });
      await act(async () => {
        await result.current.login('user2@test.com', 'pass2');
      });
      expect(result.current.user).toEqual({ id: 2, email: 'user2@test.com' });
    });

    it('preserves additional user properties', async () => {
      const mockUser = {
        id: 1,
        email: 'user@test.com',
        role: 'admin',
        firstName: 'John',
        lastName: 'Doe',
        customField: 'custom-value',
      };

      mockApiClient.post.mockResolvedValue({
        data: { access_token: 'token', user: mockUser },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('user@test.com', 'password');
      });

      expect(result.current.user).toEqual(mockUser);
    });
  });
});
