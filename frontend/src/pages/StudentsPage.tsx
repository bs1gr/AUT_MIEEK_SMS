import { StudentsView, AddStudentModal, EditStudentModal } from '@/features/students';
import { SectionErrorBoundary } from '@/components/ErrorBoundaries';
import { useStudentsStore } from '@/stores';
import { useStudents, useStudentModals, useCreateStudent, useUpdateStudent, useDeleteStudent } from '@/hooks';
import { useState } from 'react';
import type { Student, StudentFormData } from '@/types';
import { useNavigate } from 'react-router-dom';
import Toast from '@/components/ui/Toast';

export default function StudentsPage() {
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
      if (!window.confirm('Are you sure you want to delete this student?')) return;
      await deleteStudent.mutateAsync(id);
      showToast('Student deleted successfully!', 'success');
    } catch {
      showToast('Failed to delete student. Please try again.', 'error');
    }
  };

  return (
    <SectionErrorBoundary section="StudentsPage">
      {/* Add page-ready indicator for E2E tests */}
      <div data-testid="students-page-loaded" className="hidden">Loaded</div>
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
              showToast('Student added successfully!', 'success');
            } catch {
              showToast('Failed to add student. Please check the form and try again.', 'error');
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
              await updateStudent.mutateAsync({ id: updatedStudent.id, data: updatedStudent });
              showToast('Student updated successfully!', 'success');
            } catch {
              showToast('Failed to update student. Please try again.', 'error');
            } finally {
              studentModals.editModal.close();
            }
          }}
        />
      )}
    </SectionErrorBoundary>
  );
}
