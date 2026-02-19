import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useApiQuery, useApiMutation } from './useApiWithRecovery';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock React Query
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return actual;
});

// Create a wrapper component for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: true },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useApiWithRecovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('useApiQuery', () => {
    it('should fetch data successfully', async () => {
      const mockData = { id: 1, name: 'Test' };
      const mockFn = vi.fn().mockResolvedValue(mockData);

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useApiQuery(['test'], mockFn),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle query errors', async () => {
      const testError = new Error('Query failed');
      const mockFn = vi.fn().mockRejectedValue(testError);

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useApiQuery(['test'], mockFn, { errorRecovery: { enabled: false } }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('should retry failed queries with exponential backoff', async () => {
      vi.useFakeTimers();
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce({ data: 'success' });

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useApiQuery(['test'], mockFn, {
          errorRecovery: {
            enabled: true,
            strategy: 'backoff',
            maxRetries: 3,
            backoffMs: 10,
          },
        }),
        { wrapper }
      );

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.isSuccess).toBe(true);

      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should not retry with "none" strategy', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Query failed'));

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useApiQuery(['test'], mockFn, {
          errorRecovery: {
            enabled: true,
            strategy: 'none',
          },
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should disable error recovery when errorRecovery.enabled is false', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Query failed'));

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useApiQuery(['test'], mockFn, {
          errorRecovery: { enabled: false },
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 401 errors', async () => {
      const unauthorizedError = {
        response: { status: 401 },
        message: 'Unauthorized',
      } as unknown as Error;
      const mockFn = vi.fn().mockRejectedValue(unauthorizedError);

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useApiQuery(['test-401'], mockFn, {
          errorRecovery: {
            enabled: true,
            strategy: 'backoff',
            maxRetries: 3,
            backoffMs: 10,
          },
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 403 errors', async () => {
      const forbiddenError = {
        response: { status: 403 },
        message: 'Forbidden',
      } as unknown as Error;
      const mockFn = vi.fn().mockRejectedValue(forbiddenError);

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useApiQuery(['test-403'], mockFn, {
          errorRecovery: {
            enabled: true,
            strategy: 'backoff',
            maxRetries: 3,
            backoffMs: 10,
          },
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should reset error state on successful retry', async () => {
      vi.useFakeTimers();
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValueOnce({ data: 'success' });

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useApiQuery(['test'], mockFn, {
          errorRecovery: {
            enabled: true,
            strategy: 'backoff',
            maxRetries: 2,
            backoffMs: 10,
          },
        }),
        { wrapper }
      );

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.isSuccess).toBe(true);

      expect(result.current.data).toEqual({ data: 'success' });
      expect(result.current.isError).toBe(false);
    });

    it('should respect custom options', async () => {
      const mockFn = vi.fn().mockResolvedValue({ data: 'test' });
      const onSuccess = vi.fn();

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useApiQuery(['test'], mockFn, {
          onSuccess,
          errorRecovery: { enabled: false },
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      }, { timeout: 2000 });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      }, { timeout: 5000 });
    });

    it('should use custom error recovery options', async () => {
      vi.useFakeTimers();
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValueOnce({ data: 'success' });

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useApiQuery(['test'], mockFn, {
          errorRecovery: {
            enabled: true,
            strategy: 'backoff',
            maxRetries: 1,
            backoffMs: 20,
          },
        }),
        { wrapper }
      );

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.isSuccess).toBe(true);

      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple query keys independently', async () => {
      const mockFn1 = vi.fn().mockResolvedValue({ id: 1 });
      const mockFn2 = vi.fn().mockResolvedValue({ id: 2 });

      const wrapper = createWrapper();
      const { result: result1 } = renderHook(
        () => useApiQuery(['test1'], mockFn1),
        { wrapper }
      );

      const { result: result2 } = renderHook(
        () => useApiQuery(['test2'], mockFn2),
        { wrapper }
      );

      await waitFor(() => {
        expect(result1.current.isSuccess && result2.current.isSuccess).toBe(true);
      });

      expect(result1.current.data).toEqual({ id: 1 });
      expect(result2.current.data).toEqual({ id: 2 });
    });
  });

  describe('useApiMutation', () => {
    it('should mutate data successfully', async () => {
      const mockData = { id: 1, name: 'Created' };
      const mockFn = vi.fn().mockResolvedValue(mockData);

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useApiMutation(mockFn),
        { wrapper }
      );

        result.current.mutate(undefined);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle mutation errors', async () => {
      const testError = new Error('Mutation failed');
      const mockFn = vi.fn().mockRejectedValue(testError);

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useApiMutation(mockFn, { errorRecovery: { enabled: false } }),
        { wrapper }
      );

        result.current.mutate(undefined);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('should retry failed mutations', async () => {
      vi.useFakeTimers();
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockResolvedValueOnce({ success: true });

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useApiMutation(mockFn, {
          errorRecovery: {
            enabled: true,
            strategy: 'backoff',
            maxRetries: 2,
            backoffMs: 100,
          },
        }),
        { wrapper }
      );

      act(() => {
        result.current.mutate({ test: 'data' });
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.isSuccess).toBe(true);
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should pass variables to mutation function', async () => {
      const mockFn = vi.fn().mockResolvedValue({ success: true });

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useApiMutation(mockFn),
        { wrapper }
      );

      const testData = { id: 1, name: 'Test' };

        result.current.mutate(testData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockFn).toHaveBeenCalledWith(testData);
    });

    it('should respect maxRetries for mutations', async () => {
      vi.useFakeTimers();
      const mockFn = vi.fn().mockRejectedValue(new Error('Always fails'));

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useApiMutation(mockFn, {
          errorRecovery: {
            enabled: true,
            strategy: 'backoff',
            maxRetries: 2,
            backoffMs: 100,
          },
        }),
        { wrapper }
      );

      act(() => {
        result.current.mutate(undefined);
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.isError).toBe(true);
      // Should have tried: initial + 2 retries = 3 times
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should use immediate strategy by default', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValueOnce({ success: true });

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useApiMutation(mockFn, {
          errorRecovery: {
            enabled: true,
            strategy: 'immediate',
            maxRetries: 1,
          },
        }),
        { wrapper }
      );

        result.current.mutate(undefined);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should call onSuccess callback', async () => {
      const mockFn = vi.fn().mockResolvedValue({ success: true });
      const onSuccess = vi.fn();

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useApiMutation(mockFn, { onSuccess }),
        { wrapper }
      );

        result.current.mutate(undefined);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(onSuccess).toHaveBeenCalled();
    });

    it('should call onError callback on failure', async () => {
      const testError = new Error('Mutation failed');
      const mockFn = vi.fn().mockRejectedValue(testError);
      const onError = vi.fn();

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useApiMutation(mockFn, {
          onError,
          errorRecovery: { enabled: false },
        }),
        { wrapper }
      );

        result.current.mutate(undefined);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(onError).toHaveBeenCalled();
    });

    it('should disable error recovery when errorRecovery.enabled is false', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Mutation failed'));

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useApiMutation(mockFn, {
          errorRecovery: { enabled: false },
        }),
        { wrapper }
      );

        result.current.mutate(undefined);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle sequential mutations', async () => {
      const mockFn = vi.fn()
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 2 })
        .mockResolvedValueOnce({ id: 3 });

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useApiMutation(mockFn),
        { wrapper }
      );

      // First mutation
      act(() => {
        result.current.mutate({ id: 1 });
      });

      await waitFor(() => {
        expect(result.current.data?.id).toBe(1);
      });

      // Second mutation
      act(() => {
        result.current.mutate({ id: 2 });
      });

      await waitFor(() => {
        expect(result.current.data?.id).toBe(2);
      });

      // Third mutation
      act(() => {
        result.current.mutate({ id: 3 });
      });

      await waitFor(() => {
        expect(result.current.data?.id).toBe(3);
      });

      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should reset mutation state', async () => {
      const mockFn = vi.fn().mockResolvedValue({ success: true });

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useApiMutation(mockFn),
        { wrapper }
      );

      act(() => {
        result.current.mutate(undefined);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isSuccess).toBe(true);

      await act(async () => {
        result.current.reset();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(false);
      });
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('error recovery integration', () => {
    it('should integrate with useErrorRecovery for queries', async () => {
      vi.useFakeTimers();
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: 'recovered' });

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useApiQuery(['test'], mockFn, {
          errorRecovery: {
            enabled: true,
            strategy: 'backoff',
            maxRetries: 3,
            backoffMs: 10,
          },
        }),
        { wrapper }
      );

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toEqual({ data: 'recovered' });
    });

    it('should integrate with useErrorRecovery for mutations', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValueOnce({ success: true });

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useApiMutation(mockFn, {
          errorRecovery: {
            enabled: true,
            strategy: 'backoff',
            maxRetries: 2,
            backoffMs: 10,
          },
        }),
        { wrapper }
      );

      act(() => {
        result.current.mutate({ test: 'data' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      }, { timeout: 5000 });
      expect(result.current.data?.success).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle null response', async () => {
      const mockFn = vi.fn().mockResolvedValue(null);

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useApiQuery(['test'], mockFn),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });

    it('should handle undefined response', async () => {
      const mockFn = vi.fn().mockResolvedValue(undefined);

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useApiQuery(['test'], mockFn),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('should handle large data objects', async () => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          data: 'x'.repeat(100),
        })),
      };

      const mockFn = vi.fn().mockResolvedValue(largeData);

      const wrapper = createWrapper();
      const { result } = renderHook(
        () => useApiQuery(['test'], mockFn),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(largeData);
    });
  });
});
