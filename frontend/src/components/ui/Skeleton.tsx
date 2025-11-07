import { motion } from 'framer-motion';
import { fadeVariants } from '@/utils/animations';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

export const Skeleton = ({ 
  className = '', 
  variant = 'rectangular',
  width,
  height,
  animate = true
}: SkeletonProps) => {
  const baseClasses = 'bg-gray-200';
  const animateClasses = animate ? 'animate-pulse' : '';
  
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <motion.div
      className={`${baseClasses} ${variantClasses[variant]} ${animateClasses} ${className}`}
      style={style}
      variants={fadeVariants}
      initial="hidden"
      animate="visible"
    />
  );
};

// Preset skeleton loaders for common use cases
export const StudentCardSkeleton = () => (
  <div className="border p-4 rounded shadow-sm space-y-3">
    <div className="flex justify-between items-center">
      <div className="flex-1 space-y-2">
        <Skeleton width="60%" height={20} />
        <Skeleton width="40%" height={16} />
      </div>
      <Skeleton variant="circular" width={40} height={40} />
    </div>
    <div className="space-y-2">
      <Skeleton width="100%" height={12} />
      <Skeleton width="80%" height={12} />
    </div>
  </div>
);

export const CourseCardSkeleton = () => (
  <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200 space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex-1 space-y-2">
        <Skeleton width="30%" height={18} />
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={12} />
      </div>
      <Skeleton variant="circular" width={48} height={24} className="rounded-full" />
    </div>
    <div className="pt-2 border-t border-purple-200">
      <Skeleton width="50%" height={10} className="mb-2" />
      <div className="flex gap-2">
        <Skeleton width={60} height={20} className="rounded-full" />
        <Skeleton width={80} height={20} className="rounded-full" />
        <Skeleton width={70} height={20} className="rounded-full" />
      </div>
    </div>
  </div>
);

export const TableRowSkeleton = ({ columns = 4 }: { columns?: number }) => (
  <tr className="border-b">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <Skeleton width="90%" height={16} />
      </td>
    ))}
  </tr>
);

export const DashboardStatSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 space-y-4">
    <div className="flex items-center space-x-3">
      <Skeleton variant="circular" width={48} height={48} />
      <Skeleton width="40%" height={20} />
    </div>
    <Skeleton width="60%" height={32} />
    <Skeleton width="80%" height={14} />
  </div>
);

export const ListSkeleton = ({ 
  count = 3, 
  itemComponent: ItemComponent = StudentCardSkeleton 
}: { 
  count?: number; 
  itemComponent?: React.ComponentType;
}) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, i) => (
      <ItemComponent key={i} />
    ))}
  </div>
);

export default Skeleton;
