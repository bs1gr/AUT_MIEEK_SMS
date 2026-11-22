import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLiteHeartbeat, LITE_HEARTBEAT_INTERVAL_MS, isLiteServer } from '../useLiteHeartbeat';

vi.mock('@/utils/serverUrl', () => ({ getApiBaseUrl: () => '/api/v1' }));

const BEAT = /^\/api\/v1\/lite\/heartbeat\?page=([^&]+)&state=(visible|hidden|closed)$/;

// SMS Lite exits once no page has sent a beat for 90 s, so every open page beats every 10 s,
// logged in or not; a server without the endpoint (Docker, QNAP) stops it after one 404.
describe('useLiteHeartbeat', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let visibility: 'visible' | 'hidden';

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    visibility = 'visible';
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const reply = (status: number) => ({ status, ok: status >= 200 && status < 300, text: vi.fn().mockResolvedValue('{}') });
  const beats = () =>
    fetchMock.mock.calls.map(([url, options]) => {
      const match = String(url).match(BEAT);
      return { page: match?.[1], state: match?.[2], keepalive: Boolean((options as RequestInit)?.keepalive) };
    });

  it('beats at once and every 10 s on an SMS Lite server', async () => {
    const response = reply(200);
    fetchMock.mockResolvedValue(response);
    const { unmount } = renderHook(() => useLiteHeartbeat());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(0);
    // An unread body keeps the request open, and the page never goes network-idle.
    expect(response.text).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(BEAT), expect.objectContaining({ method: 'GET' }));
    expect(isLiteServer()).toBe(true); // the connection banner can say how to start it again
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

  // Plan todo 67 (the owner, 2026-11-22): a page in the background counts as open for 5 hours.
  describe('in the background and when closed', () => {
    beforeEach(() => {
      fetchMock.mockResolvedValue(reply(200));
    });

    it('says so at once as the page goes into the background, and again when it comes back', async () => {
      renderHook(() => useLiteHeartbeat());
      await vi.advanceTimersByTimeAsync(0);

      visibility = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
      await vi.advanceTimersByTimeAsync(LITE_HEARTBEAT_INTERVAL_MS);
      visibility = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));

      const sent = beats();
      expect(sent.map((beat) => beat.state)).toEqual(['visible', 'hidden', 'hidden', 'visible']);
      // The one sent as it leaves must arrive even if the browser freezes the page right after.
      expect(sent[1].keepalive).toBe(true);
      expect(new Set(sent.map((beat) => beat.page)).size).toBe(1); // one page, one id
    });

    it('says it is in the background when the browser freezes it', async () => {
      renderHook(() => useLiteHeartbeat());
      document.dispatchEvent(new Event('freeze'));
      expect(beats().at(-1)).toMatchObject({ state: 'hidden', keepalive: true });
    });

    it('says it is closed when the tab or the browser closes, not when it is kept for Back', async () => {
      renderHook(() => useLiteHeartbeat());

      const kept = new Event('pagehide') as PageTransitionEvent;
      Object.defineProperty(kept, 'persisted', { value: true });
      window.dispatchEvent(kept);
      expect(beats().map((beat) => beat.state)).toEqual(['visible']);

      const closed = new Event('pagehide') as PageTransitionEvent;
      Object.defineProperty(closed, 'persisted', { value: false });
      window.dispatchEvent(closed);
      expect(beats().at(-1)).toMatchObject({ state: 'closed', keepalive: true });
    });

    it('gives every page an id of its own', async () => {
      renderHook(() => useLiteHeartbeat());
      renderHook(() => useLiteHeartbeat());
      const pages = new Set(beats().map((beat) => beat.page));
      expect(pages.size).toBe(2);
    });
  });
});
