import { useEffect, useRef } from 'react';

export function usePerformanceMonitor(componentName: string) {
  const startTimeRef = useRef<number>(0);
  const renderCountRef = useRef(0);

  if (startTimeRef.current === 0) {
      startTimeRef.current = performance.now();
  }

  useEffect(() => {
    renderCountRef.current++;
    const duration = performance.now() - startTimeRef.current;

    // Log if render takes > 16ms (1 frame) in development
    if (process.env.NODE_ENV === 'development' && duration > 16) {
        console.debug(`[Performance] ${componentName} render #${renderCountRef.current} took ${duration.toFixed(2)}ms`);
    }

    // Reset for next update
    startTimeRef.current = performance.now();
  });
}
