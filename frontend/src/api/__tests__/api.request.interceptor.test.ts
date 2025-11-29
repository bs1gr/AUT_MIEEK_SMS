/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import * as apiModule from '../api';
import * as authService from '../../services/authService';

describe('apiClient request interceptor', () => {
  it('attaches Authorization header when access token exists', () => {
    // Arrange
  authService.setAccessToken('TOK123');
  const spy = vi.spyOn(authService, 'getAccessToken');
  const config: any = { headers: {} };

  // Act

  // call the helper exported from the api module
  (apiModule as any).attachAuthHeader(config);

  // Assert that the helper consulted the auth service
  expect(spy).toHaveBeenCalled();
  expect(config.headers.Authorization).toBe('Bearer TOK123');
  });

  it('does nothing when no token present', () => {
    authService.clearAccessToken();
    const config: any = { headers: {} };
    (apiModule as any).attachAuthHeader(config);
    expect(config.headers.Authorization).toBeUndefined();
  });

  it('is resilient if headers missing or getter throws', () => {
    const configNoHeaders: any = {};
    expect(() => (apiModule as any).attachAuthHeader(configNoHeaders)).not.toThrow();

    const spy = vi.spyOn(authService, 'getAccessToken').mockImplementation(() => {
      throw new Error('boom');
    });
    const config: any = { headers: {} };
    expect(() => (apiModule as any).attachAuthHeader(config)).not.toThrow();
    // and does not set auth header
    expect(config.headers.Authorization).toBeUndefined();
    spy.mockRestore();
  });
});
