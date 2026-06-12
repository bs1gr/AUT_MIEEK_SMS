import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Course } from '@/types';

interface CoursesState {
  // State
  courses: Course[];
  selectedCourse: Course | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setCourses: (courses: Course[]) => void;
  addCourse: (course: Course) => void;
  updateCourse: (id: number, updates: Partial<Course>) => void;
  deleteCourse: (id: number) => void;
  selectCourse: (course: Course | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useCoursesStore = create<CoursesState>()(
  devtools(
    (set) => ({
      // Initial state
      courses: [],
      selectedCourse: null,
      isLoading: false,
      error: null,

      // Actions
      setCourses: (courses) => set({ courses, error: null }),

      addCourse: (course) => set((state) => ({
        courses: [...state.courses, course],
        error: null,
      })),

      updateCourse: (id, updates) => set((state) => ({
        courses: state.courses.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
        selectedCourse: state.selectedCourse?.id === id
          ? { ...state.selectedCourse, ...updates }
          : state.selectedCourse,
        error: null,
      })),

      deleteCourse: (id) => set((state) => ({
        courses: state.courses.filter((c) => c.id !== id),
        selectedCourse: state.selectedCourse?.id === id ? null : state.selectedCourse,
        error: null,
      })),

      selectCourse: (course) => set({ selectedCourse: course }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),
    }),
    { name: 'CoursesStore' }
  )
);
