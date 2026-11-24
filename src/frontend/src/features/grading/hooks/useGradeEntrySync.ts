import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import apiClient, { gradesAPI } from '@/api/api';
import { eventBus, EVENTS } from '@/utils/events';
import { formatLocalDate } from '@/utils/date';
import { Grade, FinalGrade } from '@/types';
import {
  enqueueGradeMutation,
  getQueuedGradeMutationCount,
  getQueuedGradeMutations,
  removeQueuedGradeMutation,
} from '@/features/grading/utils/offlineGradesQueue';
import { isOfflineError } from '@/utils/databaseAvailability';
import { useQueueFlushTriggers } from '@/hooks/useQueueFlushTriggers';

// Also true for 503 DATABASE_UNAVAILABLE: the change is queued, not lost.
const isOfflineNetworkError = isOfflineError;

// Extracts a human-readable message from an axios-style error, an API
// {detail: ...} error payload, a plain Error, or a raw thrown value.
const extractApiErrorMessage = (e: unknown): string => {
  if (typeof e === 'object' && e !== null && 'response' in e) {
    try {
      const ev = e as { response?: { data?: unknown }; message?: string };
      const data = ev.response?.data;
      if (typeof data === 'string') return data;
      if (typeof data === 'object' && data !== null) {
        const detail = (data as Record<string, unknown>)['detail'];
        return typeof detail === 'string' ? detail : JSON.stringify(data);
      }
      if (typeof ev.message === 'string') return ev.message;
    } catch {
      // fall through to generic handling below
    }
  }
  if (e instanceof Error) return e.message;
  return String(e);
};

// Normalize category for comparison (EN/EL & common variants)
const normalizeCategory = (name?: string): 'midterm' | 'final' | 'other' => {
  const n = (name || '').toString().trim().toLowerCase();
  const midtermNeedles = ['midterm', 'midterm exam', 'ενδιάμεση', 'ενδιάμεση εξέταση', 'ενδιαμεση', 'ενδιαμεση εξεταση'];
  const finalNeedles = ['final', 'final exam', 'τελική', 'τελική εξέταση', 'τελικη', 'τελικη εξεταση'];
  if (midtermNeedles.some((x) => n.includes(x))) return 'midterm';
  if (finalNeedles.some((x) => n.includes(x))) return 'final';
  return 'other';
};

interface UseGradeEntrySyncParams {
  studentId: number | '';
  courseId: number | '';
  setStudentId: Dispatch<SetStateAction<number | ''>>;
  setCourseId: Dispatch<SetStateAction<number | ''>>;
  todayStr: string;
  t: (key: string, options?: Record<string, unknown>) => string;
  /** Plan todo 80: whether a category is a Midterm's or a Final Exam's (by its words, as the final grade reads it). */
  isExamCategory?: (category: string) => boolean;
}

export function useGradeEntrySync(params: UseGradeEntrySyncParams) {
  const { studentId, courseId, setStudentId, setCourseId, todayStr, t, isExamCategory } = params;

  const [category, setCategory] = useState('Midterm');
  const [gradeValue, setGradeValue] = useState<string>('');
  const [maxGrade, setMaxGrade] = useState<string>('100');
  const [weight, setWeight] = useState<string>('');
  const [assignmentName, setAssignmentName] = useState('');
  const [editingGradeId, setEditingGradeId] = useState<number | null>(null);
  const [historyDate, setHistoryDate] = useState<string>('');
  // Plan todo 80 (the owner, 2026-11-24): for an exam, the day it was taken, which the teacher
  // picks, and whether this grade is the retake that replaces the earlier sitting. The day stays
  // from one student to the next (one exam, one day, for a class); the mark never does.
  const [examDate, setExamDate] = useState<string>('');
  const [isRetake, setIsRetake] = useState(false);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [finalSummary, setFinalSummary] = useState<FinalGrade | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => getQueuedGradeMutationCount());

  const updatePendingSyncCount = useCallback(() => {
    setPendingSyncCount(getQueuedGradeMutationCount());
  }, []);

  // Shared by the initial load effect, the post-submit/post-delete refresh,
  // and the offline-queue flush. Previously each call site had its own
  // near-identical fetch, and two of the three only handled a plain-array
  // response (not the paginated { items: [...] } shape this endpoint can
  // return) - after submitting or deleting a grade the list could silently
  // go blank. Consolidated into one function so there's one response-shape
  // handling to get right, and it always respects historyDate the same way
  // the initial load already did.
  const fetchGrades = useCallback(async () => {
    if (!studentId) {
      setGrades([]);
      return;
    }
    try {
      const requestParams: Record<string, string | number | boolean | undefined> = {
        student_id: studentId,
        course_id: courseId || undefined,
      };
      if (historyDate && historyDate !== todayStr) {
        requestParams.start_date = historyDate;
        requestParams.end_date = historyDate;
        requestParams.use_submitted = true;
      }
      const res = await apiClient.get('/grades/', { params: requestParams });
      const gradesData = res.data?.items || (Array.isArray(res.data) ? res.data : []);
      setGrades(gradesData as Grade[]);
    } catch {
      // noop; errors surfaced during submission/deletion themselves
    }
  }, [studentId, courseId, historyDate, todayStr]);

  const flushQueuedGradeMutations = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    const queue = getQueuedGradeMutations();
    if (!queue.length) {
      updatePendingSyncCount();
      return;
    }

    let syncedCount = 0;
    for (const item of queue) {
      try {
        if (item.op === 'update' && item.gradeId) {
          await gradesAPI.update(item.gradeId, item.payload).catch(async (error: unknown) => {
            const status =
              typeof error === 'object' && error !== null && 'response' in error
                ? (error as { response?: { status?: number } }).response?.status
                : undefined;
            if (status === 404) {
              await gradesAPI.create(item.payload);
              return;
            }
            throw error;
          });
        } else {
          await gradesAPI.create(item.payload);
        }

        removeQueuedGradeMutation(item.id);
        syncedCount += 1;
      } catch (error) {
        if (isOfflineNetworkError(error)) {
          break;
        }
        console.error('[GradingView] Failed to sync queued mutation:', error);
        break;
      }
    }

    updatePendingSyncCount();
    if (syncedCount > 0) {
      await fetchGrades();
      setError(null);
    }
  }, [fetchGrades, updatePendingSyncCount]);

  useQueueFlushTriggers(flushQueuedGradeMutations, updatePendingSyncCount);

  const loadFinal = useCallback(async () => {
    setFinalSummary(null);
    setError(null);
    if (!studentId || !courseId) return;
    try {
      const res = await apiClient.get(`/analytics/student/${studentId}/course/${courseId}/final-grade`);
      const data: FinalGrade = res.data;
      setFinalSummary(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load final grade');
    }
  }, [studentId, courseId]);

  useEffect(() => { loadFinal(); }, [loadFinal]);

  useEffect(() => { fetchGrades(); }, [fetchGrades]);

  // Auto-fill assignment name and default max grade when choosing Midterm/Final
  useEffect(() => {
    const catNorm = normalizeCategory(category);
    if (!studentId || !courseId) return;
    if (catNorm === 'midterm' || catNorm === 'final') {
      const attempts = grades.filter((g) => normalizeCategory(g.category) === catNorm).length;
      const baseTitle = catNorm === 'midterm' ? 'Midterm Exam' : 'Final Exam';
      const suffix = attempts >= 1 ? 'B' : 'A';

      // Only override if empty or if previously auto-generated for the same family
      setAssignmentName((prev) => {
        const current = (prev || '').trim().toLowerCase();
        const isAutoPattern = current.startsWith('midterm') || current.startsWith('final');
        if (!prev || isAutoPattern) return `${baseTitle} ${suffix}`;
        return prev;
      });

      setMaxGrade((prev) => {
        const numeric = Number(prev || 0);
        if (prev === '' || numeric <= 0) return '100';
        return prev;
      });
    }
  }, [category, grades, studentId, courseId]);

  // Force Midterm/Final Exam to weight=1
  useEffect(() => {
    if (category === 'Midterm Exam' || category === 'Final Exam') {
      setWeight('1');
    }
  }, [category]);

  // Plan todo 80: an exam's grade has its day and can be the retake, under any spelling of the kind.
  const examSitting = Boolean(isExamCategory?.(category));
  // A new exam grade starts on today, which the teacher changes to the day the exam was taken.
  useEffect(() => {
    if (examSitting && !editingGradeId && !examDate) setExamDate(todayStr);
  }, [examSitting, editingGradeId, examDate, todayStr]);
  // Only an exam's grade can be a retake; and a mark never carries over to another student or
  // course (a grade being edited keeps its own).
  useEffect(() => {
    if (!examSitting) setIsRetake(false);
  }, [examSitting]);
  useEffect(() => {
    if (editingGradeId === null) setIsRetake(false);
  }, [studentId, courseId, editingGradeId]);

  const handleEditGrade = useCallback((grade: Grade) => {
    setEditingGradeId(grade.id);
    setStudentId(grade.student_id);
    setCourseId(grade.course_id);
    setAssignmentName(grade.assignment_name || '');
    setCategory(grade.category || 'Midterm');
    setGradeValue(String(grade.grade));
    setMaxGrade(String(grade.max_grade || 100));
    setWeight(String(grade.weight || 1));
    // Always set the date when editing (use grade's date or today)
    const rawDate = grade.date_submitted || grade.date_assigned || new Date().toISOString();
    const normalized = rawDate ? formatLocalDate(rawDate) : todayStr;
    setHistoryDate(normalized);
    // An exam's own day, empty for an undated grade: saved so, it stays undated (until the review of
    // 2026-11-24 an edit dated an undated grade today).
    setExamDate(grade.date_submitted ? formatLocalDate(grade.date_submitted) : '');
    setIsRetake(Boolean(grade.is_retake));
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setStudentId, setCourseId, todayStr]);

  useEffect(() => {
    const recallIdRaw = sessionStorage.getItem('grading_recall_grade_id');
    if (!recallIdRaw) return;
    const recallId = Number(recallIdRaw);
    if (!Number.isFinite(recallId) || recallId <= 0) {
      sessionStorage.removeItem('grading_recall_grade_id');
      return;
    }

    const fetchRecall = async () => {
      try {
        // eslint-disable-next-line testing-library/no-await-sync-queries
        const grade = await gradesAPI.getById(recallId);
        if (grade && typeof grade === 'object') {
          handleEditGrade(grade as Grade);
        }
      } finally {
        sessionStorage.removeItem('grading_recall_grade_id');
      }
    };
    fetchRecall();
  }, [handleEditGrade]);

  const handleCancelEdit = useCallback(() => {
    setEditingGradeId(null);
    setAssignmentName('');
    setCategory('Midterm');
    setGradeValue('');
    setMaxGrade('100');
    setWeight('');
    setHistoryDate('');
    setExamDate('');
    setIsRetake(false);
  }, []);

  const handleDeleteGrade = useCallback(async (gradeId: number) => {
    if (!window.confirm(t('confirmDeleteGrade') || 'Are you sure you want to delete this grade?')) {
      return;
    }
    try {
      await gradesAPI.delete(gradeId);
      eventBus.emit(EVENTS.GRADE_ADDED, { studentId: Number(studentId), courseId: Number(courseId) });
      await loadFinal();
      await fetchGrades();
    } catch (e: unknown) {
      setError(extractApiErrorMessage(e));
    }
  }, [studentId, courseId, loadFinal, fetchGrades, t]);

  const submitGrade = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !courseId) { setError(t('selectStudentAndCourseError')); return; }
    if (!assignmentName || String(assignmentName).trim().length === 0) { setError(t('assignmentNameRequired')); return; }
    if (gradeValue === '' || maxGrade === '') { setError(t('fillRequiredFields')); return; }
    const gv = Number(gradeValue.replace(',', '.'));
    const mg = Number(maxGrade.replace(',', '.') || 100);
    if (!Number.isFinite(gv) || !Number.isFinite(mg) || mg <= 0) { setError(t('invalidScoreMaxValues')); return; }
    if (gv < 0 || gv > mg) { setError(t('scoreMustBeBetween0AndMax')); return; }
    setSubmitting(true); setError(null);
    const dayOfEntry = historyDate && historyDate !== todayStr ? historyDate : formatLocalDate(new Date());
    // An exam's grade is dated on the day it was taken (plan todo 80), the box's day; an edited
    // grade whose box is empty stays as it is (an undated one undated).
    const dateSubmitted = examSitting ? (examDate || (editingGradeId ? undefined : dayOfEntry)) : dayOfEntry;
    const payload: Omit<Grade, 'id'> = {
      student_id: Number(studentId),
      course_id: Number(courseId),
      assignment_name: assignmentName,
      category,
      grade: gv,
      max_grade: mg,
      weight: Number((category === 'Midterm Exam' || category === 'Final Exam' ? '1' : (weight || '1')).replace(',', '.')),
      ...(dateSubmitted ? { date_submitted: dateSubmitted } : {}),
      // Only an exam's grade can be the retake; any other is saved as none (the server refuses it).
      is_retake: examSitting && isRetake,
      // optional fields not set: date_assigned, notes
    };
    const wasEdit = Boolean(editingGradeId);
    const resetForm = () => {
      setAssignmentName(''); setCategory('Midterm'); setGradeValue(''); setMaxGrade('100'); setWeight('');
      setHistoryDate('');
      setIsRetake(false);
      // The exam's day stays for the next student's grade, not an edited grade's own day.
      if (wasEdit) setExamDate('');
    };
    try {
      // Update existing grade or create new one
      if (editingGradeId) {
        await gradesAPI.update(editingGradeId, payload);
        setEditingGradeId(null);
      } else {
        await gradesAPI.create(payload);
      }
      // The form is cleared as soon as the grade is saved, before the final grade and the list are
      // read again: cleared after them, it wiped whatever the teacher had begun to type for the next
      // grade meanwhile (a slow server, a quick hand; seen as a failing test on 2026-11-24).
      resetForm();
      // Emit event to notify other components that grades changed
      eventBus.emit(EVENTS.GRADE_ADDED, { studentId: Number(studentId), courseId: Number(courseId) });
      await loadFinal();
      await fetchGrades();
    } catch (e: unknown) {
      if (isOfflineNetworkError(e)) {
        enqueueGradeMutation({
          op: editingGradeId ? 'update' : 'create',
          gradeId: editingGradeId || undefined,
          payload,
        });
        updatePendingSyncCount();
        setError(t('offlineQueued') || 'Offline: grade changes queued and will sync when connection returns.');
        if (editingGradeId) {
          setEditingGradeId(null);
        }
        resetForm();
        return;
      }

      setError(extractApiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }, [studentId, courseId, assignmentName, gradeValue, maxGrade, category, weight, historyDate, todayStr, editingGradeId, examSitting, examDate, isRetake, loadFinal, fetchGrades, updatePendingSyncCount, t]);

  return {
    category, setCategory,
    gradeValue, setGradeValue,
    maxGrade, setMaxGrade,
    weight, setWeight,
    assignmentName, setAssignmentName,
    editingGradeId,
    historyDate, setHistoryDate,
    examSitting, examDate, setExamDate, isRetake, setIsRetake,
    grades,
    finalSummary,
    submitting,
    error,
    pendingSyncCount,
    loadFinal,
    submitGrade,
    handleEditGrade,
    handleCancelEdit,
    handleDeleteGrade,
  };
}

export default useGradeEntrySync;
