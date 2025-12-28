
import { AttendanceView } from '@/features/attendance';
import { SectionErrorBoundary } from '@/components/ErrorBoundaries';
import { useStudentsStore, useCoursesStore } from '@/stores';
import { useCourses, useStudents } from '@/hooks';
// React is not required in scope under the automatic JSX runtime

export default function AttendancePage() {
  const students = useStudentsStore((state) => state.students);
  const courses = useCoursesStore((state) => state.courses);

  // Fetch data automatically via React Query
  useCourses();
  useStudents();


  return (
    <SectionErrorBoundary section="AttendancePage">
      {/* Add page-ready indicator for E2E tests */}
      <div data-testid="attendance-page-loaded" className="hidden">Loaded</div>
      <AttendanceView students={students} courses={courses} />
    </SectionErrorBoundary>
  );
}
