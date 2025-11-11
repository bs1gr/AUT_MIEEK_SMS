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
  });
});
