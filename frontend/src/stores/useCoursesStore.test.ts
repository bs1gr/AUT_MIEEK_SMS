import { describe, it, expect, beforeEach } from 'vitest';
import { useCoursesStore } from './useCoursesStore';
import type { Course } from '@/types';

const sampleCourse1: Course = {
  id: 1,
  course_code: 'CS101',
  course_name: 'Intro to Programming',
  semester: 'Spring Semester 2024',
  credits: 3,
  is_active: true,
};

const sampleCourse2: Course = {
  id: 2,
  course_code: 'MATH201',
  course_name: 'Advanced Calculus',
  semester: 'Fall Semester 2024',
  credits: 4,
  is_active: false,
};

describe('useCoursesStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const { setCourses, selectCourse, setLoading, setError } = useCoursesStore.getState();
    setCourses([]);
    selectCourse(null);
    setLoading(false);
    setError(null);
  });

  describe('Initial state', () => {
    it('starts with empty courses array', () => {
      const { courses } = useCoursesStore.getState();
      expect(courses).toEqual([]);
    });

    it('starts with no selected course', () => {
      const { selectedCourse } = useCoursesStore.getState();
      expect(selectedCourse).toBeNull();
    });

    it('starts with loading false', () => {
      const { isLoading } = useCoursesStore.getState();
      expect(isLoading).toBe(false);
    });

    it('starts with no error', () => {
      const { error } = useCoursesStore.getState();
      expect(error).toBeNull();
    });
  });

  describe('setCourses', () => {
    it('sets courses array', () => {
      const { setCourses } = useCoursesStore.getState();
      setCourses([sampleCourse1, sampleCourse2]);
      const { courses } = useCoursesStore.getState();
      expect(courses).toHaveLength(2);
      expect(courses[0].id).toBe(1);
      expect(courses[1].id).toBe(2);
    });

    it('clears error when setting courses', () => {
      const { setError, setCourses } = useCoursesStore.getState();
      setError('Previous error');
      setCourses([sampleCourse1]);
      const { error } = useCoursesStore.getState();
      expect(error).toBeNull();
    });

    it('replaces existing courses', () => {
      const { setCourses } = useCoursesStore.getState();
      setCourses([sampleCourse1]);
      setCourses([sampleCourse2]);
      const { courses } = useCoursesStore.getState();
      expect(courses).toHaveLength(1);
      expect(courses[0].id).toBe(2);
    });
  });

  describe('addCourse', () => {
    it('adds a course to empty array', () => {
      const { addCourse } = useCoursesStore.getState();
      addCourse(sampleCourse1);
      const { courses } = useCoursesStore.getState();
      expect(courses).toHaveLength(1);
      expect(courses[0].id).toBe(1);
    });

    it('appends course to existing courses', () => {
      const { setCourses, addCourse } = useCoursesStore.getState();
      setCourses([sampleCourse1]);
      addCourse(sampleCourse2);
      const { courses } = useCoursesStore.getState();
      expect(courses).toHaveLength(2);
      expect(courses[1].id).toBe(2);
    });

    it('clears error when adding course', () => {
      const { setError, addCourse } = useCoursesStore.getState();
      setError('Add error');
      addCourse(sampleCourse1);
      const { error } = useCoursesStore.getState();
      expect(error).toBeNull();
    });

    it('does not mutate original array', () => {
      const { setCourses, addCourse } = useCoursesStore.getState();
      setCourses([sampleCourse1]);
      const { courses: before } = useCoursesStore.getState();
      addCourse(sampleCourse2);
      expect(before).toHaveLength(1); // Original reference unchanged
    });
  });

  describe('updateCourse', () => {
    beforeEach(() => {
      const { setCourses } = useCoursesStore.getState();
      setCourses([sampleCourse1, sampleCourse2]);
    });

    it('updates course by id', () => {
      const { updateCourse } = useCoursesStore.getState();
      updateCourse(1, { course_name: 'Updated Programming' });
      const { courses } = useCoursesStore.getState();
      expect(courses[0].course_name).toBe('Updated Programming');
      expect(courses[0].course_code).toBe('CS101'); // Other fields unchanged
    });

    it('updates multiple fields', () => {
      const { updateCourse } = useCoursesStore.getState();
      updateCourse(2, { course_name: 'New Calculus', credits: 5 });
      const { courses } = useCoursesStore.getState();
      const updated = courses.find(c => c.id === 2);
      expect(updated?.course_name).toBe('New Calculus');
      expect(updated?.credits).toBe(5);
    });

    it('does not affect other courses', () => {
      const { updateCourse } = useCoursesStore.getState();
      updateCourse(1, { course_name: 'Changed' });
      const { courses } = useCoursesStore.getState();
      expect(courses[1].course_name).toBe('Advanced Calculus');
    });

    it('updates selectedCourse if it matches the updated id', () => {
      const { selectCourse, updateCourse } = useCoursesStore.getState();
      selectCourse(sampleCourse1);
      updateCourse(1, { course_name: 'Selected Updated' });
      const { selectedCourse } = useCoursesStore.getState();
      expect(selectedCourse?.course_name).toBe('Selected Updated');
    });

    it('does not update selectedCourse if different id', () => {
      const { selectCourse, updateCourse } = useCoursesStore.getState();
      selectCourse(sampleCourse1);
      updateCourse(2, { course_name: 'Other Updated' });
      const { selectedCourse } = useCoursesStore.getState();
      expect(selectedCourse?.course_name).toBe('Intro to Programming');
    });

    it('clears error on update', () => {
      const { setError, updateCourse } = useCoursesStore.getState();
      setError('Update error');
      updateCourse(1, { credits: 4 });
      const { error } = useCoursesStore.getState();
      expect(error).toBeNull();
    });

    it('handles update of non-existent course gracefully', () => {
      const { updateCourse } = useCoursesStore.getState();
      updateCourse(999, { course_name: 'Ghost' });
      const { courses } = useCoursesStore.getState();
      expect(courses).toHaveLength(2); // No change
    });
  });

  describe('deleteCourse', () => {
    beforeEach(() => {
      const { setCourses } = useCoursesStore.getState();
      setCourses([sampleCourse1, sampleCourse2]);
    });

    it('removes course by id', () => {
      const { deleteCourse } = useCoursesStore.getState();
      deleteCourse(1);
      const { courses } = useCoursesStore.getState();
      expect(courses).toHaveLength(1);
      expect(courses[0].id).toBe(2);
    });

    it('clears selectedCourse if deleted', () => {
      const { selectCourse, deleteCourse } = useCoursesStore.getState();
      selectCourse(sampleCourse1);
      deleteCourse(1);
      const { selectedCourse } = useCoursesStore.getState();
      expect(selectedCourse).toBeNull();
    });

    it('preserves selectedCourse if different id deleted', () => {
      const { selectCourse, deleteCourse } = useCoursesStore.getState();
      selectCourse(sampleCourse1);
      deleteCourse(2);
      const { selectedCourse } = useCoursesStore.getState();
      expect(selectedCourse?.id).toBe(1);
    });

    it('clears error on delete', () => {
      const { setError, deleteCourse } = useCoursesStore.getState();
      setError('Delete error');
      deleteCourse(1);
      const { error } = useCoursesStore.getState();
      expect(error).toBeNull();
    });

    it('handles delete of non-existent course', () => {
      const { deleteCourse } = useCoursesStore.getState();
      deleteCourse(999);
      const { courses } = useCoursesStore.getState();
      expect(courses).toHaveLength(2);
    });
  });

  describe('selectCourse', () => {
    it('sets selectedCourse', () => {
      const { selectCourse } = useCoursesStore.getState();
      selectCourse(sampleCourse1);
      const { selectedCourse } = useCoursesStore.getState();
      expect(selectedCourse?.id).toBe(1);
    });

    it('can clear selection with null', () => {
      const { selectCourse } = useCoursesStore.getState();
      selectCourse(sampleCourse1);
      selectCourse(null);
      const { selectedCourse } = useCoursesStore.getState();
      expect(selectedCourse).toBeNull();
    });

    it('replaces previous selection', () => {
      const { selectCourse } = useCoursesStore.getState();
      selectCourse(sampleCourse1);
      selectCourse(sampleCourse2);
      const { selectedCourse } = useCoursesStore.getState();
      expect(selectedCourse?.id).toBe(2);
    });
  });

  describe('Loading state', () => {
    it('sets loading to true', () => {
      const { setLoading } = useCoursesStore.getState();
      setLoading(true);
      const { isLoading } = useCoursesStore.getState();
      expect(isLoading).toBe(true);
    });

    it('sets loading to false', () => {
      const { setLoading } = useCoursesStore.getState();
      setLoading(true);
      setLoading(false);
      const { isLoading } = useCoursesStore.getState();
      expect(isLoading).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('sets error message', () => {
      const { setError } = useCoursesStore.getState();
      setError('Network failure');
      const { error } = useCoursesStore.getState();
      expect(error).toBe('Network failure');
    });

    it('clears error with clearError', () => {
      const { setError, clearError } = useCoursesStore.getState();
      setError('Some error');
      clearError();
      const { error } = useCoursesStore.getState();
      expect(error).toBeNull();
    });

    it('allows setting error to null', () => {
      const { setError } = useCoursesStore.getState();
      setError('Error');
      setError(null);
      const { error } = useCoursesStore.getState();
      expect(error).toBeNull();
    });
  });

  describe('Complex scenarios', () => {
    it('handles full CRUD lifecycle', () => {
      const { setCourses, addCourse, updateCourse, deleteCourse } = useCoursesStore.getState();
      
      // Set initial
      setCourses([sampleCourse1]);
      expect(useCoursesStore.getState().courses).toHaveLength(1);
      
      // Add
      addCourse(sampleCourse2);
      expect(useCoursesStore.getState().courses).toHaveLength(2);
      
      // Update
      updateCourse(1, { credits: 5 });
      expect(useCoursesStore.getState().courses[0].credits).toBe(5);
      
      // Delete
      deleteCourse(2);
      expect(useCoursesStore.getState().courses).toHaveLength(1);
      expect(useCoursesStore.getState().courses[0].id).toBe(1);
    });

    it('maintains error state across operations when not explicitly cleared', () => {
      const { setError, setLoading } = useCoursesStore.getState();
      setError('Persistent error');
      setLoading(true);
      const { error } = useCoursesStore.getState();
      expect(error).toBe('Persistent error'); // Still there after loading change
    });

    it('updates selectedCourse reference when course is updated', () => {
      const { setCourses, selectCourse, updateCourse } = useCoursesStore.getState();
      setCourses([sampleCourse1]);
      selectCourse(sampleCourse1);
      updateCourse(1, { is_active: false });
      const { selectedCourse } = useCoursesStore.getState();
      expect(selectedCourse?.is_active).toBe(false);
    });
  });
});
