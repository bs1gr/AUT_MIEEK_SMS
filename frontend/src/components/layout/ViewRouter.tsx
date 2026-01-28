import { lazy, Suspense, type ReactElement } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { NavigationView } from './Navigation';
import type { Student, Course } from '@/types';
import Spinner from '../ui/Spinner';
import { pageVariants } from '@/utils/animations';

// Lazy load views for better performance
const EnhancedDashboardView = lazy(() => import('@/features/dashboard').then(m => ({ default: m.EnhancedDashboardView })));
const StudentsView = lazy(() => import('@/features/students').then(m => ({ default: m.StudentsView })));
const CoursesView = lazy(() => import('@/features/courses').then(m => ({ default: m.CoursesView })));
const AttendanceView = lazy(() => import('@/features/attendance').then(m => ({ default: m.AttendanceView })));
const GradingView = lazy(() => import('@/features/grading').then(m => ({ default: m.GradingView })));
const CalendarView = lazy(() => import('@/features/calendar').then(m => ({ default: m.CalendarView })));
const OperationsView = lazy(() => import('@/features/operations').then(m => ({ default: m.OperationsView })));

export interface ViewRouterProps {
  activeView: NavigationView;
  students: Student[];
  courses: Course[];
  loading: boolean;

  // Dashboard specific
  dashboardStats?: {
    totalStudents: number;
    activeStudents: number;
    totalCourses: number;
  };

  // Students view specific
  showStudentsView: boolean;
  onAddStudent: () => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (id: number) => Promise<void>;
  onViewProfile: (studentId: number) => void;

  // Courses view specific
  onAddCourse: () => void;
  onEditCourse: (course: Course) => void;
  onDeleteCourse: (courseId: number) => Promise<void>;

  // System view specific (render props pattern) - formerly 'power'
  renderPowerView?: () => ReactElement | null;
}

export default function ViewRouter({
  activeView,
  students,
  courses,
  loading,
  dashboardStats,
  showStudentsView,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onViewProfile,
  onAddCourse,
  onEditCourse,
  onDeleteCourse,
  renderPowerView,
}: ViewRouterProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeView}
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="w-full h-full"
      >
        <Suspense fallback={<Spinner />}>
          {activeView === 'dashboard' && (
            <EnhancedDashboardView
              students={students}
              courses={courses}
              stats={dashboardStats || {
                totalStudents: students.length,
                activeStudents: students.filter((s) => s.is_active !== false).length,
                totalCourses: courses.length,
              }}
            />
          )}

          {activeView === 'students' && (loading ? (
            <Spinner />
          ) : showStudentsView ? (
            <StudentsView
              students={students}
              loading={loading}
              setShowAddModal={onAddStudent}
              onEdit={onEditStudent}
              onDelete={onDeleteStudent}
              onViewProfile={onViewProfile}
            />
          ) : null)}

          {activeView === 'courses' && (
            <CoursesView
              courses={courses}
              loading={loading}
              onAddCourse={onAddCourse}
              onEdit={onEditCourse}
              onDelete={onDeleteCourse}
            />
          )}

          {activeView === 'attendance' && (
            <AttendanceView courses={courses} students={students} />
          )}

          {activeView === 'grading' && (
            <GradingView students={students} courses={courses} />
          )}

          {activeView === 'calendar' && (
            <CalendarView courses={courses} />
          )}

          {activeView === 'operations' && (
            <OperationsView students={students} />
          )}

          {/* Legacy support: 'system' view (formerly 'power') */}
          {(activeView === 'system' || activeView === 'power') && renderPowerView && renderPowerView()}
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}
