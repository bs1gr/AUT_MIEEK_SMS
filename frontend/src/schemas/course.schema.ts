import { z } from 'zod';

/**
 * Course form validation schema
 * Matches backend API requirements from backend/schemas/course.py
 */
export const courseSchema = z.object({
  course_code: z
    .string()
    .min(1, 'Course code is required')
    .max(50, 'Course code must be less than 50 characters')
    .regex(/^[A-Z0-9-]+$/, 'Course code must be uppercase letters, numbers, and hyphens only')
    .trim(),

  course_name: z
    .string()
    .min(1, 'Course name is required')
    .max(200, 'Course name must be less than 200 characters')
    .trim(),

  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),

  credits: z
    .number()
    .int('Credits must be a whole number')
    .min(0, 'Credits must be non-negative')
    .max(20, 'Credits must be 20 or less')
    .or(z.string().transform(val => {
      const num = parseInt(val, 10);
      return isNaN(num) ? 0 : num;
    })),

  semester: z
    .string()
    .min(1, 'Semester is required')
    .max(50, 'Semester must be less than 50 characters')
    .trim(),

  year: z
    .number()
    .int('Year must be a whole number')
    .min(2000, 'Year must be 2000 or later')
    .max(2100, 'Year must be 2100 or earlier')
    .or(z.string().transform(val => {
      const num = parseInt(val, 10);
      return isNaN(num) ? new Date().getFullYear() : num;
    })),

  instructor: z
    .string()
    .max(200, 'Instructor name must be less than 200 characters')
    .optional(),

  absence_penalty: z
    .number()
    .min(0, 'Absence penalty must be non-negative')
    .max(20, 'Absence penalty must be 20 or less')
    .optional()
    .or(z.string().transform(val => {
      if (val === '') return undefined;
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    })),
});

/**
 * Course update schema (all fields optional except ID)
 */
export const courseUpdateSchema = courseSchema.partial().extend({
  id: z.number().int().positive(),
});

/**
 * Type inference from schema
 */
export type CourseFormData = z.infer<typeof courseSchema>;
export type CourseUpdateFormData = z.infer<typeof courseUpdateSchema>;
