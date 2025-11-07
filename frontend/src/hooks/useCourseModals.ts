import { useModal, type UseModalReturn } from './useModal';

export interface UseCourseModalsReturn {
  // Add modal
  addModal: UseModalReturn;
  
  // Edit modal
  editModal: UseModalReturn;
}

/**
 * Manages all course-related modal states
 * 
 * @example
 * const courseModals = useCourseModals();
 * 
 * // Open modals
 * <button onClick={courseModals.addModal.open}>Add Course</button>
 * <button onClick={courseModals.editModal.open}>Edit Course</button>
 * 
 * // Render modals
 * {courseModals.addModal.isOpen && <AddCourseModal onClose={courseModals.addModal.close} />}
 * {courseModals.editModal.isOpen && <EditCourseModal onClose={courseModals.editModal.close} />}
 */
export function useCourseModals(): UseCourseModalsReturn {
  const addModal = useModal();
  const editModal = useModal();

  return {
    addModal,
    editModal,
  };
}
