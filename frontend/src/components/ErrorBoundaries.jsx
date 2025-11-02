/**
 * Component-Level Error Boundaries
 * Smaller error boundaries for isolating failures in specific component trees.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Lightweight error boundary for sections that should fail gracefully
 * Shows a minimal error message without crashing the whole app
 */
class SectionErrorBoundaryCore extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`SectionErrorBoundary (${this.props.section}) caught error:`, error, errorInfo);

    // Log to backend
    import('../utils/errorReporting').then(({ logErrorToBackend }) => {
      logErrorToBackend(error, errorInfo, {
        section: this.props.section,
        boundaryType: 'section',
      });
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
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
        <div style={{
          padding: '2rem',
          border: '2px dashed #fecaca',
          borderRadius: '0.5rem',
          backgroundColor: '#fef2f2',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '2rem',
            marginBottom: '0.5rem'
          }}>⚠️</div>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#991b1b',
            marginBottom: '0.5rem'
          }}>
            {this.props.t('errors.sectionError') || `Error in ${section || 'this section'}`}
          </h3>
          <p style={{
            fontSize: '0.875rem',
            color: '#7f1d1d',
            marginBottom: '1rem'
          }}>
            {this.props.t('errors.sectionErrorDesc') || 'This section encountered an error, but the rest of the app is still working.'}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={e => e.target.style.backgroundColor = '#b91c1c'}
            onMouseOut={e => e.target.style.backgroundColor = '#dc2626'}
          >
            {this.props.t('common.retry') || 'Retry'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper with i18n
export const SectionErrorBoundary = ({ children, section, fallback }) => {
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
class AsyncErrorBoundaryCore extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error, isRetrying: false };
  }

  componentDidCatch(error, errorInfo) {
    console.error('AsyncErrorBoundary caught error:', error, errorInfo);

    import('../utils/errorReporting').then(({ logErrorToBackend }) => {
      logErrorToBackend(error, errorInfo, {
        operationType: this.props.operation,
        boundaryType: 'async',
      });
    });
  }

  handleRetry = async () => {
    this.setState({ isRetrying: true });

    // Call retry callback if provided
    if (this.props.onRetry) {
      try {
        await this.props.onRetry();
        this.setState({ hasError: false, error: null, isRetrying: false });
      } catch (error) {
        this.setState({ hasError: true, error, isRetrying: false });
      }
    } else {
      this.setState({ hasError: false, error: null, isRetrying: false });
    }
  };

  render() {
    const { hasError, error, isRetrying } = this.state;
    const { operation, fallback, children } = this.props;

    if (hasError) {
      if (fallback) {
        return typeof fallback === 'function'
          ? fallback(error, this.handleRetry, isRetrying)
          : fallback;
      }

      return (
        <div style={{
          padding: '1.5rem',
          border: '1px solid #fed7aa',
          borderRadius: '0.5rem',
          backgroundColor: '#fffbeb',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '1.5rem',
            marginBottom: '0.5rem'
          }}>🔄</div>
          <h4 style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: '#92400e',
            marginBottom: '0.5rem'
          }}>
            {this.props.t('errors.loadError') || `Failed to load ${operation || 'data'}`}
          </h4>
          <p style={{
            fontSize: '0.875rem',
            color: '#78350f',
            marginBottom: '1rem'
          }}>
            {error?.message || this.props.t('errors.genericError') || 'Something went wrong'}
          </p>
          <button
            onClick={this.handleRetry}
            disabled={isRetrying}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: isRetrying ? '#d97706' : '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: isRetrying ? 'not-allowed' : 'pointer',
              opacity: isRetrying ? 0.6 : 1,
              transition: 'background-color 0.2s'
            }}
          >
            {isRetrying
              ? (this.props.t('common.retrying') || 'Retrying...')
              : (this.props.t('common.retry') || 'Retry')}
          </button>
        </div>
      );
    }

    return children;
  }
}

// Wrapper with i18n
export const AsyncErrorBoundary = ({ children, operation, onRetry, fallback }) => {
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
