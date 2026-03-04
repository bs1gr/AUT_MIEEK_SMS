import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { studentsAPI } from '@/api/api';
import { useStudentsStore } from '@/stores';
import type { Student, StudentFormData } from '@/types';
import {
  enqueueStudentUpdate,
  getQueuedStudentUpdates,
  removeQueuedStudentUpdate,
} from '@/features/students/utils/offlineStudentUpdateQueue';

let studentUpdateSyncInProgress = false;

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
export function useStudents(
  filters?: { search?: string; active?: boolean },
  queryOptions?: Partial<UseQueryOptions<Student[]>>
) {
  const { t } = useTranslation();
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
        const errorMessage = error instanceof Error ? error.message : t('failedToFetchStudents');
        setError(errorMessage);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...queryOptions,
  });
}

// Fetch single student
export function useStudent(id: number | null) {
  const selectStudent = useStudentsStore((state) => state.selectStudent);

  return useQuery({
    queryKey: studentKeys.detail(id!),
    queryFn: async () => {
      // eslint-disable-next-line testing-library/no-await-sync-queries
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
  const students = useStudentsStore((state) => state.students);
  const setError = useStudentsStore((state) => state.setError);

  const isOfflineNetworkError = useCallback((error: unknown) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
    if (typeof error !== 'object' || error === null) return false;

    const maybeError = error as {
      code?: string;
      message?: string;
      response?: { status?: number };
      request?: unknown;
    };

    const message = String(maybeError.message || '');
    return (
      maybeError.code === 'ERR_NETWORK' ||
      maybeError.response?.status === 0 ||
      (!maybeError.response && Boolean(maybeError.request)) ||
      /Network Error|Failed to fetch|offline/i.test(message)
    );
  }, []);

  const flushQueuedStudentUpdates = useCallback(async () => {
    if (studentUpdateSyncInProgress) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    const queue = getQueuedStudentUpdates();
    if (!queue.length) return;

    studentUpdateSyncInProgress = true;
    try {
      for (const item of queue) {
        try {
          const syncedStudent = await studentsAPI.update(item.studentId, item.data);
          updateStudent(syncedStudent.id, syncedStudent);
          removeQueuedStudentUpdate(item.id);
          queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
          queryClient.invalidateQueries({ queryKey: studentKeys.detail(syncedStudent.id) });
        } catch (error) {
          if (isOfflineNetworkError(error)) {
            break;
          }
          // Keep entry for manual retry to avoid accidental loss.
          break;
        }
      }
    } finally {
      studentUpdateSyncInProgress = false;
    }
  }, [isOfflineNetworkError, queryClient, updateStudent]);

  useEffect(() => {
    const handleOnline = () => {
      void flushQueuedStudentUpdates();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
    }

    if (typeof navigator === 'undefined' || navigator.onLine) {
      void flushQueuedStudentUpdates();
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
      }
    };
  }, [flushQueuedStudentUpdates]);

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<StudentFormData> & { re_enroll_previous?: boolean };
    }) =>
      studentsAPI.update(id, data).catch((error) => {
        if (!isOfflineNetworkError(error)) {
          throw error;
        }

        enqueueStudentUpdate(id, data);

        const current = students.find((s) => s.id === id);
        const optimisticStudent: Student = {
          ...(current || ({ id } as Student)),
          ...data,
          id,
          is_active: current?.is_active ?? true,
          first_name: (data.first_name ?? current?.first_name ?? '') as string,
          last_name: (data.last_name ?? current?.last_name ?? '') as string,
          email: (data.email ?? current?.email ?? '') as string,
          student_id: (data.student_id ?? current?.student_id ?? '') as string,
          enrollment_date: (data.enrollment_date ?? current?.enrollment_date ?? new Date().toISOString().split('T')[0]) as string,
        };

        return optimisticStudent;
      }),
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
