import { useState, useCallback } from 'react';
import { ZodSchema, ZodError } from 'zod';

export interface UseFormValidationOptions {
  onValidationError?: (errors: Record<string, string>) => void;
}

/**
 * Generic form validation hook using Zod schemas
 * Provides type-safe validation with error handling
 *
 * @example
 * const { errors, validate, clearErrors } = useFormValidation(studentSchema);
 *
 * const handleSubmit = async (formData) => {
 *   if (!(await validate(formData))) return;
 *   // Submit form
 * };
 */
export function useFormValidation<T>(
  schema: ZodSchema<T>,
  options: UseFormValidationOptions = {}
) {
  const { onValidationError } = options;
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const validate = useCallback(
    async (data: unknown): Promise<boolean> => {
      try {
        await schema.parseAsync(data);
        setErrors({});
        return true;
      } catch (error) {
        if (error instanceof ZodError) {
          const newErrors: Record<string, string> = {};
          error.issues.forEach((issue) => {
            const path = String(issue.path[0] || 'root');
            newErrors[path] = issue.message;
          });
          setErrors(newErrors as Partial<Record<keyof T, string>>);
          onValidationError?.(newErrors);
        }
        return false;
      }
    },
    [schema, onValidationError]
  );

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const getFieldError = useCallback(
    (fieldName: keyof T): string | undefined => {
      return errors[fieldName];
    },
    [errors]
  );

  const hasErrors = useCallback((): boolean => {
    return Object.keys(errors).length > 0;
  }, [errors]);

  return {
    errors,
    validate,
    clearErrors,
    getFieldError,
    hasErrors
  };
}
