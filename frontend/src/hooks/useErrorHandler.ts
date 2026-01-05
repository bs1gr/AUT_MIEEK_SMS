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
  details?: string | Record<string, any>;
  path?: string;
  request_id?: string;
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
    (err: any, fallbackMessage?: string) => {
      let errorState: ErrorState;

      // Handle API response errors (from axios)
      if (err?.response?.data) {
        const extracted = extractAPIError(err.response);
        errorState = {
          code: extracted.code,
          message: extracted.message,
          details: extracted.details,
          path: extracted.path,
          request_id: extracted.request_id,
          status: err.response.status,
        };
      }
      // Handle network errors
      else if (err?.request && !err?.response) {
        errorState = {
          code: 'NETWORK_ERROR',
          message: t('errors.NETWORK_ERROR', { defaultValue: 'Network connection failed' }),
          details: err.message,
        };
      }
      // Handle validation errors
      else if (err?.validation) {
        errorState = {
          code: 'VALIDATION_ERROR',
          message: t('errors.VALIDATION_ERROR', { defaultValue: 'Please check your input' }),
          details: err.validation,
        };
      }
      // Handle generic errors
      else {
        errorState = {
          code: err?.code || 'UNKNOWN_ERROR',
          message: fallbackMessage || err?.message || t('errors.UNKNOWN_ERROR', { defaultValue: 'An error occurred' }),
          details: err?.details,
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
    (code: string, message: string, details?: string | Record<string, any>) => {
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
