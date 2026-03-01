/**
 * Chart Animation Utilities
 * Provides animation configurations and effects for Recharts visualizations
 */

/**
 * Animation configuration for chart entrance effects
 */
export const CHART_ANIMATIONS = {
  entrance: {
    animationDuration: 800,
    animationEasing: 'ease-in-out' as const,
    isAnimationActive: true,
  },
  smooth: {
    animationDuration: 500,
    animationEasing: 'monotone' as const,
    isAnimationActive: true,
  },
  quick: {
    animationDuration: 300,
    animationEasing: 'linear' as const,
    isAnimationActive: true,
  },
  disabled: {
    animationDuration: 0,
    animationEasing: 'linear' as const,
    isAnimationActive: false,
  },
};

/**
 * Custom animation wrapper for chart containers
 */
export const applyChartAnimation = (
  duration: number = 800,
  easing: string = 'ease-in-out'
): React.CSSProperties => ({
  animation: `fadeInScale ${duration}ms ${easing}`,
});

/**
 * CSS animations for chart effects
 */
export const chartAnimationStyles = `
  @keyframes fadeInScale {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .chart-container {
    animation: slideInUp 0.5s ease-in-out;
  }

  .chart-title {
    animation: slideInLeft 0.4s ease-in-out;
  }

  .loading-skeleton {
    animation: pulse 2s infinite;
  }
`;

/**
 * Tooltip animation styles
 */
export const tooltipAnimationStyles = `
  .recharts-tooltip {
    animation: fadeInScale 200ms ease-in-out;
  }

  .recharts-tooltip-wrapper {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    border-radius: 8px;
    backdrop-filter: blur(8px);
  }
`;

/**
 * Dot animation for line/area charts
 */
export const dotAnimationStyles = `
  .recharts-dot {
    transition: r 200ms ease-in-out, fill 200ms ease-in-out;
    cursor: pointer;
  }

  .recharts-dot:hover {
    transition: r 200ms ease-in-out;
  }
`;

/**
 * Get animation configuration based on data size
 * Larger datasets get faster animations to maintain performance
 */
export const getAnimationConfig = (dataPointCount: number) => {
  if (dataPointCount > 500) {
    return CHART_ANIMATIONS.quick; // Fast animations for large datasets
  } else if (dataPointCount > 100) {
    return CHART_ANIMATIONS.smooth; // Smooth for medium datasets
  }
  return CHART_ANIMATIONS.entrance; // Full animation for small datasets
};

/**
 * Staggered animation delays for multiple chart containers
 */
export const getStaggeredDelay = (index: number, baseDelay: number = 100): React.CSSProperties => ({
  animation: `slideInUp 0.5s ease-in-out`,
  animationDelay: `${index * baseDelay}ms`,
});

/**
 * Loading skeleton animation configuration
 */
export const SKELETON_ANIMATION = {
  duration: 1500,
  easing: 'ease-in-out' as const,
  infiniteLoop: true,
};

/**
 * Hover effect for chart elements
 */
export const hoverEffectStyles = `
  .chart-bar,
  .chart-line,
  .chart-area {
    cursor: pointer;
    transition: opacity 200ms ease-in-out;
  }

  .chart-bar:hover,
  .chart-line:hover,
  .chart-area:hover {
    opacity: 0.8;
    filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.15));
  }
`;

/**
 * Legend animation styles
 */
export const legendAnimationStyles = `
  .recharts-legend-wrapper {
    animation: slideInUp 0.4s ease-in-out;
  }

  .recharts-legend-item {
    transition: all 200ms ease-in-out;
  }

  .recharts-legend-item:hover {
    opacity: 0.7;
    transform: translateX(2px);
  }
`;

/**
 * Apply all animation styles to document
 */
export const injectAnimationStyles = () => {
  if (typeof document === 'undefined') return;

  const styleId = 'chart-animations-style';

  // Only inject once
  if (document.getElementById(styleId)) {
    return;
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.innerHTML = `
    ${chartAnimationStyles}
    ${tooltipAnimationStyles}
    ${dotAnimationStyles}
    ${hoverEffectStyles}
    ${legendAnimationStyles}
  `;

  document.head.appendChild(style);
};

/**
 * Hook-friendly animation initializer
 */
export const useChartAnimations = () => {
  if (typeof window !== 'undefined') {
    injectAnimationStyles();
  }

  return {
    entrance: CHART_ANIMATIONS.entrance,
    smooth: CHART_ANIMATIONS.smooth,
    quick: CHART_ANIMATIONS.quick,
    getConfig: getAnimationConfig,
    getDelay: getStaggeredDelay,
  };
};
