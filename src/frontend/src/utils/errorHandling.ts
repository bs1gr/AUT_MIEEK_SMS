/**
 * Comprehensive error handling utilities for SMS frontend
 * Provides standardized error categorization, recovery strategies, and logging
 */

export enum ErrorCategory {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN',
}

export interface ErrorContext {
  operation?: string;
  request?: string;
  timestamp: number;
  category: ErrorCategory;
  isDev: boolean;
  userAgent?: string;
}

export class ErrorHandler {
  /**
   * Categorize an error based on its properties
   */
  static categorizeError(error: unknown): ErrorCategory {
    if (!error) return ErrorCategory.UNKNOWN;

    if (error instanceof TypeError) {
      return ErrorCategory.VALIDATION;
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes('network') || message.includes('fetch')) {
        return ErrorCategory.NETWORK;
      }

      if (message.includes('auth') || message.includes('401')) {
        return ErrorCategory.AUTHENTICATION;
      }

      if (message.includes('forbidden') || message.includes('403')) {
        return ErrorCategory.AUTHORIZATION;
      }

      if (message.includes('404') || message.includes('not found')) {
        return ErrorCategory.NOT_FOUND;
      }

      if (message.includes('500') || message.includes('server')) {
        return ErrorCategory.SERVER;
      }
    }

    // Check if it's an API response error
    if (typeof error === 'object' && error !== null) {
      const errorObj = error as Record<string, unknown>;

      if (errorObj.status === 401) return ErrorCategory.AUTHENTICATION;
      if (errorObj.status === 403) return ErrorCategory.AUTHORIZATION;
      if (errorObj.status === 404) return ErrorCategory.NOT_FOUND;
      if (typeof errorObj.status === 'number' && errorObj.status >= 500) {
        return ErrorCategory.SERVER;
      }
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Create context object for error logging
   */
  static createContext(operation?: string): ErrorContext {
    return {
      operation,
      timestamp: Date.now(),
      category: ErrorCategory.UNKNOWN,
      isDev: import.meta.env.DEV,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    };
  }

  /**
   * Format error for logging with full context
   */
  static formatError(error: unknown, context: ErrorContext): string {
    const category = this.categorizeError(error);
    const timestamp = new Date(context.timestamp).toISOString();

    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error);
    }

    return [
      `[${timestamp}] ${category} Error`,
      context.operation ? `Operation: ${context.operation}` : '',
      `Message: ${errorMessage}`,
      context.isDev ? 'Dev Mode: true' : '',
    ]
      .filter(Boolean)
      .join(' | ');
  }

  /**
   * Log error with structured format
   */
  static logError(error: unknown, context?: Partial<ErrorContext>): void {
    const fullContext = { ...this.createContext(), ...context };
    const category = this.categorizeError(error);
    fullContext.category = category;

    const formatted = this.formatError(error, fullContext);

    // Always log to console in development
    if (fullContext.isDev) {
      console.error(`[${category}]`, error, fullContext);
    } else {
      console.error(formatted);
    }

    // Send to backend error logging service
    this.sendToBackend(error, fullContext).catch(() => {
      // Silently fail - don't cascade error logging failures
    });
  }

  /**
   * Send error to backend logging service
   */
  private static async sendToBackend(
    error: unknown,
    context: ErrorContext
  ): Promise<void> {
    try {
      const payload = {
        message: error instanceof Error ? error.message : String(error),
        category: this.categorizeError(error),
        stack: error instanceof Error ? error.stack : undefined,
        context: {
          operation: context.operation,
          timestamp: context.timestamp,
          userAgent: context.userAgent,
        },
      };

      // Only send in production or if explicitly enabled
      if (!context.isDev) {
        await fetch('/api/v1/system/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
    } catch {
      // Silently fail - error logging shouldn't break the app
    }
  }

  /**
   * Get user-friendly error message based on category
   */
  static getUserMessage(category: ErrorCategory): string {
    const messages: Record<ErrorCategory, string> = {
      [ErrorCategory.NETWORK]: 'Network connection error. Please check your internet connection and try again.',
      [ErrorCategory.VALIDATION]: 'Invalid input provided. Please check your data and try again.',
      [ErrorCategory.AUTHENTICATION]: 'Your session has expired. Please log in again.',
      [ErrorCategory.AUTHORIZATION]: 'You do not have permission to perform this action.',
      [ErrorCategory.NOT_FOUND]: 'The requested resource was not found.',
      [ErrorCategory.SERVER]: 'A server error occurred. Please try again later.',
      [ErrorCategory.UNKNOWN]: 'An unexpected error occurred. Please try again.',
    };

    return messages[category] || messages[ErrorCategory.UNKNOWN];
  }

  /**
   * Determine if error is recoverable
   */
  static isRecoverable(category: ErrorCategory): boolean {
    return category === ErrorCategory.NETWORK || category === ErrorCategory.SERVER;
  }

  /**
   * Get retry strategy for error
   */
  static getRetryStrategy(category: ErrorCategory): { maxAttempts: number; delayMs: number } {
    switch (category) {
      case ErrorCategory.NETWORK:
        return { maxAttempts: 3, delayMs: 1000 };
      case ErrorCategory.SERVER:
        return { maxAttempts: 2, delayMs: 2000 };
      default:
        return { maxAttempts: 0, delayMs: 0 };
    }
  }
}

/**
 * Safe wrapper for localStorage operations with error handling
 */
export function safeLocalStorage<T>(
  operation: 'get' | 'set' | 'remove',
  key: string,
  value?: T
): T | null {
  try {
    switch (operation) {
      case 'get': {
        const item = localStorage.getItem(key);
        return item ? (JSON.parse(item) as T) : null;
      }
      case 'set':
        localStorage.setItem(key, JSON.stringify(value));
        return null;
      case 'remove':
        localStorage.removeItem(key);
        return null;
      default:
        throw new Error(`Unknown localStorage operation: ${operation}`);
    }
  } catch (error) {
    ErrorHandler.logError(error, { operation: `localStorage.${operation}` });
    return null;
  }
}

/**
 * Retry mechanism with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
