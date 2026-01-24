import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { useStudents } from '@/hooks/useStudentsQuery';
import VirtualStudentList from '@/components/VirtualStudentList';
import StudentForm from './StudentForm';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { AdvancedFilters } from '../search/AdvancedFilters';
import { useErrorRecovery } from '../../hooks/useErrorRecovery';
import ErrorRetry from '../../components/common/ErrorRetry';
import { Student } from '@/types/student';

const StudentsView: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const studentsQuery = useStudents();
  const { data: students, isLoading, error: apiError, refetch } = studentsQuery;
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Integrate Smart Error Recovery
  const { error, handleError, isRetrying, reset } = useErrorRecovery({
    strategy: 'backoff',
    maxRetries: 3,
    onRetry: async () => {
      await refetch();
    }
  });

  // Sync API error with recovery hook
  useEffect(() => {
    if (apiError) {
      handleError(apiError instanceof Error ? apiError : new Error('Unknown error'));
    } else {
      reset();
    }
  }, [apiError, handleError, reset]);

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setIsFormOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm(t('students.confirmDelete'))) {
      // TODO: Implement delete via mutation
      console.log('Delete student:', id);
      refetch();
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingStudent(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('students.title')}</h1>
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          <span>{t('students.addStudent')}</span>
        </button>
      </div>

      <AdvancedFilters searchType="students" className="mb-6" />

      {error ? (
        <ErrorRetry
          message={error.message}
          onRetry={() => handleError(error)} // Trigger manual retry via hook logic
          isRetrying={isRetrying}
        />
      ) : isLoading ? (
        <div className="bg-white shadow rounded-lg p-6">
          <SkeletonLoader rows={10} />
        </div>
      ) : (
        <VirtualStudentList
          students={students || []}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={(id: any) => navigate(`/students/${id}`)}
          height={600}
        />
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingStudent ? t('students.editStudent') : t('students.addStudent')}
            </h2>
            <StudentForm
              initialData={editingStudent || undefined}
              onSubmit={async (data) => {
                if (editingStudent) {
                  // TODO: Implement update via mutation
                  console.log('Update student:', editingStudent.id, data);
                } else {
                  // TODO: Implement create via mutation
                  console.log('Create student:', data);
                }
                handleCloseForm();
                refetch();
              }}
              onCancel={handleCloseForm}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsView;
