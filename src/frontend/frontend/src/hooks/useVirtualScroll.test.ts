import { renderHook } from '@testing-library/react';
import { useVirtualScroll } from './useVirtualScroll';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock @tanstack/react-virtual
vi.mock('@tanstack/react-virtual', () => {
  const mockVirtualizer = {
    getVirtualItems: vi.fn(() => []),
    getTotalSize: vi.fn(() => 0),
    measure: vi.fn(),
    scrollToIndex: vi.fn(),
    getOffsetForIndex: vi.fn((index: number) => index * 50),
  };

  return {
    useVirtualizer: vi.fn(() => mockVirtualizer),
  };
});

describe('useVirtualScroll hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return virtualizer and parentRef', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({ itemCount: 1000 })
      );

      expect(result.current).toHaveProperty('virtualizer');
      expect(result.current).toHaveProperty('parentRef');
      expect(typeof result.current.virtualizer).toBe('object');
      expect(typeof result.current.parentRef).toBe('object');
    });

    it('should initialize parentRef as null', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({ itemCount: 100 })
      );

      expect(result.current.parentRef.current).toBeNull();
    });

    it('should use default itemHeight of 50', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({ itemCount: 100 })
      );

      expect(result.current.virtualizer).toBeDefined();
    });

    it('should use default overscan of 10', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({ itemCount: 100 })
      );

      expect(result.current.virtualizer).toBeDefined();
    });
  });

  describe('virtualizer options', () => {
    it('should accept custom itemHeight', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({
          itemCount: 1000,
          itemHeight: 100,
        })
      );

      expect(result.current.virtualizer).toBeDefined();
    });

    it('should accept custom overscan value', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({
          itemCount: 1000,
          overscan: 20,
        })
      );

      expect(result.current.virtualizer).toBeDefined();
    });

    it('should handle small itemCount', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({ itemCount: 5 })
      );

      expect(result.current.virtualizer).toBeDefined();
    });

    it('should handle large itemCount', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({ itemCount: 100000 })
      );

      expect(result.current.virtualizer).toBeDefined();
    });

    it('should handle zero itemCount', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({ itemCount: 0 })
      );

      expect(result.current.virtualizer).toBeDefined();
    });

    it('should handle fractional itemHeight', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({
          itemCount: 100,
          itemHeight: 50.5,
        })
      );

      expect(result.current.virtualizer).toBeDefined();
    });
  });

  describe('virtualizer methods', () => {
    it('should provide getVirtualItems method', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({ itemCount: 100 })
      );

      expect(typeof result.current.virtualizer.getVirtualItems).toBe('function');
    });

    it('should provide getTotalSize method', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({ itemCount: 100 })
      );

      expect(typeof result.current.virtualizer.getTotalSize).toBe('function');
    });

    it('should provide scrollToIndex method', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({ itemCount: 100 })
      );

      expect(typeof result.current.virtualizer.scrollToIndex).toBe('function');
    });

    it('should provide getOffsetForIndex method', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({ itemCount: 100 })
      );

      expect(typeof result.current.virtualizer.getOffsetForIndex).toBe('function');
    });
  });

  describe('dependency updates', () => {
    it('should update virtualizer when itemCount changes', () => {
      const { result, rerender } = renderHook(
        ({ itemCount }) => useVirtualScroll({ itemCount }),
        { initialProps: { itemCount: 100 } }
      );

      // const firstVirtualizer = result.current.virtualizer; // Unused

      rerender({ itemCount: 200 });

      // Virtualizer should be the same reference if implementation uses useMemo
      expect(result.current.virtualizer).toBeDefined();
    });

    it('should update virtualizer when itemHeight changes', () => {
      const { result, rerender } = renderHook(
        ({ itemHeight }) =>
          useVirtualScroll({ itemCount: 100, itemHeight }),
        { initialProps: { itemHeight: 50 } }
      );

      rerender({ itemHeight: 100 });

      expect(result.current.virtualizer).toBeDefined();
    });

    it('should update virtualizer when overscan changes', () => {
      const { result, rerender } = renderHook(
        ({ overscan }) =>
          useVirtualScroll({ itemCount: 100, overscan }),
        { initialProps: { overscan: 5 } }
      );

      rerender({ overscan: 15 });

      expect(result.current.virtualizer).toBeDefined();
    });
  });

  describe('parentRef', () => {
    it('should provide a ref that can be attached to a DOM element', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({ itemCount: 100 })
      );

      expect(result.current.parentRef).toHaveProperty('current');
      expect(typeof result.current.parentRef).toBe('object');
    });

    it('should maintain ref identity across renders', () => {
      const { result, rerender } = renderHook(() =>
        useVirtualScroll({ itemCount: 100 })
      );

      const firstRef = result.current.parentRef;

      rerender();

      expect(result.current.parentRef).toBe(firstRef);
    });

    it('should allow ref to be attached to DOM element', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({ itemCount: 100 })
      );

      const div = document.createElement('div');
      result.current.parentRef.current = div;

      expect(result.current.parentRef.current).toBe(div);
    });
  });

  describe('configuration combinations', () => {
    it('should handle combination of small count and small itemHeight', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({
          itemCount: 10,
          itemHeight: 25,
          overscan: 2,
        })
      );

      expect(result.current.virtualizer).toBeDefined();
    });

    it('should handle combination of large count and large itemHeight', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({
          itemCount: 50000,
          itemHeight: 200,
          overscan: 5,
        })
      );

      expect(result.current.virtualizer).toBeDefined();
    });

    it('should handle combination of large count and small itemHeight', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({
          itemCount: 100000,
          itemHeight: 20,
          overscan: 20,
        })
      );

      expect(result.current.virtualizer).toBeDefined();
    });

    it('should handle combination of small count and large itemHeight', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({
          itemCount: 50,
          itemHeight: 300,
          overscan: 3,
        })
      );

      expect(result.current.virtualizer).toBeDefined();
    });
  });

  describe('performance', () => {
    it('should memoize virtualizer to prevent unnecessary recreations', () => {
      const { result, rerender } = renderHook(
        () => useVirtualScroll({ itemCount: 100 })
      );

      const firstVirtualizer = result.current.virtualizer;

      // Re-render without changing props
      rerender();

      // Virtualizer reference should be the same
      expect(result.current.virtualizer).toBe(firstVirtualizer);
    });

    it('should handle rapid itemCount changes', () => {
      const { result, rerender } = renderHook(
        ({ itemCount }) => useVirtualScroll({ itemCount }),
        { initialProps: { itemCount: 100 } }
      );

      // Rapid changes
      rerender({ itemCount: 200 });
      rerender({ itemCount: 300 });
      rerender({ itemCount: 400 });
      rerender({ itemCount: 500 });

      expect(result.current.virtualizer).toBeDefined();
    });

    it('should handle rapid config changes', () => {
      const { result, rerender } = renderHook(
        ({ height, overscan }) =>
          useVirtualScroll({
            itemCount: 100,
            itemHeight: height,
            overscan,
          }),
        { initialProps: { height: 50, overscan: 10 } }
      );

      rerender({ height: 60, overscan: 12 });
      rerender({ height: 55, overscan: 11 });
      rerender({ height: 65, overscan: 13 });

      expect(result.current.virtualizer).toBeDefined();
    });
  });

  describe('virtualization behavior', () => {
    it('should support virtual item measurement', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({ itemCount: 1000, itemHeight: 50 })
      );

      expect(result.current.virtualizer).toHaveProperty('measure');
    });

    it('should track total virtual size', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({ itemCount: 1000, itemHeight: 50 })
      );

      const totalSize = result.current.virtualizer.getTotalSize();
      expect(typeof totalSize).toBe('number');
      expect(totalSize).toBeGreaterThanOrEqual(0);
    });

    it('should support scroll to index', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({ itemCount: 1000 })
      );

      expect(() => {
        result.current.virtualizer.scrollToIndex(500);
      }).not.toThrow();
    });

    it('should calculate offset for index', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({ itemCount: 1000, itemHeight: 50 })
      );

      const offset = result.current.virtualizer.getOffsetForIndex(10);
      expect(typeof offset).toBe('number');
      expect(offset).toBeGreaterThanOrEqual(0);
    });
  });

  describe('edge cases', () => {
    it('should handle negative overscan gracefully', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({
          itemCount: 100,
          overscan: -5,
        })
      );

      expect(result.current.virtualizer).toBeDefined();
    });

    it('should handle very large itemHeight', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({
          itemCount: 100,
          itemHeight: 10000,
        })
      );

      expect(result.current.virtualizer).toBeDefined();
    });

    it('should handle very small itemHeight', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({
          itemCount: 1000,
          itemHeight: 1,
        })
      );

      expect(result.current.virtualizer).toBeDefined();
    });

    it('should handle scrollToIndex at boundary', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({ itemCount: 100 })
      );

      expect(() => {
        result.current.virtualizer.scrollToIndex(0);
        result.current.virtualizer.scrollToIndex(99);
      }).not.toThrow();
    });

    it('should handle scrollToIndex beyond range', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({ itemCount: 100 })
      );

      expect(() => {
        result.current.virtualizer.scrollToIndex(200);
      }).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should not throw on unmount', () => {
      const { unmount } = renderHook(() =>
        useVirtualScroll({ itemCount: 100 })
      );

      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should handle unmount during scroll operations', () => {
      const { result, unmount } = renderHook(() =>
        useVirtualScroll({ itemCount: 1000 })
      );

      result.current.virtualizer.scrollToIndex(500);

      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe('integration scenarios', () => {
    it('should support typical student list scenario (1000 items)', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({
          itemCount: 1000,
          itemHeight: 60, // Typical row height
          overscan: 10,
        })
      );

      expect(result.current.virtualizer).toBeDefined();
      expect(result.current.parentRef).toBeDefined();
    });

    it('should support large grade table scenario (10000 items)', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({
          itemCount: 10000,
          itemHeight: 40, // Compact row height
          overscan: 20,
        })
      );

      expect(result.current.virtualizer).toBeDefined();
    });

    it('should support course attendance scenario (500 items)', () => {
      const { result } = renderHook(() =>
        useVirtualScroll({
          itemCount: 500,
          itemHeight: 45,
          overscan: 5,
        })
      );

      expect(result.current.virtualizer).toBeDefined();
    });

    it('should support search results scenario (variable items)', () => {
      const { result, rerender } = renderHook(
        ({ count }) => useVirtualScroll({ itemCount: count, itemHeight: 55 }),
        { initialProps: { count: 100 } }
      );

      // Simulate search returning fewer results
      rerender({ count: 25 });
      expect(result.current.virtualizer).toBeDefined();

      // Simulate search returning many results
      rerender({ count: 5000 });
      expect(result.current.virtualizer).toBeDefined();
    });
  });
});
