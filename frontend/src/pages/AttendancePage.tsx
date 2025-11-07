
import { AttendanceView } from '@/features/attendance';
import { useStudentsStore, useCoursesStore } from '@/stores';
import { useCourses, useStudents } from '@/hooks';
import React from 'react';

export default function AttendancePage() {
  const students = useStudentsStore((state) => state.students);
  const courses = useCoursesStore((state) => state.courses);

  // Fetch data automatically via React Query
  useCourses();
  useStudents();


  return (
    <AttendanceView students={students} courses={courses} />
  );
}
