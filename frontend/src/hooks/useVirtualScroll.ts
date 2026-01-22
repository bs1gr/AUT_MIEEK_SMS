import { useState } from 'react';

interface UseVirtualScrollProps {
  itemHeight: number;
  containerHeight: number;
  itemsCount: number;
  overscan?: number;
}

export const useVirtualScroll = ({
  itemHeight,
  containerHeight,
  itemsCount,
  overscan = 3,
}: UseVirtualScrollProps) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleItemsCount = Math.ceil(containerHeight / itemHeight);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    itemsCount,
    Math.floor(scrollTop / itemHeight) + visibleItemsCount + overscan
  );

  const offsetY = startIndex * itemHeight;
  const totalHeight = itemsCount * itemHeight;

  return {
    startIndex,
    endIndex,
    offsetY,
    totalHeight,
    onScroll: (e: React.UIEvent<HTMLElement>) => setScrollTop(e.currentTarget.scrollTop),
  };
};
