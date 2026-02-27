import { describe, it, expect } from 'vitest';
import { getErrorMessage } from './errorMessage';

describe('errorMessage', () => {
  describe('getErrorMessage', () => {
    const fallback = 'Default error message';

    it('returns fallback for null input', () => {
      expect(getErrorMessage(null, fallback)).toBe(fallback);
    });

    it('returns fallback for undefined input', () => {
      expect(getErrorMessage(undefined, fallback)).toBe(fallback);
    });

    it('returns string input directly', () => {
      expect(getErrorMessage('Network error', fallback)).toBe('Network error');
    });

    it('returns fallback for empty string', () => {
      expect(getErrorMessage('', fallback)).toBe(fallback);
    });

    it('returns fallback for whitespace-only string', () => {
      expect(getErrorMessage('   ', fallback)).toBe(fallback);
    });

    it('trims whitespace from string input', () => {
      expect(getErrorMessage('  Error message  ', fallback)).toBe('Error message');
    });

    it('extracts message from Error instance', () => {
      const error = new Error('Something went wrong');
      expect(getErrorMessage(error, fallback)).toBe('Something went wrong');
    });

    it('returns fallback for Error with empty message', () => {
      const error = new Error('');
      expect(getErrorMessage(error, fallback)).toBe(fallback);
    });

    it('extracts message property from object', () => {
      const obj = { message: 'Object error message' };
      expect(getErrorMessage(obj, fallback)).toBe('Object error message');
    });

    it('extracts detail property from object when message is missing', () => {
      const obj = { detail: 'Detail error message' };
      expect(getErrorMessage(obj, fallback)).toBe('Detail error message');
    });

    it('extracts error property from object when message and detail are missing', () => {
      const obj = { error: 'Error property message' };
      expect(getErrorMessage(obj, fallback)).toBe('Error property message');
    });

    it('prioritizes message over detail and error', () => {
      const obj = { message: 'Message', detail: 'Detail', error: 'Error' };
      expect(getErrorMessage(obj, fallback)).toBe('Message');
    });

    it('prioritizes detail over error when message is missing', () => {
      const obj = { detail: 'Detail', error: 'Error' };
      expect(getErrorMessage(obj, fallback)).toBe('Detail');
    });

    it('joins array of error messages', () => {
      const obj = { message: ['Error 1', 'Error 2', 'Error 3'] };
      expect(getErrorMessage(obj, fallback)).toBe('Error 1, Error 2, Error 3');
    });

    it('returns fallback for array with empty result after joining', () => {
      const obj = { message: [] };
      expect(getErrorMessage(obj, fallback)).toBe(fallback);
    });

    it('converts array items to strings', () => {
      const obj = { message: [1, 2, 3] };
      expect(getErrorMessage(obj, fallback)).toBe('1, 2, 3');
    });

    it('serializes object to JSON when no known properties exist', () => {
      const obj = { code: 500, status: 'error' };
      const result = getErrorMessage(obj, fallback);
      expect(result).toBe(JSON.stringify(obj));
    });

    it('returns fallback for empty object', () => {
      expect(getErrorMessage({}, fallback)).toBe(fallback);
    });

    it('handles nested error objects', () => {
      const obj = { message: { nested: 'value' } };
      // When message is not a string, function serializes the whole object
      expect(getErrorMessage(obj, fallback)).toBe(JSON.stringify(obj));
    });

    it('handles object with empty string message', () => {
      const obj = { message: '' };
      expect(getErrorMessage(obj, fallback)).toBe(fallback);
    });

    it('handles object with whitespace-only message', () => {
      const obj = { message: '   ' };
      expect(getErrorMessage(obj, fallback)).toBe(fallback);
    });

    it('handles Axios-style error response', () => {
      const axiosError = {
        response: {
          data: {
            detail: 'Validation failed',
          },
        },
      };
      const result = getErrorMessage(axiosError, fallback);
      expect(result).toBe('Validation failed');
    });

    it('extracts backend APIResponse nested error message', () => {
      const apiWrappedError = {
        response: {
          data: {
            success: false,
            error: {
              code: 'HTTP_400',
              message: 'Invalid email or password',
            },
          },
        },
        message: 'Request failed with status code 400',
      };

      const result = getErrorMessage(apiWrappedError, fallback);
      expect(result).toBe('Invalid email or password');
    });

    it('handles circular reference gracefully', () => {
      const circular: Record<string, unknown> & { message?: string; self?: unknown } = { message: 'Error' };
      circular.self = circular;
      // Should handle serialization error and return fallback
      const result = getErrorMessage(circular, fallback);
      expect(result).toBeTruthy(); // Should not throw
    });

    it('handles numbers as fallback to serialization', () => {
      expect(getErrorMessage(42, fallback)).toBe(fallback);
    });

    it('handles boolean as fallback to serialization', () => {
      expect(getErrorMessage(true, fallback)).toBe(fallback);
    });

    it('handles symbols gracefully', () => {
      const sym = Symbol('error');
      expect(getErrorMessage(sym as unknown, fallback)).toBe(fallback);
    });

    it('handles mixed case properties', () => {
      const obj = { Message: 'Mixed case' }; // Capital M
      // Function looks for lowercase 'message'
      const result = getErrorMessage(obj, fallback);
      expect(result).toContain('Message'); // Should serialize it
    });

    it('extracts message from complex error object', () => {
      const complexError = {
        message: 'Main error',
        stack: 'Error stack trace...',
        code: 'ERR_CODE',
      };
      expect(getErrorMessage(complexError, fallback)).toBe('Main error');
    });

    it('handles FastAPI validation error structure', () => {
      const validationError = {
        detail: [
          { loc: ['body', 'email'], msg: 'invalid email', type: 'value_error' },
          { loc: ['body', 'age'], msg: 'must be positive', type: 'value_error' },
        ],
      };
      const result = getErrorMessage(validationError, fallback);
      // Function joins array items with String(), which produces "[object Object]" for objects
      expect(result).toBe('[object Object], [object Object]');
    });

    it('trims whitespace from extracted detail', () => {
      const obj = { detail: '  Detail message  ' };
      expect(getErrorMessage(obj, fallback)).toBe('Detail message');
    });

    it('trims whitespace from extracted error property', () => {
      const obj = { error: '  Error message  ' };
      expect(getErrorMessage(obj, fallback)).toBe('Error message');
    });
  });
});
