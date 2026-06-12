import { describe, it, expect } from 'vitest';
import { gradeSchema, gradeUpdateSchema, type GradeFormData, type GradeUpdateFormData } from './grade.schema';

describe('gradeSchema', () => {
  const validGradeBase = {
    student_id: 1,
    course_id: 1,
    component_type: 'Final Exam',
    grade: 18,
    max_grade: 20,
    weight: 40,
  };

  describe('student_id validation', () => {
    it('accepts valid integer student_id', () => {
      expect(gradeSchema.parse(validGradeBase)).toMatchObject({ student_id: 1 });
      expect(gradeSchema.parse({ ...validGradeBase, student_id: 100 })).toMatchObject({ student_id: 100 });
    });

    it('accepts string student_id and converts to number', () => {
      const result = gradeSchema.parse({ ...validGradeBase, student_id: '5' });
      expect(result.student_id).toBe(5);
      expect(typeof result.student_id).toBe('number');
    });

    it('rejects zero student_id', () => {
      expect(() => gradeSchema.parse({ ...validGradeBase, student_id: 0 })).toThrow('Student ID must be positive');
    });

    it('rejects negative student_id', () => {
      expect(() => gradeSchema.parse({ ...validGradeBase, student_id: -1 })).toThrow('Student ID must be positive');
    });

    it('rejects non-integer student_id', () => {
      expect(() => gradeSchema.parse({ ...validGradeBase, student_id: 1.5 })).toThrow('Student ID must be a whole number');
    });

    it('rejects invalid string student_id', () => {
      expect(() => gradeSchema.parse({ ...validGradeBase, student_id: 'invalid' })).toThrow('Invalid student ID');
    });
  });

  describe('course_id validation', () => {
    it('accepts valid integer course_id', () => {
      expect(gradeSchema.parse(validGradeBase)).toMatchObject({ course_id: 1 });
      expect(gradeSchema.parse({ ...validGradeBase, course_id: 50 })).toMatchObject({ course_id: 50 });
    });

    it('accepts string course_id and converts to number', () => {
      const result = gradeSchema.parse({ ...validGradeBase, course_id: '10' });
      expect(result.course_id).toBe(10);
      expect(typeof result.course_id).toBe('number');
    });

    it('rejects zero course_id', () => {
      expect(() => gradeSchema.parse({ ...validGradeBase, course_id: 0 })).toThrow('Course ID must be positive');
    });

    it('rejects negative course_id', () => {
      expect(() => gradeSchema.parse({ ...validGradeBase, course_id: -1 })).toThrow('Course ID must be positive');
    });

    it('rejects non-integer course_id', () => {
      expect(() => gradeSchema.parse({ ...validGradeBase, course_id: 1.5 })).toThrow('Course ID must be a whole number');
    });

    it('rejects invalid string course_id', () => {
      expect(() => gradeSchema.parse({ ...validGradeBase, course_id: 'invalid' })).toThrow('Invalid course ID');
    });
  });

  describe('component_type validation', () => {
    it('accepts valid component types', () => {
      expect(gradeSchema.parse(validGradeBase)).toMatchObject({ component_type: 'Final Exam' });
      expect(gradeSchema.parse({ ...validGradeBase, component_type: 'Midterm' })).toMatchObject({ component_type: 'Midterm' });
      expect(gradeSchema.parse({ ...validGradeBase, component_type: 'Τελική Εξέταση' })).toMatchObject({ component_type: 'Τελική Εξέταση' });
    });

    it('trims whitespace from component_type', () => {
      const result = gradeSchema.parse({ ...validGradeBase, component_type: '  Final Exam  ' });
      expect(result.component_type).toBe('Final Exam');
    });

    it('rejects empty component_type', () => {
      expect(() => gradeSchema.parse({ ...validGradeBase, component_type: '' })).toThrow('Component type is required');
    });

    it('rejects component_type exceeding 100 characters', () => {
      const longType = 'A'.repeat(101);
      expect(() => gradeSchema.parse({ ...validGradeBase, component_type: longType })).toThrow('Component type must be less than 100 characters');
    });

    it('accepts exactly 100 character component_type', () => {
      const type100 = 'A'.repeat(100);
      expect(gradeSchema.parse({ ...validGradeBase, component_type: type100 })).toMatchObject({ component_type: type100 });
    });
  });

  describe('grade validation', () => {
    it('accepts valid grades', () => {
      expect(gradeSchema.parse(validGradeBase)).toMatchObject({ grade: 18 });
      expect(gradeSchema.parse({ ...validGradeBase, grade: 0 })).toMatchObject({ grade: 0 });
      expect(gradeSchema.parse({ ...validGradeBase, grade: 20 })).toMatchObject({ grade: 20 });
      expect(gradeSchema.parse({ ...validGradeBase, grade: 15.5 })).toMatchObject({ grade: 15.5 });
    });

    it('accepts string grade and converts to number', () => {
      const result = gradeSchema.parse({ ...validGradeBase, grade: '17.5' });
      expect(result.grade).toBe(17.5);
      expect(typeof result.grade).toBe('number');
    });

    it('rejects negative grades', () => {
      expect(() => gradeSchema.parse({ ...validGradeBase, grade: -1 })).toThrow('Grade must be non-negative');
    });

    it('rejects grades exceeding 20', () => {
      expect(() => gradeSchema.parse({ ...validGradeBase, grade: 21 })).toThrow('Grade must be 20 or less');
    });

    it('rejects invalid string grade', () => {
      expect(() => gradeSchema.parse({ ...validGradeBase, grade: 'invalid' })).toThrow('Invalid grade');
    });
  });

  describe('max_grade validation', () => {
    it('accepts valid max_grades', () => {
      expect(gradeSchema.parse(validGradeBase)).toMatchObject({ max_grade: 20 });
      expect(gradeSchema.parse({ ...validGradeBase, grade: 10, max_grade: 10 })).toMatchObject({ max_grade: 10 });
      expect(gradeSchema.parse({ ...validGradeBase, grade: 5, max_grade: 5 })).toMatchObject({ max_grade: 5 });
    });

    it('accepts string max_grade and converts to number', () => {
      const result = gradeSchema.parse({ ...validGradeBase, max_grade: '20' });
      expect(result.max_grade).toBe(20);
      expect(typeof result.max_grade).toBe('number');
    });

    it('rejects zero max_grade', () => {
      expect(() => gradeSchema.parse({ ...validGradeBase, max_grade: 0 })).toThrow('Max grade must be positive');
    });

    it('rejects negative max_grade', () => {
      expect(() => gradeSchema.parse({ ...validGradeBase, max_grade: -1 })).toThrow('Max grade must be positive');
    });

    it('rejects max_grade exceeding 20', () => {
      expect(() => gradeSchema.parse({ ...validGradeBase, max_grade: 21 })).toThrow('Max grade must be 20 or less');
    });

    it('rejects invalid string max_grade', () => {
      expect(() => gradeSchema.parse({ ...validGradeBase, max_grade: 'invalid' })).toThrow('Invalid max grade');
    });
  });

  describe('grade vs max_grade validation', () => {
    it('accepts grade equal to max_grade', () => {
      expect(gradeSchema.parse({ ...validGradeBase, grade: 20, max_grade: 20 })).toMatchObject({ grade: 20, max_grade: 20 });
    });

    it('accepts grade less than max_grade', () => {
      expect(gradeSchema.parse({ ...validGradeBase, grade: 15, max_grade: 20 })).toMatchObject({ grade: 15, max_grade: 20 });
    });

    it('rejects grade exceeding max_grade', () => {
      expect(() => gradeSchema.parse({ ...validGradeBase, grade: 21, max_grade: 20 })).toThrow('Grade cannot exceed max grade');
      expect(() => gradeSchema.parse({ ...validGradeBase, grade: 15, max_grade: 10 })).toThrow('Grade cannot exceed max grade');
    });
  });

  describe('weight validation', () => {
    it('accepts valid weights', () => {
      expect(gradeSchema.parse(validGradeBase)).toMatchObject({ weight: 40 });
      expect(gradeSchema.parse({ ...validGradeBase, weight: 0 })).toMatchObject({ weight: 0 });
      expect(gradeSchema.parse({ ...validGradeBase, weight: 100 })).toMatchObject({ weight: 100 });
      expect(gradeSchema.parse({ ...validGradeBase, weight: 33.33 })).toMatchObject({ weight: 33.33 });
    });

    it('accepts string weight and converts to number', () => {
      const result = gradeSchema.parse({ ...validGradeBase, weight: '50.5' });
      expect(result.weight).toBe(50.5);
      expect(typeof result.weight).toBe('number');
    });

    it('rejects negative weight', () => {
      expect(() => gradeSchema.parse({ ...validGradeBase, weight: -1 })).toThrow('Weight must be non-negative');
    });

    it('rejects weight exceeding 100', () => {
      expect(() => gradeSchema.parse({ ...validGradeBase, weight: 101 })).toThrow('Weight must be 100 or less');
    });

    it('rejects invalid string weight', () => {
      expect(() => gradeSchema.parse({ ...validGradeBase, weight: 'invalid' })).toThrow('Invalid weight');
    });
  });

  describe('date_assigned validation', () => {
    it('accepts valid date_assigned', () => {
      expect(gradeSchema.parse({ ...validGradeBase, date_assigned: '2024-01-01' })).toMatchObject({ date_assigned: '2024-01-01' });
      expect(gradeSchema.parse({ ...validGradeBase, date_assigned: '2025-12-31' })).toMatchObject({ date_assigned: '2025-12-31' });
    });

    it('accepts undefined date_assigned', () => {
      const result = gradeSchema.parse(validGradeBase);
      expect(result.date_assigned).toBeUndefined();
    });

    it('converts empty string to undefined', () => {
      const result = gradeSchema.parse({ ...validGradeBase, date_assigned: '' });
      expect(result.date_assigned).toBeUndefined();
    });

    it('rejects invalid date formats', () => {
      expect(() => gradeSchema.parse({ ...validGradeBase, date_assigned: 'invalid-date' })).toThrow('Invalid date format');
      expect(() => gradeSchema.parse({ ...validGradeBase, date_assigned: '2024-13-01' })).toThrow('Invalid date format');
    });
  });

  describe('date_submitted validation', () => {
    it('accepts valid date_submitted', () => {
      expect(gradeSchema.parse({ ...validGradeBase, date_submitted: '2024-02-01' })).toMatchObject({ date_submitted: '2024-02-01' });
      expect(gradeSchema.parse({ ...validGradeBase, date_submitted: '2025-11-30' })).toMatchObject({ date_submitted: '2025-11-30' });
    });

    it('accepts undefined date_submitted', () => {
      const result = gradeSchema.parse(validGradeBase);
      expect(result.date_submitted).toBeUndefined();
    });

    it('converts empty string to undefined', () => {
      const result = gradeSchema.parse({ ...validGradeBase, date_submitted: '' });
      expect(result.date_submitted).toBeUndefined();
    });

    it('rejects invalid date formats', () => {
      expect(() => gradeSchema.parse({ ...validGradeBase, date_submitted: 'not-a-date' })).toThrow('Invalid date format');
      expect(() => gradeSchema.parse({ ...validGradeBase, date_submitted: '2024-00-01' })).toThrow('Invalid date format');
    });
  });

  describe('notes validation', () => {
    it('accepts valid notes', () => {
      expect(gradeSchema.parse({ ...validGradeBase, notes: 'Great work!' })).toMatchObject({ notes: 'Great work!' });
      expect(gradeSchema.parse({ ...validGradeBase, notes: 'Εξαιρετική δουλειά' })).toMatchObject({ notes: 'Εξαιρετική δουλειά' });
    });

    it('accepts undefined notes', () => {
      const result = gradeSchema.parse(validGradeBase);
      expect(result.notes).toBeUndefined();
    });

    it('converts empty string to undefined', () => {
      const result = gradeSchema.parse({ ...validGradeBase, notes: '' });
      expect(result.notes).toBeUndefined();
    });

    it('rejects notes exceeding 500 characters', () => {
      const longNotes = 'A'.repeat(501);
      expect(() => gradeSchema.parse({ ...validGradeBase, notes: longNotes })).toThrow('Notes must be less than 500 characters');
    });

    it('accepts exactly 500 character notes', () => {
      const notes500 = 'A'.repeat(500);
      expect(gradeSchema.parse({ ...validGradeBase, notes: notes500 })).toMatchObject({ notes: notes500 });
    });
  });

  describe('complete valid grade data', () => {
    it('parses complete grade with all fields', () => {
      const validGrade = {
        student_id: 1,
        course_id: 2,
        component_type: 'Final Exam',
        grade: 18.5,
        max_grade: 20,
        weight: 40,
        date_assigned: '2024-01-15',
        date_submitted: '2024-02-01',
        notes: 'Excellent performance',
      };
      const result = gradeSchema.parse(validGrade);
      expect(result).toMatchObject(validGrade);
    });

    it('parses grade with only required fields', () => {
      const minimalGrade = {
        student_id: 1,
        course_id: 1,
        component_type: 'Midterm',
        grade: 15,
        max_grade: 20,
        weight: 30,
      };
      const result = gradeSchema.parse(minimalGrade);
      expect(result).toMatchObject(minimalGrade);
      expect(result.date_assigned).toBeUndefined();
      expect(result.date_submitted).toBeUndefined();
      expect(result.notes).toBeUndefined();
    });
  });
});

describe('gradeUpdateSchema', () => {
  it('requires id field', () => {
    expect(() => gradeUpdateSchema.parse({})).toThrow('expected number');
  });

  it('accepts id with partial updates', () => {
    const result = gradeUpdateSchema.parse({ id: 1, grade: 19 });
    expect(result).toMatchObject({ id: 1, grade: 19 });
  });

  it('rejects non-positive id', () => {
    expect(() => gradeUpdateSchema.parse({ id: 0, grade: 15 })).toThrow();
    expect(() => gradeUpdateSchema.parse({ id: -1, grade: 15 })).toThrow();
  });

  it('rejects non-integer id', () => {
    expect(() => gradeUpdateSchema.parse({ id: 1.5, grade: 15 })).toThrow();
  });

  it('allows updating all fields', () => {
    const update = {
      id: 1,
      student_id: 2,
      course_id: 3,
      component_type: 'Project',
      grade: 19,
      max_grade: 20,
      weight: 60,
      date_assigned: '2024-03-01',
      date_submitted: '2024-03-15',
      notes: 'Updated notes',
    };
    const result = gradeUpdateSchema.parse(update);
    expect(result).toMatchObject(update);
  });

  it('allows partial updates', () => {
    expect(gradeUpdateSchema.parse({ id: 1, grade: 17 })).toMatchObject({ id: 1, grade: 17 });
    expect(gradeUpdateSchema.parse({ id: 2, notes: 'New notes' })).toMatchObject({ id: 2, notes: 'New notes' });
  });

  it('validates field constraints on partial updates', () => {
    expect(() => gradeUpdateSchema.parse({ id: 1, grade: -1 })).toThrow();
    expect(() => gradeUpdateSchema.parse({ id: 1, max_grade: 0 })).toThrow();
    expect(() => gradeUpdateSchema.parse({ id: 1, weight: 101 })).toThrow();
  });

  // Note: The grade vs max_grade refinement doesn't work reliably on partial updates
  // because .partial() makes all fields optional, and the refinement needs both values
});

describe('Type exports', () => {
  it('exports GradeFormData type', () => {
    const data: GradeFormData = {
      student_id: 1,
      course_id: 1,
      component_type: 'Final Exam',
      grade: 18,
      max_grade: 20,
      weight: 40,
      date_assigned: undefined,
      date_submitted: undefined,
      notes: undefined,
    };
    expect(data).toBeDefined();
  });

  it('exports GradeUpdateFormData type', () => {
    const data: GradeUpdateFormData = {
      id: 1,
      grade: 19,
    };
    expect(data).toBeDefined();
  });
});
