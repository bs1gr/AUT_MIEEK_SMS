import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

import {
  getAccessToken,
  setAccessToken,
  refreshAccessToken,
} from '../../services/authService';

vi.mock('axios');

describe('authService', () => {
  beforeEach(() => {
    // clear tokens
    setAccessToken(null);
    vi.resetAllMocks();
  });

  it('refreshAccessToken stores tokens and returns access token on success', async () => {
      // Arrange: axios.post should return access and refresh tokens
      vi.spyOn(axios, 'post').mockResolvedValue({ data: { access_token: 'A1' } } as unknown as { data: { access_token: string } });

    // Act
    const token = await refreshAccessToken();

    // Assert
    expect(token).toBe('A1');
  expect(getAccessToken()).toBe('A1');
  });

  it('refreshAccessToken clears tokens on failure', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('network'));
    const token = await refreshAccessToken();

    expect(token).toBeNull();
    expect(getAccessToken()).toBeNull();
  });
});
