import { GradingView } from '@/features/grading';
import { SectionErrorBoundary } from '@/components/ErrorBoundaries';
import { useStudentsStore, useCoursesStore } from '@/stores';
import { useCourses, useStudents } from '@/hooks';
import { useEffect } from 'react';

export default function GradingPage() {
  const students = useStudentsStore((state) => state.students);
  const courses = useCoursesStore((state) => state.courses);

  // Ensure data is fetched
  const { refetch: refetchCourses } = useCourses();
  const { refetch: refetchStudents } = useStudents();

  useEffect(() => {
    // Fetch data on mount only, not on every render
    const controller = new AbortController();
    refetchCourses();
    refetchStudents();
    return () => controller.abort();
    // Note: Intentionally omit refetch functions from deps to prevent loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SectionErrorBoundary section="GradingPage">
      {/* Add page-ready indicator for E2E tests */}
      <div data-testid="grading-page-loaded" className="hidden">Loaded</div>
      <GradingView students={students} courses={courses} />
    </SectionErrorBoundary>
  );
}
