import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
/* eslint-disable testing-library/no-await-sync-queries */
import { studentsAPI } from '@/api/api';
import { useStudentsStore } from '@/stores';
import type { Student, StudentFormData } from '@/types';

// Query keys
export const studentKeys = {
  all: ['students'] as const,
  lists: () => [...studentKeys.all, 'list'] as const,
  list: (filters?: { search?: string; active?: boolean }) =>
    [...studentKeys.lists(), filters] as const,
  details: () => [...studentKeys.all, 'detail'] as const,
  detail: (id: number) => [...studentKeys.details(), id] as const,
};

// Fetch all students
export function useStudents(filters?: { search?: string; active?: boolean }) {
  const setStudents = useStudentsStore((state) => state.setStudents);
  const setLoading = useStudentsStore((state) => state.setLoading);
  const setError = useStudentsStore((state) => state.setError);

  return useQuery({
    queryKey: studentKeys.list(filters),
    queryFn: async () => {
        setLoading(true);
      try {
      const students = await studentsAPI.getAll();
        // Apply filters client-side if needed
        let filteredStudents = students;
        if (filters?.search) {
          const searchLower = filters.search.toLowerCase();
          filteredStudents = students.filter(
            (s: Student) =>
              s.first_name.toLowerCase().includes(searchLower) ||
              s.last_name.toLowerCase().includes(searchLower) ||
              s.email.toLowerCase().includes(searchLower)
          );
        }
        if (filters?.active !== undefined) {
          filteredStudents = filteredStudents.filter((s: Student) => s.is_active === filters.active);
        }
        try {
          setStudents(filteredStudents);
          setError(null);
        } catch (err) {
          if (process.env.NODE_ENV === 'test') console.error('[useStudents] setStudents error', err);
          throw err;
        }
        return filteredStudents;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch students';
        setError(errorMessage);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Fetch single student
export function useStudent(id: number | null) {
  const selectStudent = useStudentsStore((state) => state.selectStudent);

  return useQuery({
    queryKey: studentKeys.detail(id!),
    queryFn: async () => {
      const student = await studentsAPI.getById(id!);
      selectStudent(student);
      return student;
    },
    enabled: id !== null,
    staleTime: 5 * 60 * 1000,
  });
}

// Create student mutation
export function useCreateStudent() {
  const queryClient = useQueryClient();
  const addStudent = useStudentsStore((state) => state.addStudent);
  const setError = useStudentsStore((state) => state.setError);

  return useMutation({
    mutationFn: (data: StudentFormData) => studentsAPI.create(data),
    onSuccess: (newStudent) => {
      addStudent(newStudent);
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
      setError(null);
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });
}

// Update student mutation
export function useUpdateStudent() {
  const queryClient = useQueryClient();
  const updateStudent = useStudentsStore((state) => state.updateStudent);
  const setError = useStudentsStore((state) => state.setError);

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<StudentFormData> }) =>
      studentsAPI.update(id, data),
    onSuccess: (updatedStudent) => {
      updateStudent(updatedStudent.id, updatedStudent);
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: studentKeys.detail(updatedStudent.id) });
      setError(null);
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });
}

// Delete student mutation
export function useDeleteStudent() {
  const queryClient = useQueryClient();
  const deleteStudent = useStudentsStore((state) => state.deleteStudent);
  const setError = useStudentsStore((state) => state.setError);

  return useMutation({
    mutationFn: (id: number) => studentsAPI.delete(id),
    onSuccess: (_, id) => {
      deleteStudent(id);
      queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
      setError(null);
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });
}
