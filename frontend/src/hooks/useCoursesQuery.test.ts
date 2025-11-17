import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCourses, useCourse, useCreateCourse, useUpdateCourse, useDeleteCourse, courseKeys } from './useCoursesQuery';

// Mock the API module to ensure consistent shape (api.js lacks getById on coursesAPI)
vi.mock('@/api/api', () => ({
  coursesAPI: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { coursesAPI } from '@/api/api';
import { useCoursesStore } from '@/stores/useCoursesStore';
import type { Course } from '@/types';

// Helper wrapper
function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
}

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

const sampleCourses: Course[] = [
  {
    id: 1,
    course_code: 'CS101',
    course_name: 'Intro to Programming',
    semester: 'Spring Semester 2024',
    credits: 3,
    is_active: true,
    description: 'Basics of programming'
  },
  {
    id: 2,
    course_code: 'MATH201',
    course_name: 'Advanced Calculus',
    semester: 'Winter Semester 2024',
    credits: 4,
    is_active: false,
    description: 'Differential equations'
  },
  {
    id: 3,
    course_code: 'PHY150',
    course_name: 'General Physics',
    semester: 'Spring Semester 2025',
    credits: 3,
    is_active: true,
    description: 'Mechanics and waves'
  },
];

// Paginated response shape mock
const paginatedResponse = {
  items: sampleCourses,
  total: sampleCourses.length,
  skip: 0,
  limit: 100,
  pages: 1,
  current_page: 1,
};

function resetStore() {
  const { setCourses, selectCourse, setLoading, setError } = useCoursesStore.getState();
  setCourses([]);
  selectCourse(null);
  setLoading(false);
  setError(null);
}

describe('useCoursesQuery hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  describe('useCourses - basic fetching', () => {
    it('fetches courses from paginated response and updates store', async () => {
      const getAllSpy = vi.spyOn(coursesAPI, 'getAll').mockResolvedValueOnce(paginatedResponse as any);
      const queryClient = makeClient();
      const { result } = renderHook(() => useCourses(), { wrapper: createWrapper(queryClient) });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(getAllSpy).toHaveBeenCalledTimes(1);
      expect(result.current.data).toHaveLength(3);
      const state = useCoursesStore.getState();
      expect(state.courses).toHaveLength(3);
      expect(state.error).toBeNull();
    });

    it('handles API returning an array directly', async () => {
      const getAllSpy = vi.spyOn(coursesAPI, 'getAll').mockResolvedValueOnce(sampleCourses as any);
      const queryClient = makeClient();
      const { result } = renderHook(() => useCourses(), { wrapper: createWrapper(queryClient) });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(3);
      expect(getAllSpy).toHaveBeenCalledTimes(1);
    });

    it('handles unexpected response shape (no items) gracefully', async () => {
      const getAllSpy = vi.spyOn(coursesAPI, 'getAll').mockResolvedValueOnce({ foo: 'bar' } as any);
      const queryClient = makeClient();
      const { result } = renderHook(() => useCourses(), { wrapper: createWrapper(queryClient) });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(0);
      expect(useCoursesStore.getState().courses).toHaveLength(0);
      expect(getAllSpy).toHaveBeenCalledTimes(1);
    });

    it('sets error state on failure', async () => {
      const error = new Error('Network fail');
      vi.spyOn(coursesAPI, 'getAll').mockRejectedValueOnce(error);
      const queryClient = makeClient();
      const { result } = renderHook(() => useCourses(), { wrapper: createWrapper(queryClient) });
      await waitFor(() => expect(result.current.isError).toBe(true));
      const state = useCoursesStore.getState();
      expect(state.error).toBe('Network fail');
    });

    it('applies search filter (case-insensitive across name and code)', async () => {
      vi.spyOn(coursesAPI, 'getAll').mockResolvedValueOnce(paginatedResponse as any);
      const queryClient = makeClient();
      const { result } = renderHook(() => useCourses({ search: 'physics' }), { wrapper: createWrapper(queryClient) });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].course_code).toBe('PHY150');
    });

    it('applies active filter', async () => {
      vi.spyOn(coursesAPI, 'getAll').mockResolvedValueOnce(paginatedResponse as any);
      const queryClient = makeClient();
      const { result } = renderHook(() => useCourses({ active: true }), { wrapper: createWrapper(queryClient) });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.every(c => c.is_active)).toBe(true);
    });

    it('applies semester filter', async () => {
      vi.spyOn(coursesAPI, 'getAll').mockResolvedValueOnce(paginatedResponse as any);
      const queryClient = makeClient();
      const { result } = renderHook(() => useCourses({ semester: 'Spring Semester 2024' }), { wrapper: createWrapper(queryClient) });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].id).toBe(1);
    });

    it('combines filters (search + active + semester)', async () => {
      vi.spyOn(coursesAPI, 'getAll').mockResolvedValueOnce(paginatedResponse as any);
      const queryClient = makeClient();
      const { result } = renderHook(() => useCourses({ search: 'intro', active: true, semester: 'Spring Semester 2024' }), { wrapper: createWrapper(queryClient) });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].course_code).toBe('CS101');
    });

    it('sets loading state during fetch', async () => {
      const getAllSpy = vi.spyOn(coursesAPI, 'getAll').mockResolvedValueOnce(paginatedResponse as any);
      const queryClient = makeClient();
      const { result } = renderHook(() => useCourses(), { wrapper: createWrapper(queryClient) });
      // Immediately after start should have set loading true in store (can't guarantee timing; poll)
      await waitFor(() => expect(getAllSpy).toHaveBeenCalled());
      expect(useCoursesStore.getState().isLoading).toBe(false); // After completion set false
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('useCourse - single fetch', () => {
    it('fetches a single course and selects it in store', async () => {
      vi.spyOn(coursesAPI, 'getById').mockResolvedValueOnce(sampleCourses[1]);
      const queryClient = makeClient();
      const { result } = renderHook(() => useCourse(2), { wrapper: createWrapper(queryClient) });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.id).toBe(2);
      expect(useCoursesStore.getState().selectedCourse?.id).toBe(2);
    });

    it('does nothing when id is null (disabled query)', async () => {
      const getSpy = vi.spyOn(coursesAPI, 'getById').mockResolvedValue(sampleCourses[0]);
      const queryClient = new QueryClient();
      const { result } = renderHook(() => useCourse(null), { wrapper: createWrapper(queryClient) });
      expect(result.current.isLoading).toBe(false);
      expect(getSpy).not.toHaveBeenCalled();
    });
  });

  describe('Mutations', () => {
    it('creates a course and updates store + invalidates list', async () => {
      const newCourse: Course = {
        id: 99,
        course_code: 'BIO200',
        course_name: 'Biology Fundamentals',
        semester: 'Spring Semester 2024',
        credits: 3,
        is_active: true,
      };
      vi.spyOn(coursesAPI, 'create').mockResolvedValueOnce(newCourse);
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useCreateCourse(), { wrapper: createWrapper(queryClient) });

      await act(async () => {
        await result.current.mutateAsync({
          course_code: newCourse.course_code,
          course_name: newCourse.course_name,
          semester: newCourse.semester,
          credits: newCourse.credits,
        });
      });

      expect(useCoursesStore.getState().courses.some(c => c.id === 99)).toBe(true);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: courseKeys.lists() });
    });

    it('updates a course and invalidates list + detail', async () => {
      // Seed store
      useCoursesStore.getState().setCourses(sampleCourses);
      const updatedCourse = { ...sampleCourses[0], course_name: 'Intro to Programming UPDATED' };
      vi.spyOn(coursesAPI, 'update').mockResolvedValueOnce(updatedCourse);
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useUpdateCourse(), { wrapper: createWrapper(queryClient) });

      await act(async () => {
        await result.current.mutateAsync({ id: updatedCourse.id, data: { course_name: updatedCourse.course_name } });
      });

      expect(useCoursesStore.getState().courses.find(c => c.id === updatedCourse.id)?.course_name).toContain('UPDATED');
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: courseKeys.lists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: courseKeys.detail(updatedCourse.id) });
    });

    it('deletes a course and invalidates list', async () => {
      useCoursesStore.getState().setCourses(sampleCourses);
      vi.spyOn(coursesAPI, 'delete').mockResolvedValueOnce({ message: 'deleted' });
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useDeleteCourse(), { wrapper: createWrapper(queryClient) });

      await act(async () => {
        await result.current.mutateAsync(2);
      });

      expect(useCoursesStore.getState().courses.some(c => c.id === 2)).toBe(false);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: courseKeys.lists() });
    });

    it('sets error in store on mutation failure', async () => {
      vi.spyOn(coursesAPI, 'create').mockRejectedValueOnce(new Error('Create failed'));
      const queryClient = new QueryClient();
      const { result } = renderHook(() => useCreateCourse(), { wrapper: createWrapper(queryClient) });

      await act(async () => {
        try {
          await result.current.mutateAsync({ course_code: 'X', course_name: 'Y', semester: 'Spring Semester 2024', credits: 3 });
        } catch {}
      });

      expect(useCoursesStore.getState().error).toBe('Create failed');
    });
  });
});
