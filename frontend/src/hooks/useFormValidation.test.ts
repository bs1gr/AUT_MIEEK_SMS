import { renderHook, act } from '@testing-library/react';
import { z } from 'zod';
import { useFormValidation } from './useFormValidation';

describe('useFormValidation hook', () => {
  const testSchema = z.object({
    email: z.string().email('Invalid email'),
    name: z.string().min(2, 'Name too short'),
    age: z.number().min(0).max(150, 'Invalid age'),
  });

  // type TestData = z.infer<typeof testSchema>; // Unused type

  describe('validate', () => {
    it('should return true for valid data', async () => {
      const { result } = renderHook(() => useFormValidation(testSchema));

      const validData = {
        email: 'test@example.com',
        name: 'John Doe',
        age: 30,
      };

      let isValid = false;
      await act(async () => {
        isValid = await result.current.validate(validData);
      });

      expect(isValid).toBe(true);
      expect(result.current.errors).toEqual({});
    });

    it('should return false for invalid data', async () => {
      const { result } = renderHook(() => useFormValidation(testSchema));

      const invalidData = {
        email: 'not-an-email',
        name: 'J',
        age: 200,
      };

      let isValid = false;
      await act(async () => {
        isValid = await result.current.validate(invalidData);
      });

      expect(isValid).toBe(false);
      expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);
    });

    it('should populate errors with field-specific messages', async () => {
      const { result } = renderHook(() => useFormValidation(testSchema));

      const invalidData = {
        email: 'invalid',
        name: 'J',
        age: 200,
      };

      await act(async () => {
        await result.current.validate(invalidData);
      });

      expect(result.current.errors.email).toBeDefined();
      expect(result.current.errors.name).toBeDefined();
      expect(result.current.errors.age).toBeDefined();
    });

    it('should clear previous errors on successful validation', async () => {
      const { result } = renderHook(() => useFormValidation(testSchema));

      const invalidData = { email: 'invalid', name: 'J', age: 200 };
      const validData = { email: 'test@example.com', name: 'John', age: 30 };

      // First validation fails
      await act(async () => {
        await result.current.validate(invalidData);
      });
      expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);

      // Second validation succeeds
      await act(async () => {
        await result.current.validate(validData);
      });
      expect(result.current.errors).toEqual({});
    });
  });

  describe('clearErrors', () => {
    it('should clear all errors', async () => {
      const { result } = renderHook(() => useFormValidation(testSchema));

      const invalidData = { email: 'invalid', name: 'J', age: 200 };

      await act(async () => {
        await result.current.validate(invalidData);
      });
      expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);

      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.errors).toEqual({});
    });
  });

  describe('getFieldError', () => {
    it('should return error for specific field', async () => {
      const { result } = renderHook(() => useFormValidation(testSchema));

      const invalidData = { email: 'invalid', name: 'John', age: 30 };

      await act(async () => {
        await result.current.validate(invalidData);
      });

      expect(result.current.getFieldError('email')).toBeDefined();
      expect(result.current.getFieldError('name')).toBeUndefined();
    });

    it('should return undefined for field without error', async () => {
      const { result } = renderHook(() => useFormValidation(testSchema));

      const validData = { email: 'test@example.com', name: 'John', age: 30 };

      await act(async () => {
        await result.current.validate(validData);
      });

      expect(result.current.getFieldError('email')).toBeUndefined();
    });
  });

  describe('hasErrors', () => {
    it('should return true when errors exist', async () => {
      const { result } = renderHook(() => useFormValidation(testSchema));

      const invalidData = { email: 'invalid', name: 'J', age: 200 };

      await act(async () => {
        await result.current.validate(invalidData);
      });

      expect(result.current.hasErrors()).toBe(true);
    });

    it('should return false when no errors exist', async () => {
      const { result } = renderHook(() => useFormValidation(testSchema));

      const validData = { email: 'test@example.com', name: 'John', age: 30 };

      await act(async () => {
        await result.current.validate(validData);
      });

      expect(result.current.hasErrors()).toBe(false);
    });
  });

  describe('onValidationError callback', () => {
    it('should call onValidationError when validation fails', async () => {
      const onValidationError = vi.fn();
      const { result } = renderHook(() =>
        useFormValidation(testSchema, { onValidationError })
      );

      const invalidData = { email: 'invalid', name: 'J', age: 200 };

      await act(async () => {
        await result.current.validate(invalidData);
      });

      expect(onValidationError).toHaveBeenCalled();
      expect(onValidationError).toHaveBeenCalledWith(expect.objectContaining({
        email: expect.any(String),
        name: expect.any(String),
      }));
    });

    it('should not call onValidationError when validation succeeds', async () => {
      const onValidationError = vi.fn();
      const { result } = renderHook(() =>
        useFormValidation(testSchema, { onValidationError })
      );

      const validData = { email: 'test@example.com', name: 'John', age: 30 };

      await act(async () => {
        await result.current.validate(validData);
      });

      expect(onValidationError).not.toHaveBeenCalled();
    });
  });

  describe('complex validation scenarios', () => {
    it('should handle partial object validation', async () => {
      const partialSchema = z.object({
        email: z.string().email().optional(),
        name: z.string().min(2),
      });

      const { result } = renderHook(() => useFormValidation(partialSchema));

      const data = { name: 'John' };

      await act(async () => {
        await result.current.validate(data);
      });

      expect(result.current.hasErrors()).toBe(false);
    });

    it('should handle custom validation errors', async () => {
      const customSchema = z.object({
        password: z.string().min(8, 'Password too short'),
        confirmPassword: z.string(),
      }).refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
      });

      const { result } = renderHook(() => useFormValidation(customSchema));

      const data = {
        password: 'password123', // pragma: allowlist secret
        confirmPassword: 'password456', // pragma: allowlist secret
      };

      await act(async () => {
        await result.current.validate(data);
      });

      expect(result.current.getFieldError('confirmPassword')).toBeDefined();
    });

    it('should handle nested object validation', async () => {
      const nestedSchema = z.object({
        user: z.object({
          email: z.string().email(),
          profile: z.object({
            firstName: z.string().min(1),
          }),
        }),
      });

      const { result } = renderHook(() => useFormValidation(nestedSchema));

      const invalidData = {
        user: {
          email: 'invalid',
          profile: { firstName: '' },
        },
      };

      await act(async () => {
        await result.current.validate(invalidData);
      });

      expect(result.current.hasErrors()).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined values', async () => {
      const { result } = renderHook(() => useFormValidation(testSchema));

      await act(async () => {
        await result.current.validate(undefined);
      });

      expect(result.current.hasErrors()).toBe(true);
    });

    it('should handle null values', async () => {
      const { result } = renderHook(() => useFormValidation(testSchema));

      await act(async () => {
        await result.current.validate(null);
      });

      expect(result.current.hasErrors()).toBe(true);
    });

    it('should handle rapid successive validations', async () => {
      const { result } = renderHook(() => useFormValidation(testSchema));

      const validData = { email: 'test@example.com', name: 'John', age: 30 };
      const invalidData = { email: 'invalid', name: 'J', age: 200 };

      await act(async () => {
        await result.current.validate(validData);
        await result.current.validate(invalidData);
        await result.current.validate(validData);
      });

      expect(result.current.hasErrors()).toBe(false);
    });
  });
});
