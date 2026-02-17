import { StudentsView, AddStudentModal, EditStudentModal } from '@/features/students';
import { SectionErrorBoundary } from '@/components/ErrorBoundaries';
import { useStudentsStore } from '@/stores';
import { useStudents, useStudentModals, useCreateStudent, useUpdateStudent, useDeleteStudent } from '@/hooks';
import { useLanguage } from '@/LanguageContext';
import { useState } from 'react';
import type { Student, StudentFormData } from '@/types';
import { useNavigate } from 'react-router-dom';
import Toast from '@/components/ui/Toast';
import { coursesAPI, enrollmentsAPI } from '@/api/api';

export default function StudentsPage() {
  const { t } = useLanguage();
  const { isLoading } = useStudents();
  const students = useStudentsStore((state) => state.students);
  const selectedStudent = useStudentsStore((state) => state.selectedStudent);
  const selectStudent = useStudentsStore((state) => state.selectStudent);

  const studentModals = useStudentModals();
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  const navigate = useNavigate();

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info'): void => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleViewProfile = (studentId: number) => {
    navigate(`/students/${studentId}`);
  };

  const handleEditStudent = (student: Student) => {
    selectStudent(student);
    studentModals.editModal.open();
  };

  const handleDeleteStudent = async (id: number) => {
    try {
      if (!window.confirm(t('confirmDeleteStudent'))) return;
      await deleteStudent.mutateAsync(id);
      showToast(t('studentDeleted'), 'success');
    } catch {
      showToast(t('failedToDeleteStudent'), 'error');
    }
  };

  const getCourseNamesForStudent = async (studentId: number): Promise<string[]> => {
    // eslint-disable-next-line testing-library/no-await-sync-queries
    const enrollments = await enrollmentsAPI.getByStudent(studentId);
    if (!enrollments.length) return [];

    const courseIds = Array.from(new Set(enrollments.map((enrollment) => enrollment.course_id)));
    const courses = await coursesAPI.getAll(0, 1000);
    const courseMap = new Map(courses.map((course) => [course.id, course]));

    return courseIds
      .map((courseId) => courseMap.get(courseId))
      .map((course) => course?.course_name || course?.course_code)
      .filter((name): name is string => Boolean(name));
  };

  return (
    <SectionErrorBoundary section="StudentsPage">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <StudentsView
        students={students}
        loading={isLoading}
        setShowAddModal={studentModals.addModal.open}
        onEdit={handleEditStudent}
        onDelete={handleDeleteStudent}
        onViewProfile={handleViewProfile}
      />

      {studentModals.addModal.isOpen && (
        <AddStudentModal
          onClose={studentModals.addModal.close}
          onAdd={async (newStudent: StudentFormData) => {
            try {
              await createStudent.mutateAsync(newStudent);
              showToast(t('studentAdded'), 'success');
            } catch {
              showToast(t('failedToAddStudent'), 'error');
            } finally {
              studentModals.addModal.close();
            }
          }}
        />
      )}

      {studentModals.editModal.isOpen && selectedStudent && (
        <EditStudentModal
          student={selectedStudent}
          onClose={studentModals.editModal.close}
          onUpdate={async (updatedStudent: Student) => {
            try {
              const wasActive = selectedStudent.is_active;
              const willBeInactive = updatedStudent.is_active === false;
              const removedCourseNames =
                wasActive && willBeInactive
                  ? await getCourseNamesForStudent(updatedStudent.id)
                  : [];
              await updateStudent.mutateAsync({ id: updatedStudent.id, data: updatedStudent });
              if (wasActive && willBeInactive) {
                if (removedCourseNames.length) {
                  const courseList = removedCourseNames.map((name) => `• ${name}`).join('\n');
                  showToast(
                    `Student unenrolled from:\n${courseList}`,
                    'success'
                  );
                } else {
                  showToast(t('studentUnenrolledFromCourses'), 'success');
                }
              } else {
                showToast(t('studentUpdated'), 'success');
              }
            } catch {
              showToast(t('failedToUpdateStudent'), 'error');
            } finally {
              studentModals.editModal.close();
            }
          }}
        />
      )}
    </SectionErrorBoundary>
  );
}
