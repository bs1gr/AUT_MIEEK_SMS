/**
 * Error Reporting Service
 * Sends client-side errors to the backend for centralized logging and monitoring.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Log error to backend
 * @param {Error} error - The error object
 * @param {Object} errorInfo - React error info with component stack
 * @param {Object} context - Additional context (e.g., user actions, route)
 */
export async function logErrorToBackend(error, errorInfo, context = {}) {
  try {
    const errorData = {
      message: error?.message || 'Unknown error',
      stack: error?.stack || '',
      componentStack: errorInfo?.componentStack || '',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      context: context,
      type: 'react_error',
    };

    // Send to backend (fire and forget - don't block user experience)
    fetch(`${API_BASE_URL}/api/logs/frontend-error`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorData),
      // Use keepalive to ensure request completes even if page unloads
      keepalive: true,
    }).catch(err => {
      // Silently fail if backend is unavailable
      console.warn('Failed to send error to backend:', err);
    });

    // Also log to console in development
    if (import.meta.env.DEV) {
      console.group('🔴 Error logged to backend');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Context:', context);
      console.groupEnd();
    }
  } catch (err) {
    // Don't let error reporting cause more errors
    console.warn('Error reporting failed:', err);
  }
}

/**
 * Log warning to backend
 * @param {string} message - Warning message
 * @param {Object} context - Additional context
 */
export async function logWarningToBackend(message, context = {}) {
  try {
    const warningData = {
      message,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      context,
      type: 'react_warning',
    };

    fetch(`${API_BASE_URL}/api/logs/frontend-warning`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(warningData),
      keepalive: true,
    }).catch(err => {
      console.warn('Failed to send warning to backend:', err);
    });
  } catch (err) {
    console.warn('Warning reporting failed:', err);
  }
}

/**
 * Setup global error handlers for unhandled errors
 */
export function setupGlobalErrorHandlers() {
  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    logErrorToBackend(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      { componentStack: 'Global: Unhandled Promise Rejection' },
      {
        type: 'unhandled_rejection',
        promise: event.promise,
      }
    );
  });

  // Catch global errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    logErrorToBackend(
      event.error || new Error(event.message),
      { componentStack: 'Global: Window Error' },
      {
        type: 'window_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }
    );
  });

  // Log when the page is about to unload (for tracking user journey)
  window.addEventListener('beforeunload', () => {
    // This could be used to track user sessions, but we'll keep it simple
  });
}

/**
 * Initialize error reporting
 */
export function initializeErrorReporting() {
  setupGlobalErrorHandlers();
  
  if (import.meta.env.DEV) {
    console.log('✓ Error reporting initialized');
  }
}
