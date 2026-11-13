import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QUEUE_RETRY_MS, useQueueFlushTriggers } from './useQueueFlushTriggers';
import { setDatabaseUnavailable } from '@/utils/databaseAvailability';

describe('useQueueFlushTriggers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setDatabaseUnavailable(false);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('flushes on mount and runs onMount', () => {
    const flush = vi.fn();
    const onMount = vi.fn();
    renderHook(() => useQueueFlushTriggers(flush, onMount));
    expect(onMount).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it('retries on a timer, since the browser stays online while only the database is down', () => {
    const flush = vi.fn();
    renderHook(() => useQueueFlushTriggers(flush));
    act(() => {
      vi.advanceTimersByTime(QUEUE_RETRY_MS * 2);
    });
    expect(flush).toHaveBeenCalledTimes(3);
  });

  it('flushes as soon as the database is reachable again', () => {
    const flush = vi.fn();
    renderHook(() => useQueueFlushTriggers(flush));
    act(() => setDatabaseUnavailable(true));
    expect(flush).toHaveBeenCalledTimes(1); // going down does not flush
    act(() => setDatabaseUnavailable(false));
    expect(flush).toHaveBeenCalledTimes(2);
  });

  it('does not flush again just because a re-render passed a new flush function', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ flush }) => useQueueFlushTriggers(flush), { initialProps: { flush: first } });
    rerender({ flush: second });
    rerender({ flush: vi.fn() });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  it('calls the latest flush function on the next trigger', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ flush }) => useQueueFlushTriggers(flush), { initialProps: { flush: first } });
    rerender({ flush: second });
    act(() => {
      vi.advanceTimersByTime(QUEUE_RETRY_MS);
    });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('does not start a second flush while one is still running', async () => {
    let finish: () => void = () => undefined;
    const flush = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    renderHook(() => useQueueFlushTriggers(flush));
    act(() => {
      window.dispatchEvent(new Event('online'));
      vi.advanceTimersByTime(QUEUE_RETRY_MS);
    });
    expect(flush).toHaveBeenCalledTimes(1);

    await act(async () => {
      finish();
      await Promise.resolve();
    });
    act(() => {
      vi.advanceTimersByTime(QUEUE_RETRY_MS);
    });
    expect(flush).toHaveBeenCalledTimes(2);
  });

  it('keeps retrying after a flush that threw or rejected', async () => {
    const flush = vi.fn().mockRejectedValueOnce(new Error('boom'));
    renderHook(() => useQueueFlushTriggers(flush));
    await act(async () => {
      await Promise.resolve();
    });
    act(() => {
      vi.advanceTimersByTime(QUEUE_RETRY_MS);
    });
    expect(flush).toHaveBeenCalledTimes(2);
  });

  it('flushes when the browser comes back online, and stops after unmount', () => {
    const flush = vi.fn();
    const { unmount } = renderHook(() => useQueueFlushTriggers(flush));
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(flush).toHaveBeenCalledTimes(2);
    unmount();
    act(() => {
      window.dispatchEvent(new Event('online'));
      vi.advanceTimersByTime(QUEUE_RETRY_MS);
      setDatabaseUnavailable(true);
      setDatabaseUnavailable(false);
    });
    expect(flush).toHaveBeenCalledTimes(2);
  });
});
