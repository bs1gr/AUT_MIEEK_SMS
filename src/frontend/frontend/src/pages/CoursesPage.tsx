import { CoursesView, AddCourseModal, EditCourseModal } from '@/features/courses';
import { SectionErrorBoundary } from '@/components/ErrorBoundaries';
import { useCoursesStore } from '@/stores';
import { useCourses, useCourseModals, useCreateCourse, useUpdateCourse, useDeleteCourse } from '@/hooks';
import { useLanguage } from '@/LanguageContext';
import { useState } from 'react';
import type { Course, CourseFormData } from '@/types';
import Toast from '@/components/ui/Toast';

export default function CoursesPage() {
  const { t } = useLanguage();
  const { isLoading } = useCourses();
  const courses = useCoursesStore((state) => state.courses);
  const selectedCourse = useCoursesStore((state) => state.selectedCourse);
  const selectCourse = useCoursesStore((state) => state.selectCourse);

  const courseModals = useCourseModals();
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const deleteCourse = useDeleteCourse();

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info'): void => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleEditCourse = (course: Course) => {
    selectCourse(course);
    courseModals.editModal.open();
  };

  const handleDeleteCourse = async (courseId: number) => {
    try {
      if (!window.confirm(t('confirmDeleteCourse'))) return;
      await deleteCourse.mutateAsync(courseId);
      showToast(t('courseDeleted'), 'success');
    } catch {
      showToast(t('failedToDeleteCourse'), 'error');
    }
  };

  return (
    <SectionErrorBoundary section="CoursesPage">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <CoursesView
        courses={courses}
        loading={isLoading}
        onAddCourse={courseModals.addModal.open}
        onEdit={handleEditCourse}
        onDelete={handleDeleteCourse}
      />

      {courseModals.addModal.isOpen && (
        <AddCourseModal
          onClose={courseModals.addModal.close}
          onAdd={async (newCourse: CourseFormData) => {
            try {
              await createCourse.mutateAsync(newCourse);
              showToast(t('courseAdded'), 'success');
            } catch {
              showToast(t('failedToAddCourse'), 'error');
            } finally {
              courseModals.addModal.close();
            }
          }}
        />
      )}

      {courseModals.editModal.isOpen && selectedCourse && (
        <EditCourseModal
          course={selectedCourse}
          onClose={courseModals.editModal.close}
          onUpdate={async (updatedCourse: Course) => {
            try {
              await updateCourse.mutateAsync({ id: updatedCourse.id, data: updatedCourse });
              showToast(t('courseUpdated'), 'success');
            } catch {
              showToast(t('failedToUpdateCourse'), 'error');
            } finally {
              courseModals.editModal.close();
            }
          }}
        />
      )}
    </SectionErrorBoundary>
  );
}
