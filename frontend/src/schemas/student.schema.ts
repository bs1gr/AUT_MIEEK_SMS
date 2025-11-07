import { z } from 'zod';

/**
 * Student form validation schema
 * Matches backend API requirements from backend/schemas/student.py
 */
export const studentSchema = z.object({
  student_id: z
    .string()
    .min(1, 'Student ID is required')
    .max(50, 'Student ID must be less than 50 characters')
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9\-_]{0,49}$/,
      'Student ID must start with alphanumeric and can include - or _'
    )
    .trim(),

  first_name: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must be less than 100 characters')
    .trim(),
  
  last_name: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be less than 100 characters')
    .trim(),
  
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase()
    .trim(),
  
  phone: z
    .string()
    .max(20, 'Phone number must be less than 20 characters')
    .optional(),
  
  address: z
    .string()
    .max(500, 'Address must be less than 500 characters')
    .optional(),
  
  date_of_birth: z
    .string()
    .optional()
    .refine(
      val => !val || !isNaN(Date.parse(val)),
      'Invalid date format'
    ),
  
  enrollment_date: z
    .string()
    .min(1, 'Enrollment date is required')
    .refine(
      val => !isNaN(Date.parse(val)),
      'Invalid date format'
    ),
});

/**
 * Student update schema (all fields optional except ID)
 */
export const studentUpdateSchema = studentSchema.partial().extend({
  id: z.number().int().positive(),
});

/**
 * Type inference from schema
 */
export type StudentFormData = z.infer<typeof studentSchema>;
export type StudentUpdateFormData = z.infer<typeof studentUpdateSchema>;
