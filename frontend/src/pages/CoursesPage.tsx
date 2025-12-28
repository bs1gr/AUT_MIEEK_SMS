import { CoursesView, AddCourseModal, EditCourseModal } from '@/features/courses';
import { SectionErrorBoundary } from '@/components/ErrorBoundaries';
import { useCoursesStore } from '@/stores';
import { useCourses, useCourseModals, useCreateCourse, useUpdateCourse, useDeleteCourse } from '@/hooks';
import { useState } from 'react';
import type { Course, CourseFormData } from '@/types';
import Toast from '@/components/ui/Toast';

export default function CoursesPage() {
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
      if (!window.confirm('Are you sure you want to delete this course?')) return;
      await deleteCourse.mutateAsync(courseId);
      showToast('Course deleted successfully!', 'success');
    } catch {
      showToast('Failed to delete course. Please try again.', 'error');
    }
  };

  return (
    <SectionErrorBoundary section="CoursesPage">
      {/* Add page-ready indicator for E2E tests */}
      <div data-testid="courses-page-loaded" className="hidden">Loaded</div>
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
              showToast('Course added successfully!', 'success');
            } catch {
              showToast('Failed to add course. Please try again.', 'error');
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
              showToast('Course updated successfully!', 'success');
            } catch {
              showToast('Failed to update course. Please try again.', 'error');
            } finally {
              courseModals.editModal.close();
            }
          }}
        />
      )}
    </SectionErrorBoundary>
  );
}
