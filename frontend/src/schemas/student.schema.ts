import { z } from 'zod';

/**
 * Student form validation schema
 * Matches backend API requirements from backend/schemas/student.py
 */
export const studentSchema = z.object({
  student_id: z
    .string()
    .trim()
    .min(1, 'Student ID is required')
    .max(50, 'Student ID must be less than 50 characters')
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9\-_]{0,49}$/,
      'Student ID must start with alphanumeric and can include - or _'
    ),

  first_name: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(100, 'First name must be less than 100 characters'),

  last_name: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be less than 100 characters'),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),

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

  academic_year: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val && val.trim().length > 0 ? val.toUpperCase() : undefined))
    .refine((val) => !val || val === 'A' || val === 'B', "Academic year must be 'A' or 'B'"),

  class_division: z
    .string()
    .trim()
    .max(50, 'Class division must be less than 50 characters')
    .optional(),
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
export type StudentFormInput = z.input<typeof studentSchema>;
export type StudentFormData = z.infer<typeof studentSchema>;
export type StudentUpdateFormData = z.infer<typeof studentUpdateSchema>;
export type StudentUpdateFormInput = z.input<typeof studentUpdateSchema>;
