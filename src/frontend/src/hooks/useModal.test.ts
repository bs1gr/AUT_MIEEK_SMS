import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModal } from './useModal';

describe('useModal', () => {
  describe('Initial State', () => {
    it('should initialize with isOpen false by default', () => {
      const { result } = renderHook(() => useModal());

      expect(result.current.isOpen).toBe(false);
    });

    it('should initialize with isOpen true when initialState is true', () => {
      const { result } = renderHook(() => useModal(true));

      expect(result.current.isOpen).toBe(true);
    });

    it('should initialize with isOpen false when initialState is explicitly false', () => {
      const { result } = renderHook(() => useModal(false));

      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('Return Interface', () => {
    it('should return all required properties', () => {
      const { result } = renderHook(() => useModal());

      expect(result.current).toHaveProperty('isOpen');
      expect(result.current).toHaveProperty('open');
      expect(result.current).toHaveProperty('close');
      expect(result.current).toHaveProperty('toggle');
    });

    it('should return functions for open, close, and toggle', () => {
      const { result } = renderHook(() => useModal());

      expect(typeof result.current.open).toBe('function');
      expect(typeof result.current.close).toBe('function');
      expect(typeof result.current.toggle).toBe('function');
    });
  });

  describe('open()', () => {
    it('should set isOpen to true when initially closed', () => {
      const { result } = renderHook(() => useModal());

      act(() => {
        result.current.open();
      });

      expect(result.current.isOpen).toBe(true);
    });

    it('should keep isOpen true when already open', () => {
      const { result } = renderHook(() => useModal(true));

      act(() => {
        result.current.open();
      });

      expect(result.current.isOpen).toBe(true);
    });

    it('should be callable multiple times safely', () => {
      const { result } = renderHook(() => useModal());

      act(() => {
        result.current.open();
        result.current.open();
        result.current.open();
      });

      expect(result.current.isOpen).toBe(true);
    });
  });

  describe('close()', () => {
    it('should set isOpen to false when initially open', () => {
      const { result } = renderHook(() => useModal(true));

      act(() => {
        result.current.close();
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('should keep isOpen false when already closed', () => {
      const { result } = renderHook(() => useModal(false));

      act(() => {
        result.current.close();
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('should be callable multiple times safely', () => {
      const { result } = renderHook(() => useModal(true));

      act(() => {
        result.current.close();
        result.current.close();
        result.current.close();
      });

      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('toggle()', () => {
    it('should toggle from false to true', () => {
      const { result } = renderHook(() => useModal(false));

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isOpen).toBe(true);
    });

    it('should toggle from true to false', () => {
      const { result } = renderHook(() => useModal(true));

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('should toggle multiple times correctly', () => {
      const { result } = renderHook(() => useModal(false));

      // false -> true
      act(() => {
        result.current.toggle();
      });
      expect(result.current.isOpen).toBe(true);

      // true -> false
      act(() => {
        result.current.toggle();
      });
      expect(result.current.isOpen).toBe(false);

      // false -> true
      act(() => {
        result.current.toggle();
      });
      expect(result.current.isOpen).toBe(true);
    });
  });

  describe('Function Stability', () => {
    it('should maintain stable function references across re-renders', () => {
      const { result, rerender } = renderHook(() => useModal());

      const initialOpen = result.current.open;
      const initialClose = result.current.close;
      const initialToggle = result.current.toggle;

      rerender();

      expect(result.current.open).toBe(initialOpen);
      expect(result.current.close).toBe(initialClose);
      expect(result.current.toggle).toBe(initialToggle);
    });

    it('should maintain stable function references after state changes', () => {
      const { result } = renderHook(() => useModal());

      const initialOpen = result.current.open;
      const initialClose = result.current.close;
      const initialToggle = result.current.toggle;

      act(() => {
        result.current.open();
      });

      expect(result.current.open).toBe(initialOpen);
      expect(result.current.close).toBe(initialClose);
      expect(result.current.toggle).toBe(initialToggle);
    });
  });

  describe('Complex Workflows', () => {
    it('should handle open -> close -> open sequence', () => {
      const { result } = renderHook(() => useModal());

      expect(result.current.isOpen).toBe(false);

      act(() => {
        result.current.open();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.close();
      });
      expect(result.current.isOpen).toBe(false);

      act(() => {
        result.current.open();
      });
      expect(result.current.isOpen).toBe(true);
    });

    it('should handle toggle -> open -> close sequence', () => {
      const { result } = renderHook(() => useModal(false));

      act(() => {
        result.current.toggle();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.open();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.close();
      });
      expect(result.current.isOpen).toBe(false);
    });

    it('should handle mixed operations correctly', () => {
      const { result } = renderHook(() => useModal());

      act(() => {
        result.current.toggle(); // false -> true
        result.current.close();  // true -> false
        result.current.toggle(); // false -> true
        result.current.open();   // true -> true
        result.current.toggle(); // true -> false
      });

      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('Multiple Instances', () => {
    it('should allow independent modal instances', () => {
      const { result: modal1 } = renderHook(() => useModal());
      const { result: modal2 } = renderHook(() => useModal());

      act(() => {
        modal1.current.open();
      });

      expect(modal1.current.isOpen).toBe(true);
      expect(modal2.current.isOpen).toBe(false);

      act(() => {
        modal2.current.open();
      });

      expect(modal1.current.isOpen).toBe(true);
      expect(modal2.current.isOpen).toBe(true);
    });

    it('should allow different initial states for multiple instances', () => {
      const { result: modal1 } = renderHook(() => useModal(true));
      const { result: modal2 } = renderHook(() => useModal(false));

      expect(modal1.current.isOpen).toBe(true);
      expect(modal2.current.isOpen).toBe(false);
    });
  });
});
