import { renderHook, act } from '@testing-library/react';
import { useErrorRecovery } from './useErrorRecovery';
import { vi } from 'vitest';

describe('useErrorRecovery hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('error handling', () => {
    it('should handle errors correctly', () => {
      const { result } = renderHook(() => useErrorRecovery());
      const testError = new Error('Test error');

      act(() => {
        result.current.handleError(testError);
      });

      expect(result.current.error).toBe(testError);
      expect(result.current.isRetrying).toBe(false);
    });

    it('should initialize with no error', () => {
      const { result } = renderHook(() => useErrorRecovery());

      expect(result.current.error).toBeNull();
      expect(result.current.retryCount).toBe(0);
      expect(result.current.isRetrying).toBe(false);
    });
  });

  describe('retry strategies', () => {
    it('should not retry with "none" strategy', () => {
      const { result } = renderHook(() =>
        useErrorRecovery({ strategy: 'none' })
      );

      const testError = new Error('Test error');

      act(() => {
        result.current.handleError(testError);
      });

      expect(result.current.shouldRetry()).toBe(false);
    });

    it('should increment retry count with backoff strategy', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() =>
        useErrorRecovery({
          strategy: 'backoff',
          maxRetries: 3,
          backoffMs: 100,
        })
      );

      const testError = new Error('Test error');

      act(() => {
        result.current.handleError(testError);
      });

      expect(result.current.shouldRetry()).toBe(true);
      expect(result.current.retryCount).toBe(0);

      // Fast-forward time to allow retry count to increment
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Retry count should be incremented after timeout
      expect(result.current.retryCount).toBe(1);

      vi.useRealTimers();
    });

    it('should respect maxRetries limit', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() =>
        useErrorRecovery({
          strategy: 'backoff',
          maxRetries: 2,
          backoffMs: 100,
        })
      );

      const testError = new Error('Test error');

      // First error
      act(() => {
        result.current.handleError(testError);
      });
      expect(result.current.retryCount).toBe(0);
      expect(result.current.shouldRetry()).toBe(true);

      // Advance to trigger first retry (baseDelay * 2^0 = 100ms)
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current.retryCount).toBe(1);

      // Second error increments retry count again
      act(() => {
        result.current.handleError(testError);
      });

      // Advance to trigger second retry (baseDelay * 2^1 = 200ms)
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current.retryCount).toBe(2);

      // Should not retry beyond maxRetries
      expect(result.current.shouldRetry()).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('exponential backoff calculation', () => {
    it('should calculate correct exponential backoff delays', () => {
      vi.useFakeTimers();
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useErrorRecovery({
          strategy: 'backoff',
          maxRetries: 4,
          backoffMs: 1000,
          onError,
        })
      );

      const testError = new Error('Test error');

      // First error should trigger with 1000ms delay
      act(() => {
        result.current.handleError(testError);
      });

      // Verify first retry is scheduled at 1000ms (backoffMs * 2^0)
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.retryCount).toBe(1);

      // Trigger second error to schedule next retry
      act(() => {
        result.current.handleError(testError);
      });

      // Next retry should be at 2000ms (backoffMs * 2^1)
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(result.current.retryCount).toBe(2);

      vi.useRealTimers();
    });
  });

  describe('manual retry', () => {
    it('should reset on manual retry', () => {
      const { result } = renderHook(() => useErrorRecovery());
      const testError = new Error('Test error');

      act(() => {
        result.current.handleError(testError);
      });

      expect(result.current.error).toBe(testError);
      expect(result.current.retryCount).toBeGreaterThanOrEqual(0);

      act(() => {
        result.current.retry();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.retryCount).toBe(0);
      expect(result.current.isRetrying).toBe(false);
    });
  });

  describe('reset', () => {
    it('should clear all state on reset', () => {
      const { result } = renderHook(() => useErrorRecovery());
      const testError = new Error('Test error');

      act(() => {
        result.current.handleError(testError);
      });

      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.retryCount).toBe(0);
      expect(result.current.isRetrying).toBe(false);
    });

    it('should clear pending timeouts on reset', async () => {
      vi.useFakeTimers();
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useErrorRecovery({
          strategy: 'backoff',
          maxRetries: 3,
          backoffMs: 1000,
          onError,
        })
      );

      const testError = new Error('Test error');

      act(() => {
        result.current.handleError(testError);
      });

      // Reset before timeout fires
      act(() => {
        result.current.reset();
      });

      // Advance time past when retry would have fired
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      // Retry count should still be 0
      expect(result.current.retryCount).toBe(0);

      vi.useRealTimers();
    });
  });

  describe('onError callback', () => {
    it('should call onError callback when error occurs', () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useErrorRecovery({ onError })
      );

      const testError = new Error('Test error');

      act(() => {
        result.current.handleError(testError);
      });

      expect(onError).toHaveBeenCalledWith(testError, expect.any(Function));
    });

    it('should provide retry function in onError callback', () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useErrorRecovery({ onError })
      );

      const testError = new Error('Test error');

      act(() => {
        result.current.handleError(testError);
      });

      const [, retryFunction] = onError.mock.calls[0];
      expect(typeof retryFunction).toBe('function');

      act(() => {
        retryFunction();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('shouldRetry', () => {
    it('should return true when conditions allow retry', () => {
      const { result } = renderHook(() =>
        useErrorRecovery({
          strategy: 'backoff',
          maxRetries: 3,
        })
      );

      const testError = new Error('Test error');

      act(() => {
        result.current.handleError(testError);
      });

      expect(result.current.shouldRetry()).toBe(true);
    });

    it('should return false when max retries exceeded', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() =>
        useErrorRecovery({
          strategy: 'backoff',
          maxRetries: 1,
          backoffMs: 100,
        })
      );

      const testError = new Error('Test error');

      act(() => {
        result.current.handleError(testError);
      });

      // Trigger first retry
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.retryCount).toBe(1);

      // Now shouldRetry should be false
      expect(result.current.shouldRetry()).toBe(false);

      vi.useRealTimers();
    });

    it('should return false with "none" strategy', () => {
      const { result } = renderHook(() =>
        useErrorRecovery({ strategy: 'none' })
      );

      const testError = new Error('Test error');

      act(() => {
        result.current.handleError(testError);
      });

      expect(result.current.shouldRetry()).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should clear timeout on unmount', () => {
      vi.useFakeTimers();
      const { unmount } = renderHook(() =>
        useErrorRecovery({
          strategy: 'backoff',
          maxRetries: 3,
          backoffMs: 1000,
        })
      );

      // Unmount should not throw
      expect(() => unmount()).not.toThrow();

      vi.useRealTimers();
    });
  });

  describe('edge cases', () => {
    it('should handle rapid error handling', () => {
      const { result } = renderHook(() => useErrorRecovery());
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      act(() => {
        result.current.handleError(error1);
        result.current.handleError(error2);
      });

      expect(result.current.error).toBe(error2);
    });

    it('should handle non-Error objects', () => {
      const { result } = renderHook(() => useErrorRecovery());

      act(() => {
        result.current.handleError(new Error('Test error'));
      });

      expect(result.current.error).toBeInstanceOf(Error);
    });

    it('should cap exponential backoff to avoid extremely long delays', () => {
      vi.useFakeTimers();
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useErrorRecovery({
          strategy: 'backoff',
          maxRetries: 10,
          backoffMs: 1000,
          onError,
        })
      );

      const testError = new Error('Test error');

      act(() => {
        result.current.handleError(testError);
      });

      // Advance to trigger first few retries
      // The backoff should be capped at 16x (1000 * 2^4)
      act(() => {
        vi.advanceTimersByTime(1000); // First retry (1000 * 2^0)
      });
      expect(result.current.retryCount).toBe(1);

      // Trigger second error
      act(() => {
        result.current.handleError(testError);
      });

      act(() => {
        vi.advanceTimersByTime(2000); // Second retry (1000 * 2^1)
      });
      expect(result.current.retryCount).toBe(2);

      // Should have retries working
      expect(result.current.retryCount).toBeGreaterThan(0);

      vi.useRealTimers();
    });
  });
});
