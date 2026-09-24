import { CalendarView } from '@/features/calendar';
import { useCoursesStore } from '@/stores';
import { useCourses } from '@/hooks';
import { useSetCourseActive } from '@/hooks/useCoursesQuery';
import { useEffect } from 'react';

export default function CalendarPage() {
  const courses = useCoursesStore((state) => state.courses);
  const { refetch: refetchCourses } = useCourses();
  const setCourseActive = useSetCourseActive();

  // Refetch courses when calendar view is loaded to ensure fresh data
  useEffect(() => {
    refetchCourses();
    // Omit refetchCourses from deps to prevent loops on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ending completes the course's enrollments (so it deactivates); reactivating restores them
  const handleSetCourseActive = (courseId: number, isActive: boolean) =>
    setCourseActive.mutateAsync({ id: courseId, active: isActive }).then(() => undefined);

  return <CalendarView courses={courses} onSetCourseActive={handleSetCourseActive} />;
}
