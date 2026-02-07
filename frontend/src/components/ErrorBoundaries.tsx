/**
 * Component-Level Error Boundaries
 * Smaller error boundaries for isolating failures in specific component trees.
 */
import React, { Component, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

// Types
type FallbackFunction = (error: Error | null, retry: () => void) => ReactNode;
type AsyncFallbackFunction = (error: Error | null, retry: () => void, isRetrying: boolean) => ReactNode;

interface SectionErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface SectionErrorBoundaryCoreProps {
  children: ReactNode;
  t: (key: string, options?: Record<string, unknown>) => string;
  section?: string;
  fallback?: ReactNode | FallbackFunction;
}

interface AsyncErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  isRetrying: boolean;
}

interface AsyncErrorBoundaryCoreProps {
  children: ReactNode;
  t: (key: string, options?: Record<string, unknown>) => string;
  operation?: string;
  onRetry?: () => Promise<void>;
  fallback?: ReactNode | AsyncFallbackFunction;
}

/**
 * Lightweight error boundary for sections that should fail gracefully
 * Shows a minimal error message without crashing the whole app
 */
class SectionErrorBoundaryCore extends Component<SectionErrorBoundaryCoreProps, SectionErrorBoundaryState> {
  constructor(props: SectionErrorBoundaryCoreProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<SectionErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(`SectionErrorBoundary (${this.props.section}) caught error:`, error, errorInfo);

    // Log to backend
    import('../utils/errorReporting').then(({ logErrorToBackend }) => {
      logErrorToBackend(error, { componentStack: errorInfo.componentStack ?? undefined }, {
        section: this.props.section,
        boundaryType: 'section',
      });
    });
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { fallback, section } = this.props;

      // Use custom fallback if provided
      if (fallback) {
        return typeof fallback === 'function'
          ? fallback(this.state.error, this.handleRetry)
          : fallback;
      }

      // Default fallback UI
      return (
        <div className="p-8 border-2 border-dashed border-rose-200 rounded-md bg-rose-50 text-center">
          <div className="text-2xl mb-2">{this.props.t('iconWarning', { ns: 'errors' }) || '⚠️'}</div>
          <h3 className="text-lg font-semibold text-rose-800 mb-2">
            {this.props.t('sectionError', { ns: 'errors' }) || `Error in ${section || 'this section'}`}
          </h3>
          <p className="text-sm text-rose-700 mb-4">
            {this.props.t('sectionErrorDesc', { ns: 'errors' }) || 'This section encountered an error, but the rest of the app is still working.'}
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-rose-600 text-white rounded-md text-sm font-medium hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            {this.props.t('retry') || 'Retry'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper with i18n
interface SectionErrorBoundaryProps {
  children: ReactNode;
  section?: string;
  fallback?: ReactNode | FallbackFunction;
}

export const SectionErrorBoundary: React.FC<SectionErrorBoundaryProps> = ({ children, section, fallback }) => {
  const { t } = useTranslation();
  return (
    <SectionErrorBoundaryCore
      t={t}
      section={section}
      fallback={fallback}
    >
      {children}
    </SectionErrorBoundaryCore>
  );
};

/**
 * Error boundary specifically for async operations
 * Handles loading states and async errors
 */
class AsyncErrorBoundaryCore extends Component<AsyncErrorBoundaryCoreProps, AsyncErrorBoundaryState> {
  constructor(props: AsyncErrorBoundaryCoreProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AsyncErrorBoundaryState> {
    return { hasError: true, error, isRetrying: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('AsyncErrorBoundary caught error:', error, errorInfo);

    import('../utils/errorReporting').then(({ logErrorToBackend }) => {
      logErrorToBackend(error, { componentStack: errorInfo.componentStack ?? undefined }, {
        operationType: this.props.operation,
        boundaryType: 'async',
      });
    });
  }

  handleRetry = async (): Promise<void> => {
    this.setState({ isRetrying: true });

    // Call retry callback if provided
    if (this.props.onRetry) {
      try {
        await this.props.onRetry();
        this.setState({ hasError: false, error: null, isRetrying: false });
      } catch (error) {
        this.setState({ hasError: true, error: error as Error, isRetrying: false });
      }
    } else {
      this.setState({ hasError: false, error: null, isRetrying: false });
    }
  };

  render(): ReactNode {
    const { hasError, error, isRetrying } = this.state;
    const { operation, fallback, children } = this.props;

    if (hasError) {
      if (fallback) {
        return typeof fallback === 'function'
          ? fallback(error, this.handleRetry, isRetrying)
          : fallback;
      }

      return (
        <div className="p-6 border border-amber-200 rounded-md bg-amber-50 text-center">
          <div className="text-2xl mb-2">{this.props.t('iconRetry', { ns: 'errors' }) || '🔄'}</div>
          <h4 className="text-base font-semibold text-amber-800 mb-2">
            {this.props.t('loadError', { ns: 'errors' }) || `Failed to load ${operation || 'data'}`}
          </h4>
          <p className="text-sm text-amber-700 mb-4">
            {error?.message || this.props.t('genericError', { ns: 'errors' }) || 'Something went wrong'}
          </p>
          <button
            onClick={this.handleRetry}
            disabled={isRetrying}
            className={"px-4 py-2 text-sm font-medium text-white rounded-md transition-all " + (isRetrying ? 'bg-amber-600 opacity-60 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400')}
          >
            {isRetrying
              ? (this.props.t('retrying', { ns: 'common' }) || 'Retrying...')
              : (this.props.t('retry', { ns: 'common' }) || 'Retry')}
          </button>
        </div>
      );
    }

    return children;
  }
}

// Wrapper with i18n
interface AsyncErrorBoundaryProps {
  children: ReactNode;
  operation?: string;
  onRetry?: () => Promise<void>;
  fallback?: ReactNode | AsyncFallbackFunction;
}

export const AsyncErrorBoundary: React.FC<AsyncErrorBoundaryProps> = ({ children, operation, onRetry, fallback }) => {
  const { t } = useTranslation();
  return (
    <AsyncErrorBoundaryCore
      t={t}
      operation={operation}
      onRetry={onRetry}
      fallback={fallback}
    >
      {children}
    </AsyncErrorBoundaryCore>
  );
};

export default { SectionErrorBoundary, AsyncErrorBoundary };
