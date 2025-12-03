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
    refetchCourses();
    refetchStudents();
  }, [refetchCourses, refetchStudents]);

  return (
    <SectionErrorBoundary section="GradingPage">
      <GradingView students={students} courses={courses} />
    </SectionErrorBoundary>
  );
}
