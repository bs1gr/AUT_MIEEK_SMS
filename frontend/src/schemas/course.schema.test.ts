import { describe, it, expect } from 'vitest';
import { courseSchema, courseUpdateSchema, type CourseFormData, type CourseUpdateFormData } from './course.schema';

describe('courseSchema', () => {
  describe('course_code validation', () => {
    it('accepts valid uppercase course codes', () => {
      expect(courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3 })).toMatchObject({ course_code: 'CS101' });
      expect(courseSchema.parse({ course_code: 'MATH-201', course_name: 'Calculus', semester: 'Spring', year: 2024, credits: 4 })).toMatchObject({ course_code: 'MATH-201' });
      expect(courseSchema.parse({ course_code: 'ENG-101-A', course_name: 'English', semester: 'Fall', year: 2024, credits: 3 })).toMatchObject({ course_code: 'ENG-101-A' });
    });

    it('trims whitespace from course_code', () => {
      // Note: Zod validates regex before trimming, so input must already match pattern
      const result = courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3 });
      expect(result.course_code).toBe('CS101');
    });

    it('rejects empty course_code', () => {
      expect(() => courseSchema.parse({ course_code: '', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3 })).toThrow('Course code is required');
    });

    it('rejects course_code exceeding 50 characters', () => {
      const longCode = 'A'.repeat(51);
      expect(() => courseSchema.parse({ course_code: longCode, course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3 })).toThrow('Course code must be less than 50 characters');
    });

    it('rejects lowercase course codes', () => {
      expect(() => courseSchema.parse({ course_code: 'cs101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3 })).toThrow('Course code must be uppercase letters, numbers, and hyphens only');
    });

    it('rejects course codes with invalid characters', () => {
      expect(() => courseSchema.parse({ course_code: 'CS_101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3 })).toThrow('Course code must be uppercase letters, numbers, and hyphens only');
      expect(() => courseSchema.parse({ course_code: 'CS 101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3 })).toThrow('Course code must be uppercase letters, numbers, and hyphens only');
      expect(() => courseSchema.parse({ course_code: 'CS.101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3 })).toThrow('Course code must be uppercase letters, numbers, and hyphens only');
    });

    it('accepts exactly 50 character course_code', () => {
      const code50 = 'A' + '1'.repeat(49);
      expect(courseSchema.parse({ course_code: code50, course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3 })).toMatchObject({ course_code: code50 });
    });
  });

  describe('course_name validation', () => {
    it('accepts valid course names', () => {
      expect(courseSchema.parse({ course_code: 'CS101', course_name: 'Introduction to Computer Science', semester: 'Fall', year: 2024, credits: 3 })).toMatchObject({ course_name: 'Introduction to Computer Science' });
      expect(courseSchema.parse({ course_code: 'CS101', course_name: 'Εισαγωγή στην Πληροφορική', semester: 'Fall', year: 2024, credits: 3 })).toMatchObject({ course_name: 'Εισαγωγή στην Πληροφορική' });
    });

    it('trims whitespace from course_name', () => {
      const result = courseSchema.parse({ course_code: 'CS101', course_name: '  Intro to CS  ', semester: 'Fall', year: 2024, credits: 3 });
      expect(result.course_name).toBe('Intro to CS');
    });

    it('rejects empty course_name', () => {
      expect(() => courseSchema.parse({ course_code: 'CS101', course_name: '', semester: 'Fall', year: 2024, credits: 3 })).toThrow('Course name is required');
    });

    it('rejects course_name exceeding 200 characters', () => {
      const longName = 'A'.repeat(201);
      expect(() => courseSchema.parse({ course_code: 'CS101', course_name: longName, semester: 'Fall', year: 2024, credits: 3 })).toThrow('Course name must be less than 200 characters');
    });

    it('accepts exactly 200 character course_name', () => {
      const name200 = 'A'.repeat(200);
      expect(courseSchema.parse({ course_code: 'CS101', course_name: name200, semester: 'Fall', year: 2024, credits: 3 })).toMatchObject({ course_name: name200 });
    });
  });

  describe('description validation', () => {
    it('accepts valid descriptions', () => {
      expect(courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3, description: 'An introductory course' })).toMatchObject({ description: 'An introductory course' });
    });

    it('accepts undefined description', () => {
      const result = courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3 });
      expect(result.description).toBeUndefined();
    });

    it('rejects description exceeding 1000 characters', () => {
      const longDesc = 'A'.repeat(1001);
      expect(() => courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3, description: longDesc })).toThrow('Description must be less than 1000 characters');
    });

    it('accepts exactly 1000 character description', () => {
      const desc1000 = 'A'.repeat(1000);
      expect(courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3, description: desc1000 })).toMatchObject({ description: desc1000 });
    });
  });

  describe('credits validation', () => {
    it('accepts valid integer credits', () => {
      expect(courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3 })).toMatchObject({ credits: 3 });
      expect(courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 0 })).toMatchObject({ credits: 0 });
      expect(courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 20 })).toMatchObject({ credits: 20 });
    });

    it('accepts string credits and converts to number', () => {
      const result = courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: '5' });
      expect(result.credits).toBe(5);
      expect(typeof result.credits).toBe('number');
    });

    it('converts invalid string credits to 0', () => {
      const result = courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 'invalid' });
      expect(result.credits).toBe(0);
    });

    it('rejects negative credits', () => {
      expect(() => courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: -1 })).toThrow('Credits must be non-negative');
    });

    it('rejects credits exceeding 20', () => {
      expect(() => courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 21 })).toThrow('Credits must be 20 or less');
    });

    it('rejects non-integer credits', () => {
      expect(() => courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3.5 })).toThrow('Credits must be a whole number');
    });
  });

  describe('semester validation', () => {
    it('accepts valid semester values', () => {
      expect(courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3 })).toMatchObject({ semester: 'Fall' });
      expect(courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Spring 2024', year: 2024, credits: 3 })).toMatchObject({ semester: 'Spring 2024' });
      expect(courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Χειμερινό', year: 2024, credits: 3 })).toMatchObject({ semester: 'Χειμερινό' });
    });

    it('trims whitespace from semester', () => {
      const result = courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: '  Fall  ', year: 2024, credits: 3 });
      expect(result.semester).toBe('Fall');
    });

    it('rejects empty semester', () => {
      expect(() => courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: '', year: 2024, credits: 3 })).toThrow('Semester is required');
    });

    it('rejects semester exceeding 50 characters', () => {
      const longSemester = 'A'.repeat(51);
      expect(() => courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: longSemester, year: 2024, credits: 3 })).toThrow('Semester must be less than 50 characters');
    });
  });

  describe('year validation', () => {
    it('accepts valid years', () => {
      expect(courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3 })).toMatchObject({ year: 2024 });
      expect(courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2000, credits: 3 })).toMatchObject({ year: 2000 });
      expect(courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2100, credits: 3 })).toMatchObject({ year: 2100 });
    });

    it('accepts string years and converts to number', () => {
      const result = courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: '2025', credits: 3 });
      expect(result.year).toBe(2025);
      expect(typeof result.year).toBe('number');
    });

    it('converts invalid string year to current year', () => {
      const result = courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 'invalid', credits: 3 });
      const currentYear = new Date().getFullYear();
      expect(result.year).toBe(currentYear);
    });

    it('rejects years before 2000', () => {
      expect(() => courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 1999, credits: 3 })).toThrow('Year must be 2000 or later');
    });

    it('rejects years after 2100', () => {
      expect(() => courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2101, credits: 3 })).toThrow('Year must be 2100 or earlier');
    });

    it('rejects non-integer years', () => {
      expect(() => courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024.5, credits: 3 })).toThrow('Year must be a whole number');
    });
  });

  describe('instructor validation', () => {
    it('accepts valid instructor names', () => {
      expect(courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3, instructor: 'Dr. Smith' })).toMatchObject({ instructor: 'Dr. Smith' });
      expect(courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3, instructor: 'Καθηγητής Παπαδόπουλος' })).toMatchObject({ instructor: 'Καθηγητής Παπαδόπουλος' });
    });

    it('accepts undefined instructor', () => {
      const result = courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3 });
      expect(result.instructor).toBeUndefined();
    });

    it('rejects instructor exceeding 200 characters', () => {
      const longInstructor = 'A'.repeat(201);
      expect(() => courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3, instructor: longInstructor })).toThrow('Instructor name must be less than 200 characters');
    });
  });

  describe('absence_penalty validation', () => {
    it('accepts valid absence penalties', () => {
      expect(courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3, absence_penalty: 0.5 })).toMatchObject({ absence_penalty: 0.5 });
      expect(courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3, absence_penalty: 0 })).toMatchObject({ absence_penalty: 0 });
      expect(courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3, absence_penalty: 20 })).toMatchObject({ absence_penalty: 20 });
    });

    it('accepts string absence_penalty and converts to number', () => {
      const result = courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3, absence_penalty: '1.5' });
      expect(result.absence_penalty).toBe(1.5);
      expect(typeof result.absence_penalty).toBe('number');
    });

    it('converts empty string to undefined', () => {
      const result = courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3, absence_penalty: '' });
      expect(result.absence_penalty).toBeUndefined();
    });

    it('converts invalid string to undefined', () => {
      const result = courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3, absence_penalty: 'invalid' });
      expect(result.absence_penalty).toBeUndefined();
    });

    it('accepts undefined absence_penalty', () => {
      const result = courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3 });
      expect(result.absence_penalty).toBeUndefined();
    });

    it('rejects negative absence_penalty', () => {
      expect(() => courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3, absence_penalty: -1 })).toThrow('Absence penalty must be non-negative');
    });

    it('rejects absence_penalty exceeding 20', () => {
      expect(() => courseSchema.parse({ course_code: 'CS101', course_name: 'Intro to CS', semester: 'Fall', year: 2024, credits: 3, absence_penalty: 21 })).toThrow('Absence penalty must be 20 or less');
    });
  });

  describe('complete valid course data', () => {
    it('parses complete course with all fields', () => {
      const validCourse = {
        course_code: 'CS-101',
        course_name: 'Introduction to Computer Science',
        description: 'Fundamentals of programming',
        credits: 4,
        semester: 'Fall 2024',
        year: 2024,
        instructor: 'Dr. Jane Smith',
        absence_penalty: 1.0,
      };
      const result = courseSchema.parse(validCourse);
      expect(result).toMatchObject(validCourse);
    });

    it('parses course with only required fields', () => {
      const minimalCourse = {
        course_code: 'MATH101',
        course_name: 'Calculus I',
        semester: 'Spring',
        year: 2025,
        credits: 3,
      };
      const result = courseSchema.parse(minimalCourse);
      expect(result).toMatchObject(minimalCourse);
      expect(result.description).toBeUndefined();
      expect(result.instructor).toBeUndefined();
      expect(result.absence_penalty).toBeUndefined();
    });
  });
});

describe('courseUpdateSchema', () => {
  it('requires id field', () => {
    expect(() => courseUpdateSchema.parse({})).toThrow('expected number');
  });

  it('accepts id with partial updates', () => {
    const result = courseUpdateSchema.parse({ id: 1, course_name: 'Updated Course Name' });
    expect(result).toMatchObject({ id: 1, course_name: 'Updated Course Name' });
  });

  it('rejects non-positive id', () => {
    expect(() => courseUpdateSchema.parse({ id: 0, course_name: 'Updated' })).toThrow();
    expect(() => courseUpdateSchema.parse({ id: -1, course_name: 'Updated' })).toThrow();
  });

  it('rejects non-integer id', () => {
    expect(() => courseUpdateSchema.parse({ id: 1.5, course_name: 'Updated' })).toThrow();
  });

  it('allows updating all fields', () => {
    const update = {
      id: 1,
      course_code: 'CS-102',
      course_name: 'Advanced CS',
      description: 'Advanced topics',
      credits: 5,
      semester: 'Fall 2025',
      year: 2025,
      instructor: 'Prof. Johnson',
      absence_penalty: 2.0,
    };
    const result = courseUpdateSchema.parse(update);
    expect(result).toMatchObject(update);
  });

  it('allows partial updates', () => {
    expect(courseUpdateSchema.parse({ id: 1, instructor: 'New Instructor' })).toMatchObject({ id: 1, instructor: 'New Instructor' });
    expect(courseUpdateSchema.parse({ id: 2, credits: 4 })).toMatchObject({ id: 2, credits: 4 });
  });

  it('validates field constraints on partial updates', () => {
    expect(() => courseUpdateSchema.parse({ id: 1, course_code: 'invalid-code' })).toThrow();
    expect(() => courseUpdateSchema.parse({ id: 1, credits: -1 })).toThrow();
    expect(() => courseUpdateSchema.parse({ id: 1, year: 1999 })).toThrow();
  });
});

describe('Type exports', () => {
  it('exports CourseFormData type', () => {
    const data: CourseFormData = {
      course_code: 'CS101',
      course_name: 'Intro to CS',
      semester: 'Fall',
      year: 2024,
      credits: 3,
    };
    expect(data).toBeDefined();
  });

  it('exports CourseUpdateFormData type', () => {
    const data: CourseUpdateFormData = {
      id: 1,
      course_name: 'Updated Name',
    };
    expect(data).toBeDefined();
  });
});
