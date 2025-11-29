import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import apiClient, { preflightAPI, __test_forceOriginalBase } from '../api';

// We simulate an unreachable absolute backend base; preflight should switch to relative '/api/v1'
// Implementation detail: __test_forceOriginalBase is only active under NODE_ENV === 'test'

describe('API dynamic fallback', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('switches to relative base on preflight failure for absolute original base', async () => {
    // Force original absolute base
    __test_forceOriginalBase('http://unreachable.invalid:9999/api/v1');

    // Mock axios.get for health to reject (simulate network unreachable)
    const error = new Error('connect ECONNREFUSED');
    vi.spyOn(axios, 'get').mockRejectedValue(error);

    const finalBase = await preflightAPI();
    expect(finalBase).toBe('/api/v1');
    expect(apiClient.defaults.baseURL).toBe('/api/v1');
  });

  it('keeps relative base when already relative', async () => {
    __test_forceOriginalBase('/api/v1');
    vi.spyOn(axios, 'get').mockResolvedValue({ status: 200, data: { ok: true } });
    const finalBase = await preflightAPI();
    expect(finalBase).toBe('/api/v1');
  });

  it('does not switch if health succeeds for absolute base', async () => {
    __test_forceOriginalBase('http://example.com/api/v1');
    vi.spyOn(axios, 'get').mockResolvedValue({ status: 200, data: { status: 'ok' } });
    const before = apiClient.defaults.baseURL;
    const finalBase = await preflightAPI();
    expect(finalBase).toBe(before);
  });
});
