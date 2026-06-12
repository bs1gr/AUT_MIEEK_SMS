import { z } from 'zod';

/**
 * Attendance form validation schema
 * Matches backend API requirements from backend/schemas/attendance.py
 */
export const attendanceSchema = z.object({
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

  date: z
    .string()
    .min(1, 'Date is required')
    .refine(
      val => !isNaN(Date.parse(val)),
      'Invalid date format'
    ),

  status: z
    .enum(['present', 'absent', 'late', 'excused'], {
      message: 'Status must be one of: present, absent, late, excused',
    }),

  notes: z
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? undefined : val),
});

/**
 * Bulk attendance schema (multiple students for one course/date)
 */
export const bulkAttendanceSchema = z.object({
  course_id: z
    .number()
    .int('Course ID must be a whole number')
    .positive('Course ID must be positive'),

  date: z
    .string()
    .min(1, 'Date is required')
    .refine(
      val => !isNaN(Date.parse(val)),
      'Invalid date format'
    ),

  attendance_records: z
    .array(z.object({
      student_id: z.number().int().positive(),
      status: z.enum(['present', 'absent', 'late', 'excused']),
      notes: z.string().max(500).optional(),
    }))
    .min(1, 'At least one attendance record is required'),
});

/**
 * Attendance update schema (all fields optional except ID)
 * Cannot use .partial() on schemas with refinements, so we reconstruct without .partial()
 * Preserves necessary validation (date format, constraints) on individual fields
 */
export const attendanceUpdateSchema = z.object({
  id: z.number().int().positive(),
  student_id: z
    .number()
    .int('Student ID must be a whole number')
    .positive('Student ID must be positive')
    .or(z.string().transform(val => {
      const num = parseInt(val, 10);
      if (isNaN(num)) throw new Error('Invalid student ID');
      return num;
    }))
    .optional(),
  course_id: z
    .number()
    .int('Course ID must be a whole number')
    .positive('Course ID must be positive')
    .or(z.string().transform(val => {
      const num = parseInt(val, 10);
      if (isNaN(num)) throw new Error('Invalid course ID');
      return num;
    }))
    .optional(),
  date: z
    .string()
    .min(1, 'Date is required')
    .refine(
      val => !isNaN(Date.parse(val)),
      'Invalid date format'
    )
    .optional(),
  status: z
    .enum(['present', 'absent', 'late', 'excused'], {
      message: 'Status must be one of: present, absent, late, excused',
    })
    .optional(),
  notes: z
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .optional(),
});

/**
 * Type inference from schema
 */
export type AttendanceFormData = z.infer<typeof attendanceSchema>;
export type BulkAttendanceFormData = z.infer<typeof bulkAttendanceSchema>;
export type AttendanceUpdateFormData = z.infer<typeof attendanceUpdateSchema>;
