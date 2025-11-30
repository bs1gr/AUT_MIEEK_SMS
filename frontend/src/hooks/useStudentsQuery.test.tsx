import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStudents, useStudent, useCreateStudent, useUpdateStudent, useDeleteStudent, studentKeys } from './useStudentsQuery';
import { studentsAPI } from '@/api/api';
import { useStudentsStore } from '@/stores/useStudentsStore';
import type { Student } from '@/types';

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

const sampleStudents: Student[] = [
  {
    id: 1,
    first_name: 'Alice',
    last_name: 'Zephyr',
    email: 'alice@example.com',
    student_id: 'STU001',
    enrollment_date: '2024-01-10',
    is_active: true,
  },
  {
    id: 2,
    first_name: 'Bob',
    last_name: 'Yellow',
    email: 'bob@example.com',
    student_id: 'STU002',
    enrollment_date: '2024-01-11',
    is_active: false,
  },
  {
    id: 3,
    first_name: 'Charlie',
    last_name: 'Xavier',
    email: 'charlie@example.com',
    student_id: 'STU003',
    enrollment_date: '2024-01-12',
    is_active: true,
  },
];

const _paginatedResponse = {
  items: sampleStudents,
  total: sampleStudents.length,
  skip: 0,
  limit: 100,
  pages: 1,
  current_page: 1,
};

function resetStore() {
  const { setStudents, selectStudent, setLoading, setError } = useStudentsStore.getState();
  setStudents([]);
  selectStudent(null);
  setLoading(false);
  setError(null);
}

describe('useStudentsQuery hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  describe('useStudents - basic fetching', () => {
    it('fetches students (array) and updates store', async () => {
      const getAllSpy = vi.spyOn(studentsAPI, 'getAll').mockResolvedValueOnce(sampleStudents as Student[]);
      const queryClient = makeClient();
      const { result } = renderHook(() => useStudents(), { wrapper: createWrapper(queryClient) });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(getAllSpy).toHaveBeenCalledTimes(1);
      expect(result.current.data).toHaveLength(3);
      const state = useStudentsStore.getState();
      expect(state.students).toHaveLength(3);
      expect(state.error).toBeNull();
    });

    it('applies search filter across first, last, email (case-insensitive)', async () => {
      vi.spyOn(studentsAPI, 'getAll').mockResolvedValueOnce(sampleStudents as Student[]);
      const queryClient = makeClient();
      const { result } = renderHook(() => useStudents({ search: 'xAvIeR' }), { wrapper: createWrapper(queryClient) });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].last_name).toBe('Xavier');
    });

    it('applies active filter', async () => {
      vi.spyOn(studentsAPI, 'getAll').mockResolvedValueOnce(sampleStudents as Student[]);
      const queryClient = makeClient();
      const { result } = renderHook(() => useStudents({ active: true }), { wrapper: createWrapper(queryClient) });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.every(s => s.is_active)).toBe(true);
    });

    it('combines search + active filters', async () => {
      vi.spyOn(studentsAPI, 'getAll').mockResolvedValueOnce(sampleStudents as Student[]);
      const queryClient = makeClient();
      const { result } = renderHook(() => useStudents({ search: 'alice', active: true }), { wrapper: createWrapper(queryClient) });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].id).toBe(1);
    });

    it('handles error during fetch and sets store error', async () => {
      vi.spyOn(studentsAPI, 'getAll').mockRejectedValueOnce(new Error('Fetch failed'));
      const queryClient = makeClient();
      const { result } = renderHook(() => useStudents(), { wrapper: createWrapper(queryClient) });
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(useStudentsStore.getState().error).toBe('Fetch failed');
    });

    it('sets loading state during fetch lifecycle', async () => {
      const getAllSpy = vi.spyOn(studentsAPI, 'getAll').mockResolvedValueOnce(sampleStudents as Student[]);
      const queryClient = makeClient();
      const { result } = renderHook(() => useStudents(), { wrapper: createWrapper(queryClient) });
      await waitFor(() => expect(getAllSpy).toHaveBeenCalled());
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(useStudentsStore.getState().isLoading).toBe(false);
    });
  });

  describe('useStudent - single fetch', () => {
    it('fetches single student and selects in store', async () => {
      vi.spyOn(studentsAPI, 'getById').mockResolvedValueOnce(sampleStudents[2]);
      const queryClient = makeClient();
      const { result } = renderHook(() => useStudent(3), { wrapper: createWrapper(queryClient) });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.id).toBe(3);
      expect(useStudentsStore.getState().selectedStudent?.id).toBe(3);
    });

    it('disabled when id is null', () => {
      const getSpy = vi.spyOn(studentsAPI, 'getById').mockResolvedValue(sampleStudents[0]);
      const queryClient = makeClient();
      const { result } = renderHook(() => useStudent(null), { wrapper: createWrapper(queryClient) });
      expect(result.current.isLoading).toBe(false);
      expect(getSpy).not.toHaveBeenCalled();
    });
  });

  describe('Mutations', () => {
    it('creates student and updates store + invalidates list', async () => {
      const newStudent: Student = {
        id: 99,
        first_name: 'Dora',
        last_name: 'Wonder',
        email: 'dora@example.com',
        student_id: 'STU099',
        enrollment_date: '2024-01-20',
        is_active: true,
      };
      vi.spyOn(studentsAPI, 'create').mockResolvedValueOnce(newStudent);
      const queryClient = makeClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useCreateStudent(), { wrapper: createWrapper(queryClient) });
      await act(async () => {
        await result.current.mutateAsync({
          first_name: newStudent.first_name,
          last_name: newStudent.last_name,
          email: newStudent.email,
          student_id: newStudent.student_id,
          enrollment_date: newStudent.enrollment_date,
        });
      });
      expect(useStudentsStore.getState().students.some((s: Student) => s.id === 99)).toBe(true);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: studentKeys.lists() });
    });

    it('updates student and invalidates list + detail', async () => {
      useStudentsStore.getState().setStudents(sampleStudents);
      const updated = { ...sampleStudents[0], first_name: 'AliceUpdated' };
      vi.spyOn(studentsAPI, 'update').mockResolvedValueOnce(updated);
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useUpdateStudent(), { wrapper: createWrapper(queryClient) });
      await act(async () => {
        await result.current.mutateAsync({ id: updated.id, data: { first_name: updated.first_name } });
      });
      expect(useStudentsStore.getState().students.find((s: Student) => s.id === updated.id)?.first_name).toContain('Updated');
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: studentKeys.lists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: studentKeys.detail(updated.id) });
    });

    it('deletes student and invalidates list', async () => {
      useStudentsStore.getState().setStudents(sampleStudents);
      vi.spyOn(studentsAPI, 'delete').mockResolvedValueOnce({ message: 'deleted' });
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useDeleteStudent(), { wrapper: createWrapper(queryClient) });
      await act(async () => {
        await result.current.mutateAsync(2);
      });
      expect(useStudentsStore.getState().students.some((s: Student) => s.id === 2)).toBe(false);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: studentKeys.lists() });
    });

    it('sets error on mutation failure', async () => {
      vi.spyOn(studentsAPI, 'create').mockRejectedValueOnce(new Error('Create failed'));
      const queryClient = new QueryClient();
      const { result } = renderHook(() => useCreateStudent(), { wrapper: createWrapper(queryClient) });
      await act(async () => {
        try {
          await result.current.mutateAsync({ first_name: 'X', last_name: 'Y', email: 'x@y.com', student_id: 'S', enrollment_date: '2024-01-01' });
        } catch {}
      });
      expect(useStudentsStore.getState().error).toBe('Create failed');
    });
  });
});
