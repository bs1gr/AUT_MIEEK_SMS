/**
 * Component-Level Error Boundaries
 * Smaller error boundaries for isolating failures in specific component trees.
 */
import React, { Component, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

// Types
type FallbackFunction = (error: Error | null, retry: () => void) => ReactNode;

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
          <AlertTriangle className="mx-auto mb-2 h-7 w-7 text-rose-600" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-rose-800 mb-2">
            {section ? this.props.t('sectionError', { section }) : this.props.t('sectionErrorGeneric')}
          </h3>
          <p className="text-sm text-rose-700 mb-4">
            {this.props.t('sectionErrorDesc')}
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-rose-600 text-white rounded-md text-sm font-medium hover:bg-rose-700 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
          >
            {this.props.t('retry', { ns: 'common' })}
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
  const { t } = useTranslation('errors');
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

export default { SectionErrorBoundary };
