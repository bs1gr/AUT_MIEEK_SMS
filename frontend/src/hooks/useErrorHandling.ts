/**
 * Custom React hooks for error handling and recovery
 */

import { useState, useCallback, useRef } from 'react';
import { ErrorHandler, ErrorCategory } from '@/utils/errorHandling';

export interface UseAsyncErrorState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isRetrying: boolean;
  errorCategory: ErrorCategory;
}

interface UseAsyncErrorOptions {
  onError?: (error: Error, category: ErrorCategory) => void;
  onSuccess?: () => void;
  autoRetry?: boolean;
  maxRetries?: number;
}

/**
 * Hook for managing async operations with comprehensive error handling
 */
export function useAsyncError<T>(
  asyncFn: () => Promise<T>,
  options: UseAsyncErrorOptions = {}
) {
  const [state, setState] = useState<UseAsyncErrorState<T>>({
    data: null,
    error: null,
    isLoading: false,
    isRetrying: false,
    errorCategory: ErrorCategory.UNKNOWN,
  });

  const retryCountRef = useRef(0);
  const { onError, onSuccess, autoRetry = false, maxRetries = 3 } = options;

  const execute = useCallback(
    async (shouldRetry = false) => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        isRetrying: shouldRetry,
      }));

      try {
        // Reset retry count on new attempt
        if (!shouldRetry) {
          retryCountRef.current = 0;
        }

        const result = await asyncFn();
        setState({
          data: result,
          error: null,
          isLoading: false,
          isRetrying: false,
          errorCategory: ErrorCategory.UNKNOWN,
        });

        onSuccess?.();
        return result;
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        const category = ErrorHandler.categorizeError(error);
        const isRecoverable = ErrorHandler.isRecoverable(category);

        // Auto-retry if enabled and error is recoverable
        if (autoRetry && isRecoverable && retryCountRef.current < maxRetries) {
          retryCountRef.current += 1;
          const strategy = ErrorHandler.getRetryStrategy(category);

          // Wait before retrying
          await new Promise<void>((resolve) => setTimeout(resolve, strategy.delayMs));

          // Retry recursively
          return execute(true);
        }

        setState({
          data: null,
          error,
          isLoading: false,
          isRetrying: false,
          errorCategory: category,
        });

        ErrorHandler.logError(error, { operation: 'useAsyncError' });
        onError?.(error, category);

        throw error;
      }
    },
    [asyncFn, onError, onSuccess, autoRetry, maxRetries]
  );

  const retry = useCallback(async () => {
    retryCountRef.current = 0;
    return execute(false);
  }, [execute]);

  return { ...state, execute, retry };
}

/**
 * Hook for managing local storage with error handling
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [stored, setStored] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      ErrorHandler.logError(error, { operation: `useLocalStorage.get[${key}]` });
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(stored) : value;
        setStored(valueToStore);
        localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        ErrorHandler.logError(error, { operation: `useLocalStorage.set[${key}]` });
      }
    },
    [key, stored]
  );

  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setStored(initialValue);
    } catch (error) {
      ErrorHandler.logError(error, { operation: `useLocalStorage.remove[${key}]` });
    }
  }, [key, initialValue]);

  return [stored, setValue, removeValue] as const;
}

/**
 * Hook for debounced async operations with error handling
 */
export function useDebouncedAsync<T>(
  asyncFn: () => Promise<T>,
  delay: number = 500,
  options: UseAsyncErrorOptions = {}
) {
  const [state, setState] = useState<UseAsyncErrorState<T>>({
    data: null,
    error: null,
    isLoading: false,
    isRetrying: false,
    errorCategory: ErrorCategory.UNKNOWN,
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const execute = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    // Clear previous timeout
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        const result = await asyncFn();
        setState({
          data: result,
          error: null,
          isLoading: false,
          isRetrying: false,
          errorCategory: ErrorCategory.UNKNOWN,
        });
        options.onSuccess?.();
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        const category = ErrorHandler.categorizeError(err);

        setState({
          data: null,
          error: err,
          isLoading: false,
          isRetrying: false,
          errorCategory: category,
        });

        ErrorHandler.logError(error, { operation: 'useDebouncedAsync' });
        options.onError?.(err, category);
      }
    }, delay);
  }, [asyncFn, delay, options]);

  const cancel = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { ...state, execute, cancel };
}
