import { useState, useCallback } from 'react';

export interface UseModalReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Generic modal management hook
 *
 * @example
 * const addModal = useModal();
 * const editModal = useModal();
 *
 * // Later in JSX:
 * <button onClick={addModal.open}>Add</button>
 * {addModal.isOpen && <Modal onClose={addModal.close}>...</Modal>}
 */
export function useModal(initialState = false): UseModalReturn {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}
