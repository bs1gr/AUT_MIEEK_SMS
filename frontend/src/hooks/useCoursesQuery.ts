import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesAPI } from '@/api/api';
import { useCoursesStore } from '@/stores';
import type { Course, CourseFormData } from '@/types';

// Query keys
export const courseKeys = {
  all: ['courses'] as const,
  lists: () => [...courseKeys.all, 'list'] as const,
  list: (filters?: { search?: string; active?: boolean; semester?: string }) =>
    [...courseKeys.lists(), filters] as const,
  details: () => [...courseKeys.all, 'detail'] as const,
  detail: (id: number) => [...courseKeys.details(), id] as const,
};

// Fetch all courses
export function useCourses(filters?: { search?: string; active?: boolean; semester?: string }) {
  const setCourses = useCoursesStore((state) => state.setCourses);
  const setLoading = useCoursesStore((state) => state.setLoading);
  const setError = useCoursesStore((state) => state.setError);

  return useQuery({
    queryKey: courseKeys.list(filters),
    queryFn: async () => {
      setLoading(true);
      try {
        const response = await coursesAPI.getAll(0, 1000);  // Request up to 1000 courses
        // Accept both array and object-with-items
        let courses: Course[] = [];
        if (Array.isArray(response)) {
          courses = response;
        } else if (response && Array.isArray(response.items)) {
          courses = response.items;
        } else {
          courses = [];
        }
        // Apply filters client-side
        let filteredCourses = courses;
        if (filters?.search) {
          const searchLower = filters.search.toLowerCase();
          filteredCourses = courses.filter(
            (c: Course) =>
              c.course_name.toLowerCase().includes(searchLower) ||
              c.course_code.toLowerCase().includes(searchLower)
          );
        }
        if (filters?.active !== undefined) {
          filteredCourses = filteredCourses.filter((c: Course) => c.is_active === filters.active);
        }
        if (filters?.semester) {
          filteredCourses = filteredCourses.filter((c: Course) => c.semester === filters.semester);
        }
        setCourses(filteredCourses);
        setError(null);
        return filteredCourses;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch courses';
        setError(errorMessage);
        console.error('[useCourses] Error:', errorMessage, error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Fetch single course
export function useCourse(id: number | null) {
  const selectCourse = useCoursesStore((state) => state.selectCourse);

  return useQuery({
    queryKey: courseKeys.detail(id!),
    queryFn: async () => {
      const course = await coursesAPI.getById(id!);
      selectCourse(course);
      return course;
    },
    enabled: id !== null,
    staleTime: 5 * 60 * 1000,
  });
}

// Create course mutation
export function useCreateCourse() {
  const queryClient = useQueryClient();
  const addCourse = useCoursesStore((state) => state.addCourse);
  const setError = useCoursesStore((state) => state.setError);

  return useMutation({
    mutationFn: (data: CourseFormData) => coursesAPI.create(data),
    onSuccess: (newCourse) => {
      addCourse(newCourse);
      queryClient.invalidateQueries({ queryKey: courseKeys.lists() });
      setError(null);
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });
}

// Update course mutation
export function useUpdateCourse() {
  const queryClient = useQueryClient();
  const updateCourse = useCoursesStore((state) => state.updateCourse);
  const setError = useCoursesStore((state) => state.setError);

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CourseFormData> }) =>
      coursesAPI.update(id, data),
    onSuccess: (updatedCourse) => {
      updateCourse(updatedCourse.id, updatedCourse);
      queryClient.invalidateQueries({ queryKey: courseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(updatedCourse.id) });
      setError(null);
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });
}

// Delete course mutation
export function useDeleteCourse() {
  const queryClient = useQueryClient();
  const deleteCourse = useCoursesStore((state) => state.deleteCourse);
  const setError = useCoursesStore((state) => state.setError);

  return useMutation({
    mutationFn: (id: number) => coursesAPI.delete(id),
    onSuccess: (_, id) => {
      deleteCourse(id);
      queryClient.invalidateQueries({ queryKey: courseKeys.lists() });
      setError(null);
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });
}
