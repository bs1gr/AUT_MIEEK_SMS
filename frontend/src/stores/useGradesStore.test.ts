import { describe, it, expect, beforeEach } from 'vitest';
import { useGradesStore } from './useGradesStore';
import type { Grade } from '@/types';

const sampleGrade1: Grade = {
  id: 1,
  student_id: 1,
  course_id: 1,
  assignment_name: 'Midterm Exam',
  category: 'exam',
  grade: 85.5,
  max_grade: 100,
  weight: 30,
  date_assigned: '2024-01-15',
};

const sampleGrade2: Grade = {
  id: 2,
  student_id: 1,
  course_id: 1,
  assignment_name: 'Final Exam',
  category: 'exam',
  grade: 92.0,
  max_grade: 100,
  weight: 40,
  date_assigned: '2024-03-20',
};

const sampleGrade3: Grade = {
  id: 3,
  student_id: 2,
  course_id: 2,
  assignment_name: 'Course Project',
  category: 'project',
  grade: 78.0,
  max_grade: 100,
  weight: 50,
  date_assigned: '2024-02-10',
};

describe('useGradesStore', () => {
  beforeEach(() => {
    const { setGrades, setLoading, setError } = useGradesStore.getState();
    setGrades([]);
    setLoading(false);
    setError(null);
  });

  describe('Initial state', () => {
    it('starts with empty grades array', () => {
      const { grades } = useGradesStore.getState();
      expect(grades).toEqual([]);
    });

    it('starts with loading false', () => {
      const { isLoading } = useGradesStore.getState();
      expect(isLoading).toBe(false);
    });

    it('starts with no error', () => {
      const { error } = useGradesStore.getState();
      expect(error).toBeNull();
    });
  });

  describe('setGrades', () => {
    it('sets grades array', () => {
      const { setGrades } = useGradesStore.getState();
      setGrades([sampleGrade1, sampleGrade2]);
      const { grades } = useGradesStore.getState();
      expect(grades).toHaveLength(2);
      expect(grades[0].id).toBe(1);
      expect(grades[1].id).toBe(2);
    });

    it('clears error when setting grades', () => {
      const { setError, setGrades } = useGradesStore.getState();
      setError('Previous error');
      setGrades([sampleGrade1]);
      const { error } = useGradesStore.getState();
      expect(error).toBeNull();
    });

    it('replaces existing grades', () => {
      const { setGrades } = useGradesStore.getState();
      setGrades([sampleGrade1]);
      setGrades([sampleGrade2]);
      const { grades } = useGradesStore.getState();
      expect(grades).toHaveLength(1);
      expect(grades[0].id).toBe(2);
    });
  });

  describe('addGrade', () => {
    it('adds a grade to empty array', () => {
      const { addGrade } = useGradesStore.getState();
      addGrade(sampleGrade1);
      const { grades } = useGradesStore.getState();
      expect(grades).toHaveLength(1);
      expect(grades[0].id).toBe(1);
    });

    it('appends grade to existing grades', () => {
      const { setGrades, addGrade } = useGradesStore.getState();
      setGrades([sampleGrade1]);
      addGrade(sampleGrade2);
      const { grades } = useGradesStore.getState();
      expect(grades).toHaveLength(2);
      expect(grades[1].id).toBe(2);
    });

    it('clears error when adding grade', () => {
      const { setError, addGrade } = useGradesStore.getState();
      setError('Add error');
      addGrade(sampleGrade1);
      const { error } = useGradesStore.getState();
      expect(error).toBeNull();
    });

    it('does not mutate original array', () => {
      const { setGrades, addGrade } = useGradesStore.getState();
      setGrades([sampleGrade1]);
      const { grades: before } = useGradesStore.getState();
      addGrade(sampleGrade2);
      expect(before).toHaveLength(1);
    });
  });

  describe('updateGrade', () => {
    beforeEach(() => {
      const { setGrades } = useGradesStore.getState();
      setGrades([sampleGrade1, sampleGrade2]);
    });

    it('updates grade by id', () => {
      const { updateGrade } = useGradesStore.getState();
      updateGrade(1, { grade: 90.0 });
      const { grades } = useGradesStore.getState();
      expect(grades[0].grade).toBe(90.0);
      expect(grades[0].max_grade).toBe(100); // Other fields unchanged
    });

    it('updates multiple fields', () => {
      const { updateGrade } = useGradesStore.getState();
      updateGrade(2, { grade: 95.0, weight: 50 });
      const { grades } = useGradesStore.getState();
      const updated = grades.find(g => g.id === 2);
      expect(updated?.grade).toBe(95.0);
      expect(updated?.weight).toBe(50);
    });

    it('does not affect other grades', () => {
      const { updateGrade } = useGradesStore.getState();
      updateGrade(1, { grade: 100 });
      const { grades } = useGradesStore.getState();
      expect(grades[1].grade).toBe(92.0);
    });

    it('clears error on update', () => {
      const { setError, updateGrade } = useGradesStore.getState();
      setError('Update error');
      updateGrade(1, { grade: 88.0 });
      const { error } = useGradesStore.getState();
      expect(error).toBeNull();
    });

    it('handles update of non-existent grade gracefully', () => {
      const { updateGrade } = useGradesStore.getState();
      updateGrade(999, { grade: 100 });
      const { grades } = useGradesStore.getState();
      expect(grades).toHaveLength(2);
    });
  });

  describe('deleteGrade', () => {
    beforeEach(() => {
      const { setGrades } = useGradesStore.getState();
      setGrades([sampleGrade1, sampleGrade2]);
    });

    it('removes grade by id', () => {
      const { deleteGrade } = useGradesStore.getState();
      deleteGrade(1);
      const { grades } = useGradesStore.getState();
      expect(grades).toHaveLength(1);
      expect(grades[0].id).toBe(2);
    });

    it('clears error on delete', () => {
      const { setError, deleteGrade } = useGradesStore.getState();
      setError('Delete error');
      deleteGrade(1);
      const { error } = useGradesStore.getState();
      expect(error).toBeNull();
    });

    it('handles delete of non-existent grade', () => {
      const { deleteGrade } = useGradesStore.getState();
      deleteGrade(999);
      const { grades } = useGradesStore.getState();
      expect(grades).toHaveLength(2);
    });
  });

  describe('bulkAddGrades', () => {
    it('adds multiple grades to empty array', () => {
      const { bulkAddGrades } = useGradesStore.getState();
      bulkAddGrades([sampleGrade1, sampleGrade2]);
      const { grades } = useGradesStore.getState();
      expect(grades).toHaveLength(2);
    });

    it('appends multiple grades to existing grades', () => {
      const { setGrades, bulkAddGrades } = useGradesStore.getState();
      setGrades([sampleGrade1]);
      bulkAddGrades([sampleGrade2, sampleGrade3]);
      const { grades } = useGradesStore.getState();
      expect(grades).toHaveLength(3);
      expect(grades[1].id).toBe(2);
      expect(grades[2].id).toBe(3);
    });

    it('clears error when bulk adding grades', () => {
      const { setError, bulkAddGrades } = useGradesStore.getState();
      setError('Bulk add error');
      bulkAddGrades([sampleGrade1]);
      const { error } = useGradesStore.getState();
      expect(error).toBeNull();
    });

    it('handles empty array', () => {
      const { setGrades, bulkAddGrades } = useGradesStore.getState();
      setGrades([sampleGrade1]);
      bulkAddGrades([]);
      const { grades } = useGradesStore.getState();
      expect(grades).toHaveLength(1);
    });

    it('does not mutate original array', () => {
      const { setGrades, bulkAddGrades } = useGradesStore.getState();
      setGrades([sampleGrade1]);
      const { grades: before } = useGradesStore.getState();
      bulkAddGrades([sampleGrade2]);
      expect(before).toHaveLength(1);
    });
  });

  describe('Loading state', () => {
    it('sets loading to true', () => {
      const { setLoading } = useGradesStore.getState();
      setLoading(true);
      const { isLoading } = useGradesStore.getState();
      expect(isLoading).toBe(true);
    });

    it('sets loading to false', () => {
      const { setLoading } = useGradesStore.getState();
      setLoading(true);
      setLoading(false);
      const { isLoading } = useGradesStore.getState();
      expect(isLoading).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('sets error message', () => {
      const { setError } = useGradesStore.getState();
      setError('Network failure');
      const { error } = useGradesStore.getState();
      expect(error).toBe('Network failure');
    });

    it('clears error with clearError', () => {
      const { setError, clearError } = useGradesStore.getState();
      setError('Some error');
      clearError();
      const { error } = useGradesStore.getState();
      expect(error).toBeNull();
    });

    it('allows setting error to null', () => {
      const { setError } = useGradesStore.getState();
      setError('Error');
      setError(null);
      const { error } = useGradesStore.getState();
      expect(error).toBeNull();
    });
  });

  describe('Complex scenarios', () => {
    it('handles full CRUD lifecycle', () => {
      const { setGrades, addGrade, updateGrade, deleteGrade } = useGradesStore.getState();
      
      setGrades([sampleGrade1]);
      expect(useGradesStore.getState().grades).toHaveLength(1);
      
      addGrade(sampleGrade2);
      expect(useGradesStore.getState().grades).toHaveLength(2);
      
      updateGrade(1, { grade: 87.5 });
      expect(useGradesStore.getState().grades[0].grade).toBe(87.5);
      
      deleteGrade(2);
      expect(useGradesStore.getState().grades).toHaveLength(1);
      expect(useGradesStore.getState().grades[0].id).toBe(1);
    });

    it('combines individual and bulk operations', () => {
      const { addGrade, bulkAddGrades } = useGradesStore.getState();
      
      addGrade(sampleGrade1);
      expect(useGradesStore.getState().grades).toHaveLength(1);
      
      bulkAddGrades([sampleGrade2, sampleGrade3]);
      expect(useGradesStore.getState().grades).toHaveLength(3);
    });

    it('maintains error state across operations when not explicitly cleared', () => {
      const { setError, setLoading } = useGradesStore.getState();
      setError('Persistent error');
      setLoading(true);
      const { error } = useGradesStore.getState();
      expect(error).toBe('Persistent error');
    });

    it('handles grade updates for specific student/course', () => {
      const { setGrades, updateGrade } = useGradesStore.getState();
      setGrades([sampleGrade1, sampleGrade2, sampleGrade3]);
      
      // Update only grades for student 1, course 1
      const toUpdate = useGradesStore.getState().grades
        .filter(g => g.student_id === 1 && g.course_id === 1);
      
      expect(toUpdate).toHaveLength(2);
      updateGrade(toUpdate[0].id, { grade: 90 });
      
      const updated = useGradesStore.getState().grades.find(g => g.id === toUpdate[0].id);
      expect(updated?.grade).toBe(90);
    });
  });
});
