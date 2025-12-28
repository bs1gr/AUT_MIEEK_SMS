import { EnhancedDashboardView } from '@/features/dashboard';
import { useStudentsStore, useCoursesStore } from '@/stores';
import { useCourses, useStudents } from '@/hooks';
import { useEffect } from 'react';

export default function DashboardPage() {
  const students = useStudentsStore((state) => state.students);
  const courses = useCoursesStore((state) => state.courses);

  // Ensure data is fetched
  const { refetch: refetchCourses } = useCourses();
  const { refetch: refetchStudents } = useStudents();

  useEffect(() => {
    // Execute fetches and wait for them to complete to avoid race conditions
    Promise.all([
      refetchCourses(),
      refetchStudents(),
    ]).catch((err) => {
      console.error('[DashboardPage] Data fetch failed:', err);
    });
  }, [refetchCourses, refetchStudents]);

  const stats = {
    totalStudents: students.length,
    activeStudents: students.filter((s) => s.is_active !== false).length,
    totalCourses: courses.length,
  };

  return (
    <>
      {/* Add page-ready indicator for E2E tests */}
      <div data-testid="dashboard-page-loaded" className="hidden">Loaded</div>
      <EnhancedDashboardView students={students} courses={courses} stats={stats} />
    </>
  );
}
