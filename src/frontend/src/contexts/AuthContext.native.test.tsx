import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import authService from '@/services/authService';
import apiClient from '@/api/api';

// The Android app: sign-in asks for the refresh token, sign-out revokes it, and a failed
// renewal (perhaps only an unreachable server) keeps it for the next try.
vi.mock('@/services/authService');
vi.mock('@/api/api');
vi.mock('@/utils/appStorage', () => ({
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
  removeItem: (key: string) => localStorage.removeItem(key),
  init: () => Promise.resolve(),
}));
const native = vi.hoisted(() => ({
  headers: vi.fn(() => ({ 'X-SMS-Native-Session': '1' })),
  token: vi.fn(() => 'R-stored' as string | null),
  remember: vi.fn(),
  forget: vi.fn(),
  autoOfferDone: vi.fn(),
}));
vi.mock('@/services/nativeSession', () => ({
  nativeSessionHeaders: native.headers,
  getNativeRefreshToken: native.token,
  rememberNativeRefreshToken: native.remember,
  forgetNativeRefreshToken: native.forget,
}));
vi.mock('@/utils/savedLogin', () => ({ markAutoOfferDone: native.autoOfferDone }));

const mockAuthService = authService as unknown as {
  getAccessToken: ReturnType<typeof vi.fn>;
  clearAccessToken: ReturnType<typeof vi.fn>;
  refreshAccessToken: ReturnType<typeof vi.fn>;
};
const mockApiClient = apiClient as unknown as { post: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

describe('AuthContext in the Android app', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockAuthService.getAccessToken.mockReturnValue(null);
    mockAuthService.refreshAccessToken.mockResolvedValue(null);
  });

  it('signs in asking for the refresh token and keeps it', async () => {
    const answer = { access_token: 'A1', refresh_token: 'R1', user: { id: 2, email: 't@example.com' } };
    mockApiClient.post.mockResolvedValue({ data: answer });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('t@example.com', 'pw');
    });

    expect(mockApiClient.post).toHaveBeenCalledWith(
      '/auth/login',
      { email: 't@example.com', password: 'pw' },
      { withCredentials: true, headers: { 'X-SMS-Native-Session': '1' } },
    );
    expect(native.remember).toHaveBeenCalledWith(answer);
  });

  it('a sign-out names the stored token, forgets it, and keeps the sheet closed', async () => {
    mockApiClient.post.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/logout', { refresh_token: 'R-stored' }, { withCredentials: true });
    expect(native.forget).toHaveBeenCalled();
    expect(native.autoOfferDone).toHaveBeenCalled();
  });

  it('a failed renewal neither revokes nor forgets the stored token', async () => {
    mockApiClient.post.mockResolvedValue({ data: {} });
    localStorage.setItem('sms_user_v1', JSON.stringify({ id: 2, email: 't@example.com' }));
    mockAuthService.getAccessToken.mockReturnValue('A-old');
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/logout', {}, { withCredentials: true });
    expect(native.forget).not.toHaveBeenCalled();
  });
});
