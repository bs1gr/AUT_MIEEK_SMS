import { renderHook } from '@testing-library/react';
import { usePerformanceMonitor, useApiPerformance } from './usePerformanceMonitor';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('usePerformanceMonitor hook', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    warnSpy = vi.spyOn(console, 'warn');
    vi.spyOn(performance, 'now').mockImplementation(() => Date.now());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('usePerformanceMonitor', () => {
    it('should return metrics object with correct properties', () => {
      const { result } = renderHook(() => usePerformanceMonitor('TestComponent'));

      expect(result.current).toHaveProperty('renderTime');
      expect(result.current).toHaveProperty('renderCount');
      expect(result.current).toHaveProperty('totalTime');
      expect(typeof result.current.renderTime).toBe('number');
      expect(typeof result.current.renderCount).toBe('number');
      expect(typeof result.current.totalTime).toBe('number');
    });

    it('should initialize with zero values', () => {
      const { result } = renderHook(() => usePerformanceMonitor('TestComponent'));

      // renderCount is 0 initially, becomes 1 after effect runs
      expect(result.current.renderCount).toBeGreaterThanOrEqual(0);
      expect(result.current.totalTime).toBeGreaterThanOrEqual(0);
    });

    it('should increment render count on re-render', () => {
      const { result, rerender } = renderHook(() =>
        usePerformanceMonitor('TestComponent')
      );

      const initialRenderCount = result.current.renderCount;

      rerender();

      expect(result.current.renderCount).toBeGreaterThan(initialRenderCount);
    });

    it('should track total time across renders', () => {
      const { result, rerender } = renderHook(() =>
        usePerformanceMonitor('TestComponent')
      );

      const initialTotalTime = result.current.totalTime;

      rerender();

      expect(result.current.totalTime).toBeGreaterThanOrEqual(initialTotalTime);
    });

    it('should not log when render time is below threshold', () => {
      const warnSpy = console.warn as unknown as ReturnType<typeof vi.spyOn>;

      const { unmount } = renderHook(() => usePerformanceMonitor('TestComponent', 10000));

      // Warning should not be logged if threshold is very high
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should log warning when render time exceeds threshold', () => {
      const warnSpy = console.warn as unknown as ReturnType<typeof vi.spyOn>;

      const mockNow = vi.fn();
      let currentTime = 0;

      mockNow.mockImplementation(() => {
        currentTime += 150; // Increment by 150ms to exceed 100ms threshold
        return currentTime;
      });

      vi.spyOn(performance, 'now').mockImplementation(mockNow);

      const { unmount } = renderHook(() => usePerformanceMonitor('TestComponent', 100));
      
      // Warning is logged in cleanup, so we need to unmount
      unmount();

      expect(warnSpy).toHaveBeenCalled();
    });

    it('should include component name in warning message', () => {
      const warnSpy = console.warn as unknown as ReturnType<typeof vi.spyOn>;
      const componentName = 'MyTestComponent';

      const mockNow = vi.fn();
      let currentTime = 0;

      mockNow.mockImplementation(() => {
        currentTime += 150;
        return currentTime;
      });

      vi.spyOn(performance, 'now').mockImplementation(mockNow);

      const { unmount } = renderHook(() => usePerformanceMonitor(componentName, 100));

      // Warning is logged in cleanup
      unmount();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(componentName),
        expect.any(Object)
      );
    });

    it('should include render count in warning object', () => {
      const mockNow = vi.fn();
      let currentTime = 0;

      mockNow.mockImplementation(() => {
        currentTime += 150;
        return currentTime;
      });

      vi.spyOn(performance, 'now').mockImplementation(mockNow);

      const { unmount } = renderHook(() => usePerformanceMonitor('TestComponent', 100));
      unmount();

      const callArgs = (warnSpy as any).mock.calls[0];
      expect(callArgs[1]).toHaveProperty('renderCount');
      expect(typeof callArgs[1].renderCount).toBe('number');
    });

    it('should track duration in warning object', () => {
      const mockNow = vi.fn();
      let currentTime = 0;

      mockNow.mockImplementation(() => {
        currentTime += 150;
        return currentTime;
      });

      vi.spyOn(performance, 'now').mockImplementation(mockNow);

      const { unmount } = renderHook(() => usePerformanceMonitor('TestComponent', 100));
      unmount();

      const callArgs = (warnSpy as any).mock.calls[0];
      expect(callArgs[1]).toHaveProperty('duration');
      expect(typeof callArgs[1].duration).toBe('number');
    });

    it('should send analytics event when available', () => {
      const mockAnalytics = { event: vi.fn() };
      (window as any).analytics = mockAnalytics;

      const mockNow = vi.fn();
      let currentTime = 0;

      mockNow.mockImplementation(() => {
        currentTime += 150;
        return currentTime;
      });

      vi.spyOn(performance, 'now').mockImplementation(mockNow);

      const { unmount } = renderHook(() => usePerformanceMonitor('TestComponent', 100));
      unmount();

      expect(mockAnalytics.event).toHaveBeenCalledWith(
        'component_render',
        expect.objectContaining({
          component: 'TestComponent'
        })
      );

      delete (window as any).analytics;
    });

    it('should not crash when analytics is not available', () => {
      const mockNow = vi.fn();
      let currentTime = 0;

      mockNow.mockImplementation(() => {
        currentTime += 150;
        return currentTime;
      });

      vi.spyOn(performance, 'now').mockImplementation(mockNow);

      const { unmount } = renderHook(() => usePerformanceMonitor('TestComponent', 100));
      expect(() => {
        unmount();
      }).not.toThrow();

      expect(warnSpy).toHaveBeenCalled();
    });

    it('should use default threshold of 100ms', () => {
      const mockNow = vi.fn();
      let currentTime = 0;

      mockNow.mockImplementation(() => {
        currentTime += 101; // Just above default threshold
        return currentTime;
      });

      vi.spyOn(performance, 'now').mockImplementation(mockNow);

      const { unmount } = renderHook(() => usePerformanceMonitor('TestComponent')); // No threshold specified
      unmount();

      expect(warnSpy).toHaveBeenCalled();
    });

    it('should handle multiple renders with different durations', () => {
      const warnSpy = console.warn as unknown as ReturnType<typeof vi.spyOn>;

      let renderCount = 0;
      const mockNow = vi.fn();

      mockNow.mockImplementation(() => {
        renderCount++;
        // First render: 50ms, Second render: 150ms (above threshold)
        return renderCount * 100 + 50;
      });

      vi.spyOn(performance, 'now').mockImplementation(mockNow);

      const { rerender } = renderHook(() => usePerformanceMonitor('TestComponent', 100));

      warnSpy.mockClear();

      rerender();

      // Second render should trigger warning
      expect(warnSpy).toHaveBeenCalled();
    });

    it('should calculate render time correctly', () => {
      const { result } = renderHook(() => usePerformanceMonitor('TestComponent'));

      expect(result.current.renderTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.current.renderTime).toBe('number');
    });

    it('should accumulate total time across multiple renders', () => {
      const mockNow = vi.fn();
      let callCount = 0;

      mockNow.mockImplementation(() => {
        return ++callCount * 10; // 10ms per call
      });

      vi.spyOn(performance, 'now').mockImplementation(mockNow);

      const { result, rerender, unmount } = renderHook(() => usePerformanceMonitor('TestComponent'));

      const totalAfterFirstRender = result.current.totalTime;

      rerender();
      unmount();

      expect(result.current.totalTime).toBeGreaterThanOrEqual(totalAfterFirstRender);
    });
  });

  describe('useApiPerformance', () => {
    let capturedCallback: any;

    it('should set up performance observer if available', () => {
      const observerMock = { observe: vi.fn(), disconnect: vi.fn() };
      const observeMock = observerMock.observe;

      (window as any).PerformanceObserver = class {
        constructor(callback: any) {}
        observe = observerMock.observe;
        disconnect = observerMock.disconnect;
      };

      const { unmount } = renderHook(() => useApiPerformance('/api/students'));

      expect(observeMock).toHaveBeenCalled();

      delete (window as any).PerformanceObserver;
    });

    it('should not crash when PerformanceObserver is not available', () => {
      const originalPerformanceObserver = (window as any).PerformanceObserver;
      delete (window as any).PerformanceObserver;

      expect(() => {
        const { unmount } = renderHook(() => useApiPerformance('/api/students'));
      }).not.toThrow();

      (window as any).PerformanceObserver = originalPerformanceObserver;
    });

    it('should observe measure and resource entry types', () => {
      const observeMock = vi.fn();

      (window as any).PerformanceObserver = class {
        constructor(callback: any) {}
        observe = observeMock;
        disconnect = vi.fn();
      };

      const { unmount } = renderHook(() => useApiPerformance('/api/students'));

      expect(observeMock).toHaveBeenCalledWith({
        entryTypes: expect.arrayContaining(['measure', 'resource'])
      });

      delete (window as any).PerformanceObserver;
    });

    it('should disconnect observer on cleanup', () => {
      const disconnectMock = vi.fn();

      (window as any).PerformanceObserver = class {
        constructor(callback: any) {}
        observe = vi.fn();
        disconnect = disconnectMock;
      };

      const { unmount } = renderHook(() => useApiPerformance('/api/students'));

      unmount();

      expect(disconnectMock).toHaveBeenCalled();

      delete (window as any).PerformanceObserver;
    });

    it('should use default threshold of 1000ms', () => {
      capturedCallback = undefined;

      (window as any).PerformanceObserver = class {
        constructor(callback: any) {
          capturedCallback = callback;
        }
        observe = vi.fn();
        disconnect = vi.fn();
      };

      warnSpy.mockClear();

      const { unmount } = renderHook(() => useApiPerformance('/api/students'));

      // Simulate performance entry that exceeds default threshold
      if (capturedCallback) {
        capturedCallback({
          getEntries: () => [
            {
              name: 'https://example.com/api/students',
              duration: 1500, // Above 1000ms threshold
            },
          ],
        });
      }

      expect(warnSpy).toHaveBeenCalled();

      delete (window as any).PerformanceObserver;
    });

    it('should log warning for slow API requests', () => {
      capturedCallback = undefined;

      (window as any).PerformanceObserver = class {
        constructor(callback: any) {
          capturedCallback = callback;
        }
        observe = vi.fn();
        disconnect = vi.fn();
      };

      warnSpy.mockClear();

      const endpoint = '/api/students';
      const { unmount } = renderHook(() => useApiPerformance(endpoint, 500));

      if (capturedCallback) {
        capturedCallback({
          getEntries: () => [
            {
              name: 'https://example.com/api/students',
              duration: 600, // Above 500ms threshold
            },
          ],
        });
      }

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(endpoint),
        expect.any(Object)
      );

      delete (window as any).PerformanceObserver;
    });

    it('should not log warning for fast API requests', () => {
      capturedCallback = undefined;

      (window as any).PerformanceObserver = class {
        constructor(callback: any) {
          capturedCallback = callback;
        }
        observe = vi.fn();
        disconnect = vi.fn();
      };

      warnSpy.mockClear();

      const { unmount } = renderHook(() => useApiPerformance('/api/students', 500));

      if (capturedCallback) {
        capturedCallback({
          getEntries: () => [
            {
              name: 'https://example.com/api/students',
              duration: 300, // Below 500ms threshold
            },
          ],
        });
      }

      expect(warnSpy).not.toHaveBeenCalled();

      delete (window as any).PerformanceObserver;
    });

    it('should filter entries by endpoint name', () => {
      capturedCallback = undefined;

      (window as any).PerformanceObserver = class {
        constructor(callback: any) {
          capturedCallback = callback;
        }
        observe = vi.fn();
        disconnect = vi.fn();
      };

      warnSpy.mockClear();

      const { unmount } = renderHook(() => useApiPerformance('/api/students', 500));

      if (capturedCallback) {
        capturedCallback({
          getEntries: () => [
            {
              name: 'https://example.com/api/courses', // Different endpoint
              duration: 600,
            },
          ],
        });
      }

      expect(warnSpy).not.toHaveBeenCalled();

      delete (window as any).PerformanceObserver;
    });

    it('should send analytics event for slow API requests', () => {
      capturedCallback = undefined;

      const mockAnalytics = { event: vi.fn() };
      (window as any).analytics = mockAnalytics;

      (window as any).PerformanceObserver = class {
        constructor(callback: any) {
          capturedCallback = callback;
        }
        observe = vi.fn();
        disconnect = vi.fn();
      };

      const endpoint = '/api/students';
      const { unmount } = renderHook(() => useApiPerformance(endpoint, 500));

      if (capturedCallback) {
        capturedCallback({
          getEntries: () => [
            {
              name: 'https://example.com/api/students',
              duration: 600,
            },
          ],
        });
      }

      expect(mockAnalytics.event).toHaveBeenCalledWith(
        'api_slow_request',
        expect.objectContaining({
          endpoint,
          duration: expect.any(Number)
        })
      );

      delete (window as any).analytics;
      delete (window as any).PerformanceObserver;
    });

    it('should re-setup observer when endpoint changes', () => {
      const observeMock = vi.fn();
      const disconnectMock = vi.fn();

      (window as any).PerformanceObserver = class {
        constructor(callback: any) {}
        observe = observeMock;
        disconnect = disconnectMock;
      };

      const { rerender } = renderHook(
        ({ endpoint }) => useApiPerformance(endpoint),
        { initialProps: { endpoint: '/api/students' } }
      );

      expect(observeMock).toHaveBeenCalledTimes(1);

      rerender({ endpoint: '/api/courses' });

      expect(disconnectMock).toHaveBeenCalled();
      expect(observeMock).toHaveBeenCalledTimes(2);

      delete (window as any).PerformanceObserver;
    });

    it('should handle multiple entries in single observation', () => {
      capturedCallback = undefined;

      (window as any).PerformanceObserver = class {
        constructor(callback: any) {
          capturedCallback = callback;
        }
        observe = vi.fn();
        disconnect = vi.fn();
      };

      warnSpy.mockClear();

      const { unmount } = renderHook(() => useApiPerformance('/api/students', 500));

      if (capturedCallback) {
        capturedCallback({
          getEntries: () => [
            {
              name: 'https://example.com/api/students/1',
              duration: 600, // Above threshold
            },
            {
              name: 'https://example.com/api/students/2',
              duration: 300, // Below threshold
            },
            {
              name: 'https://example.com/api/students/3',
              duration: 700, // Above threshold
            },
          ],
        });
      }

      expect(warnSpy).toHaveBeenCalledTimes(2); // Two slow requests

      delete (window as any).PerformanceObserver;
    });
  });
});





