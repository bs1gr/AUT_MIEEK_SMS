import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Attendance } from '@/types';

interface AttendanceState {
  // State
  attendanceRecords: Attendance[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setAttendance: (records: Attendance[]) => void;
  addAttendance: (record: Attendance) => void;
  updateAttendance: (id: number, updates: Partial<Attendance>) => void;
  deleteAttendance: (id: number) => void;
  bulkAddAttendance: (records: Attendance[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAttendanceStore = create<AttendanceState>()(
  devtools(
    (set) => ({
      // Initial state
      attendanceRecords: [],
      isLoading: false,
      error: null,

      // Actions
      setAttendance: (records) => set({ attendanceRecords: records, error: null }),

      addAttendance: (record) => set((state) => ({
        attendanceRecords: [...state.attendanceRecords, record],
        error: null,
      })),

      updateAttendance: (id, updates) => set((state) => ({
        attendanceRecords: state.attendanceRecords.map((a) =>
          a.id === id ? { ...a, ...updates } : a
        ),
        error: null,
      })),

      deleteAttendance: (id) => set((state) => ({
        attendanceRecords: state.attendanceRecords.filter((a) => a.id !== id),
        error: null,
      })),

      bulkAddAttendance: (records) => set((state) => ({
        attendanceRecords: [...state.attendanceRecords, ...records],
        error: null,
      })),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),
    }),
    { name: 'AttendanceStore' }
  )
);
