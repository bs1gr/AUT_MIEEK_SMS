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
    refetchCourses();
    refetchStudents();
  }, [refetchCourses, refetchStudents]);

  const stats = {
    totalStudents: students.length,
    activeStudents: students.filter((s) => s.is_active !== false).length,
    totalCourses: courses.length,
  };

  return <EnhancedDashboardView students={students} courses={courses} stats={stats} />;
}
