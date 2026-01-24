import { useState, useCallback, useRef, useEffect } from 'react';

export type ErrorRetryStrategy = 'none' | 'immediate' | 'backoff';

interface UseErrorRecoveryOptions {
  maxRetries?: number;
  backoffMs?: number;
  strategy?: ErrorRetryStrategy;
  onError?: (error: Error, retry: () => void) => void;
  onRetry?: () => void | Promise<void>;
}

export function useErrorRecovery(options: UseErrorRecoveryOptions = {}) {
  const {
    maxRetries = 3,
    backoffMs = 1000,
    strategy = 'backoff',
    onError,
    onRetry
  } = options;

  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const reset = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setIsRetrying(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const shouldRetry = useCallback(
    () => strategy !== 'none' && retryCount < maxRetries,
    [strategy, retryCount, maxRetries]
  );

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  const retry = useCallback(() => {
    clearTimer();
    setError(null);
    setRetryCount(0);
    setIsRetrying(false);
    onRetry?.();
  }, [clearTimer, onRetry]);

  const handleError = useCallback(
    (err: Error) => {
      const normalizedError = err instanceof Error ? err : new Error(String(err));
      setError(normalizedError);
      clearTimer();

      onError?.(normalizedError, retry);

      if (!shouldRetry()) return;

      const delayBase = strategy === 'backoff' ? backoffMs : 0;
      const delay = delayBase * Math.pow(2, Math.min(retryCount, 4));

      timeoutRef.current = setTimeout(async () => {
        setIsRetrying(true);
        try {
          setRetryCount((prev) => Math.min(prev + 1, maxRetries));
          await onRetry?.();
        } finally {
          setIsRetrying(false);
        }
      }, delay);
    },
    [backoffMs, clearTimer, maxRetries, onError, onRetry, retry, retryCount, shouldRetry, strategy]
  );

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  return { error, retryCount, isRetrying, handleError, reset, retry, shouldRetry };
}
