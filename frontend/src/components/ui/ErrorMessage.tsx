/**
 * Enhanced Error Message Component (v1.15.0)
 *
 * Displays user-friendly error messages with support for:
 * - Multiple error types (validation, server, network, permission)
 * - Internationalization (EN/EL)
 * - Error details and recovery actions
 * - Automatic dismissal or manual close
 *
 * Usage:
 *   <ErrorMessage error={error} onDismiss={() => setError(null)} />
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ErrorMessageProps {
  error: ErrorInfo | null;
  onDismiss?: () => void;
  autoDismiss?: boolean;
  dismissDelay?: number; // ms
  showDetails?: boolean;
}

export type { ErrorMessageProps };

export interface ErrorInfo {
  code: string;
  message: string;
  details?: string | Record<string, unknown>;
  path?: string;
  request_id?: string;
  status?: number;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  onDismiss,
  autoDismiss = false,
  dismissDelay = 5000,
  showDetails = false,
}) => {
  const { t } = useTranslation();
  const [show, setShow] = useState(true);
  const [expandDetails, setExpandDetails] = useState(false);

  useEffect(() => {
    if (!autoDismiss || !show || !error) return;

    const timer = setTimeout(() => {
      setShow(false);
      onDismiss?.();
    }, dismissDelay);

    return () => clearTimeout(timer);
  }, [autoDismiss, dismissDelay, show, error, onDismiss]);

  if (!error || !show) return null;

  // Determine error styling and icon
  const errorTypeConfig = getErrorTypeConfig(error.code);

  // Get user-friendly message from i18n or fallback to error message
  const userMessage = t(`errors.${error.code}`, { defaultValue: error.message });

  // Format error details if available
  const formattedDetails = formatErrorDetails(error.details);

  const handleClose = () => {
    setShow(false);
    onDismiss?.();
  };

  return (
    <div
      className={`
        fixed top-4 left-4 right-4 max-w-xl
        p-4 rounded-lg shadow-lg border-l-4
        ${errorTypeConfig.bgColor}
        ${errorTypeConfig.borderColor}
        animate-in fade-in slide-in-from-top-2 duration-300
      `}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`text-xl flex-shrink-0 ${errorTypeConfig.textColor}`}>
          {errorTypeConfig.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Main message */}
          <p className={`font-semibold ${errorTypeConfig.textColor}`}>
            {userMessage}
          </p>

          {/* Details section */}
          {showDetails && (formattedDetails || error.request_id) && (
            <div className="mt-2 text-sm opacity-80">
              {formattedDetails && (
                <div className="mt-1">
                  <button
                    onClick={() => setExpandDetails(!expandDetails)}
                    className="underline hover:opacity-80 transition"
                  >
                    {expandDetails ? t('common.hideDetails', { defaultValue: 'Hide' }) : t('common.showDetails', { defaultValue: 'Show' })} {t('common.details', { defaultValue: 'details' })}
                  </button>
                  {expandDetails && (
                    <pre className="mt-2 bg-black bg-opacity-10 p-2 rounded text-xs overflow-auto max-h-40">
                      {formattedDetails}
                    </pre>
                  )}
                </div>
              )}

              {/* Request ID for support */}
              {error.request_id && (
                <div className="mt-2 text-xs opacity-70">
                  {t('errors.requestId', { defaultValue: 'Request ID' })}: {error.request_id}
                </div>
              )}
            </div>
          )}

          {/* Recovery action suggestion */}
          {error.code && (
            <div className="mt-2 text-sm">
              <p className="opacity-80">
                {t(`errors.${error.code}.suggestion`, {
                  defaultValue: getDefaultSuggestion(error.code),
                })}
              </p>
            </div>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className={`
            flex-shrink-0 p-1 rounded hover:bg-black hover:bg-opacity-10
            transition-colors
            ${errorTypeConfig.textColor}
          `}
          aria-label={t('common.close', { defaultValue: 'Close' })}
        >
          <span className="text-xl">×</span>
        </button>
      </div>
    </div>
  );
};

/**
 * Get styling and icon for error type
 */
function getErrorTypeConfig(code: string) {
  const baseConfig = {
    bgColor: 'bg-red-50',
    borderColor: 'border-red-500',
    textColor: 'text-red-800',
    icon: '⚠️',
  };

  if (code.startsWith('VALIDATION_')) {
    return {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-500',
      textColor: 'text-yellow-800',
      icon: '⚡',
    };
  }

  if (code.startsWith('NETWORK_') || code === 'NETWORK_ERROR') {
    return {
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-500',
      textColor: 'text-orange-800',
      icon: '🌐',
    };
  }

  if (code.startsWith('AUTH_') || code === 'UNAUTHORIZED') {
    return {
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-500',
      textColor: 'text-purple-800',
      icon: '🔒',
    };
  }

  if (code.startsWith('PERMISSION_') || code === 'FORBIDDEN') {
    return {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-500',
      textColor: 'text-red-800',
      icon: '🚫',
    };
  }

  if (code === 'NOT_FOUND') {
    return {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500',
      textColor: 'text-blue-800',
      icon: '🔍',
    };
  }

  // Default red for server errors
  return baseConfig;
}

/**
 * Get default suggestion for error code
 */
function getDefaultSuggestion(code: string): string {
  const suggestions: Record<string, string> = {
    VALIDATION_ERROR: 'Please check the highlighted fields and try again.',
    NETWORK_ERROR: 'Connection failed. Please check your internet and try again.',
    UNAUTHORIZED: 'Your session has expired. Please log in again.',
    FORBIDDEN: 'You do not have permission to perform this action.',
    NOT_FOUND: 'The requested resource was not found.',
    INTERNAL_SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
  };

  for (const [key, suggestion] of Object.entries(suggestions)) {
    if (code.startsWith(key.split('_')[0])) {
      return suggestion;
    }
  }

  return 'An error occurred. Please try again.';
}

/**
 * Format error details for display
 */
function formatErrorDetails(details?: string | Record<string, any>): string | null {
  if (!details) return null;

  if (typeof details === 'string') {
    return details;
  }

  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}

export default ErrorMessage;
