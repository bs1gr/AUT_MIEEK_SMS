import { useState, useEffect } from 'react';
import { StudentProfile, AddStudentModal, EditStudentModal } from '@/features/students';
import { AddCourseModal, EditCourseModal } from '@/features/courses';
import Toast from './components/ui/Toast';
import LanguageSwitcher from './components/LanguageSwitcher';
import ServerControl from './components/common/ServerControl';
import ControlPanel from './components/ControlPanel';
import { Navigation, ViewRouter, type NavigationView } from './components/layout';
import { useLanguage } from './LanguageContext';
import { useTranslation } from 'react-i18next';

// Import React Query hooks and stores
import { useStudents, useCreateStudent, useUpdateStudent, useDeleteStudent } from '@/hooks';
import { useCourses, useCreateCourse, useUpdateCourse, useDeleteCourse } from '@/hooks';
import { useStudentModals, useCourseModals } from '@/hooks';
import { useStudentsStore, useCoursesStore } from '@/stores';

import type { Student, Course, StudentFormData, CourseFormData } from '@/types';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

const StudentManagementApp = () => {
  const { t } = useLanguage();
  const { t: ti18n } = useTranslation(); // i18n translation function

  // Use React Query hooks for data fetching
  const { isLoading: studentsLoading, refetch: refetchStudents } = useStudents();
  const { isLoading: coursesLoading, refetch: refetchCourses } = useCourses();

  // Get data from Zustand stores
  const students = useStudentsStore((state) => state.students);
  const courses = useCoursesStore((state) => state.courses);
  const selectedStudent = useStudentsStore((state) => state.selectedStudent);
  const selectedCourse = useCoursesStore((state) => state.selectedCourse);
  const selectStudent = useStudentsStore((state) => state.selectStudent);
  const selectCourse = useCoursesStore((state) => state.selectCourse);

  // Mutations
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const deleteCourse = useDeleteCourse();

  // Modal management hooks
  const studentModals = useStudentModals();
  const courseModals = useCourseModals();

  const loading = studentsLoading || coursesLoading;
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info'): void => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Determine initial view from URL (hash or ?view=)
  const getInitialView = (): NavigationView => {
    try {
      const hash = (window.location.hash || '').replace('#', '').trim().toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const queryView = (params.get('view') || '').trim().toLowerCase();
      const v = hash || queryView || 'dashboard';
      const allowed = new Set<string>(['dashboard','students','courses','attendance','grading','calendar','operations','power']);
      return allowed.has(v) ? v as NavigationView : 'dashboard';
    } catch {
      return 'dashboard';
    }
  };

  const [activeView, setActiveView] = useState<NavigationView>(getInitialView());

  // Keep URL hash in sync and respond to external hash changes (deep-linking)
  useEffect(() => {
    const onHashChange = () => {
      const hashView = (window.location.hash || '').replace('#','').trim().toLowerCase();
      if (!hashView) return;
      const allowed = new Set<string>(['dashboard','students','courses','attendance','grading','calendar','operations','power']);
      if (allowed.has(hashView)) {
        setActiveView(hashView as NavigationView);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Refetch courses when navigating to calendar view to ensure fresh data
  useEffect(() => {
    if (activeView === 'calendar') {
      refetchCourses();
    }
  }, [activeView, refetchCourses]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header with Title and Language Toggle */}
      <div className="flex items-center justify-between pb-4">
        <h1 className="text-3xl font-bold text-gray-800">{t('systemTitle')}</h1>
        <div className="flex items-center space-x-4">
          <LanguageSwitcher />
        </div>
      </div>

      {/* Top Navigation */}
      <Navigation
        activeView={activeView}
        onViewChange={setActiveView}
        tabs={[
          { key: 'dashboard', label: t('dashboard') },
          { key: 'attendance', label: t('attendance') },
          { key: 'grading', label: t('grades') },
          { key: 'students', label: t('students') },
          { key: 'courses', label: t('courses') },
          { key: 'calendar', label: t('calendar') },
          { key: 'operations', label: t('utilsTab') },
          { key: 'power', label: t('powerTab') || 'Power' },
        ]}
      />


      {/* Views */}
      {activeView === 'students' && studentModals.isViewingProfile ? (
        <StudentProfile
          studentId={studentModals.viewingStudentId!}
          onBack={studentModals.closeProfile}
        />
      ) : (
        <ViewRouter
          activeView={activeView}
          students={students}
          courses={courses}
          loading={loading}
          showStudentsView={!studentModals.isViewingProfile}
          onAddStudent={studentModals.addModal.open}
          onEditStudent={(student: Student) => {
            selectStudent(student);
            studentModals.editModal.open();
          }}
          onDeleteStudent={async (id: number) => {
            try {
              if (!window.confirm('Are you sure you want to delete this student?')) return;
              await deleteStudent.mutateAsync(id);
              showToast('Student deleted successfully!', 'success');
            } catch (error) {
              showToast('Failed to delete student. Please try again.', 'error');
            }
          }}
          onViewProfile={studentModals.viewProfile}
          onAddCourse={courseModals.addModal.open}
          onEditCourse={(course: Course) => {
            selectCourse(course);
            courseModals.editModal.open();
          }}
          onDeleteCourse={async (courseId: number) => {
            try {
              if (!window.confirm('Are you sure you want to delete this course?')) return;
              await deleteCourse.mutateAsync(courseId);
              showToast('Course deleted successfully!', 'success');
            } catch (error) {
              showToast('Failed to delete course. Please try again.', 'error');
            }
          }}
          renderPowerView={() => (
            <div className="space-y-6">
              <div className="bg-white border rounded-xl p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('controlPanel.title')}</h2>
                <ServerControl />
              </div>
              <ControlPanel />
            </div>
          )}
        />
      )}

      {/* Modals */}
      {activeView === 'students' && studentModals.addModal.isOpen && (
        <AddStudentModal
          onClose={studentModals.addModal.close}
          onAdd={async (newStudent: StudentFormData) => {
            try {
              await createStudent.mutateAsync(newStudent);
              showToast('Student added successfully!', 'success');
            } catch (error) {
              showToast('Failed to add student. Please check the form and try again.', 'error');
            } finally {
              studentModals.addModal.close();
            }
          }}
        />
      )}

      {activeView === 'students' && studentModals.editModal.isOpen && selectedStudent && (
        <EditStudentModal
          student={selectedStudent}
          onClose={studentModals.editModal.close}
          onUpdate={async (updatedStudent: Student) => {
            try {
              await updateStudent.mutateAsync({ id: updatedStudent.id, data: updatedStudent });
              showToast('Student updated successfully!', 'success');
            } catch (error) {
              showToast('Failed to update student. Please try again.', 'error');
            } finally {
              studentModals.editModal.close();
            }
          }}
        />
      )}

      {activeView === 'courses' && courseModals.addModal.isOpen && (
        <AddCourseModal
          onClose={courseModals.addModal.close}
          onAdd={async (newCourse: CourseFormData) => {
            try {
              await createCourse.mutateAsync(newCourse);
              showToast('Course added successfully!', 'success');
            } catch (error) {
              showToast('Failed to add course. Please try again.', 'error');
            } finally {
              courseModals.addModal.close();
            }
          }}
        />
      )}

      {activeView === 'courses' && courseModals.editModal.isOpen && selectedCourse && (
        <EditCourseModal
          course={selectedCourse}
          onClose={courseModals.editModal.close}
          onUpdate={async (updatedCourse: Course) => {
            try {
              await updateCourse.mutateAsync({ id: updatedCourse.id, data: updatedCourse });
              showToast('Course updated successfully!', 'success');
            } catch (error) {
              showToast('Failed to update course. Please try again.', 'error');
            } finally {
              courseModals.editModal.close();
            }
          }}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default StudentManagementApp;
