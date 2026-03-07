import React, { Component, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { safeNavigate } from './utils/navigation';
import { ErrorHandler, ErrorCategory, ErrorContext } from './utils/errorHandling';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
  errorCategory: ErrorCategory;
  errorContext: ErrorContext | null;
}

interface ErrorBoundaryCoreProps {
  children: ReactNode;
  t: (key: string, options?: Record<string, unknown>) => string;
  boundaryName?: string;
}

class ErrorBoundaryCore extends Component<ErrorBoundaryCoreProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryCoreProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCategory: ErrorCategory.UNKNOWN,
      errorContext: null,
      errorInfo: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Categorize error for better handling
    const category = ErrorHandler.categorizeError(error);
    const context = ErrorHandler.createContext(`ErrorBoundary-${this.props.boundaryName}`);

    // Store error info in state
    this.setState({
      errorInfo,
      errorCategory: category,
      errorContext: context,
    });

    // Log error with structured context
    ErrorHandler.logError(error, {
      operation: `ErrorBoundary caught [${this.props.boundaryName}]`,
    });

    // Log detailed context in DEV mode
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary detailed context:', {
        error,
        category,
        context,
        componentStack: errorInfo.componentStack,
        boundaryName: this.props.boundaryName,
        timestamp: new Date().toISOString(),
      });
    }
  }

  handleReset = (): void => {
    // Reset error state and attempt to recover
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    });
  };

  handleGoHome = (): void => {
    // Navigate to home page
    safeNavigate('/');
  };

  toggleDetails = (): void => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { error, errorInfo, showDetails, errorCategory } = this.state;
      const { t } = this.props;

      // Get user-friendly message based on error category
      const userMessage = ErrorHandler.getUserMessage(errorCategory);
      const isRecoverable = ErrorHandler.isRecoverable(errorCategory);

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 font-sans">
          <div className="max-w-3xl w-full bg-white rounded-md shadow-lg p-8">
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>

            {/* Error Message */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {t('unknown', { ns: 'errors' }) || 'Something went wrong'}
              </h2>
              <p className="text-sm text-gray-600">
                {userMessage}
              </p>
              {isRecoverable && (
                <p className="text-xs text-sky-600 mt-2">
                  💡 {t('tryAgain', { ns: 'messages' }) || 'This error may be temporary. Try again or go home.'}
                </p>
              )}
            </div>

            {/* Error Details (Collapsible) */}
            <div className="mb-6 rounded-md border border-gray-200 overflow-hidden">
              <button
                onClick={this.toggleDetails}
                className="w-full px-4 py-3 bg-gray-50 border-0 cursor-pointer flex items-center justify-between text-sm font-medium text-gray-700"
              >
                <span>{t('info', { ns: 'common' }) || 'Error Details'}</span>
                <svg
                  className={"w-5 h-5 transition-transform " + (showDetails ? 'rotate-180' : 'rotate-0')}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showDetails && (
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  <div className="text-xs font-mono text-rose-600 mb-3 p-3 bg-white rounded border border-rose-50 overflow-x-auto">
                    {error?.toString() || t('unknown', { ns: 'errors' })}
                  </div>

                  {errorInfo?.componentStack && (
                    <div className="text-xs font-mono text-gray-600 p-3 bg-white rounded border border-gray-200 max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
                      {errorInfo.componentStack}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-sky-600 text-white rounded-md text-sm font-medium transition-colors shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                {t('reset', { ns: 'common' }) || 'Try Again'}
              </button>

              <button
                onClick={this.handleGoHome}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md text-sm font-medium transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                {t('home', { ns: 'common' }) || 'Go Home'}
              </button>
            </div>

            {/* Development Mode Warning */}
            {import.meta.env.DEV && (
              <div className="mt-6 p-3 bg-amber-50 rounded-md text-xs text-amber-800 text-center">
                {t('devModeCheckConsole', { ns: 'messages' }) || '🔧 Development mode: Check console for detailed error logs'}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper to provide i18n translation to class component
interface ErrorBoundaryProps {
  children: ReactNode;
  boundaryName?: string;
}

const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children, boundaryName }) => {
  const { t } = useTranslation();
  return <ErrorBoundaryCore t={t} boundaryName={boundaryName}>{children}</ErrorBoundaryCore>;
};

export default ErrorBoundary;
