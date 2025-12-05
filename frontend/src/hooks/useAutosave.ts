/**
 * useAutosave - Universal autosave hook with debouncing
 * 
 * Automatically saves data after a debounce delay when dependencies change.
 * Prevents unnecessary saves and shows user feedback.
 * 
 * @param saveFunction - Async function to call for saving
 * @param dependencies - Values to watch for changes
 * @param options - Configuration options
 * @returns Object with autosave status and manual save trigger
 * 
 * @example
 * ```tsx
 * const { isSaving, saveNow } = useAutosave(
 *   async () => await apiClient.post('/save', data),
 *   [data],
 *   { delay: 2000, enabled: isDirty }
 * );
 * ```
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface AutosaveOptions {
  /** Debounce delay in milliseconds (default: 2000) */
  delay?: number;
  /** Enable/disable autosave (default: true) */
  enabled?: boolean;
  /** Callback on successful save */
  onSuccess?: () => void;
  /** Callback on save error */
  onError?: (error: unknown) => void;
  /** Skip initial mount (default: true) */
  skipInitial?: boolean;
}

interface AutosaveReturn {
  /** Whether autosave is currently in progress */
  isSaving: boolean;
  /** Whether there are pending changes waiting to save */
  isPending: boolean;
  /** Manually trigger save immediately (bypass debounce) */
  saveNow: () => Promise<void>;
  /** Last successful save timestamp */
  lastSaved: Date | null;
}

export const useAutosave = (
  saveFunction: () => Promise<void>,
  dependencies: unknown[],
  options: AutosaveOptions = {}
): AutosaveReturn => {
  const {
    delay = 2000,
    enabled = true,
    onSuccess,
    onError,
    skipInitial = true,
  } = options;

  const [isSaving, setIsSaving] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const timeoutRef = useRef<number | null>(null);
  const initialRenderRef = useRef(true);
  const saveInProgressRef = useRef(false);

  const executeSave = useCallback(async () => {
    if (saveInProgressRef.current) {
      return; // Prevent concurrent saves
    }

    try {
      saveInProgressRef.current = true;
      setIsSaving(true);
      setIsPending(false);
      
      await saveFunction();
      
      setLastSaved(new Date());
      onSuccess?.();
    } catch (error) {
      console.error('[useAutosave] Save failed:', error);
      onError?.(error);
    } finally {
      setIsSaving(false);
      saveInProgressRef.current = false;
    }
  }, [saveFunction, onSuccess, onError]);

  const saveNow = useCallback(async () => {
    // Clear any pending debounced save
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    await executeSave();
  }, [executeSave]);

  const depsKey = JSON.stringify(dependencies);

  useEffect(() => {
    // Skip initial render if configured
    if (skipInitial && initialRenderRef.current) {
      initialRenderRef.current = false;
      return;
    }

    // Don't autosave if disabled
    if (!enabled) {
      // If autosave is disabled (e.g., user reverted changes), ensure pending state is cleared
      // and cancel any in-flight debounce timer.
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsPending(false);
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    // Set pending state
    setIsPending(true);

    // Schedule new save
    timeoutRef.current = window.setTimeout(() => {
      void executeSave();
    }, delay);

    // Cleanup on unmount or dependency change
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [depsKey, enabled, delay, executeSave, skipInitial]);

  return {
    isSaving,
    isPending,
    saveNow,
    lastSaved,
  };
};

export default useAutosave;
