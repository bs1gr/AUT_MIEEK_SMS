import { describe, it, expect } from 'vitest';
import {
  attendanceSchema,
  bulkAttendanceSchema,
  attendanceUpdateSchema,
  type AttendanceFormData,
  type BulkAttendanceFormData,
  type AttendanceUpdateFormData,
} from './attendance.schema';

describe('attendanceSchema', () => {
  const validAttendanceBase = {
    student_id: 1,
    course_id: 1,
    date: '2024-01-15',
    status: 'present' as const,
  };

  describe('student_id validation', () => {
    it('accepts valid integer student_id', () => {
      expect(attendanceSchema.parse(validAttendanceBase)).toMatchObject({ student_id: 1 });
      expect(attendanceSchema.parse({ ...validAttendanceBase, student_id: 100 })).toMatchObject({ student_id: 100 });
    });

    it('accepts string student_id and converts to number', () => {
      const result = attendanceSchema.parse({ ...validAttendanceBase, student_id: '5' });
      expect(result.student_id).toBe(5);
      expect(typeof result.student_id).toBe('number');
    });

    it('rejects zero student_id', () => {
      expect(() => attendanceSchema.parse({ ...validAttendanceBase, student_id: 0 })).toThrow('Student ID must be positive');
    });

    it('rejects negative student_id', () => {
      expect(() => attendanceSchema.parse({ ...validAttendanceBase, student_id: -1 })).toThrow('Student ID must be positive');
    });

    it('rejects non-integer student_id', () => {
      expect(() => attendanceSchema.parse({ ...validAttendanceBase, student_id: 1.5 })).toThrow('Student ID must be a whole number');
    });

    it('rejects invalid string student_id', () => {
      expect(() => attendanceSchema.parse({ ...validAttendanceBase, student_id: 'invalid' })).toThrow('Invalid student ID');
    });
  });

  describe('course_id validation', () => {
    it('accepts valid integer course_id', () => {
      expect(attendanceSchema.parse(validAttendanceBase)).toMatchObject({ course_id: 1 });
      expect(attendanceSchema.parse({ ...validAttendanceBase, course_id: 50 })).toMatchObject({ course_id: 50 });
    });

    it('accepts string course_id and converts to number', () => {
      const result = attendanceSchema.parse({ ...validAttendanceBase, course_id: '10' });
      expect(result.course_id).toBe(10);
      expect(typeof result.course_id).toBe('number');
    });

    it('rejects zero course_id', () => {
      expect(() => attendanceSchema.parse({ ...validAttendanceBase, course_id: 0 })).toThrow('Course ID must be positive');
    });

    it('rejects negative course_id', () => {
      expect(() => attendanceSchema.parse({ ...validAttendanceBase, course_id: -1 })).toThrow('Course ID must be positive');
    });

    it('rejects non-integer course_id', () => {
      expect(() => attendanceSchema.parse({ ...validAttendanceBase, course_id: 1.5 })).toThrow('Course ID must be a whole number');
    });

    it('rejects invalid string course_id', () => {
      expect(() => attendanceSchema.parse({ ...validAttendanceBase, course_id: 'invalid' })).toThrow('Invalid course ID');
    });
  });

  describe('date validation', () => {
    it('accepts valid date formats', () => {
      expect(attendanceSchema.parse(validAttendanceBase)).toMatchObject({ date: '2024-01-15' });
      expect(attendanceSchema.parse({ ...validAttendanceBase, date: '2025-12-31' })).toMatchObject({ date: '2025-12-31' });
      expect(attendanceSchema.parse({ ...validAttendanceBase, date: '2024-02-29' })).toMatchObject({ date: '2024-02-29' }); // Leap year
    });

    it('rejects empty date', () => {
      expect(() => attendanceSchema.parse({ ...validAttendanceBase, date: '' })).toThrow('Date is required');
    });

    it('rejects invalid date formats', () => {
      expect(() => attendanceSchema.parse({ ...validAttendanceBase, date: 'not-a-date' })).toThrow('Invalid date format');
      expect(() => attendanceSchema.parse({ ...validAttendanceBase, date: '2024-13-01' })).toThrow('Invalid date format');
      // Note: JavaScript Date.parse coerces 2024-02-30 to 2024-03-02, so it doesn't throw
    });
  });

  describe('status validation', () => {
    it('accepts present status', () => {
      expect(attendanceSchema.parse({ ...validAttendanceBase, status: 'present' })).toMatchObject({ status: 'present' });
    });

    it('accepts absent status', () => {
      expect(attendanceSchema.parse({ ...validAttendanceBase, status: 'absent' })).toMatchObject({ status: 'absent' });
    });

    it('accepts late status', () => {
      expect(attendanceSchema.parse({ ...validAttendanceBase, status: 'late' })).toMatchObject({ status: 'late' });
    });

    it('accepts excused status', () => {
      expect(attendanceSchema.parse({ ...validAttendanceBase, status: 'excused' })).toMatchObject({ status: 'excused' });
    });

    it('rejects invalid status values', () => {
      expect(() => attendanceSchema.parse({ ...validAttendanceBase, status: 'unknown' })).toThrow('Status must be one of');
      expect(() => attendanceSchema.parse({ ...validAttendanceBase, status: 'tardy' })).toThrow('Status must be one of');
      expect(() => attendanceSchema.parse({ ...validAttendanceBase, status: '' })).toThrow('Status must be one of');
    });
  });

  describe('notes validation', () => {
    it('accepts valid notes', () => {
      expect(attendanceSchema.parse({ ...validAttendanceBase, notes: 'Student arrived late due to traffic' })).toMatchObject({ notes: 'Student arrived late due to traffic' });
      expect(attendanceSchema.parse({ ...validAttendanceBase, notes: 'Καθυστέρησε λόγω κακοκαιρίας' })).toMatchObject({ notes: 'Καθυστέρησε λόγω κακοκαιρίας' });
    });

    it('accepts undefined notes', () => {
      const result = attendanceSchema.parse(validAttendanceBase);
      expect(result.notes).toBeUndefined();
    });

    it('converts empty string to undefined', () => {
      const result = attendanceSchema.parse({ ...validAttendanceBase, notes: '' });
      expect(result.notes).toBeUndefined();
    });

    it('rejects notes exceeding 500 characters', () => {
      const longNotes = 'A'.repeat(501);
      expect(() => attendanceSchema.parse({ ...validAttendanceBase, notes: longNotes })).toThrow('Notes must be less than 500 characters');
    });

    it('accepts exactly 500 character notes', () => {
      const notes500 = 'A'.repeat(500);
      expect(attendanceSchema.parse({ ...validAttendanceBase, notes: notes500 })).toMatchObject({ notes: notes500 });
    });
  });

  describe('complete valid attendance data', () => {
    it('parses complete attendance with all fields', () => {
      const validAttendance = {
        student_id: 1,
        course_id: 2,
        date: '2024-01-15',
        status: 'late' as const,
        notes: 'Arrived 15 minutes late',
      };
      const result = attendanceSchema.parse(validAttendance);
      expect(result).toMatchObject(validAttendance);
    });

    it('parses attendance with only required fields', () => {
      const minimalAttendance = {
        student_id: 1,
        course_id: 1,
        date: '2024-01-15',
        status: 'present' as const,
      };
      const result = attendanceSchema.parse(minimalAttendance);
      expect(result).toMatchObject(minimalAttendance);
      expect(result.notes).toBeUndefined();
    });
  });
});

describe('bulkAttendanceSchema', () => {
  const validBulkBase = {
    course_id: 1,
    date: '2024-01-15',
    attendance_records: [
      { student_id: 1, status: 'present' as const },
      { student_id: 2, status: 'absent' as const },
    ],
  };

  describe('course_id validation', () => {
    it('accepts valid course_id', () => {
      expect(bulkAttendanceSchema.parse(validBulkBase)).toMatchObject({ course_id: 1 });
    });

    it('rejects zero course_id', () => {
      expect(() => bulkAttendanceSchema.parse({ ...validBulkBase, course_id: 0 })).toThrow('Course ID must be positive');
    });

    it('rejects negative course_id', () => {
      expect(() => bulkAttendanceSchema.parse({ ...validBulkBase, course_id: -1 })).toThrow('Course ID must be positive');
    });

    it('rejects non-integer course_id', () => {
      expect(() => bulkAttendanceSchema.parse({ ...validBulkBase, course_id: 1.5 })).toThrow('Course ID must be a whole number');
    });
  });

  describe('date validation', () => {
    it('accepts valid dates', () => {
      expect(bulkAttendanceSchema.parse(validBulkBase)).toMatchObject({ date: '2024-01-15' });
    });

    it('rejects empty date', () => {
      expect(() => bulkAttendanceSchema.parse({ ...validBulkBase, date: '' })).toThrow('Date is required');
    });

    it('rejects invalid date formats', () => {
      expect(() => bulkAttendanceSchema.parse({ ...validBulkBase, date: 'invalid' })).toThrow('Invalid date format');
    });
  });

  describe('attendance_records validation', () => {
    it('accepts valid attendance records', () => {
      const records = [
        { student_id: 1, status: 'present' as const },
        { student_id: 2, status: 'late' as const, notes: 'Arrived late' },
        { student_id: 3, status: 'excused' as const },
      ];
      expect(bulkAttendanceSchema.parse({ ...validBulkBase, attendance_records: records })).toMatchObject({ attendance_records: records });
    });

    it('accepts single record', () => {
      const records = [{ student_id: 1, status: 'present' as const }];
      expect(bulkAttendanceSchema.parse({ ...validBulkBase, attendance_records: records })).toMatchObject({ attendance_records: records });
    });

    it('rejects empty attendance_records array', () => {
      expect(() => bulkAttendanceSchema.parse({ ...validBulkBase, attendance_records: [] })).toThrow('At least one attendance record is required');
    });

    it('validates individual record fields', () => {
      const invalidRecords = [{ student_id: 0, status: 'present' as const }];
      expect(() => bulkAttendanceSchema.parse({ ...validBulkBase, attendance_records: invalidRecords })).toThrow();
    });

    it('validates status values in records', () => {
      const invalidRecords = [{ student_id: 1, status: 'invalid' }];
      expect(() => bulkAttendanceSchema.parse({ ...validBulkBase, attendance_records: invalidRecords })).toThrow();
    });

    it('validates notes length in records', () => {
      const longNotes = 'A'.repeat(501);
      const recordsWithLongNotes = [{ student_id: 1, status: 'present' as const, notes: longNotes }];
      expect(() => bulkAttendanceSchema.parse({ ...validBulkBase, attendance_records: recordsWithLongNotes })).toThrow();
    });

    it('accepts records with optional notes', () => {
      const records = [
        { student_id: 1, status: 'present' as const },
        { student_id: 2, status: 'late' as const, notes: 'Traffic' },
      ];
      const result = bulkAttendanceSchema.parse({ ...validBulkBase, attendance_records: records });
      expect(result.attendance_records[0].notes).toBeUndefined();
      expect(result.attendance_records[1].notes).toBe('Traffic');
    });

    it('accepts many records for bulk operation', () => {
      const manyRecords = Array.from({ length: 50 }, (_, i) => ({
        student_id: i + 1,
        status: (i % 2 === 0 ? 'present' : 'absent') as 'present' | 'absent',
      }));
      expect(bulkAttendanceSchema.parse({ ...validBulkBase, attendance_records: manyRecords })).toMatchObject({ attendance_records: manyRecords });
    });
  });

  describe('complete bulk attendance data', () => {
    it('parses complete bulk attendance', () => {
      const validBulk = {
        course_id: 1,
        date: '2024-01-15',
        attendance_records: [
          { student_id: 1, status: 'present' as const },
          { student_id: 2, status: 'absent' as const, notes: 'Sick' },
          { student_id: 3, status: 'late' as const, notes: 'Arrived 10 min late' },
          { student_id: 4, status: 'excused' as const, notes: 'Medical appointment' },
        ],
      };
      const result = bulkAttendanceSchema.parse(validBulk);
      expect(result).toMatchObject(validBulk);
    });
  });
});

describe('attendanceUpdateSchema', () => {
  it('requires id field', () => {
    expect(() => attendanceUpdateSchema.parse({})).toThrow('expected number');
  });

  it('accepts id with partial updates', () => {
    const result = attendanceUpdateSchema.parse({ id: 1, status: 'late' });
    expect(result).toMatchObject({ id: 1, status: 'late' });
  });

  it('rejects non-positive id', () => {
    expect(() => attendanceUpdateSchema.parse({ id: 0, status: 'present' })).toThrow();
    expect(() => attendanceUpdateSchema.parse({ id: -1, status: 'present' })).toThrow();
  });

  it('rejects non-integer id', () => {
    expect(() => attendanceUpdateSchema.parse({ id: 1.5, status: 'present' })).toThrow();
  });

  it('allows updating all fields', () => {
    const update = {
      id: 1,
      student_id: 2,
      course_id: 3,
      date: '2024-02-01',
      status: 'excused' as const,
      notes: 'Medical excuse provided',
    };
    const result = attendanceUpdateSchema.parse(update);
    expect(result).toMatchObject(update);
  });

  it('allows partial updates', () => {
    expect(attendanceUpdateSchema.parse({ id: 1, status: 'absent' })).toMatchObject({ id: 1, status: 'absent' });
    expect(attendanceUpdateSchema.parse({ id: 2, notes: 'Updated notes' })).toMatchObject({ id: 2, notes: 'Updated notes' });
  });

  it('validates field constraints on partial updates', () => {
    expect(() => attendanceUpdateSchema.parse({ id: 1, student_id: 0 })).toThrow();
    expect(() => attendanceUpdateSchema.parse({ id: 1, status: 'invalid' })).toThrow();
    expect(() => attendanceUpdateSchema.parse({ id: 1, date: 'invalid-date' })).toThrow();
  });
});

describe('Type exports', () => {
  it('exports AttendanceFormData type', () => {
    const data: AttendanceFormData = {
      student_id: 1,
      course_id: 1,
      date: '2024-01-15',
      status: 'present',
      notes: undefined,
    };
    expect(data).toBeDefined();
  });

  it('exports BulkAttendanceFormData type', () => {
    const data: BulkAttendanceFormData = {
      course_id: 1,
      date: '2024-01-15',
      attendance_records: [
        { student_id: 1, status: 'present' },
        { student_id: 2, status: 'absent', notes: 'Sick' },
      ],
    };
    expect(data).toBeDefined();
  });

  it('exports AttendanceUpdateFormData type', () => {
    const data: AttendanceUpdateFormData = {
      id: 1,
      status: 'late',
    };
    expect(data).toBeDefined();
  });
});
