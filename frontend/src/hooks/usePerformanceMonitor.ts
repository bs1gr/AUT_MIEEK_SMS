import { useEffect, useRef } from 'react';

export interface PerformanceMetrics {
  renderTime: number;
  renderCount: number;
  totalTime: number;
}

/**
 * Performance monitoring hook for tracking component render times
 * Helps identify slow components in production
 *
 * @example
 * function MyComponent() {
 *   usePerformanceMonitor('MyComponent');
 *   return <div>...</div>;
 * }
 */
export function usePerformanceMonitor(componentName: string, threshold: number = 100) {
  const startTimeRef = useRef<number>(0);
  const renderCountRef = useRef(0);
  const totalTimeRef = useRef(0);

  useEffect(() => {
    startTimeRef.current = performance.now();
    renderCountRef.current++;

    return () => {
      const duration = performance.now() - startTimeRef.current;
      totalTimeRef.current += duration;

      if (duration > threshold) {
        console.warn(
          `[Performance] ${componentName} render #${renderCountRef.current} took ${duration.toFixed(2)}ms`,
          {
            component: componentName,
            duration,
            renderCount: renderCountRef.current,
            totalTime: totalTimeRef.current.toFixed(2)
          }
        );

        // Send to analytics if available
        if (typeof window !== 'undefined' && (window as any).analytics) {
          (window as any).analytics.event?.('component_render', {
            component: componentName,
            duration,
            renderCount: renderCountRef.current
          });
        }
      }
    };
  }, [componentName, threshold]);

  return {
    renderTime: performance.now() - startTimeRef.current,
    renderCount: renderCountRef.current,
    totalTime: totalTimeRef.current
  } as PerformanceMetrics;
}

/**
 * Hook for measuring API call performance
 * Integrates with React Query to track request/response times
 *
 * @example
 * function MyComponent() {
 *   useApiPerformance('/students');
 *   const { data } = useStudents();
 *   return <div>...</div>;
 * }
 */
export function useApiPerformance(endpoint: string, threshold: number = 1000) {
  useEffect(() => {
    // Create observer for API timing if available
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name.includes(endpoint)) {
              const duration = entry.duration;
              if (duration > threshold) {
                console.warn(
                  `[API Performance] ${endpoint} request took ${duration.toFixed(2)}ms`,
                  {
                    endpoint,
                    duration,
                    name: entry.name
                  }
                );

                // Send to analytics
                if ((window as any).analytics) {
                  (window as any).analytics.event?.('api_slow_request', {
                    endpoint,
                    duration
                  });
                }
              }
            }
          }
        });

        observer.observe({ entryTypes: ['measure', 'resource'] });

        return () => observer.disconnect();
      } catch (e) {
        // Performance API not available or error, silently fail
      }
    }
  }, [endpoint, threshold]);
}
