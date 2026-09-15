import { useCallback, useEffect, useRef, useState } from 'react';
import { sessionAPI } from '@/api/api';

export type MergeStrategy = 'update' | 'skip';

export type ImportValidationResult = {
  validation_passed?: boolean;
  errors?: unknown[];
  total_errors?: number;
  summary?: Record<string, { created?: number; updated?: number; errors?: unknown[] }>;
  counts?: { courses?: number; students?: number; grades?: number };
  [key: string]: unknown;
} | null;

interface UseSessionExportImportParams {
  t: (key: string, params?: Record<string, unknown>) => string;
  showToast: (message: string, type?: string) => void;
}

/**
 * Semester listing, whole-session export download, and session import
 * (with dry-run validation) — extracted from the SessionExportImport
 * component that used to live inside ExportCenter.tsx. None of this had test
 * coverage while it was embedded in a ~1380-line multi-component file.
 */
export function useSessionExportImport({ t, showToast }: UseSessionExportImportParams) {
  const [semesters, setSemesters] = useState<string[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>('update');
  const [loadingSemesters, setLoadingSemesters] = useState(false);
  const [exportingSession, setExportingSession] = useState(false);
  const [importingSession, setImportingSession] = useState(false);
  const [validatingImport, setValidatingImport] = useState(false);
  const [validationResult, setValidationResult] = useState<ImportValidationResult>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractErrorMessage = useCallback((e: unknown, fallback?: string): string => {
    if (typeof e !== 'object' || e === null) return String(e ?? fallback ?? '');
    const obj = e as Record<string, unknown>;
    const resp = obj['response'];
    if (resp && typeof resp === 'object') {
      const d = (resp as Record<string, unknown>)['data'];
      if (d && typeof d === 'object') {
        const detail = (d as Record<string, unknown>)['detail'];
        const message = (d as Record<string, unknown>)['message'];
        if (typeof detail === 'string') return detail;
        if (typeof message === 'string') return message;
      }
    }
    const detail = obj['detail'];
    if (typeof detail === 'string') return detail;
    const message = obj['message'];
    if (typeof message === 'string') return message;
    return fallback || t('sessionImportFailed');
  }, [t]);

  const loadSemesters = useCallback(async () => {
    setLoadingSemesters(true);
    try {
      const data: unknown = await sessionAPI.listSemesters();
      const list = Array.isArray(data)
        ? (data as string[])
        : ((data as { semesters?: string[] })?.semesters || (data as { list?: string[] })?.list || []);
      setSemesters(list);
      if (list && list.length > 0) setSelectedSemester(list[0]);
    } catch (error) {
      console.error('Failed to load semesters:', error);
      showToast(t('failedToLoadSemesters'), 'error');
    } finally {
      setLoadingSemesters(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    void loadSemesters();
  }, [loadSemesters]);

  const handleExportSession = useCallback(async () => {
    if (!selectedSemester) {
      showToast(t('selectSemester'), 'error');
      return;
    }

    setExportingSession(true);
    try {
      // The sessionAPI returns the raw Blob for exports
      const blob = await sessionAPI.exportSession(selectedSemester);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // No headers are available when the API client returns a raw Blob, so
      // fall back to a sensible default filename.
      const filename = `session_export_${selectedSemester.replace(/\s+/g, '_')}.json`;

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast(t('sessionExportSuccess'), 'success');
    } catch (error) {
      console.error('Session export failed:', error);
      showToast(t('sessionExportFailed'), 'error');
    } finally {
      setExportingSession(false);
    }
  }, [selectedSemester, showToast, t]);

  const handleImportSession = useCallback(async () => {
    if (!selectedFile) {
      showToast(t('selectFile'), 'error');
      return;
    }

    setImportingSession(true);
    try {
      const result = await sessionAPI.importSession(selectedFile, mergeStrategy);

      // Show summary
      const summary = (result as { summary?: Record<string, { created?: number; updated?: number; errors?: unknown[] }> }).summary || {};
      const totalCreated = Object.values(summary).reduce((sum: number, item: { created?: number }) => sum + (item.created || 0), 0);
      const totalUpdated = Object.values(summary).reduce((sum: number, item: { updated?: number }) => sum + (item.updated || 0), 0);
      const totalErrors = Object.values(summary).reduce((sum: number, item: { errors?: unknown[] }) => sum + ((item.errors?.length as number) || 0), 0);

      if (typeof totalErrors === 'number' && totalErrors > 0) {
        showToast(`${t('sessionImportSuccess')} (${t('created')}: ${totalCreated}, ${t('updated')}: ${totalUpdated}, ${t('errors')}: ${totalErrors})`, 'warning');
      } else {
        showToast(`${t('sessionImportSuccess')} (${t('created')}: ${totalCreated}, ${t('updated')}: ${totalUpdated})`, 'success');
      }

      // Reset file input
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Reload semesters in case new ones were added
      loadSemesters();
    } catch (error: unknown) {
      console.error('Session import failed:', error);
      showToast(extractErrorMessage(error), 'error');
    } finally {
      setImportingSession(false);
    }
  }, [selectedFile, mergeStrategy, loadSemesters, extractErrorMessage, showToast, t]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      setValidationResult(null); // Clear previous validation
    }
  }, []);

  const handleValidateImport = useCallback(async () => {
    if (!selectedFile) {
      showToast(t('selectFile'), 'error');
      return;
    }

    setValidatingImport(true);
    try {
      const response = await sessionAPI.importSession(selectedFile, mergeStrategy, true); // dry_run=true
      setValidationResult(response as ImportValidationResult);

      if (response.validation_passed) {
        showToast(t('validationPassed'), 'success');
      }
    } catch (error: unknown) {
      console.error('Validation failed:', error);
      const errorObj = typeof error === 'object' && error ? (error as Record<string, unknown>) : null;
      const errorData = errorObj && 'response' in errorObj ? (errorObj['response'] as Record<string, unknown>)?.['data'] ?? error : error;

      const errDataObj = (typeof errorData === 'object' && errorData) ? (errorData as Record<string, unknown>) : null;
      if (errDataObj && 'context' in errDataObj && typeof errDataObj['context'] === 'object') {
        const ctx = errDataObj['context'] as Record<string, unknown>;
        const validationErrors = Array.isArray(ctx['validation_errors']) ? ctx['validation_errors'] as unknown[] : undefined;
        const totalErrors = typeof ctx['total_errors'] === 'number' ? ctx['total_errors'] as number : undefined;
        setValidationResult({
          validation_passed: false,
          errors: validationErrors,
          total_errors: totalErrors
        });
        showToast(t('validationFailed', { count: totalErrors }), 'error');
      } else {
        const detail = errDataObj && typeof errDataObj['detail'] === 'string' ? errDataObj['detail'] as string : undefined;
        const message = errDataObj && typeof errDataObj['message'] === 'string' ? errDataObj['message'] as string : undefined;
        showToast(detail || message || t('sessionImportFailed'), 'error');
      }
    } finally {
      setValidatingImport(false);
    }
  }, [selectedFile, mergeStrategy, showToast, t]);

  return {
    semesters,
    selectedSemester,
    setSelectedSemester,
    selectedFile,
    mergeStrategy,
    setMergeStrategy,
    loadingSemesters,
    exportingSession,
    importingSession,
    validatingImport,
    validationResult,
    fileInputRef,
    handleExportSession,
    handleImportSession,
    handleFileChange,
    handleValidateImport,
  };
}

export default useSessionExportImport;
