import { renderHook, act } from '@testing-library/react';
import { useAutosave } from './useAutosave';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('useAutosave hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should initialize with default state', () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() => useAutosave(mockSave, []));

      expect(result.current.isSaving).toBe(false);
      expect(result.current.isPending).toBe(false);
      expect(result.current.lastSaved).toBeNull();
      expect(typeof result.current.saveNow).toBe('function');
    });

    it('should skip initial save by default', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);

      renderHook(() => useAutosave(mockSave, ['initial'], { skipInitial: true }));

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(mockSave).not.toHaveBeenCalled();
    });

    it('should perform initial save when skipInitial is false', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useAutosave(mockSave, ['initial'], { skipInitial: false })
      );

      expect(result.current.isPending).toBe(true);

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockSave).toHaveBeenCalledTimes(1);
    });
  });

  describe('debounce behavior', () => {
    it('should debounce saves with default delay', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);

      const { result, rerender } = renderHook(
        ({ deps }) => useAutosave(mockSave, deps, { skipInitial: false }),
        { initialProps: { deps: ['value1'] } }
      );

      // Initial render
      expect(result.current.isPending).toBe(true);

      // Change before debounce fires
      act(() => {
        vi.advanceTimersByTime(500);
      });

      rerender({ deps: ['value2'] });

      expect(result.current.isPending).toBe(true);
      expect(mockSave).not.toHaveBeenCalled();

      // Change again before debounce fires
      act(() => {
        vi.advanceTimersByTime(500);
      });

      rerender({ deps: ['value3'] });

      expect(result.current.isPending).toBe(true);
      expect(mockSave).not.toHaveBeenCalled();

      // Wait for debounce to complete
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(result.current.isPending).toBe(false);
    });

    it('should respect custom delay', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useAutosave(mockSave, ['value'], { delay: 500, skipInitial: false })
      );

      expect(result.current.isPending).toBe(true);

      // Advance past half the delay
      act(() => {
        vi.advanceTimersByTime(250);
      });

      expect(mockSave).not.toHaveBeenCalled();

      // Advance to full delay
      act(() => {
        vi.advanceTimersByTime(250);
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('should clear pending state after save', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useAutosave(mockSave, ['value'], { skipInitial: false })
      );

      expect(result.current.isPending).toBe(true);

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.isPending).toBe(false);
    });
  });

  describe('save execution', () => {
    it('should call save function when debounce completes', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);

      renderHook(() => useAutosave(mockSave, ['value'], { skipInitial: false }));

      expect(mockSave).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('should update lastSaved timestamp on successful save', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useAutosave(mockSave, ['value'], { skipInitial: false })
      );

      expect(result.current.lastSaved).toBeNull();

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.lastSaved).not.toBeNull();
      expect(result.current.lastSaved).toBeInstanceOf(Date);
    });

    it('should set isSaving during save', async () => {
      let resolveSave: (() => void) | null = null;
      const savePromise = new Promise<void>((resolve) => {
        resolveSave = resolve;
      });

      const mockSave = vi.fn().mockReturnValue(savePromise);

      const { result } = renderHook(() =>
        useAutosave(mockSave, ['value'], { skipInitial: false })
      );

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Should be saving now
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.isSaving).toBe(true);

      // Resolve the save
      act(() => {
        if (resolveSave) {
          resolveSave();
        }
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.isSaving).toBe(false);
    });

    it('should prevent concurrent saves', async () => {
      let resolveFirstSave: (() => void) | null = null;
      const firstSavePromise = new Promise<void>((resolve) => {
        resolveFirstSave = resolve;
      });

      const mockSave = vi
        .fn()
        .mockReturnValueOnce(firstSavePromise)
        .mockResolvedValueOnce(undefined);

      const { result, rerender } = renderHook(
        ({ deps }) => useAutosave(mockSave, deps, { skipInitial: false, delay: 100 }),
        { initialProps: { deps: ['value1'] } }
      );

      act(() => {
        vi.advanceTimersByTime(100);
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.isSaving).toBe(true);

      // Try to trigger another save while first is in progress
      rerender({ deps: ['value2'] });

      // Should still only be one call
      expect(mockSave).toHaveBeenCalledTimes(1);

      // Resolve first save
      act(() => {
        if (resolveFirstSave) {
          resolveFirstSave();
        }
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(result.current.isSaving).toBe(false);
    });
  });

  describe('saveNow', () => {
    it('should save immediately without debounce', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useAutosave(mockSave, ['value'], { delay: 5000, skipInitial: true })
      );

      act(() => {
        result.current.saveNow();
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockSave).toHaveBeenCalledTimes(1);

      // No further saves should occur
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('should clear pending debounce when saveNow is called', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(
        ({ deps }) =>
          useAutosave(mockSave, deps, {
            delay: 2000,
            skipInitial: false,
          }),
        { initialProps: { deps: ['value1'] } }
      );

      expect(result.current.isPending).toBe(true);

      // Advance partially
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Save immediately
      act(() => {
        result.current.saveNow();
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(result.current.isPending).toBe(false);

      // Verify debounce was cleared (no additional save)
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('should handle errors in saveNow', async () => {
      const testError = new Error('Save failed');
      const mockSave = vi.fn().mockRejectedValue(testError);
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useAutosave(mockSave, ['value'], { onError, skipInitial: true })
      );

      act(() => {
        result.current.saveNow();
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(testError);
      expect(result.current.isSaving).toBe(false);
    });
  });

  describe('enabled/disabled', () => {
    it('should not save when disabled', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);

      renderHook(() =>
        useAutosave(mockSave, ['value'], {
          enabled: false,
          skipInitial: false,
        })
      );

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(mockSave).not.toHaveBeenCalled();
    });

    it('should stop saving when disabled after being enabled', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);

      const { rerender } = renderHook(
        ({ enabled, deps }) =>
          useAutosave(mockSave, deps, { enabled, skipInitial: false }),
        { initialProps: { enabled: true, deps: ['value1'] } }
      );

      // First save should work
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockSave).toHaveBeenCalledTimes(1);

      // Disable and trigger change
      rerender({ enabled: false, deps: ['value2'] });

      // Clear pending state
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Should still only have one save
      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('should clear pending state when disabled', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);

      const { result, rerender } = renderHook(
        ({ enabled }) =>
          useAutosave(mockSave, ['value'], {
            enabled,
            skipInitial: false,
          }),
        { initialProps: { enabled: true } }
      );

      expect(result.current.isPending).toBe(true);

      // Disable before debounce completes
      act(() => {
        vi.advanceTimersByTime(500);
      });

      rerender({ enabled: false });

      expect(result.current.isPending).toBe(false);
    });
  });

  describe('callbacks', () => {
    it('should call onSuccess after successful save', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);
      const onSuccess = vi.fn();

      renderHook(() =>
        useAutosave(mockSave, ['value'], { onSuccess, skipInitial: false })
      );

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('should call onError on save failure', async () => {
      const testError = new Error('Save failed');
      const mockSave = vi.fn().mockRejectedValue(testError);
      const onError = vi.fn();

      renderHook(() =>
        useAutosave(mockSave, ['value'], { onError, skipInitial: false })
      );

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(onError).toHaveBeenCalledWith(testError);
    });

    it('should not call onSuccess if error occurs', async () => {
      const mockSave = vi.fn().mockRejectedValue(new Error('Save failed'));
      const onSuccess = vi.fn();
      const onError = vi.fn();

      renderHook(() =>
        useAutosave(mockSave, ['value'], {
          onSuccess,
          onError,
          skipInitial: false,
        })
      );

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(onError).toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe('dependency tracking', () => {
    it('should trigger save on dependency change', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);

      const { rerender } = renderHook(
        ({ deps }) => useAutosave(mockSave, deps, { skipInitial: false }),
        { initialProps: { deps: ['value1'] } }
      );

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockSave).toHaveBeenCalledTimes(1);

      // Change dependency
      rerender({ deps: ['value2'] });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockSave).toHaveBeenCalledTimes(2);
    });

    it('should not trigger save on unchanged dependencies', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);

      const { rerender } = renderHook(
        ({ deps }) => useAutosave(mockSave, deps, { skipInitial: false }),
        { initialProps: { deps: ['value1'] } }
      );

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockSave).toHaveBeenCalledTimes(1);

      // Re-render with same dependency
      rerender({ deps: ['value1'] });

      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('should handle array dependency changes', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);

      const { rerender } = renderHook(
        ({ deps }) => useAutosave(mockSave, deps, { skipInitial: false }),
        { initialProps: { deps: ['a', 'b', 'c'] } }
      );

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockSave).toHaveBeenCalledTimes(1);

      // Change one element
      rerender({ deps: ['a', 'b', 'x'] });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockSave).toHaveBeenCalledTimes(2);
    });

    it('should handle object dependency changes', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);

      const { rerender } = renderHook(
        ({ deps }) => useAutosave(mockSave, deps, { skipInitial: false }),
        { initialProps: { deps: [{ id: 1, name: 'test' }] } }
      );

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockSave).toHaveBeenCalledTimes(1);

      // Change object
      rerender({ deps: [{ id: 1, name: 'updated' }] });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockSave).toHaveBeenCalledTimes(2);
    });
  });

  describe('cleanup', () => {
    it('should clear timeout on unmount', () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { unmount } = renderHook(() =>
        useAutosave(mockSave, ['value'], { skipInitial: false })
      );

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should not execute save after unmount', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);

      const { unmount } = renderHook(() =>
        useAutosave(mockSave, ['value'], { skipInitial: false })
      );

      // Unmount before debounce fires
      unmount();

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Should not have saved
      expect(mockSave).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle rapid dependency changes', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);

      const { rerender } = renderHook(
        ({ deps }) => useAutosave(mockSave, deps, { skipInitial: false, delay: 1000 }),
        { initialProps: { deps: ['v1'] } }
      );

      // Rapid changes
      rerender({ deps: ['v2'] });
      rerender({ deps: ['v3'] });
      rerender({ deps: ['v4'] });
      rerender({ deps: ['v5'] });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Should only save once (last value)
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('should handle empty dependencies', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);

      renderHook(() => useAutosave(mockSave, [], { skipInitial: false }));

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('should handle null/undefined values in dependencies', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);

      const { rerender } = renderHook(
        ({ deps }: { deps: (string | null | undefined)[] }) => useAutosave(mockSave, deps, { skipInitial: false }),
        { initialProps: { deps: [null, undefined, 'false'] } }
      );

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockSave).toHaveBeenCalledTimes(1);

      // Change to different falsy values
      rerender({ deps: [undefined, null, 'zero'] });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mockSave).toHaveBeenCalledTimes(2);
    });
  });
});
