import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Grade } from '@/types';

interface GradesState {
  // State
  grades: Grade[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setGrades: (grades: Grade[]) => void;
  addGrade: (grade: Grade) => void;
  updateGrade: (id: number, updates: Partial<Grade>) => void;
  deleteGrade: (id: number) => void;
  bulkAddGrades: (grades: Grade[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useGradesStore = create<GradesState>()(
  devtools(
    (set) => ({
      // Initial state
      grades: [],
      isLoading: false,
      error: null,

      // Actions
      setGrades: (grades) => set({ grades, error: null }),

      addGrade: (grade) => set((state) => ({
        grades: [...state.grades, grade],
        error: null,
      })),

      updateGrade: (id, updates) => set((state) => ({
        grades: state.grades.map((g) =>
          g.id === id ? { ...g, ...updates } : g
        ),
        error: null,
      })),

      deleteGrade: (id) => set((state) => ({
        grades: state.grades.filter((g) => g.id !== id),
        error: null,
      })),

      bulkAddGrades: (grades) => set((state) => ({
        grades: [...state.grades, ...grades],
        error: null,
      })),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),
    }),
    { name: 'GradesStore' }
  )
);
