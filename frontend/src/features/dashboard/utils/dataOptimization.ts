/**
 * Large Dataset Optimization Utilities
 * Provides pagination, virtual scrolling, and data chunking for performance
 */

/**
 * Paginate large datasets
 */
export function paginate<T>(
  data: T[],
  pageSize: number = 50,
  currentPage: number = 1
): {
  data: T[];
  pageSize: number;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
} {
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;

  return {
    data: data.slice(start, end),
    pageSize,
    currentPage,
    totalPages,
    totalItems,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };
}

/**
 * Create chunks of data for processing
 */
export function chunkData<T>(
  data: T[],
  chunkSize: number = 100,
  overlap: number = 0
): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < data.length; i += chunkSize - overlap) {
    chunks.push(data.slice(i, i + chunkSize));
  }

  return chunks;
}

/**
 * Virtual scrolling calculations for rendering large lists
 */
export interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  totalItems: number;
  bufferSize?: number;
}

export function calculateVirtualScrollRange(
  scrollTop: number,
  config: VirtualScrollConfig
): { startIndex: number; endIndex: number; offsetY: number } {
  const { itemHeight, containerHeight, totalItems, bufferSize = 5 } = config;

  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
  const endIndex = Math.min(totalItems - 1, startIndex + visibleCount + bufferSize * 2);
  const offsetY = startIndex * itemHeight;

  return {
    startIndex,
    endIndex,
    offsetY,
  };
}

/**
 * Debounce function for scroll/resize events
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for scroll/resize events
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Request idle callback polyfill
 */
export function requestIdleCallback(
  callback: (deadline: IdleDeadline) => void,
  options?: IdleRequestOptions
): number {
  if ('requestIdleCallback' in window) {
    return (window as any).requestIdleCallback(callback, options);
  }

  // Fallback to setTimeout
  const start = Date.now();
  return setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
    } as IdleDeadline);
  }, 1) as any;
}

/**
 * Batch process large arrays with idle callback
 */
export async function batchProcessAsync<T, R>(
  items: T[],
  processor: (item: T) => R,
  onProgress?: (current: number, total: number) => void
): Promise<R[]> {
  return new Promise((resolve) => {
    const results: R[] = [];
    let index = 0;

    function processBatch() {
      if (index >= items.length) {
        resolve(results);
        return;
      }

      requestIdleCallback(() => {
        const batchEnd = Math.min(index + 10, items.length);

        for (let i = index; i < batchEnd; i++) {
          results.push(processor(items[i]));
        }

        index = batchEnd;
        if (onProgress) {
          onProgress(index, items.length);
        }

        processBatch();
      });
    }

    processBatch();
  });
}

/**
 * Memoize computed results to avoid recalculation
 */
export function memoize<T extends (...args: any[]) => any>(func: T): T {
  const cache = new Map();

  return ((...args: any[]) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = func(...args);
    cache.set(key, result);

    // Keep cache size reasonable (max 100 entries)
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    return result;
  }) as T;
}

/**
 * Aggregate data into bins for visualization (e.g., histogram)
 */
export interface DataBin<T> {
  range: { min: number; max: number };
  count: number;
  items: T[];
}

export function createDataBins<T>(
  items: T[],
  getValue: (item: T) => number,
  binCount: number = 10
): DataBin<T>[] {
  if (items.length === 0) return [];

  const values = items.map(getValue);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binSize = (max - min) / binCount;

  const bins: DataBin<T>[] = Array.from({ length: binCount }, (_, i) => ({
    range: {
      min: min + i * binSize,
      max: min + (i + 1) * binSize,
    },
    count: 0,
    items: [],
  }));

  items.forEach((item) => {
    const value = getValue(item);
    const binIndex = Math.min(
      binCount - 1,
      Math.floor((value - min) / binSize)
    );
    bins[binIndex].count++;
    bins[binIndex].items.push(item);
  });

  return bins;
}

/**
 * Downsample time series data for visualization (e.g., reduce from 1000 to 100 points)
 */
export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
}

export function downsampleTimeSeries(
  data: TimeSeriesPoint[],
  targetCount: number = 100
): TimeSeriesPoint[] {
  if (data.length <= targetCount) {
    return data;
  }

  const bucketSize = Math.ceil(data.length / targetCount);
  const downsampled: TimeSeriesPoint[] = [];

  for (let i = 0; i < data.length; i += bucketSize) {
    const bucket = data.slice(i, i + bucketSize);
    const avgValue = bucket.reduce((sum, p) => sum + p.value, 0) / bucket.length;
    const lastPoint = bucket[bucket.length - 1];

    downsampled.push({
      timestamp: lastPoint.timestamp,
      value: avgValue,
    });
  }

  return downsampled;
}

/**
 * React hook for large dataset pagination
 */
export function usePagination<T>(data: T[], pageSize: number = 50) {
  const [currentPage, setCurrentPage] = React.useState(1);

  const result = React.useMemo(
    () => paginate(data, pageSize, currentPage),
    [data, pageSize, currentPage]
  );

  return {
    ...result,
    setCurrentPage,
    goToNextPage: () => setCurrentPage((p) => Math.min(p + 1, result.totalPages)),
    goToPreviousPage: () => setCurrentPage((p) => Math.max(p - 1, 1)),
    goToPage: (page: number) => setCurrentPage(Math.max(1, Math.min(page, result.totalPages))),
  };
}

/**
 * React hook for virtual scrolling
 */
export function useVirtualScroll(
  containerRef: React.RefObject<HTMLDivElement>,
  config: Omit<VirtualScrollConfig, 'containerHeight'>
) {
  const [scrollTop, setScrollTop] = React.useState(0);
  const [containerHeight, setContainerHeight] = React.useState(600);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setContainerHeight(container.clientHeight);

    const handleScroll = throttle(() => {
      setScrollTop(container.scrollTop);
    }, 50);

    const handleResize = debounce(() => {
      setContainerHeight(container.clientHeight);
    }, 200);

    container.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [containerRef]);

  const range = React.useMemo(
    () =>
      calculateVirtualScrollRange(scrollTop, {
        ...config,
        containerHeight,
      }),
    [scrollTop, containerHeight, config]
  );

  return range;
}

// Re-export React for hook convenience
import React from 'react';
