import { useState, useCallback, useRef, useEffect } from 'react';

export type ErrorRetryStrategy = 'none' | 'immediate' | 'backoff';

interface UseErrorRecoveryOptions {
  maxRetries?: number;
  backoffMs?: number;
  strategy?: ErrorRetryStrategy;
  onRetry?: () => void | Promise<void>;
}

export function useErrorRecovery(options: UseErrorRecoveryOptions = {}) {
  const {
    maxRetries = 3,
    backoffMs = 1000,
    strategy = 'backoff',
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

  const handleError = useCallback((err: Error) => {
    setError(err);

    if (strategy === 'none') return;

    if (retryCount < maxRetries) {
      const delay = strategy === 'backoff' ? backoffMs * Math.pow(2, retryCount) : 0;

      timeoutRef.current = setTimeout(async () => {
        setIsRetrying(true);
        try {
          setRetryCount(prev => prev + 1);
          await onRetry?.();
          // Note: We don't auto-reset here; we assume the component will clear error on success
        } finally {
          setIsRetrying(false);
        }
      }, delay);
    }
  }, [retryCount, maxRetries, backoffMs, strategy, onRetry]);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const retry = useCallback(() => {
    handleError(error || new Error('Retry requested'));
  }, [error, handleError]);

  return { error, retryCount, isRetrying, handleError, reset, retry };
}
