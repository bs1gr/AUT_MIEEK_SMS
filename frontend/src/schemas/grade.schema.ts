import { z } from 'zod';

/**
 * Grade form validation schema
 * Matches backend API requirements from backend/schemas/grade.py
 */
export const gradeSchema = z.object({
  student_id: z
    .number()
    .int('Student ID must be a whole number')
    .positive('Student ID must be positive')
    .or(z.string().transform(val => {
      const num = parseInt(val, 10);
      if (isNaN(num)) throw new Error('Invalid student ID');
      return num;
    })),

  course_id: z
    .number()
    .int('Course ID must be a whole number')
    .positive('Course ID must be positive')
    .or(z.string().transform(val => {
      const num = parseInt(val, 10);
      if (isNaN(num)) throw new Error('Invalid course ID');
      return num;
    })),

  component_type: z
    .string()
    .min(1, 'Component type is required')
    .max(100, 'Component type must be less than 100 characters')
    .trim(),

  grade: z
    .number()
    .min(0, 'Grade must be non-negative')
    .max(20, 'Grade must be 20 or less (Greek scale)')
    .or(z.string().transform(val => {
      const num = parseFloat(val);
      if (isNaN(num)) throw new Error('Invalid grade');
      return num;
    })),

  max_grade: z
    .number()
    .positive('Max grade must be positive')
    .max(20, 'Max grade must be 20 or less (Greek scale)')
    .or(z.string().transform(val => {
      const num = parseFloat(val);
      if (isNaN(num)) throw new Error('Invalid max grade');
      return num;
    })),

  weight: z
    .number()
    .min(0, 'Weight must be non-negative')
    .max(100, 'Weight must be 100 or less (%)')
    .or(z.string().transform(val => {
      const num = parseFloat(val);
      if (isNaN(num)) throw new Error('Invalid weight');
      return num;
    })),

  date_assigned: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val)
    .refine(
      val => !val || !isNaN(Date.parse(val)),
      'Invalid date format'
    ),

  date_submitted: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val)
    .refine(
      val => !val || !isNaN(Date.parse(val)),
      'Invalid date format'
    ),

  notes: z
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val),
}).refine(
  data => data.grade <= data.max_grade,
  {
    message: 'Grade cannot exceed max grade',
    path: ['grade'],
  }
);

/**
 * Grade update schema (all fields optional except ID)
 */
export const gradeUpdateSchema = gradeSchema.partial().extend({
  id: z.number().int().positive(),
});

/**
 * Type inference from schema
 */
export type GradeFormData = z.infer<typeof gradeSchema>;
export type GradeUpdateFormData = z.infer<typeof gradeUpdateSchema>;
