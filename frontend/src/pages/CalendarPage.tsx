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
    // Omit refetchCourses from deps to prevent loops on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <CalendarView courses={courses} />;
}
