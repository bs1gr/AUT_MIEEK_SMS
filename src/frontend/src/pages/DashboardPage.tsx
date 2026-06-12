import { EnhancedDashboardView } from '@/features/dashboard';
import { useStudentsStore, useCoursesStore } from '@/stores';
import { useCourses, useStudents } from '@/hooks';
import { useAuth } from '@/contexts/AuthContext';
import { useRef } from 'react';

export default function DashboardPage() {
  const { user, isInitializing } = useAuth();
  const students = useStudentsStore((state) => state.students);
  const courses = useCoursesStore((state) => state.courses);
  const initialFetchDoneRef = useRef(false);

  // Only fetch data after auth is initialized - queries will auto-run when enabled becomes true
  useCourses(undefined, { enabled: Boolean(user && !isInitializing) });
  useStudents(undefined, { enabled: Boolean(user && !isInitializing) });

  // Mark fetch as done once user is loaded
  if (user && !isInitializing && !initialFetchDoneRef.current) {
    initialFetchDoneRef.current = true;
  }

  const stats = {
    totalStudents: students.length,
    activeStudents: students.filter((s) => s.is_active !== false).length,
    totalCourses: courses.length,
  };

  return (
    <>
      <EnhancedDashboardView students={students} courses={courses} stats={stats} />
    </>
  );
}
