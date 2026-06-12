import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCourseModals } from './useCourseModals';

describe('useCourseModals', () => {
  describe('Initial State', () => {
    it('should initialize with all modals closed', () => {
      const { result } = renderHook(() => useCourseModals());

      expect(result.current.addModal.isOpen).toBe(false);
      expect(result.current.editModal.isOpen).toBe(false);
    });

    it('should return all required properties', () => {
      const { result } = renderHook(() => useCourseModals());

      expect(result.current).toHaveProperty('addModal');
      expect(result.current).toHaveProperty('editModal');
    });
  });

  describe('Add Modal', () => {
    it('should provide useModal interface for addModal', () => {
      const { result } = renderHook(() => useCourseModals());

      expect(result.current.addModal).toHaveProperty('isOpen');
      expect(result.current.addModal).toHaveProperty('open');
      expect(result.current.addModal).toHaveProperty('close');
      expect(result.current.addModal).toHaveProperty('toggle');
    });

    it('should open add modal', () => {
      const { result } = renderHook(() => useCourseModals());

      act(() => {
        result.current.addModal.open();
      });

      expect(result.current.addModal.isOpen).toBe(true);
    });

    it('should close add modal', () => {
      const { result } = renderHook(() => useCourseModals());

      act(() => {
        result.current.addModal.open();
      });
      expect(result.current.addModal.isOpen).toBe(true);

      act(() => {
        result.current.addModal.close();
      });
      expect(result.current.addModal.isOpen).toBe(false);
    });

    it('should toggle add modal', () => {
      const { result } = renderHook(() => useCourseModals());

      act(() => {
        result.current.addModal.toggle();
      });
      expect(result.current.addModal.isOpen).toBe(true);

      act(() => {
        result.current.addModal.toggle();
      });
      expect(result.current.addModal.isOpen).toBe(false);
    });

    it('should handle multiple open calls', () => {
      const { result } = renderHook(() => useCourseModals());

      act(() => {
        result.current.addModal.open();
        result.current.addModal.open();
      });

      expect(result.current.addModal.isOpen).toBe(true);
    });

    it('should handle multiple close calls', () => {
      const { result } = renderHook(() => useCourseModals());

      act(() => {
        result.current.addModal.open();
      });

      act(() => {
        result.current.addModal.close();
        result.current.addModal.close();
      });

      expect(result.current.addModal.isOpen).toBe(false);
    });
  });

  describe('Edit Modal', () => {
    it('should provide useModal interface for editModal', () => {
      const { result } = renderHook(() => useCourseModals());

      expect(result.current.editModal).toHaveProperty('isOpen');
      expect(result.current.editModal).toHaveProperty('open');
      expect(result.current.editModal).toHaveProperty('close');
      expect(result.current.editModal).toHaveProperty('toggle');
    });

    it('should open edit modal', () => {
      const { result } = renderHook(() => useCourseModals());

      act(() => {
        result.current.editModal.open();
      });

      expect(result.current.editModal.isOpen).toBe(true);
    });

    it('should close edit modal', () => {
      const { result } = renderHook(() => useCourseModals());

      act(() => {
        result.current.editModal.open();
      });
      expect(result.current.editModal.isOpen).toBe(true);

      act(() => {
        result.current.editModal.close();
      });
      expect(result.current.editModal.isOpen).toBe(false);
    });

    it('should toggle edit modal', () => {
      const { result } = renderHook(() => useCourseModals());

      act(() => {
        result.current.editModal.toggle();
      });
      expect(result.current.editModal.isOpen).toBe(true);

      act(() => {
        result.current.editModal.toggle();
      });
      expect(result.current.editModal.isOpen).toBe(false);
    });

    it('should handle multiple open calls', () => {
      const { result } = renderHook(() => useCourseModals());

      act(() => {
        result.current.editModal.open();
        result.current.editModal.open();
      });

      expect(result.current.editModal.isOpen).toBe(true);
    });

    it('should handle multiple close calls', () => {
      const { result } = renderHook(() => useCourseModals());

      act(() => {
        result.current.editModal.open();
      });

      act(() => {
        result.current.editModal.close();
        result.current.editModal.close();
      });

      expect(result.current.editModal.isOpen).toBe(false);
    });
  });

  describe('Modal Independence', () => {
    it('should allow add and edit modals to be open simultaneously', () => {
      const { result } = renderHook(() => useCourseModals());

      act(() => {
        result.current.addModal.open();
        result.current.editModal.open();
      });

      expect(result.current.addModal.isOpen).toBe(true);
      expect(result.current.editModal.isOpen).toBe(true);
    });

    it('should not affect edit modal when closing add modal', () => {
      const { result } = renderHook(() => useCourseModals());

      act(() => {
        result.current.addModal.open();
        result.current.editModal.open();
      });

      act(() => {
        result.current.addModal.close();
      });

      expect(result.current.addModal.isOpen).toBe(false);
      expect(result.current.editModal.isOpen).toBe(true);
    });

    it('should not affect add modal when closing edit modal', () => {
      const { result } = renderHook(() => useCourseModals());

      act(() => {
        result.current.addModal.open();
        result.current.editModal.open();
      });

      act(() => {
        result.current.editModal.close();
      });

      expect(result.current.addModal.isOpen).toBe(true);
      expect(result.current.editModal.isOpen).toBe(false);
    });

    it('should not affect add modal when toggling edit modal', () => {
      const { result } = renderHook(() => useCourseModals());

      act(() => {
        result.current.addModal.open();
        result.current.editModal.toggle();
      });

      expect(result.current.addModal.isOpen).toBe(true);
      expect(result.current.editModal.isOpen).toBe(true);

      act(() => {
        result.current.editModal.toggle();
      });

      expect(result.current.addModal.isOpen).toBe(true);
      expect(result.current.editModal.isOpen).toBe(false);
    });

    it('should not affect edit modal when toggling add modal', () => {
      const { result } = renderHook(() => useCourseModals());

      act(() => {
        result.current.editModal.open();
        result.current.addModal.toggle();
      });

      expect(result.current.editModal.isOpen).toBe(true);
      expect(result.current.addModal.isOpen).toBe(true);

      act(() => {
        result.current.addModal.toggle();
      });

      expect(result.current.editModal.isOpen).toBe(true);
      expect(result.current.addModal.isOpen).toBe(false);
    });
  });

  describe('Complex Workflows', () => {
    it('should handle typical add course workflow', () => {
      const { result } = renderHook(() => useCourseModals());

      // Open add modal
      act(() => {
        result.current.addModal.open();
      });
      expect(result.current.addModal.isOpen).toBe(true);

      // Close after adding
      act(() => {
        result.current.addModal.close();
      });
      expect(result.current.addModal.isOpen).toBe(false);
    });

    it('should handle typical edit course workflow', () => {
      const { result } = renderHook(() => useCourseModals());

      // Open edit modal
      act(() => {
        result.current.editModal.open();
      });
      expect(result.current.editModal.isOpen).toBe(true);

      // Close after editing
      act(() => {
        result.current.editModal.close();
      });
      expect(result.current.editModal.isOpen).toBe(false);
    });

    it('should handle open -> close -> reopen for same modal', () => {
      const { result } = renderHook(() => useCourseModals());

      act(() => {
        result.current.addModal.open();
      });
      expect(result.current.addModal.isOpen).toBe(true);

      act(() => {
        result.current.addModal.close();
      });
      expect(result.current.addModal.isOpen).toBe(false);

      act(() => {
        result.current.addModal.open();
      });
      expect(result.current.addModal.isOpen).toBe(true);
    });

    it('should handle alternating between add and edit modals', () => {
      const { result } = renderHook(() => useCourseModals());

      // Open add
      act(() => {
        result.current.addModal.open();
      });
      expect(result.current.addModal.isOpen).toBe(true);

      // Switch to edit
      act(() => {
        result.current.addModal.close();
        result.current.editModal.open();
      });
      expect(result.current.addModal.isOpen).toBe(false);
      expect(result.current.editModal.isOpen).toBe(true);

      // Switch back to add
      act(() => {
        result.current.editModal.close();
        result.current.addModal.open();
      });
      expect(result.current.editModal.isOpen).toBe(false);
      expect(result.current.addModal.isOpen).toBe(true);
    });

    it('should handle rapid toggle operations', () => {
      const { result } = renderHook(() => useCourseModals());

      act(() => {
        result.current.addModal.toggle(); // open
        result.current.addModal.toggle(); // close
        result.current.addModal.toggle(); // open
      });

      expect(result.current.addModal.isOpen).toBe(true);
    });

    it('should handle mixed operations on both modals', () => {
      const { result } = renderHook(() => useCourseModals());

      act(() => {
        result.current.addModal.open();
        result.current.editModal.toggle();
        result.current.addModal.close();
        result.current.editModal.open();
      });

      expect(result.current.addModal.isOpen).toBe(false);
      expect(result.current.editModal.isOpen).toBe(true);
    });
  });

  describe('Function Stability', () => {
    it('should maintain stable function references across re-renders', () => {
      const { result, rerender } = renderHook(() => useCourseModals());

      const initialAddOpen = result.current.addModal.open;
      const initialAddClose = result.current.addModal.close;
      const initialEditOpen = result.current.editModal.open;
      const initialEditClose = result.current.editModal.close;

      rerender();

      expect(result.current.addModal.open).toBe(initialAddOpen);
      expect(result.current.addModal.close).toBe(initialAddClose);
      expect(result.current.editModal.open).toBe(initialEditOpen);
      expect(result.current.editModal.close).toBe(initialEditClose);
    });

    it('should maintain stable function references after state changes', () => {
      const { result } = renderHook(() => useCourseModals());

      const initialAddOpen = result.current.addModal.open;
      const initialEditToggle = result.current.editModal.toggle;

      act(() => {
        result.current.addModal.open();
        result.current.editModal.toggle();
      });

      expect(result.current.addModal.open).toBe(initialAddOpen);
      expect(result.current.editModal.toggle).toBe(initialEditToggle);
    });
  });

  describe('Multiple Hook Instances', () => {
    it('should allow independent hook instances', () => {
      const { result: instance1 } = renderHook(() => useCourseModals());
      const { result: instance2 } = renderHook(() => useCourseModals());

      act(() => {
        instance1.current.addModal.open();
      });

      expect(instance1.current.addModal.isOpen).toBe(true);
      expect(instance2.current.addModal.isOpen).toBe(false);
    });

    it('should not share state between instances', () => {
      const { result: instance1 } = renderHook(() => useCourseModals());
      const { result: instance2 } = renderHook(() => useCourseModals());

      act(() => {
        instance1.current.addModal.open();
        instance1.current.editModal.open();
      });

      act(() => {
        instance2.current.addModal.toggle();
      });

      expect(instance1.current.addModal.isOpen).toBe(true);
      expect(instance1.current.editModal.isOpen).toBe(true);
      expect(instance2.current.addModal.isOpen).toBe(true);
      expect(instance2.current.editModal.isOpen).toBe(false);
    });
  });
});
