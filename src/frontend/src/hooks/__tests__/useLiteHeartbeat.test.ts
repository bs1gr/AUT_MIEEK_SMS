import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLiteHeartbeat, LITE_HEARTBEAT_INTERVAL_MS } from '../useLiteHeartbeat';

vi.mock('@/utils/serverUrl', () => ({ getApiBaseUrl: () => '/api/v1' }));

// SMS Lite exits once no page has sent a beat for 90 s, so every open page beats every 10 s,
// logged in or not; a server without the endpoint (Docker, QNAP) stops it after one 404.
describe('useLiteHeartbeat', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const reply = (status: number) => ({ status, text: vi.fn().mockResolvedValue('{}') });

  it('beats at once and every 10 s on an SMS Lite server', async () => {
    const response = reply(200);
    fetchMock.mockResolvedValue(response);
    const { unmount } = renderHook(() => useLiteHeartbeat());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(0);
    // An unread body keeps the request open, and the page never goes network-idle.
    expect(response.text).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/lite/heartbeat', expect.objectContaining({ method: 'GET' }));
    await vi.advanceTimersByTimeAsync(LITE_HEARTBEAT_INTERVAL_MS * 3);
    expect(fetchMock).toHaveBeenCalledTimes(4);

    unmount();
    await vi.advanceTimersByTimeAsync(LITE_HEARTBEAT_INTERVAL_MS * 3);
    expect(fetchMock).toHaveBeenCalledTimes(4); // a closed page stops beating
  });

  it('stops after a 404 (not an SMS Lite server)', async () => {
    const response = reply(404);
    fetchMock.mockResolvedValue(response);
    renderHook(() => useLiteHeartbeat());

    await vi.advanceTimersByTimeAsync(LITE_HEARTBEAT_INTERVAL_MS * 5);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.text).toHaveBeenCalledTimes(1);
  });

  it('keeps beating while the server cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    renderHook(() => useLiteHeartbeat());

    await vi.advanceTimersByTimeAsync(LITE_HEARTBEAT_INTERVAL_MS * 2);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
