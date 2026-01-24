import { useEffect, useRef, useState } from 'react';

type PerformanceMetrics = {
  renderTime: number;
  renderCount: number;
  totalTime: number;
};

export function usePerformanceMonitor(componentName: string, thresholdMs = 100) {
  const startTimeRef = useRef(performance.now());
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    renderCount: 0,
    totalTime: 0,
  });

  // Capture render start time for this render
  startTimeRef.current = performance.now();

  useEffect(() => {
    const renderStart = startTimeRef.current;

    return () => {
      const duration = performance.now() - renderStart;

      setMetrics((prev) => {
        const renderCount = prev.renderCount + 1;
        const totalTime = prev.totalTime + duration;
        const next = {
          renderTime: duration,
          renderCount,
          totalTime,
        };

        if (duration >= thresholdMs) {
          console.warn(
            `[Performance] ${componentName} render exceeded threshold`,
            { renderCount, duration, threshold: thresholdMs }
          );

          const analytics = (window as typeof window & { analytics?: { event?: (...args: unknown[]) => void } }).analytics;
          analytics?.event?.('component_render', {
            component: componentName,
            duration,
            renderCount,
            threshold: thresholdMs,
          });
        }

        return next;
      });

      // reset start time for next render measurement
      startTimeRef.current = performance.now();
    };
  });

  return metrics;
}

export function useApiPerformance(endpoint: string, thresholdMs = 1000) {
  useEffect(() => {
    const globalWindow = window as typeof window & {
      analytics?: { event?: (...args: unknown[]) => void };
      PerformanceObserver?: typeof PerformanceObserver;
    };

    if (!globalWindow.PerformanceObserver) {
      return undefined;
    }

    const observer = new globalWindow.PerformanceObserver((list) => {
      const entries = list.getEntries();

      entries.forEach((entry) => {
        const duration = Number((entry as PerformanceResourceTiming).duration ?? 0);
        if (!entry.name.includes(endpoint)) return;

        if (duration > thresholdMs) {
          console.warn(
            `[Performance] Slow API request detected for ${endpoint}`,
            { duration, name: entry.name, threshold: thresholdMs }
          );

          globalWindow.analytics?.event?.('api_slow_request', {
            endpoint,
            duration,
            name: entry.name,
          });
        }
      });
    });

    observer.observe({ entryTypes: ['measure', 'resource'] });

    return () => {
      observer.disconnect();
    };
  }, [endpoint, thresholdMs]);
}
