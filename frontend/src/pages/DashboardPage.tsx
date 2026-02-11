import { EnhancedDashboardView } from '@/features/dashboard';
import { useStudentsStore, useCoursesStore } from '@/stores';
import { useCourses, useStudents } from '@/hooks';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, isInitializing } = useAuth();
  const students = useStudentsStore((state) => state.students);
  const courses = useCoursesStore((state) => state.courses);

  // Only fetch data after auth is initialized - disable queries until user is loaded
  const { refetch: refetchCourses } = useCourses(undefined, { enabled: Boolean(user && !isInitializing) });
  const { refetch: refetchStudents } = useStudents(undefined, { enabled: Boolean(user && !isInitializing) });

  useEffect(() => {
    // Skip fetch if still initializing
    if (isInitializing || !user) {
      return;
    }

    // Execute fetches and wait for them to complete to avoid race conditions
    Promise.all([
      refetchCourses(),
      refetchStudents(),
    ]).catch((err) => {
      console.error('[DashboardPage] Data fetch failed:', err);
    });
  }, [refetchCourses, refetchStudents, user, isInitializing]);

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
