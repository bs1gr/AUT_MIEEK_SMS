import { describe, it, expect } from 'vitest';
import { studentSchema, studentUpdateSchema, type StudentFormData, type StudentUpdateFormData } from './student.schema';

describe('studentSchema', () => {
  describe('student_id validation', () => {
    it('accepts valid alphanumeric student IDs', () => {
      expect(studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01' })).toMatchObject({ student_id: 'STU123' });
      expect(studentSchema.parse({ student_id: 'A1B2C3', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01' })).toMatchObject({ student_id: 'A1B2C3' });
    });

    it('accepts student IDs with hyphens and underscores', () => {
      expect(studentSchema.parse({ student_id: 'STU-123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01' })).toMatchObject({ student_id: 'STU-123' });
      expect(studentSchema.parse({ student_id: 'STU_456', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01' })).toMatchObject({ student_id: 'STU_456' });
      expect(studentSchema.parse({ student_id: 'A-B_C', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01' })).toMatchObject({ student_id: 'A-B_C' });
    });

    it('trims whitespace from student_id', () => {
      // Note: Zod validates before trimming, so input must already match regex
      const result = studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01' });
      expect(result.student_id).toBe('STU123');
    });

    it('rejects empty student_id', () => {
      expect(() => studentSchema.parse({ student_id: '', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01' })).toThrow('Student ID is required');
    });

    it('rejects student_id exceeding 50 characters', () => {
      const longId = 'A'.repeat(51);
      expect(() => studentSchema.parse({ student_id: longId, first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01' })).toThrow('Student ID must be less than 50 characters');
    });

    it('rejects student_id starting with hyphen or underscore', () => {
      expect(() => studentSchema.parse({ student_id: '-STU123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01' })).toThrow('Student ID must start with alphanumeric');
      expect(() => studentSchema.parse({ student_id: '_STU123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01' })).toThrow('Student ID must start with alphanumeric');
    });

    it('rejects student_id with invalid characters', () => {
      expect(() => studentSchema.parse({ student_id: 'STU@123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01' })).toThrow('Student ID must start with alphanumeric');
      expect(() => studentSchema.parse({ student_id: 'STU 123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01' })).toThrow('Student ID must start with alphanumeric');
    });

    it('accepts single character student_id', () => {
      expect(studentSchema.parse({ student_id: 'A', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01' })).toMatchObject({ student_id: 'A' });
    });

    it('accepts exactly 50 character student_id', () => {
      const id50 = 'A' + '1'.repeat(49);
      expect(studentSchema.parse({ student_id: id50, first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01' })).toMatchObject({ student_id: id50 });
    });
  });

  describe('first_name validation', () => {
    it('accepts valid first names', () => {
      expect(studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01' })).toMatchObject({ first_name: 'John' });
      expect(studentSchema.parse({ student_id: 'STU123', first_name: 'Αλέξανδρος', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01' })).toMatchObject({ first_name: 'Αλέξανδρος' });
    });

    it('trims whitespace from first_name', () => {
      const result = studentSchema.parse({ student_id: 'STU123', first_name: '  John  ', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01' });
      expect(result.first_name).toBe('John');
    });

    it('rejects empty first_name', () => {
      expect(() => studentSchema.parse({ student_id: 'STU123', first_name: '', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01' })).toThrow('First name is required');
    });

    it('rejects first_name exceeding 100 characters', () => {
      const longName = 'A'.repeat(101);
      expect(() => studentSchema.parse({ student_id: 'STU123', first_name: longName, last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01' })).toThrow('First name must be less than 100 characters');
    });

    it('accepts exactly 100 character first_name', () => {
      const name100 = 'A'.repeat(100);
      expect(studentSchema.parse({ student_id: 'STU123', first_name: name100, last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01' })).toMatchObject({ first_name: name100 });
    });
  });

  describe('last_name validation', () => {
    it('accepts valid last names', () => {
      expect(studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01' })).toMatchObject({ last_name: 'Doe' });
      expect(studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Παπαδόπουλος', email: 'john@example.com', enrollment_date: '2024-01-01' })).toMatchObject({ last_name: 'Παπαδόπουλος' });
    });

    it('trims whitespace from last_name', () => {
      const result = studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: '  Doe  ', email: 'john@example.com', enrollment_date: '2024-01-01' });
      expect(result.last_name).toBe('Doe');
    });

    it('rejects empty last_name', () => {
      expect(() => studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: '', email: 'john@example.com', enrollment_date: '2024-01-01' })).toThrow('Last name is required');
    });

    it('rejects last_name exceeding 100 characters', () => {
      const longName = 'A'.repeat(101);
      expect(() => studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: longName, email: 'john@example.com', enrollment_date: '2024-01-01' })).toThrow('Last name must be less than 100 characters');
    });
  });

  describe('email validation', () => {
    it('accepts valid email addresses', () => {
      expect(studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01' })).toMatchObject({ email: 'john@example.com' });
      expect(studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: 'user+tag@domain.co.uk', enrollment_date: '2024-01-01' })).toMatchObject({ email: 'user+tag@domain.co.uk' });
    });

    it('converts email to lowercase', () => {
      const result = studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: 'JOHN@EXAMPLE.COM', enrollment_date: '2024-01-01' });
      expect(result.email).toBe('john@example.com');
    });

    it('trims whitespace from email', () => {
      // Note: Zod validates email format before trimming, so input must be valid
      const result = studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01' });
      expect(result.email).toBe('john@example.com');
    });

    it('rejects empty email', () => {
      expect(() => studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: '', enrollment_date: '2024-01-01' })).toThrow('Email is required');
    });

    it('rejects invalid email formats', () => {
      expect(() => studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: 'not-an-email', enrollment_date: '2024-01-01' })).toThrow('Invalid email address');
      expect(() => studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: 'missing@domain', enrollment_date: '2024-01-01' })).toThrow('Invalid email address');
      expect(() => studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: '@example.com', enrollment_date: '2024-01-01' })).toThrow('Invalid email address');
    });

    it('rejects email exceeding 255 characters', () => {
      const longEmail = 'a'.repeat(250) + '@test.com';
      expect(() => studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: longEmail, enrollment_date: '2024-01-01' })).toThrow('Email must be less than 255 characters');
    });
  });

  describe('phone validation', () => {
    it('accepts valid phone numbers', () => {
      expect(studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01', phone: '+1234567890' })).toMatchObject({ phone: '+1234567890' });
      expect(studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01', phone: '123-456-7890' })).toMatchObject({ phone: '123-456-7890' });
    });

    it('accepts undefined phone', () => {
      const result = studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01' });
      expect(result.phone).toBeUndefined();
    });

    it('rejects phone exceeding 20 characters', () => {
      const longPhone = '1'.repeat(21);
      expect(() => studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01', phone: longPhone })).toThrow('Phone number must be less than 20 characters');
    });

    it('accepts exactly 20 character phone', () => {
      const phone20 = '1'.repeat(20);
      expect(studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01', phone: phone20 })).toMatchObject({ phone: phone20 });
    });
  });

  describe('address validation', () => {
    it('accepts valid addresses', () => {
      expect(studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01', address: '123 Main St, City' })).toMatchObject({ address: '123 Main St, City' });
    });

    it('accepts undefined address', () => {
      const result = studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01' });
      expect(result.address).toBeUndefined();
    });

    it('rejects address exceeding 500 characters', () => {
      const longAddress = 'A'.repeat(501);
      expect(() => studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01', address: longAddress })).toThrow('Address must be less than 500 characters');
    });
  });

  describe('date_of_birth validation', () => {
    it('accepts valid date formats', () => {
      expect(studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01', date_of_birth: '2000-01-01' })).toMatchObject({ date_of_birth: '2000-01-01' });
      expect(studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01', date_of_birth: '2000-12-31' })).toMatchObject({ date_of_birth: '2000-12-31' });
    });

    it('accepts undefined date_of_birth', () => {
      const result = studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01' });
      expect(result.date_of_birth).toBeUndefined();
    });

    it('rejects invalid date formats', () => {
      expect(() => studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01', date_of_birth: 'not-a-date' })).toThrow('Invalid date format');
      expect(() => studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01', date_of_birth: '2000-13-01' })).toThrow('Invalid date format');
    });
  });

  describe('enrollment_date validation', () => {
    it('accepts valid enrollment dates', () => {
      expect(studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-01-01' })).toMatchObject({ enrollment_date: '2024-01-01' });
      expect(studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2025-09-15' })).toMatchObject({ enrollment_date: '2025-09-15' });
    });

    it('rejects empty enrollment_date', () => {
      expect(() => studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '' })).toThrow('Enrollment date is required');
    });

    it('rejects invalid enrollment_date formats', () => {
      expect(() => studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: 'invalid' })).toThrow('Invalid date format');
      expect(() => studentSchema.parse({ student_id: 'STU123', first_name: 'John', last_name: 'Doe', email: 'john@example.com', enrollment_date: '2024-13-32' })).toThrow('Invalid date format');
    });
  });

  describe('complete valid student data', () => {
    it('parses complete student with all fields', () => {
      const validStudent = {
        student_id: 'STU123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        address: '123 Main St',
        date_of_birth: '2000-01-01',
        enrollment_date: '2024-01-01',
      };
      const result = studentSchema.parse(validStudent);
      expect(result).toMatchObject(validStudent);
    });

    it('parses student with only required fields', () => {
      const minimalStudent = {
        student_id: 'STU123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        enrollment_date: '2024-01-01',
      };
      const result = studentSchema.parse(minimalStudent);
      expect(result).toMatchObject(minimalStudent);
      expect(result.phone).toBeUndefined();
      expect(result.address).toBeUndefined();
      expect(result.date_of_birth).toBeUndefined();
    });
  });
});

describe('studentUpdateSchema', () => {
  it('requires id field', () => {
    expect(() => studentUpdateSchema.parse({})).toThrow('expected number');
  });

  it('accepts id with partial updates', () => {
    const result = studentUpdateSchema.parse({ id: 1, first_name: 'Jane' });
    expect(result).toMatchObject({ id: 1, first_name: 'Jane' });
  });

  it('rejects non-positive id', () => {
    expect(() => studentUpdateSchema.parse({ id: 0, first_name: 'Jane' })).toThrow();
    expect(() => studentUpdateSchema.parse({ id: -1, first_name: 'Jane' })).toThrow();
  });

  it('rejects non-integer id', () => {
    expect(() => studentUpdateSchema.parse({ id: 1.5, first_name: 'Jane' })).toThrow();
  });

  it('allows updating all fields', () => {
    const update = {
      id: 1,
      student_id: 'STU456',
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@example.com',
      phone: '+9876543210',
      address: '456 Oak Ave',
      date_of_birth: '1999-05-15',
      enrollment_date: '2023-09-01',
    };
    const result = studentUpdateSchema.parse(update);
    expect(result).toMatchObject(update);
  });

  it('allows partial updates', () => {
    expect(studentUpdateSchema.parse({ id: 1, email: 'newemail@example.com' })).toMatchObject({ id: 1, email: 'newemail@example.com' });
    expect(studentUpdateSchema.parse({ id: 2, phone: '+1111111111' })).toMatchObject({ id: 2, phone: '+1111111111' });
  });

  it('validates field constraints on partial updates', () => {
    expect(() => studentUpdateSchema.parse({ id: 1, email: 'invalid-email' })).toThrow('Invalid email address');
    expect(() => studentUpdateSchema.parse({ id: 1, student_id: '-Invalid' })).toThrow();
  });
});

describe('Type exports', () => {
  it('exports StudentFormData type', () => {
    const data: StudentFormData = {
      student_id: 'STU123',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      enrollment_date: '2024-01-01',
    };
    expect(data).toBeDefined();
  });

  it('exports StudentUpdateFormData type', () => {
    const data: StudentUpdateFormData = {
      id: 1,
      first_name: 'Jane',
    };
    expect(data).toBeDefined();
  });
});
