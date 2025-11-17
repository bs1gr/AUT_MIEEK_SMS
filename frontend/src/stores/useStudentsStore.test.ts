import { describe, it, expect, beforeEach } from 'vitest';
import { useStudentsStore } from './useStudentsStore';
import type { Student } from '@/types';

const sampleStudent1: Student = {
  id: 1,
  first_name: 'Alice',
  last_name: 'Anderson',
  email: 'alice@example.com',
  student_id: 'STU001',
  enrollment_date: '2024-01-10',
  is_active: true,
};

const sampleStudent2: Student = {
  id: 2,
  first_name: 'Bob',
  last_name: 'Brown',
  email: 'bob@example.com',
  student_id: 'STU002',
  enrollment_date: '2024-01-15',
  is_active: false,
};

describe('useStudentsStore', () => {
  beforeEach(() => {
    const { setStudents, selectStudent, setLoading, setError } = useStudentsStore.getState();
    setStudents([]);
    selectStudent(null);
    setLoading(false);
    setError(null);
  });

  describe('Initial state', () => {
    it('starts with empty students array', () => {
      const { students } = useStudentsStore.getState();
      expect(students).toEqual([]);
    });

    it('starts with no selected student', () => {
      const { selectedStudent } = useStudentsStore.getState();
      expect(selectedStudent).toBeNull();
    });

    it('starts with loading false', () => {
      const { isLoading } = useStudentsStore.getState();
      expect(isLoading).toBe(false);
    });

    it('starts with no error', () => {
      const { error } = useStudentsStore.getState();
      expect(error).toBeNull();
    });
  });

  describe('setStudents', () => {
    it('sets students array', () => {
      const { setStudents } = useStudentsStore.getState();
      setStudents([sampleStudent1, sampleStudent2]);
      const { students } = useStudentsStore.getState();
      expect(students).toHaveLength(2);
      expect(students[0].id).toBe(1);
      expect(students[1].id).toBe(2);
    });

    it('clears error when setting students', () => {
      const { setError, setStudents } = useStudentsStore.getState();
      setError('Previous error');
      setStudents([sampleStudent1]);
      const { error } = useStudentsStore.getState();
      expect(error).toBeNull();
    });

    it('replaces existing students', () => {
      const { setStudents } = useStudentsStore.getState();
      setStudents([sampleStudent1]);
      setStudents([sampleStudent2]);
      const { students } = useStudentsStore.getState();
      expect(students).toHaveLength(1);
      expect(students[0].id).toBe(2);
    });
  });

  describe('addStudent', () => {
    it('adds a student to empty array', () => {
      const { addStudent } = useStudentsStore.getState();
      addStudent(sampleStudent1);
      const { students } = useStudentsStore.getState();
      expect(students).toHaveLength(1);
      expect(students[0].id).toBe(1);
    });

    it('appends student to existing students', () => {
      const { setStudents, addStudent } = useStudentsStore.getState();
      setStudents([sampleStudent1]);
      addStudent(sampleStudent2);
      const { students } = useStudentsStore.getState();
      expect(students).toHaveLength(2);
      expect(students[1].id).toBe(2);
    });

    it('clears error when adding student', () => {
      const { setError, addStudent } = useStudentsStore.getState();
      setError('Add error');
      addStudent(sampleStudent1);
      const { error } = useStudentsStore.getState();
      expect(error).toBeNull();
    });

    it('does not mutate original array', () => {
      const { setStudents, addStudent } = useStudentsStore.getState();
      setStudents([sampleStudent1]);
      const { students: before } = useStudentsStore.getState();
      addStudent(sampleStudent2);
      expect(before).toHaveLength(1);
    });
  });

  describe('updateStudent', () => {
    beforeEach(() => {
      const { setStudents } = useStudentsStore.getState();
      setStudents([sampleStudent1, sampleStudent2]);
    });

    it('updates student by id', () => {
      const { updateStudent } = useStudentsStore.getState();
      updateStudent(1, { first_name: 'Alicia' });
      const { students } = useStudentsStore.getState();
      expect(students[0].first_name).toBe('Alicia');
      expect(students[0].last_name).toBe('Anderson');
    });

    it('updates multiple fields', () => {
      const { updateStudent } = useStudentsStore.getState();
      updateStudent(2, { first_name: 'Bobby', email: 'bobby@example.com' });
      const { students } = useStudentsStore.getState();
      const updated = students.find(s => s.id === 2);
      expect(updated?.first_name).toBe('Bobby');
      expect(updated?.email).toBe('bobby@example.com');
    });

    it('does not affect other students', () => {
      const { updateStudent } = useStudentsStore.getState();
      updateStudent(1, { first_name: 'Changed' });
      const { students } = useStudentsStore.getState();
      expect(students[1].first_name).toBe('Bob');
    });

    it('updates selectedStudent if it matches the updated id', () => {
      const { selectStudent, updateStudent } = useStudentsStore.getState();
      selectStudent(sampleStudent1);
      updateStudent(1, { first_name: 'Selected Updated' });
      const { selectedStudent } = useStudentsStore.getState();
      expect(selectedStudent?.first_name).toBe('Selected Updated');
    });

    it('does not update selectedStudent if different id', () => {
      const { selectStudent, updateStudent } = useStudentsStore.getState();
      selectStudent(sampleStudent1);
      updateStudent(2, { first_name: 'Other Updated' });
      const { selectedStudent } = useStudentsStore.getState();
      expect(selectedStudent?.first_name).toBe('Alice');
    });

    it('clears error on update', () => {
      const { setError, updateStudent } = useStudentsStore.getState();
      setError('Update error');
      updateStudent(1, { email: 'new@example.com' });
      const { error } = useStudentsStore.getState();
      expect(error).toBeNull();
    });

    it('handles update of non-existent student gracefully', () => {
      const { updateStudent } = useStudentsStore.getState();
      updateStudent(999, { first_name: 'Ghost' });
      const { students } = useStudentsStore.getState();
      expect(students).toHaveLength(2);
    });
  });

  describe('deleteStudent', () => {
    beforeEach(() => {
      const { setStudents } = useStudentsStore.getState();
      setStudents([sampleStudent1, sampleStudent2]);
    });

    it('removes student by id', () => {
      const { deleteStudent } = useStudentsStore.getState();
      deleteStudent(1);
      const { students } = useStudentsStore.getState();
      expect(students).toHaveLength(1);
      expect(students[0].id).toBe(2);
    });

    it('clears selectedStudent if deleted', () => {
      const { selectStudent, deleteStudent } = useStudentsStore.getState();
      selectStudent(sampleStudent1);
      deleteStudent(1);
      const { selectedStudent } = useStudentsStore.getState();
      expect(selectedStudent).toBeNull();
    });

    it('preserves selectedStudent if different id deleted', () => {
      const { selectStudent, deleteStudent } = useStudentsStore.getState();
      selectStudent(sampleStudent1);
      deleteStudent(2);
      const { selectedStudent } = useStudentsStore.getState();
      expect(selectedStudent?.id).toBe(1);
    });

    it('clears error on delete', () => {
      const { setError, deleteStudent } = useStudentsStore.getState();
      setError('Delete error');
      deleteStudent(1);
      const { error } = useStudentsStore.getState();
      expect(error).toBeNull();
    });

    it('handles delete of non-existent student', () => {
      const { deleteStudent } = useStudentsStore.getState();
      deleteStudent(999);
      const { students } = useStudentsStore.getState();
      expect(students).toHaveLength(2);
    });
  });

  describe('selectStudent', () => {
    it('sets selectedStudent', () => {
      const { selectStudent } = useStudentsStore.getState();
      selectStudent(sampleStudent1);
      const { selectedStudent } = useStudentsStore.getState();
      expect(selectedStudent?.id).toBe(1);
    });

    it('can clear selection with null', () => {
      const { selectStudent } = useStudentsStore.getState();
      selectStudent(sampleStudent1);
      selectStudent(null);
      const { selectedStudent } = useStudentsStore.getState();
      expect(selectedStudent).toBeNull();
    });

    it('replaces previous selection', () => {
      const { selectStudent } = useStudentsStore.getState();
      selectStudent(sampleStudent1);
      selectStudent(sampleStudent2);
      const { selectedStudent } = useStudentsStore.getState();
      expect(selectedStudent?.id).toBe(2);
    });
  });

  describe('Loading state', () => {
    it('sets loading to true', () => {
      const { setLoading } = useStudentsStore.getState();
      setLoading(true);
      const { isLoading } = useStudentsStore.getState();
      expect(isLoading).toBe(true);
    });

    it('sets loading to false', () => {
      const { setLoading } = useStudentsStore.getState();
      setLoading(true);
      setLoading(false);
      const { isLoading } = useStudentsStore.getState();
      expect(isLoading).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('sets error message', () => {
      const { setError } = useStudentsStore.getState();
      setError('Network failure');
      const { error } = useStudentsStore.getState();
      expect(error).toBe('Network failure');
    });

    it('clears error with clearError', () => {
      const { setError, clearError } = useStudentsStore.getState();
      setError('Some error');
      clearError();
      const { error } = useStudentsStore.getState();
      expect(error).toBeNull();
    });

    it('allows setting error to null', () => {
      const { setError } = useStudentsStore.getState();
      setError('Error');
      setError(null);
      const { error } = useStudentsStore.getState();
      expect(error).toBeNull();
    });
  });

  describe('Complex scenarios', () => {
    it('handles full CRUD lifecycle', () => {
      const { setStudents, addStudent, updateStudent, deleteStudent } = useStudentsStore.getState();
      
      setStudents([sampleStudent1]);
      expect(useStudentsStore.getState().students).toHaveLength(1);
      
      addStudent(sampleStudent2);
      expect(useStudentsStore.getState().students).toHaveLength(2);
      
      updateStudent(1, { is_active: false });
      expect(useStudentsStore.getState().students[0].is_active).toBe(false);
      
      deleteStudent(2);
      expect(useStudentsStore.getState().students).toHaveLength(1);
      expect(useStudentsStore.getState().students[0].id).toBe(1);
    });

    it('maintains error state across operations when not explicitly cleared', () => {
      const { setError, setLoading } = useStudentsStore.getState();
      setError('Persistent error');
      setLoading(true);
      const { error } = useStudentsStore.getState();
      expect(error).toBe('Persistent error');
    });

    it('updates selectedStudent reference when student is updated', () => {
      const { setStudents, selectStudent, updateStudent } = useStudentsStore.getState();
      setStudents([sampleStudent1]);
      selectStudent(sampleStudent1);
      updateStudent(1, { is_active: false });
      const { selectedStudent } = useStudentsStore.getState();
      expect(selectedStudent?.is_active).toBe(false);
    });
  });
});
