import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '@/api/api';

export interface SemesterListItem {
  semester: string;
  course_count: number;
  already_archived: boolean;
}

export interface ArchiveEligiblePair {
  student_id: number;
  student_name: string;
  course_id: number;
  course_code: string;
  course_name: string;
  final_grade: number;
  letter_grade: string;
  total_weight_used: number;
}

export interface ArchiveExcludedPair {
  student_id: number;
  student_name: string;
  course_id: number;
  course_code: string;
  course_name: string;
  reason: 'not_passed' | 'incomplete_grading' | 'no_evaluation_rules' | 'already_archived';
  final_grade?: number;
  total_weight_used?: number;
}

export interface SemesterArchivePreview {
  semester: string;
  pass_threshold: number;
  eligible: ArchiveEligiblePair[];
  excluded: ArchiveExcludedPair[];
  eligible_count: number;
  excluded_count: number;
}

export interface SemesterArchiveExecuteResult {
  export_id: number;
  export_filename: string | null;
  students_affected: number;
  courses_affected: number;
  enrollments_archived: number;
  enrollments_skipped: number;
}

export interface SemesterArchiveExportListItem {
  id: number;
  semester: string;
  status: 'pending' | 'exported' | 'completed' | 'failed';
  export_filename: string | null;
  pass_threshold: number;
  students_affected: number;
  courses_affected: number;
  enrollments_archived: number;
  enrollments_skipped: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

function extractErrorMessage(err: unknown, fallback: string): string {
  const anyErr = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
  return anyErr?.response?.data?.error?.message || anyErr?.message || fallback;
}

export function useSemesterArchive() {
  const { t } = useTranslation('semesterArchive');
  const [semesters, setSemesters] = useState<SemesterListItem[]>([]);
  const [preview, setPreview] = useState<SemesterArchivePreview | null>(null);
  const [exports, setExports] = useState<SemesterArchiveExportListItem[]>([]);
  const [loadingSemesters, setLoadingSemesters] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSemesters = useCallback(async () => {
    setLoadingSemesters(true);
    setError(null);
    try {
      const res = await apiClient.get('/semester-archive/semesters');
      setSemesters(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(extractErrorMessage(err, t('loadFailed')));
      setSemesters([]);
    } finally {
      setLoadingSemesters(false);
    }
  }, [t]);

  const loadExports = useCallback(async () => {
    try {
      const res = await apiClient.get('/semester-archive/exports');
      setExports(Array.isArray(res.data) ? res.data : []);
    } catch {
      setExports([]);
    }
  }, []);

  const runPreview = useCallback(async (semester: string, passThreshold: number) => {
    setLoadingPreview(true);
    setError(null);
    setPreview(null);
    try {
      const res = await apiClient.post('/semester-archive/preview', {
        semester,
        pass_threshold: passThreshold,
      });
      setPreview(res.data);
      return res.data as SemesterArchivePreview;
    } catch (err) {
      setError(extractErrorMessage(err, t('previewFailed')));
      return null;
    } finally {
      setLoadingPreview(false);
    }
  }, [t]);

  const execute = useCallback(
    async (semester: string, passThreshold: number, confirmText: string): Promise<SemesterArchiveExecuteResult | null> => {
      setExecuting(true);
      setError(null);
      try {
        const res = await apiClient.post('/semester-archive/execute', {
          semester,
          pass_threshold: passThreshold,
          confirm_text: confirmText,
        });
        await loadExports();
        return res.data as SemesterArchiveExecuteResult;
      } catch (err) {
        setError(extractErrorMessage(err, t('executeFailed')));
        return null;
      } finally {
        setExecuting(false);
      }
    },
    [loadExports, t]
  );

  const downloadExport = useCallback(async (exportId: number, filename: string) => {
    try {
      const res = await apiClient.get(`/semester-archive/exports/${exportId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(extractErrorMessage(err, t('downloadFailed')));
    }
  }, [t]);

  return {
    semesters,
    preview,
    exports,
    loadingSemesters,
    loadingPreview,
    executing,
    error,
    loadSemesters,
    loadExports,
    runPreview,
    execute,
    downloadExport,
  };
}

export default useSemesterArchive;
