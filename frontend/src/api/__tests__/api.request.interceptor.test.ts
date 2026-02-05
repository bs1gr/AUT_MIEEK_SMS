import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as apiModule from '../api';
import * as authService from '../../services/authService';

describe('apiClient request interceptor', () => {
  afterEach(() => {
    vi.clearAllMocks();
    authService.clearAccessToken();
  });

  it('attaches Authorization header when access token exists', () => {
    // Arrange
    authService.setAccessToken('TOK123');
    const spy = vi.spyOn(authService, 'getAccessToken');
    const config: { headers: Record<string, unknown> } = { headers: {} };

    // Act
    // call the helper exported from the api module
    (apiModule as unknown as { attachAuthHeader: (cfg: { headers?: Record<string, unknown> }) => unknown }).attachAuthHeader(config);

    // Assert that the helper consulted the auth service
    expect(spy).toHaveBeenCalled();
    expect(config.headers.Authorization).toBe('Bearer TOK123');
  });

  it('does nothing when no token present', () => {
    authService.clearAccessToken();
    const config: { headers: Record<string, unknown> } = { headers: {} };
    (apiModule as unknown as { attachAuthHeader: (cfg: { headers?: Record<string, unknown> }) => unknown }).attachAuthHeader(config);
    expect(config.headers.Authorization).toBeUndefined();
  });

  it('is resilient if headers missing or getter throws', () => {
    const configNoHeaders: Record<string, unknown> = {};
    expect(() => (apiModule as unknown as { attachAuthHeader: (cfg: Record<string, unknown>) => unknown }).attachAuthHeader(configNoHeaders)).not.toThrow();

    const spy = vi.spyOn(authService, 'getAccessToken').mockImplementation(() => {
      throw new Error('boom');
    });
    const config: { headers: Record<string, unknown> } = { headers: {} };
    expect(() => (apiModule as unknown as { attachAuthHeader: (cfg: { headers?: Record<string, unknown> }) => unknown }).attachAuthHeader(config)).not.toThrow();
    // and does not set auth header
    expect(config.headers.Authorization).toBeUndefined();
    spy.mockRestore();
  });
});
