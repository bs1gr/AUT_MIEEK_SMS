import { useState, useCallback, useRef, useEffect } from 'react';

export function useRateLimit(delayMs: number = 500) {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const call = useCallback((fn: () => void | Promise<void>) => {
    if (isRateLimited) return;

    setIsRateLimited(true);
    try {
      fn();
      // If it's a promise, we could optionally wait for it,
      // but usually rate limiting is about action frequency.
    } finally {
      timeoutRef.current = setTimeout(() => {
        setIsRateLimited(false);
      }, delayMs);
    }
  }, [isRateLimited, delayMs]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { isRateLimited, call };
}
