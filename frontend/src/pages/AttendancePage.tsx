
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

      <AttendanceView students={students} courses={courses} />
    </SectionErrorBoundary>
  );
}
