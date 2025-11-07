import { AttendanceView } from '@/features/attendance';
import { useStudentsStore, useCoursesStore } from '@/stores';
import { useCourses, useStudents } from '@/hooks';

export default function AttendancePage() {
  const students = useStudentsStore((state) => state.students);
  const courses = useCoursesStore((state) => state.courses);

  // Fetch data automatically via React Query
  const { isLoading: coursesLoading, error: coursesError, data: coursesData } = useCourses();
  const { isLoading: studentsLoading, error: studentsError } = useStudents();

  // Debug logging
  console.log('[AttendancePage] Courses loading:', coursesLoading);
  console.log('[AttendancePage] Courses from store:', courses);
  console.log('[AttendancePage] Courses from query:', coursesData);
  console.log('[AttendancePage] Courses error:', coursesError);

  return <AttendanceView students={students} courses={courses} />;
}
