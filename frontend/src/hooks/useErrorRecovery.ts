import { useState, useCallback, useRef, useEffect } from 'react';

export type ErrorRetryStrategy = 'none' | 'immediate' | 'backoff' | 'prompt';

export interface UseErrorRecoveryOptions {
  maxRetries?: number;
  backoffMs?: number;
  strategy?: ErrorRetryStrategy;
  onError?: (error: Error, retry: () => void) => void;
}

/**
 * Smart error recovery hook with exponential backoff
 * Automatically retries failed operations with configurable strategies
 *
 * @example
 * const { error, retryCount, retry, reset, handleError } = useErrorRecovery({
 *   strategy: 'backoff',
 *   maxRetries: 3,
 *   onError: (err, retry) => console.error('Failed:', err.message)
 * });
 */
export function useErrorRecovery(options: UseErrorRecoveryOptions = {}) {
  const {
    maxRetries = 3,
    backoffMs = 1000,
    strategy = 'backoff',
    onError
  } = options;

  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Calculate exponential backoff: 1s, 2s, 4s, 8s, etc.
  const getBackoffDelay = useCallback((attempt: number): number => {
    return backoffMs * Math.pow(2, Math.min(attempt, 4)); // Cap at 16x to avoid huge delays
  }, [backoffMs]);

  const reset = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setIsRetrying(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const handleError = useCallback((err: Error) => {
    setError(err);
    setIsRetrying(false);

    if (strategy === 'backoff' && retryCount < maxRetries) {
      const delay = getBackoffDelay(retryCount);
      console.warn(`[ErrorRecovery] Scheduling retry ${retryCount + 1}/${maxRetries} in ${delay}ms`);

      timeoutRef.current = setTimeout(() => {
        setRetryCount((prev) => prev + 1);
      }, delay);
    }

    onError?.(err, () => {
      reset();
      // Caller will typically use this to trigger a retry of their operation
    });
  }, [retryCount, maxRetries, strategy, getBackoffDelay, onError, reset]);

  const retry = useCallback(() => {
    console.warn(`[ErrorRecovery] Manual retry triggered`);
    setError(null);
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  const shouldRetry = useCallback((): boolean => {
    return strategy !== 'none' && retryCount < maxRetries && error !== null;
  }, [strategy, retryCount, maxRetries, error]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return {
    error,
    retryCount,
    maxRetries,
    isRetrying,
    retry,
    reset,
    handleError,
    shouldRetry
  };
}
