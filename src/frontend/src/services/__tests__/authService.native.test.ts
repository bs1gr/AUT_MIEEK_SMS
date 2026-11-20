import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

// The Android app (Capacitor) talking to a server the owner chose; the WebView keeps no cookie
// for that server, so the app renews with the refresh token it keeps itself.
const env = vi.hoisted(() => ({ native: true, base: 'https://sms-cloud.example.ts.net/api/v1' }));
vi.mock('@/utils/serverUrl', () => ({
  isCapacitorApp: () => env.native,
  isLocalMode: () => false,
  getApiBaseUrl: () => env.base,
}));
vi.mock('axios');

import { getAccessToken, refreshAccessToken, setAccessToken } from '../authService';
import { forgetNativeRefreshToken, getNativeRefreshToken, rememberNativeRefreshToken } from '../nativeSession';
import { getItem } from '@/utils/appStorage';

const store = (token: string) => rememberNativeRefreshToken({ refresh_token: token });

const post = () => vi.mocked(axios.post);

describe('authService in the Android app', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    env.native = true;
    env.base = 'https://sms-cloud.example.ts.net/api/v1';
    setAccessToken(null);
    forgetNativeRefreshToken();
  });

  it('renews at the chosen server with its stored token and keeps the rotated one', async () => {
    store('R1');
    post().mockResolvedValue({ data: { access_token: 'A2', refresh_token: 'R2' } });

    expect(await refreshAccessToken()).toBe('A2');

    expect(post()).toHaveBeenCalledTimes(1);
    const [url, body, config] = post().mock.calls[0];
    // Not the app's own files (https://localhost/api/v1/...), which is where it went before.
    expect(url).toBe('https://sms-cloud.example.ts.net/api/v1/auth/refresh');
    expect(body).toEqual({ refresh_token: 'R1' });
    expect((config as { headers: Record<string, string> }).headers['X-SMS-Native-Session']).toBe('1');
    expect(getNativeRefreshToken()).toBe('R2');
    expect(getAccessToken()).toBe('A2');
  });

  it('asks nothing without a stored token', async () => {
    expect(await refreshAccessToken()).toBeNull();
    expect(post()).not.toHaveBeenCalled();
  });

  it('forgets a token the server refused', async () => {
    store('R-dead');
    post().mockRejectedValue({ response: { status: 401 } });
    expect(await refreshAccessToken()).toBeNull();
    expect(getNativeRefreshToken()).toBeNull();
  });

  it('keeps the token when the server was only out of reach', async () => {
    store('R1');
    post().mockRejectedValue(new Error('Network Error'));
    expect(await refreshAccessToken()).toBeNull();
    expect(getNativeRefreshToken()).toBe('R1');
  });

  it('keeps a token from a sign-in answer', () => {
    rememberNativeRefreshToken({ access_token: 'A', refresh_token: 'R9' });
    expect(getNativeRefreshToken()).toBe('R9');
  });
});

describe('authService in a browser', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    env.native = false;
    env.base = '/api/v1';
    forgetNativeRefreshToken();
  });

  it('renews with the cookie only: empty body, no app header, nothing stored', async () => {
    post().mockResolvedValue({ data: { access_token: 'A1', refresh_token: 'should-not-be-kept' } });
    expect(await refreshAccessToken()).toBe('A1');
    const [url, body, config] = post().mock.calls[0];
    expect(url).toBe('/api/v1/auth/refresh');
    expect(body).toEqual({});
    expect((config as { headers: Record<string, string> }).headers).toEqual({});
    expect((config as { withCredentials: boolean }).withCredentials).toBe(true);
    expect(getItem('sms_native_refresh_v1')).toBeNull();
  });
});
