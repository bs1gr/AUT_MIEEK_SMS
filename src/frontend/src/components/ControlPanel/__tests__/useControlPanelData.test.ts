/**
 * Tests for useControlPanelData — the control-API data layer (TTL response
 * cache, per-tab fetchers, status auto-refresh + uptime ticker, and the
 * operation runners) extracted from ControlPanel.tsx, which was ~1190 lines
 * of this logic plus the render for seven tabs and had no test coverage at
 * all. See the 2026-09 workspace audit.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { formatUptime, useControlPanelData } from '../useControlPanelData';

vi.mock('@/api/api', () => ({
  controlApiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { controlApiClient } from '@/api/api';

const mockGet = controlApiClient.get as unknown as ReturnType<typeof vi.fn>;
const mockPost = controlApiClient.post as unknown as ReturnType<typeof vi.fn>;

const t = (key: string) => key;
const ok = (data: unknown) => ({ data });

describe('formatUptime', () => {
  it('shows only seconds under a minute', () => {
    expect(formatUptime(0)).toBe('0s');
    expect(formatUptime(45)).toBe('45s');
  });

  it('adds minutes once past a minute', () => {
    expect(formatUptime(60)).toBe('1m 0s');
    expect(formatUptime(605)).toBe('10m 5s');
  });

  it('adds hours once past an hour, keeping a zero minute component', () => {
    expect(formatUptime(3600)).toBe('1h 0m 0s');
    expect(formatUptime(3661)).toBe('1h 1m 1s');
  });

  it('adds days once past a day', () => {
    expect(formatUptime(86400)).toBe('1d 0h 0m 0s');
    expect(formatUptime(90061)).toBe('1d 1h 1m 1s');
  });

  it('truncates fractional seconds', () => {
    expect(formatUptime(10.9)).toBe('10s');
  });
});

describe('useControlPanelData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGet.mockResolvedValue(ok({}));
    mockPost.mockResolvedValue(ok({ success: true }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches status on mount', async () => {
    mockGet.mockResolvedValue(ok({ backend: 'running', frontend: 'running', docker: 'up', database: 'ok' }));

    const { result } = renderHook(() => useControlPanelData({ t }));

    await waitFor(() => expect(result.current.status?.backend).toBe('running'));
    expect(mockGet).toHaveBeenCalledWith('/status');
  });

  it('derives an uptime string from process_start_time', async () => {
    const startedAt = new Date(Date.now() - 3661_000).toISOString();
    mockGet.mockResolvedValue(ok({ backend: 'running', frontend: 'running', docker: 'up', database: 'ok', process_start_time: startedAt }));

    const { result } = renderHook(() => useControlPanelData({ t }));

    await waitFor(() => expect(result.current.uptime).toBe('1h 1m 1s'));
  });

  it('swallows a status fetch failure and leaves status null', async () => {
    mockGet.mockRejectedValue(new Error('control api down'));

    const { result } = renderHook(() => useControlPanelData({ t }));

    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(result.current.status).toBeNull();
  });

  describe('per-tab fetchers', () => {
    it('loads diagnostics and stamps the tab as updated', async () => {
      mockGet.mockImplementation(async (url: string) => {
        if (url === '/diagnostics') return ok([{ name: 'python', status: 'ok', message: 'fine' }]);
        return ok({});
      });

      const { result } = renderHook(() => useControlPanelData({ t }));

      await act(async () => {
        await result.current.fetchDiagnostics();
      });

      expect(result.current.diagnostics).toHaveLength(1);
      expect(result.current.tabUpdatedAt.diagnostics).toBeTruthy();
      expect(result.current.tabLoading.diagnostics).toBe(false);
    });

    it('falls back to an empty list when diagnostics comes back non-array', async () => {
      mockGet.mockImplementation(async (url: string) => {
        if (url === '/diagnostics') return ok({ unexpected: 'shape' });
        return ok({});
      });

      const { result } = renderHook(() => useControlPanelData({ t }));

      await act(async () => {
        await result.current.fetchDiagnostics();
      });

      expect(result.current.diagnostics).toEqual([]);
    });

    it('falls back to an empty list when ports comes back non-array', async () => {
      mockGet.mockImplementation(async (url: string) => {
        if (url === '/ports') return ok({ unexpected: 'shape' });
        return ok({});
      });

      const { result } = renderHook(() => useControlPanelData({ t }));

      await act(async () => {
        await result.current.fetchPorts();
      });

      expect(result.current.ports).toEqual([]);
    });

    it('requests packages on a separate URL and cache key when asked', async () => {
      mockGet.mockImplementation(async (url: string) => {
        if (url.startsWith('/environment')) return ok({ python_version: '3.13.0' });
        return ok({});
      });

      const { result } = renderHook(() => useControlPanelData({ t }));

      await act(async () => {
        await result.current.fetchEnvironment();
      });
      expect(mockGet).toHaveBeenCalledWith('/environment');

      await act(async () => {
        await result.current.fetchEnvironment(true);
      });
      // A different cache key, so the packages variant still hits the network
      expect(mockGet).toHaveBeenCalledWith('/environment?include_packages=true');
    });

    it('reads the logs envelope and tolerates a missing logs array', async () => {
      mockGet.mockImplementation(async (url: string) => {
        if (url.startsWith('/logs/')) return ok({});
        return ok({});
      });

      const { result } = renderHook(() => useControlPanelData({ t }));

      await act(async () => {
        await result.current.fetchLogs();
      });

      expect(result.current.logs).toEqual([]);
      expect(mockGet).toHaveBeenCalledWith('/logs/backend?lines=50');
    });
  });

  describe('response cache', () => {
    it('serves a second fetch from cache instead of re-calling the API', async () => {
      mockGet.mockImplementation(async (url: string) => {
        if (url === '/diagnostics') return ok([{ name: 'python', status: 'ok', message: 'fine' }]);
        return ok({});
      });

      const { result } = renderHook(() => useControlPanelData({ t }));

      await act(async () => {
        await result.current.fetchDiagnostics();
      });
      const callsAfterFirst = mockGet.mock.calls.filter(([url]) => url === '/diagnostics').length;

      await act(async () => {
        await result.current.fetchDiagnostics();
      });
      const callsAfterSecond = mockGet.mock.calls.filter(([url]) => url === '/diagnostics').length;

      expect(callsAfterFirst).toBe(1);
      expect(callsAfterSecond).toBe(1);
      expect(result.current.diagnostics).toHaveLength(1);
    });

    it('re-fetches once the entry is older than its TTL', async () => {
      mockGet.mockImplementation(async (url: string) => {
        if (url === '/ports') return ok([{ port: 8000, status: 'in_use' }]);
        return ok({});
      });
      const nowSpy = vi.spyOn(Date, 'now');
      nowSpy.mockReturnValue(1_000_000);

      const { result } = renderHook(() => useControlPanelData({ t }));

      await act(async () => {
        await result.current.fetchPorts();
      });
      expect(mockGet.mock.calls.filter(([url]) => url === '/ports')).toHaveLength(1);

      // Ports TTL is 10s — jump past it
      nowSpy.mockReturnValue(1_000_000 + 11_000);
      await act(async () => {
        await result.current.fetchPorts();
      });

      expect(mockGet.mock.calls.filter(([url]) => url === '/ports')).toHaveLength(2);
    });
  });

  describe('operations', () => {
    it('posts to /operations/<name> and reports success', async () => {
      const { result } = renderHook(() => useControlPanelData({ t }));

      await act(async () => {
        await result.current.runOperation('cleanup', 'Cleanup done');
      });

      expect(mockPost).toHaveBeenCalledWith('/operations/cleanup');
      expect(result.current.operationStatus).toEqual({ type: 'success', message: 'Cleanup done' });
      expect(result.current.loading).toBe(false);
    });

    it('posts a full path verbatim so query params survive', async () => {
      const { result } = renderHook(() => useControlPanelData({ t }));

      await act(async () => {
        await result.current.runOperationPath('/operations/update-volumes?migrate=true', 'Updated');
      });

      expect(mockPost).toHaveBeenCalledWith('/operations/update-volumes?migrate=true');
      expect(result.current.operationStatus).toEqual({ type: 'success', message: 'Updated' });
    });

    it('reports the backend message when the operation returns success: false', async () => {
      mockPost.mockResolvedValue(ok({ success: false, message: 'Docker not running' }));
      const { result } = renderHook(() => useControlPanelData({ t }));

      await act(async () => {
        await result.current.runOperation('build', 'Built');
      });

      expect(result.current.operationStatus).toEqual({ type: 'error', message: 'Docker not running' });
    });

    it('surfaces an axios error detail', async () => {
      mockPost.mockRejectedValue({ response: { data: { detail: 'Permission denied' } }, message: 'Request failed' });
      const { result } = renderHook(() => useControlPanelData({ t }));

      await act(async () => {
        await result.current.runOperation('cleanup', 'Cleanup done');
      });

      expect(result.current.operationStatus).toEqual({ type: 'error', message: 'Permission denied' });
      expect(result.current.loading).toBe(false);
    });

    it('falls back to the translated generic failure when the error carries nothing', async () => {
      mockPost.mockRejectedValue({});
      const { result } = renderHook(() => useControlPanelData({ t }));

      await act(async () => {
        await result.current.runOperation('cleanup', 'Cleanup done');
      });

      expect(result.current.operationStatus).toEqual({ type: 'error', message: 'operationFailed' });
    });

    it('refreshes status and diagnostics after a successful operation', async () => {
      const { result } = renderHook(() => useControlPanelData({ t }));
      await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/status'));
      mockGet.mockClear();

      await act(async () => {
        await result.current.runOperation('cleanup', 'Cleanup done');
      });

      expect(mockGet).toHaveBeenCalledWith('/diagnostics');
    });
  });
});
