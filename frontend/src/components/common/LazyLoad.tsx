import React, { Suspense } from 'react';
import SkeletonLoader from './SkeletonLoader';

interface LazyLoadProps {
  children: React.ReactNode;
}

const LazyLoad: React.FC<LazyLoadProps> = ({ children }) => {
  return (
    <Suspense fallback={<div className="p-6"><SkeletonLoader rows={5} /></div>}>
      {children}
    </Suspense>
  );
};

export default LazyLoad;
