/**
 * useErrorHandler Hook (v1.15.0)
 *
 * Provides convenient error handling with automatic message formatting,
 * i18n support, and error tracking.
 *
 * Usage:
 *   const { error, setError, handleError } = useErrorHandler();
 *
 *   // In a try-catch:
 *   try {
 *     await api.doSomething();
 *   } catch (err) {
 *     handleError(err);
 *   }
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { extractAPIError } from '@/api/api';

export interface ErrorState {
  code: string;
  message: string;
  details?: string | Record<string, unknown> | null;
  path?: string | null;
  request_id?: string | null;
  status?: number;
}

interface UseErrorHandlerOptions {
  onError?: (error: ErrorState) => void;
  showDetails?: boolean;
  autoDismiss?: boolean;
  dismissDelay?: number;
}

/**
 * Hook for handling errors with i18n support
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const { t } = useTranslation();
  const [error, setError] = useState<ErrorState | null>(null);

  /**
   * Handle an error and format it for display
   */
  const handleError = useCallback(
    (err: unknown, fallbackMessage?: string) => {
      let errorState: ErrorState;

      // Type guard for API errors
      const apiError = err as Record<string, unknown> & { response?: Record<string, unknown>; request?: unknown; validation?: unknown; code?: string; message?: string; details?: unknown };

      // Handle API response errors (from axios)
      if (apiError?.response?.data) {
        const extracted = extractAPIError(apiError.response);
        // The backend reached the request but couldn't reach the database (unreachable
        // host, refused connection, connect timeout) — a distinct, actionable state from
        // both "no HTTP response at all" (NETWORK_ERROR, below) and a generic server bug.
        const isDatabaseUnavailable = extracted.code === 'DATABASE_UNAVAILABLE';
        errorState = {
          code: isDatabaseUnavailable ? 'DATABASE_UNAVAILABLE' : extracted.code,
          message: isDatabaseUnavailable
            ? t('errors.databaseUnavailable', {
                defaultValue: 'Cannot reach the database. Check your network connection and database server, then try again.',
              })
            : extracted.message,
          details: extracted.details as string | Record<string, unknown> | undefined,
          path: extracted.path,
          request_id: extracted.request_id,
          status: extracted.status,
        };
      }
      // Handle network errors — the request never got a response at all (e.g. the local
      // backend process itself is down/unreachable), as opposed to DATABASE_UNAVAILABLE
      // above where the backend responded but its own DB connection failed.
      else if (apiError?.request && !apiError?.response) {
        errorState = {
          code: 'NETWORK_ERROR',
          message: t('errors.networkError', { defaultValue: 'Network connection failed' }),
          details: apiError.message as string | undefined,
        };
      }
      // Handle validation errors
      else if (apiError?.validation) {
        errorState = {
          code: 'VALIDATION_ERROR',
          message: t('errors.validationError', { defaultValue: 'Please check your input' }),
          details: apiError.validation as string | Record<string, unknown> | undefined,
        };
      }
      // Handle generic errors
      else {
        errorState = {
          code: (apiError?.code as string) || 'UNKNOWN_ERROR',
          message: fallbackMessage || (apiError?.message as string) || t('errors.unknown', { defaultValue: 'An error occurred' }),
          details: apiError?.details as string | Record<string, unknown> | undefined,
        };
      }

      setError(errorState);
      options.onError?.(errorState);

      // Log error for debugging
      console.error('[useErrorHandler]', errorState);

      return errorState;
    },
    [t, options]
  );

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Set a custom error
   */
  const setCustomError = useCallback(
    (code: string, message: string, details?: string | Record<string, unknown>) => {
      const errorState: ErrorState = {
        code,
        message: t(`errors.${code}`, { defaultValue: message }),
        details,
      };
      setError(errorState);
      options.onError?.(errorState);
      return errorState;
    },
    [t, options]
  );

  return {
    error,
    setError,
    handleError,
    clearError,
    setCustomError,
    showDetails: options.showDetails || false,
    autoDismiss: options.autoDismiss || false,
    dismissDelay: options.dismissDelay || 5000,
  };
}

export default useErrorHandler;
