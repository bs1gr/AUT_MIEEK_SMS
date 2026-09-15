/**
 * Tests for useGradeEntrySync — the extracted grade-entry-form,
 * grades-list/final-summary fetching, and offline-sync logic from
 * GradingView.tsx (submitGrade, handleEditGrade, handleDeleteGrade,
 * handleCancelEdit, loadFinal, and the queued-mutation flush).
 *
 * No prior test exercised any of this logic directly (GradingView.decimal.test.tsx
 * covers it only incidentally through the rendered form) — see
 * UNIFIED_WORK_PLAN.md's 2026-09 workspace audit for context.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGradeEntrySync } from '../useGradeEntrySync';

vi.mock('@/api/api', () => ({
  default: {
    get: vi.fn(),
  },
  gradesAPI: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getById: vi.fn(),
  },
}));

vi.mock('@/features/grading/utils/offlineGradesQueue', () => ({
  enqueueGradeMutation: vi.fn(),
  getQueuedGradeMutationCount: vi.fn(() => 0),
  getQueuedGradeMutations: vi.fn(() => []),
  removeQueuedGradeMutation: vi.fn(),
}));

import apiClient, { gradesAPI } from '@/api/api';
import {
  enqueueGradeMutation,
  getQueuedGradeMutationCount,
  getQueuedGradeMutations,
  removeQueuedGradeMutation,
} from '@/features/grading/utils/offlineGradesQueue';

const mockGet = apiClient.get as unknown as ReturnType<typeof vi.fn>;
const mockCreate = gradesAPI.create as unknown as ReturnType<typeof vi.fn>;
const mockUpdate = gradesAPI.update as unknown as ReturnType<typeof vi.fn>;
const mockDelete = gradesAPI.delete as unknown as ReturnType<typeof vi.fn>;
const mockGetById = gradesAPI.getById as unknown as ReturnType<typeof vi.fn>;
const mockEnqueue = enqueueGradeMutation as unknown as ReturnType<typeof vi.fn>;
const mockGetQueueCount = getQueuedGradeMutationCount as unknown as ReturnType<typeof vi.fn>;
const mockGetQueue = getQueuedGradeMutations as unknown as ReturnType<typeof vi.fn>;
const mockRemoveQueued = removeQueuedGradeMutation as unknown as ReturnType<typeof vi.fn>;

const setOnline = (value: boolean) => {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true });
};

const okResponse = (data: unknown) => ({ data, status: 200, statusText: 'OK', headers: {}, config: {} });

const buildProps = (overrides: Record<string, unknown> = {}) => ({
  studentId: 1 as number | '',
  courseId: 2 as number | '',
  setStudentId: vi.fn(),
  setCourseId: vi.fn(),
  todayStr: '2026-09-15',
  t: (key: string, options?: Record<string, unknown>) => (options ? `${key}:${JSON.stringify(options)}` : key),
  ...overrides,
});

describe('useGradeEntrySync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setOnline(true);
    mockGetQueueCount.mockReturnValue(0);
    mockGetQueue.mockReturnValue([]);
    mockGet.mockImplementation(async (url: string) => {
      if (url.includes('/analytics/')) return okResponse({});
      if (url === '/grades/') return okResponse({ items: [] });
      return okResponse({});
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches grades and the final summary on mount when student+course are set', async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url.includes('/analytics/')) return okResponse({ final_grade: 88, gpa: 3.5 });
      if (url === '/grades/') return okResponse({ items: [{ id: 1, student_id: 1, course_id: 2, grade: 90, max_grade: 100 }] });
      return okResponse({});
    });

    const { result } = renderHook(() => useGradeEntrySync(buildProps()));

    await waitFor(() => expect(result.current.grades).toHaveLength(1));
    await waitFor(() => expect(result.current.finalSummary?.final_grade).toBe(88));
    expect(mockGet).toHaveBeenCalledWith('/grades/', expect.objectContaining({ params: expect.objectContaining({ student_id: 1, course_id: 2 }) }));
  });

  it('does not fetch grades when no student is selected', async () => {
    const { result } = renderHook(() => useGradeEntrySync(buildProps({ studentId: '' })));

    await waitFor(() => expect(result.current.grades).toEqual([]));
    expect(mockGet).not.toHaveBeenCalledWith('/grades/', expect.anything());
  });

  it('handles a plain-array /grades/ response the same as a paginated {items} response', async () => {
    mockGet.mockImplementation(async (url: string) => {
      if (url.includes('/analytics/')) return okResponse({});
      if (url === '/grades/') return okResponse([{ id: 5, student_id: 1, course_id: 2, grade: 70, max_grade: 100 }]);
      return okResponse({});
    });

    const { result } = renderHook(() => useGradeEntrySync(buildProps()));

    await waitFor(() => expect(result.current.grades).toHaveLength(1));
    expect(result.current.grades[0].id).toBe(5);
  });

  describe('submitGrade validation', () => {
    const submitEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;

    it('rejects submission when student or course is missing', async () => {
      const { result } = renderHook(() => useGradeEntrySync(buildProps({ studentId: '' })));

      await act(async () => {
        await result.current.submitGrade(submitEvent);
      });

      expect(result.current.error).toBe('selectStudentAndCourseError');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('rejects submission with an empty assignment name', async () => {
      const { result } = renderHook(() => useGradeEntrySync(buildProps()));

      // Default category is 'Midterm', which the auto-fill effect (tested
      // separately below) populates assignmentName for on mount - switch to
      // a non-exam category first so this test isolates the assignment-name
      // check itself rather than racing that effect.
      act(() => {
        result.current.setCategory('Homework');
        result.current.setAssignmentName('');
      });

      await act(async () => {
        await result.current.submitGrade(submitEvent);
      });

      expect(result.current.error).toBe('assignmentNameRequired');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('rejects a score greater than max grade', async () => {
      const { result } = renderHook(() => useGradeEntrySync(buildProps()));

      act(() => {
        result.current.setAssignmentName('Quiz 1');
        result.current.setGradeValue('150');
        result.current.setMaxGrade('100');
      });

      await act(async () => {
        await result.current.submitGrade(submitEvent);
      });

      expect(result.current.error).toBe('scoreMustBeBetween0AndMax');
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe('submitGrade success paths', () => {
    const submitEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;

    it('creates a new grade, refreshes grades+final, and resets the form', async () => {
      mockCreate.mockResolvedValue({ id: 99 });
      const { result } = renderHook(() => useGradeEntrySync(buildProps()));

      act(() => {
        result.current.setAssignmentName('Quiz 1');
        result.current.setGradeValue('95');
        result.current.setMaxGrade('100');
      });

      await act(async () => {
        await result.current.submitGrade(submitEvent);
      });

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        student_id: 1,
        course_id: 2,
        assignment_name: 'Quiz 1',
        grade: 95,
        max_grade: 100,
      }));
      // Not asserting assignmentName here: the success path resets category
      // to 'Midterm', which immediately re-triggers the auto-fill effect
      // (covered separately below) and repopulates it - gradeValue isn't
      // touched by that effect, so it's the reliable signal the form reset.
      expect(result.current.gradeValue).toBe('');
      expect(result.current.error).toBeNull();
    });

    it('updates an existing grade when editingGradeId is set (via handleEditGrade)', async () => {
      mockUpdate.mockResolvedValue({});
      const setStudentId = vi.fn();
      const setCourseId = vi.fn();
      const { result } = renderHook(() => useGradeEntrySync(buildProps({ setStudentId, setCourseId })));

      act(() => {
        result.current.handleEditGrade({
          id: 42,
          student_id: 1,
          course_id: 2,
          assignment_name: 'Old Name',
          category: 'Homework',
          grade: 80,
          max_grade: 100,
          weight: 1,
        } as never);
      });

      expect(setStudentId).toHaveBeenCalledWith(1);
      expect(setCourseId).toHaveBeenCalledWith(2);
      expect(result.current.editingGradeId).toBe(42);
      expect(result.current.assignmentName).toBe('Old Name');

      await act(async () => {
        await result.current.submitGrade(submitEvent);
      });

      expect(mockUpdate).toHaveBeenCalledWith(42, expect.objectContaining({ assignment_name: 'Old Name' }));
      expect(result.current.editingGradeId).toBeNull();
    });

    it('queues the mutation and shows an offline message on a network error', async () => {
      mockCreate.mockRejectedValue({ code: 'ERR_NETWORK', message: 'Network Error' });
      const { result } = renderHook(() => useGradeEntrySync(buildProps()));

      act(() => {
        result.current.setAssignmentName('Quiz 1');
        result.current.setGradeValue('95');
        result.current.setMaxGrade('100');
      });

      await act(async () => {
        await result.current.submitGrade(submitEvent);
      });

      expect(mockEnqueue).toHaveBeenCalledWith(expect.objectContaining({ op: 'create' }));
      expect(result.current.error).toBe('offlineQueued');
    });

    it('surfaces the API error detail message on a non-network failure', async () => {
      mockCreate.mockRejectedValue({ response: { data: { detail: 'Duplicate assignment' } } });
      const { result } = renderHook(() => useGradeEntrySync(buildProps()));

      act(() => {
        result.current.setAssignmentName('Quiz 1');
        result.current.setGradeValue('95');
        result.current.setMaxGrade('100');
      });

      await act(async () => {
        await result.current.submitGrade(submitEvent);
      });

      expect(result.current.error).toBe('Duplicate assignment');
      expect(mockEnqueue).not.toHaveBeenCalled();
    });
  });

  describe('handleCancelEdit', () => {
    it('resets all form fields', () => {
      const { result } = renderHook(() => useGradeEntrySync(buildProps()));

      act(() => {
        result.current.setAssignmentName('Something');
        result.current.setCategory('Homework');
        result.current.setGradeValue('50');
      });

      act(() => {
        result.current.handleCancelEdit();
      });

      // Not asserting assignmentName here: resetting category to 'Midterm'
      // immediately re-triggers the auto-fill effect within the same act()
      // flush (covered separately below) and repopulates it.
      expect(result.current.category).toBe('Midterm');
      expect(result.current.gradeValue).toBe('');
      expect(result.current.editingGradeId).toBeNull();
    });
  });

  describe('handleDeleteGrade', () => {
    it('does nothing when the user cancels the confirm dialog', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const { result } = renderHook(() => useGradeEntrySync(buildProps()));

      await act(async () => {
        await result.current.handleDeleteGrade(7);
      });

      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('deletes the grade and refreshes grades+final on confirm', async () => {
      mockDelete.mockResolvedValue({});
      const { result } = renderHook(() => useGradeEntrySync(buildProps()));

      await waitFor(() => expect(mockGet).toHaveBeenCalled());
      mockGet.mockClear();

      await act(async () => {
        await result.current.handleDeleteGrade(7);
      });

      expect(mockDelete).toHaveBeenCalledWith(7);
      expect(mockGet).toHaveBeenCalledWith('/grades/', expect.anything());
    });

    it('sets an error message when deletion fails', async () => {
      mockDelete.mockRejectedValue(new Error('Cannot delete'));
      const { result } = renderHook(() => useGradeEntrySync(buildProps()));

      await act(async () => {
        await result.current.handleDeleteGrade(7);
      });

      expect(result.current.error).toBe('Cannot delete');
    });
  });

  describe('queued-mutation flush', () => {
    it('flushes a queued create mutation on mount when online', async () => {
      mockGetQueue.mockReturnValue([{ id: 'q1', op: 'create', payload: { student_id: 1, course_id: 2 } }]);
      mockCreate.mockResolvedValue({ id: 100 });

      renderHook(() => useGradeEntrySync(buildProps()));

      await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({ student_id: 1, course_id: 2 }));
      expect(mockRemoveQueued).toHaveBeenCalledWith('q1');
    });

    it('falls back to create when a queued update targets a since-deleted grade (404)', async () => {
      mockGetQueue.mockReturnValue([{ id: 'q2', op: 'update', gradeId: 5, payload: { student_id: 1, course_id: 2 } }]);
      mockUpdate.mockRejectedValue({ response: { status: 404 } });
      mockCreate.mockResolvedValue({ id: 101 });

      renderHook(() => useGradeEntrySync(buildProps()));

      await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({ student_id: 1, course_id: 2 }));
      expect(mockRemoveQueued).toHaveBeenCalledWith('q2');
    });

    it('stops flushing and keeps the item queued on a genuine (non-404) failure', async () => {
      mockGetQueue.mockReturnValue([{ id: 'q3', op: 'create', payload: { student_id: 1, course_id: 2 } }]);
      mockCreate.mockRejectedValue(new Error('server error'));

      renderHook(() => useGradeEntrySync(buildProps()));

      await waitFor(() => expect(mockCreate).toHaveBeenCalled());
      expect(mockRemoveQueued).not.toHaveBeenCalled();
    });
  });

  describe('handleEditGrade recall via sessionStorage', () => {
    afterEach(() => {
      sessionStorage.removeItem('grading_recall_grade_id');
    });

    it('fetches and opens the recalled grade for editing, then clears the marker', async () => {
      sessionStorage.setItem('grading_recall_grade_id', '77');
      mockGetById.mockResolvedValue({
        id: 77,
        student_id: 9,
        course_id: 3,
        assignment_name: 'Recalled Grade',
        category: 'Homework',
        grade: 60,
        max_grade: 100,
        weight: 1,
      });

      const { result } = renderHook(() => useGradeEntrySync(buildProps()));

      await waitFor(() => expect(result.current.editingGradeId).toBe(77));
      expect(result.current.assignmentName).toBe('Recalled Grade');
      expect(sessionStorage.getItem('grading_recall_grade_id')).toBeNull();
    });

    it('clears an invalid marker without calling the API', async () => {
      sessionStorage.setItem('grading_recall_grade_id', 'not-a-number');

      renderHook(() => useGradeEntrySync(buildProps()));

      await waitFor(() => expect(sessionStorage.getItem('grading_recall_grade_id')).toBeNull());
      expect(mockGetById).not.toHaveBeenCalled();
    });
  });

  describe('auto-fill on Midterm/Final category', () => {
    it('auto-fills "Midterm Exam A" on mount when there are no prior midterm attempts (default category is Midterm)', async () => {
      mockGet.mockImplementation(async (url: string) => {
        if (url.includes('/analytics/')) return okResponse({});
        if (url === '/grades/') return okResponse({ items: [] });
        return okResponse({});
      });

      const { result } = renderHook(() => useGradeEntrySync(buildProps()));

      await waitFor(() => expect(result.current.assignmentName).toBe('Midterm Exam A'));
      expect(result.current.maxGrade).toBe('100');
    });

    it('suffixes "B" when a midterm attempt already exists in the loaded grades', async () => {
      mockGet.mockImplementation(async (url: string) => {
        if (url.includes('/analytics/')) return okResponse({});
        if (url === '/grades/') return okResponse({ items: [{ id: 1, student_id: 1, course_id: 2, category: 'Midterm Exam', grade: 80, max_grade: 100 }] });
        return okResponse({});
      });

      const { result } = renderHook(() => useGradeEntrySync(buildProps()));

      await waitFor(() => expect(result.current.assignmentName).toBe('Midterm Exam B'));
    });

    it('does not override a manually-typed assignment name when the effect re-runs', async () => {
      mockGet.mockImplementation(async (url: string) => {
        if (url.includes('/analytics/')) return okResponse({});
        if (url === '/grades/') return okResponse({ items: [] });
        return okResponse({});
      });

      const { result, rerender } = renderHook((props) => useGradeEntrySync(props), { initialProps: buildProps() });
      await waitFor(() => expect(result.current.assignmentName).toBe('Midterm Exam A'));

      act(() => {
        result.current.setAssignmentName('My Custom Title');
      });

      // Force the effect to re-run via a real dependency change (courseId).
      rerender(buildProps({ courseId: 3 }));

      await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/grades/', expect.objectContaining({ params: expect.objectContaining({ course_id: 3 }) })));
      expect(result.current.assignmentName).toBe('My Custom Title');
    });

    it('forces weight to 1 for the Midterm Exam / Final Exam categories', () => {
      const { result } = renderHook(() => useGradeEntrySync(buildProps()));

      act(() => {
        result.current.setCategory('Final Exam');
      });

      expect(result.current.weight).toBe('1');
    });
  });
});
