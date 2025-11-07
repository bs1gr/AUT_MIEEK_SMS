import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Student } from '@/types';

interface StudentsState {
  // State
  students: Student[];
  selectedStudent: Student | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setStudents: (students: Student[]) => void;
  addStudent: (student: Student) => void;
  updateStudent: (id: number, updates: Partial<Student>) => void;
  deleteStudent: (id: number) => void;
  selectStudent: (student: Student | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useStudentsStore = create<StudentsState>()(
  devtools(
    (set) => ({
      // Initial state
      students: [],
      selectedStudent: null,
      isLoading: false,
      error: null,
      
      // Actions
      setStudents: (students) => set({ students, error: null }),
      
      addStudent: (student) => set((state) => ({
        students: [...state.students, student],
        error: null,
      })),
      
      updateStudent: (id, updates) => set((state) => ({
        students: state.students.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
        selectedStudent: state.selectedStudent?.id === id
          ? { ...state.selectedStudent, ...updates }
          : state.selectedStudent,
        error: null,
      })),
      
      deleteStudent: (id) => set((state) => ({
        students: state.students.filter((s) => s.id !== id),
        selectedStudent: state.selectedStudent?.id === id ? null : state.selectedStudent,
        error: null,
      })),
      
      selectStudent: (student) => set({ selectedStudent: student }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => set({ error }),
      
      clearError: () => set({ error: null }),
    }),
    { name: 'StudentsStore' }
  )
);
