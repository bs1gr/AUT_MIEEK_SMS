/**
 * Virtual Scrolling Hook
 * Optimizes rendering of large lists (1000+ items) using @tanstack/react-virtual
 *
 * Usage:
 * ```tsx
 * const { virtualizer, parentRef } = useVirtualScroll(items.length);
 * const virtualItems = virtualizer.getVirtualItems();
 *
 * <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
 *   <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
 *     {virtualItems.map(virtualRow => (
 *       <ItemRow key={items[virtualRow.index].id} item={items[virtualRow.index]} />
 *     ))}
 *   </div>
 * </div>
 * ```
 */

import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface UseVirtualScrollOptions {
  itemCount: number;
  itemHeight?: number;
  overscan?: number;
}

export function useVirtualScroll({
  itemCount,
  itemHeight = 50,
  overscan = 10,
}: UseVirtualScrollOptions) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useMemo(
    () =>
      useVirtualizer({
        count: itemCount,
        getScrollElement: () => parentRef.current,
        estimateSize: () => itemHeight,
        overscan,
        measureElement: typeof window !== 'undefined' && navigator.userAgent.indexOf('Firefox') === -1
          ? (element: Element) => element?.getBoundingClientRect().height
          : undefined,
      }),
    [itemCount, itemHeight, overscan]
  );

  return { virtualizer, parentRef };
}
