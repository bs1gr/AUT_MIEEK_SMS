import { CalendarView } from '@/features/calendar';
import { useCoursesStore } from '@/stores';
import { useCourses } from '@/hooks';
import { useEffect } from 'react';

export default function CalendarPage() {
  const courses = useCoursesStore((state) => state.courses);
  const { refetch: refetchCourses } = useCourses();

  // Refetch courses when calendar view is loaded to ensure fresh data
  useEffect(() => {
    refetchCourses();
  }, [refetchCourses]);

  return <CalendarView courses={courses} />;
}
