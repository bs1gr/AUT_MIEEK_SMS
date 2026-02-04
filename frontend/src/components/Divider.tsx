import React from 'react';

interface DividerProps {
  /** Spacing above the divider (Tailwind spacing class) */
  marginTop?: string;
  /** Spacing below the divider (Tailwind spacing class) */
  marginBottom?: string;
  /** Custom className for additional styling */
  className?: string;
  /** Orientation of the divider */
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Divider component - creates a horizontal or vertical separator line
 * Equivalent to Angular Material's mat-divider
 */
export const Divider: React.FC<DividerProps> = ({
  marginTop = 'mt-4',
  marginBottom = 'mb-4',
  className = '',
  orientation = 'horizontal',
}) => {
  if (orientation === 'vertical') {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={`inline-block h-full w-px bg-gray-300 dark:bg-gray-600 ${className}`}
        style={{ paddingLeft: '1px' }}
      />
    );
  }

  return (
    <hr
      aria-orientation="horizontal"
      className={`border-0 border-t border-gray-300 dark:border-gray-600 ${marginTop} ${marginBottom} ${className}`}
      style={{ paddingTop: '1px' }}
    />
  );
};

export default Divider;
