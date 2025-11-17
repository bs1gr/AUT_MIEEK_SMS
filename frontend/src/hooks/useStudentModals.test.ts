import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStudentModals } from './useStudentModals';

describe('useStudentModals', () => {
  describe('Initial State', () => {
    it('should initialize with all modals closed', () => {
      const { result } = renderHook(() => useStudentModals());

      expect(result.current.addModal.isOpen).toBe(false);
      expect(result.current.editModal.isOpen).toBe(false);
    });

    it('should initialize with no viewing student', () => {
      const { result } = renderHook(() => useStudentModals());

      expect(result.current.viewingStudentId).toBe(null);
      expect(result.current.isViewingProfile).toBe(false);
    });

    it('should return all required properties', () => {
      const { result } = renderHook(() => useStudentModals());

      expect(result.current).toHaveProperty('addModal');
      expect(result.current).toHaveProperty('editModal');
      expect(result.current).toHaveProperty('viewingStudentId');
      expect(result.current).toHaveProperty('viewProfile');
      expect(result.current).toHaveProperty('closeProfile');
      expect(result.current).toHaveProperty('isViewingProfile');
    });
  });

  describe('Add Modal', () => {
    it('should provide useModal interface for addModal', () => {
      const { result } = renderHook(() => useStudentModals());

      expect(result.current.addModal).toHaveProperty('isOpen');
      expect(result.current.addModal).toHaveProperty('open');
      expect(result.current.addModal).toHaveProperty('close');
      expect(result.current.addModal).toHaveProperty('toggle');
    });

    it('should open add modal', () => {
      const { result } = renderHook(() => useStudentModals());

      act(() => {
        result.current.addModal.open();
      });

      expect(result.current.addModal.isOpen).toBe(true);
    });

    it('should close add modal', () => {
      const { result } = renderHook(() => useStudentModals());

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
      const { result } = renderHook(() => useStudentModals());

      act(() => {
        result.current.addModal.toggle();
      });
      expect(result.current.addModal.isOpen).toBe(true);

      act(() => {
        result.current.addModal.toggle();
      });
      expect(result.current.addModal.isOpen).toBe(false);
    });
  });

  describe('Edit Modal', () => {
    it('should provide useModal interface for editModal', () => {
      const { result } = renderHook(() => useStudentModals());

      expect(result.current.editModal).toHaveProperty('isOpen');
      expect(result.current.editModal).toHaveProperty('open');
      expect(result.current.editModal).toHaveProperty('close');
      expect(result.current.editModal).toHaveProperty('toggle');
    });

    it('should open edit modal', () => {
      const { result } = renderHook(() => useStudentModals());

      act(() => {
        result.current.editModal.open();
      });

      expect(result.current.editModal.isOpen).toBe(true);
    });

    it('should close edit modal', () => {
      const { result } = renderHook(() => useStudentModals());

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
      const { result } = renderHook(() => useStudentModals());

      act(() => {
        result.current.editModal.toggle();
      });
      expect(result.current.editModal.isOpen).toBe(true);

      act(() => {
        result.current.editModal.toggle();
      });
      expect(result.current.editModal.isOpen).toBe(false);
    });
  });

  describe('Profile Viewing', () => {
    it('should set viewingStudentId when viewProfile is called', () => {
      const { result } = renderHook(() => useStudentModals());

      act(() => {
        result.current.viewProfile(123);
      });

      expect(result.current.viewingStudentId).toBe(123);
      expect(result.current.isViewingProfile).toBe(true);
    });

    it('should clear viewingStudentId when closeProfile is called', () => {
      const { result } = renderHook(() => useStudentModals());

      act(() => {
        result.current.viewProfile(456);
      });
      expect(result.current.viewingStudentId).toBe(456);

      act(() => {
        result.current.closeProfile();
      });

      expect(result.current.viewingStudentId).toBe(null);
      expect(result.current.isViewingProfile).toBe(false);
    });

    it('should update isViewingProfile when viewing student', () => {
      const { result } = renderHook(() => useStudentModals());

      expect(result.current.isViewingProfile).toBe(false);

      act(() => {
        result.current.viewProfile(789);
      });

      expect(result.current.isViewingProfile).toBe(true);
    });

    it('should handle multiple viewProfile calls', () => {
      const { result } = renderHook(() => useStudentModals());

      act(() => {
        result.current.viewProfile(100);
      });
      expect(result.current.viewingStudentId).toBe(100);

      act(() => {
        result.current.viewProfile(200);
      });
      expect(result.current.viewingStudentId).toBe(200);

      act(() => {
        result.current.viewProfile(300);
      });
      expect(result.current.viewingStudentId).toBe(300);
    });

    it('should handle closeProfile when no profile is open', () => {
      const { result } = renderHook(() => useStudentModals());

      act(() => {
        result.current.closeProfile();
      });

      expect(result.current.viewingStudentId).toBe(null);
      expect(result.current.isViewingProfile).toBe(false);
    });

    it('should accept different student ID types', () => {
      const { result } = renderHook(() => useStudentModals());

      act(() => {
        result.current.viewProfile(0);
      });
      expect(result.current.viewingStudentId).toBe(0);
      expect(result.current.isViewingProfile).toBe(true);
    });
  });

  describe('Modal Independence', () => {
    it('should allow add and edit modals to be open simultaneously', () => {
      const { result } = renderHook(() => useStudentModals());

      act(() => {
        result.current.addModal.open();
        result.current.editModal.open();
      });

      expect(result.current.addModal.isOpen).toBe(true);
      expect(result.current.editModal.isOpen).toBe(true);
    });

    it('should not affect other modals when closing one', () => {
      const { result } = renderHook(() => useStudentModals());

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

    it('should not affect modals when viewing profile', () => {
      const { result } = renderHook(() => useStudentModals());

      act(() => {
        result.current.addModal.open();
        result.current.viewProfile(123);
      });

      expect(result.current.addModal.isOpen).toBe(true);
      expect(result.current.viewingStudentId).toBe(123);
    });

    it('should not affect profile viewing when toggling modals', () => {
      const { result } = renderHook(() => useStudentModals());

      act(() => {
        result.current.viewProfile(456);
        result.current.editModal.toggle();
      });

      expect(result.current.viewingStudentId).toBe(456);
      expect(result.current.editModal.isOpen).toBe(true);
    });
  });

  describe('Complex Workflows', () => {
    it('should handle typical add student workflow', () => {
      const { result } = renderHook(() => useStudentModals());

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

    it('should handle typical edit student workflow', () => {
      const { result } = renderHook(() => useStudentModals());

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

    it('should handle typical view profile workflow', () => {
      const { result } = renderHook(() => useStudentModals());

      // View student profile
      act(() => {
        result.current.viewProfile(789);
      });
      expect(result.current.isViewingProfile).toBe(true);
      expect(result.current.viewingStudentId).toBe(789);

      // Close profile
      act(() => {
        result.current.closeProfile();
      });
      expect(result.current.isViewingProfile).toBe(false);
      expect(result.current.viewingStudentId).toBe(null);
    });

    it('should handle view -> edit workflow', () => {
      const { result } = renderHook(() => useStudentModals());

      // View profile
      act(() => {
        result.current.viewProfile(111);
      });
      expect(result.current.isViewingProfile).toBe(true);

      // Open edit modal (profile still visible)
      act(() => {
        result.current.editModal.open();
      });
      expect(result.current.editModal.isOpen).toBe(true);
      expect(result.current.viewingStudentId).toBe(111);

      // Close edit, then close profile
      act(() => {
        result.current.editModal.close();
        result.current.closeProfile();
      });
      expect(result.current.editModal.isOpen).toBe(false);
      expect(result.current.isViewingProfile).toBe(false);
    });

    it('should handle switching between different student profiles', () => {
      const { result } = renderHook(() => useStudentModals());

      act(() => {
        result.current.viewProfile(1);
      });
      expect(result.current.viewingStudentId).toBe(1);

      act(() => {
        result.current.viewProfile(2);
      });
      expect(result.current.viewingStudentId).toBe(2);

      act(() => {
        result.current.viewProfile(3);
      });
      expect(result.current.viewingStudentId).toBe(3);
    });
  });

  describe('Function Stability', () => {
    it('should maintain stable modal function references', () => {
      const { result, rerender } = renderHook(() => useStudentModals());

      const initialAddOpen = result.current.addModal.open;
      const initialEditClose = result.current.editModal.close;

      rerender();

      expect(result.current.addModal.open).toBe(initialAddOpen);
      expect(result.current.editModal.close).toBe(initialEditClose);
    });
  });
});
