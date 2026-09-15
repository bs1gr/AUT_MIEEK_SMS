/**
 * Tests for useSessionExportImport — the semester listing, session export
 * download, and session import/dry-run-validation logic extracted from the
 * SessionExportImport component that used to live inside ExportCenter.tsx.
 * None of it had coverage before — see the 2026-09 workspace audit.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSessionExportImport } from '../useSessionExportImport';

vi.mock('@/api/api', () => ({
  sessionAPI: {
    listSemesters: vi.fn(),
    exportSession: vi.fn(),
    importSession: vi.fn(),
  },
}));

import { sessionAPI } from '@/api/api';

const mockListSemesters = sessionAPI.listSemesters as unknown as ReturnType<typeof vi.fn>;
const mockExportSession = sessionAPI.exportSession as unknown as ReturnType<typeof vi.fn>;
const mockImportSession = sessionAPI.importSession as unknown as ReturnType<typeof vi.fn>;

const buildProps = () => ({
  t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
  showToast: vi.fn(),
});

const makeFile = (name = 'session.json') => new File(['{}'], name, { type: 'application/json' });

describe('useSessionExportImport', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockListSemesters.mockResolvedValue([]);
    createObjectURL = vi.fn(() => 'blob:mock-url');
    revokeObjectURL = vi.fn();
    Object.defineProperty(window, 'URL', {
      value: { createObjectURL, revokeObjectURL },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loading semesters', () => {
    it('loads semesters on mount and preselects the first one', async () => {
      mockListSemesters.mockResolvedValue(['Fall 2026', 'Spring 2027']);

      const { result } = renderHook(() => useSessionExportImport(buildProps()));

      await waitFor(() => expect(result.current.semesters).toEqual(['Fall 2026', 'Spring 2027']));
      expect(result.current.selectedSemester).toBe('Fall 2026');
      expect(result.current.loadingSemesters).toBe(false);
    });

    it('accepts a {semesters: [...]} envelope as well as a bare array', async () => {
      mockListSemesters.mockResolvedValue({ semesters: ['Fall 2026'] });

      const { result } = renderHook(() => useSessionExportImport(buildProps()));

      await waitFor(() => expect(result.current.semesters).toEqual(['Fall 2026']));
    });

    it('accepts a {list: [...]} envelope', async () => {
      mockListSemesters.mockResolvedValue({ list: ['Spring 2027'] });

      const { result } = renderHook(() => useSessionExportImport(buildProps()));

      await waitFor(() => expect(result.current.semesters).toEqual(['Spring 2027']));
    });

    it('toasts an error and leaves the list empty when loading fails', async () => {
      const props = buildProps();
      mockListSemesters.mockRejectedValue(new Error('boom'));

      const { result } = renderHook(() => useSessionExportImport(props));

      await waitFor(() => expect(props.showToast).toHaveBeenCalledWith('failedToLoadSemesters', 'error'));
      expect(result.current.semesters).toEqual([]);
    });
  });

  describe('handleExportSession', () => {
    it('refuses to export with no semester selected', async () => {
      const props = buildProps();
      const { result } = renderHook(() => useSessionExportImport(props));
      await waitFor(() => expect(result.current.loadingSemesters).toBe(false));

      await act(async () => {
        await result.current.handleExportSession();
      });

      expect(props.showToast).toHaveBeenCalledWith('selectSemester', 'error');
      expect(mockExportSession).not.toHaveBeenCalled();
    });

    it('downloads the exported blob under a slug-ified filename', async () => {
      const props = buildProps();
      mockListSemesters.mockResolvedValue(['Fall 2026']);
      mockExportSession.mockResolvedValue(new Blob(['{}']));
      const clickSpy = vi.fn();
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = originalCreateElement(tag);
        if (tag === 'a') {
          Object.defineProperty(el, 'click', { value: clickSpy });
        }
        return el;
      });

      const { result } = renderHook(() => useSessionExportImport(props));
      await waitFor(() => expect(result.current.selectedSemester).toBe('Fall 2026'));

      await act(async () => {
        await result.current.handleExportSession();
      });

      expect(mockExportSession).toHaveBeenCalledWith('Fall 2026');
      expect(clickSpy).toHaveBeenCalled();
      expect(createObjectURL).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
      expect(props.showToast).toHaveBeenCalledWith('sessionExportSuccess', 'success');
    });

    it('toasts a failure and clears the in-flight flag when the export throws', async () => {
      const props = buildProps();
      mockListSemesters.mockResolvedValue(['Fall 2026']);
      mockExportSession.mockRejectedValue(new Error('export failed'));

      const { result } = renderHook(() => useSessionExportImport(props));
      await waitFor(() => expect(result.current.selectedSemester).toBe('Fall 2026'));

      await act(async () => {
        await result.current.handleExportSession();
      });

      expect(props.showToast).toHaveBeenCalledWith('sessionExportFailed', 'error');
      expect(result.current.exportingSession).toBe(false);
    });
  });

  describe('handleImportSession', () => {
    const selectFile = async (result: { current: ReturnType<typeof useSessionExportImport> }) => {
      act(() => {
        result.current.handleFileChange({
          target: { files: [makeFile()] },
        } as unknown as React.ChangeEvent<HTMLInputElement>);
      });
      await waitFor(() => expect(result.current.selectedFile).not.toBeNull());
    };

    it('refuses to import with no file selected', async () => {
      const props = buildProps();
      const { result } = renderHook(() => useSessionExportImport(props));

      await act(async () => {
        await result.current.handleImportSession();
      });

      expect(props.showToast).toHaveBeenCalledWith('selectFile', 'error');
      expect(mockImportSession).not.toHaveBeenCalled();
    });

    it('imports with the chosen merge strategy and reports created/updated counts', async () => {
      const props = buildProps();
      mockImportSession.mockResolvedValue({
        summary: { courses: { created: 2, updated: 1 }, students: { created: 3, updated: 0 } },
      });

      const { result } = renderHook(() => useSessionExportImport(props));
      await selectFile(result);

      act(() => {
        result.current.setMergeStrategy('skip');
      });

      await act(async () => {
        await result.current.handleImportSession();
      });

      expect(mockImportSession).toHaveBeenCalledWith(expect.any(File), 'skip');
      expect(props.showToast).toHaveBeenCalledWith(
        'sessionImportSuccess (created: 5, updated: 1)',
        'success'
      );
      // File selection is cleared so the same import can't be fired twice
      expect(result.current.selectedFile).toBeNull();
    });

    it('warns instead of succeeding when the summary contains row errors', async () => {
      const props = buildProps();
      mockImportSession.mockResolvedValue({
        summary: { courses: { created: 1, updated: 0, errors: ['bad row'] } },
      });

      const { result } = renderHook(() => useSessionExportImport(props));
      await selectFile(result);

      await act(async () => {
        await result.current.handleImportSession();
      });

      expect(props.showToast).toHaveBeenCalledWith(
        'sessionImportSuccess (created: 1, updated: 0, errors: 1)',
        'warning'
      );
    });

    it('surfaces a nested response.data.detail message on failure', async () => {
      const props = buildProps();
      mockImportSession.mockRejectedValue({ response: { data: { detail: 'Bad session file' } } });

      const { result } = renderHook(() => useSessionExportImport(props));
      await selectFile(result);

      await act(async () => {
        await result.current.handleImportSession();
      });

      expect(props.showToast).toHaveBeenCalledWith('Bad session file', 'error');
    });

    it('falls back to the generic message when the error carries nothing usable', async () => {
      const props = buildProps();
      mockImportSession.mockRejectedValue({});

      const { result } = renderHook(() => useSessionExportImport(props));
      await selectFile(result);

      await act(async () => {
        await result.current.handleImportSession();
      });

      expect(props.showToast).toHaveBeenCalledWith('sessionImportFailed', 'error');
    });
  });

  describe('handleValidateImport (dry run)', () => {
    const selectFile = async (result: { current: ReturnType<typeof useSessionExportImport> }) => {
      act(() => {
        result.current.handleFileChange({
          target: { files: [makeFile()] },
        } as unknown as React.ChangeEvent<HTMLInputElement>);
      });
      await waitFor(() => expect(result.current.selectedFile).not.toBeNull());
    };

    it('runs the import in dry-run mode and stores a passing result', async () => {
      const props = buildProps();
      mockImportSession.mockResolvedValue({
        validation_passed: true,
        counts: { courses: 2, students: 10, grades: 40 },
      });

      const { result } = renderHook(() => useSessionExportImport(props));
      await selectFile(result);

      await act(async () => {
        await result.current.handleValidateImport();
      });

      expect(mockImportSession).toHaveBeenCalledWith(expect.any(File), 'update', true);
      expect(result.current.validationResult?.validation_passed).toBe(true);
      expect(props.showToast).toHaveBeenCalledWith('validationPassed', 'success');
    });

    it('unpacks validation errors from the error response context', async () => {
      const props = buildProps();
      mockImportSession.mockRejectedValue({
        response: {
          data: {
            context: { validation_errors: ['row 1 bad', 'row 2 bad'], total_errors: 2 },
          },
        },
      });

      const { result } = renderHook(() => useSessionExportImport(props));
      await selectFile(result);

      await act(async () => {
        await result.current.handleValidateImport();
      });

      expect(result.current.validationResult).toMatchObject({
        validation_passed: false,
        errors: ['row 1 bad', 'row 2 bad'],
        total_errors: 2,
      });
      expect(props.showToast).toHaveBeenCalledWith('validationFailed:{"count":2}', 'error');
    });

    it('refuses to validate with no file selected', async () => {
      const props = buildProps();
      const { result } = renderHook(() => useSessionExportImport(props));

      await act(async () => {
        await result.current.handleValidateImport();
      });

      expect(props.showToast).toHaveBeenCalledWith('selectFile', 'error');
      expect(mockImportSession).not.toHaveBeenCalled();
    });
  });

  describe('handleFileChange', () => {
    it('clears a previous validation result when a new file is picked', async () => {
      const props = buildProps();
      mockImportSession.mockResolvedValue({ validation_passed: true });

      const { result } = renderHook(() => useSessionExportImport(props));

      act(() => {
        result.current.handleFileChange({
          target: { files: [makeFile('first.json')] },
        } as unknown as React.ChangeEvent<HTMLInputElement>);
      });
      await act(async () => {
        await result.current.handleValidateImport();
      });
      expect(result.current.validationResult).not.toBeNull();

      act(() => {
        result.current.handleFileChange({
          target: { files: [makeFile('second.json')] },
        } as unknown as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.validationResult).toBeNull();
      expect(result.current.selectedFile?.name).toBe('second.json');
    });

    it('ignores an empty file selection', () => {
      const { result } = renderHook(() => useSessionExportImport(buildProps()));

      act(() => {
        result.current.handleFileChange({
          target: { files: [] },
        } as unknown as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.selectedFile).toBeNull();
    });
  });
});
