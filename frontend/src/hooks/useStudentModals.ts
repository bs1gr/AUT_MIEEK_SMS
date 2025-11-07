import { useState } from 'react';
import { useModal, type UseModalReturn } from './useModal';

export interface UseStudentModalsReturn {
  // Add modal
  addModal: UseModalReturn;
  
  // Edit modal
  editModal: UseModalReturn;
  
  // Profile viewing
  viewingStudentId: number | null;
  viewProfile: (studentId: number) => void;
  closeProfile: () => void;
  isViewingProfile: boolean;
}

/**
 * Manages all student-related modal states
 * 
 * @example
 * const studentModals = useStudentModals();
 * 
 * // Open add modal
 * <button onClick={studentModals.addModal.open}>Add Student</button>
 * 
 * // View profile
 * <button onClick={() => studentModals.viewProfile(123)}>View</button>
 * 
 * // Check states
 * {studentModals.addModal.isOpen && <AddStudentModal />}
 * {studentModals.isViewingProfile && <StudentProfile />}
 */
export function useStudentModals(): UseStudentModalsReturn {
  const addModal = useModal();
  const editModal = useModal();
  const [viewingStudentId, setViewingStudentId] = useState<number | null>(null);

  const viewProfile = (studentId: number) => {
    setViewingStudentId(studentId);
  };

  const closeProfile = () => {
    setViewingStudentId(null);
  };

  return {
    addModal,
    editModal,
    viewingStudentId,
    viewProfile,
    closeProfile,
    isViewingProfile: viewingStudentId !== null,
  };
}
