import { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

type UseVirtualScrollProps = {
  itemCount: number;
  itemHeight?: number;
  overscan?: number;
};

export const useVirtualScroll = ({
  itemCount,
  itemHeight = 50,
  overscan = 10,
}: UseVirtualScrollProps) => {
  const parentRef = useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: itemCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: Math.max(0, overscan),
  });

  return useMemo(
    () => ({
      virtualizer,
      parentRef,
    }),
    [virtualizer]
  );
};
