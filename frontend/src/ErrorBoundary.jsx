import React from 'react';
import { useTranslation } from 'react-i18next';

class ErrorBoundaryCore extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      showDetails: false 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Store error info in state
    this.setState({ errorInfo });
    
    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    // Reset error state and attempt to recover
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      showDetails: false 
    });
  };

  handleGoHome = () => {
    // Navigate to home page
    window.location.href = '/';
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, showDetails } = this.state;
      const { t } = this.props;
      
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f3f4f6',
          padding: '1rem',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '42rem',
            width: '100%',
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            padding: '2rem'
          }}>
            {/* Error Icon */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                width: '4rem',
                height: '4rem',
                backgroundColor: '#fee2e2',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg style={{ width: '2rem', height: '2rem', color: '#dc2626' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>

            {/* Error Message */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#111827',
                marginBottom: '0.5rem'
              }}>
                {t('errors.unknown') || 'Something went wrong'}
              </h2>
              <p style={{
                color: '#6b7280',
                fontSize: '0.875rem'
              }}>
                {t('messages.pleaseWait') || 'We encountered an unexpected error. You can try reloading the page or return to the home page.'}
              </p>
            </div>

            {/* Error Details (Collapsible) */}
            <div style={{
              marginBottom: '1.5rem',
              borderRadius: '0.375rem',
              border: '1px solid #e5e7eb',
              overflow: 'hidden'
            }}>
              <button
                onClick={this.toggleDetails}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f9fafb',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151'
                }}
              >
                <span>{t('common.info') || 'Error Details'}</span>
                <svg 
                  style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showDetails && (
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#f9fafb',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    color: '#dc2626',
                    marginBottom: '0.75rem',
                    padding: '0.75rem',
                    backgroundColor: 'white',
                    borderRadius: '0.25rem',
                    border: '1px solid #fee2e2',
                    overflowX: 'auto'
                  }}>
                    {error?.toString() || t('errors.unknown')}
                  </div>
                  
                  {errorInfo?.componentStack && (
                    <div style={{
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      color: '#4b5563',
                      padding: '0.75rem',
                      backgroundColor: 'white',
                      borderRadius: '0.25rem',
                      border: '1px solid #e5e7eb',
                      maxHeight: '12rem',
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {errorInfo.componentStack}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '0.625rem 1.5rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
                onMouseOver={e => e.target.style.backgroundColor = '#1d4ed8'}
                onMouseOut={e => e.target.style.backgroundColor = '#2563eb'}
              >
                {t('common.reset') || 'Try Again'}
              </button>
              
              <button
                onClick={this.handleGoHome}
                style={{
                  padding: '0.625rem 1.5rem',
                  backgroundColor: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
                onMouseOver={e => e.target.style.backgroundColor = '#f9fafb'}
                onMouseOut={e => e.target.style.backgroundColor = 'white'}
              >
                {t('common.home') || 'Go Home'}
              </button>
            </div>

            {/* Development Mode Warning */}
            {process.env.NODE_ENV === 'development' && (
              <div style={{
                marginTop: '1.5rem',
                padding: '0.75rem',
                backgroundColor: '#fef3c7',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                color: '#92400e',
                textAlign: 'center'
              }}>
                🔧 Development mode: Check console for detailed error logs
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
const ErrorBoundary = ({ children }) => {
  const { t } = useTranslation();
  return <ErrorBoundaryCore t={t}>{children}</ErrorBoundaryCore>;
};

export default ErrorBoundary;