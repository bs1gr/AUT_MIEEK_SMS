/**
 * Plan todo 80 (the owner, 2026-11-24): "teacher shall have the option to select the date exam was
 * taken and also to select a retake exam as an overwrite of the first final exam ... The same should
 * happen with a midterm retake". A Midterm's or a Final Exam's grade (under any spelling the final
 * grade reads so) has a "Date the exam was taken" box and a "Retake" mark. The retake counts in the
 * final grade and the earlier sitting no longer does (the server's rule); the history marks both.
 * A retake of the final exam under 50 fails the course, flagged as the absence limit is.
 * Real English and Greek texts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';
import { LanguageProvider } from '@/LanguageContext';
import { formatLocalDate } from '@/utils/date';
import GradingView from '../GradingView';
import * as apiModule from '../../../../api/api';
import { DateTimeSettingsProvider } from '../../../../contexts/DateTimeSettingsContext';
import type { Grade } from '@/types';

vi.mock('../../../../api/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  gradesAPI: { submitGrade: vi.fn(), create: vi.fn(), update: vi.fn(), getById: vi.fn() },
  enrollmentsAPI: { getEnrolledStudents: vi.fn(), getByStudent: vi.fn() },
}));

const students = [
  { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com', student_id: 'S001', enrollment_date: '2024-01-01', is_active: true },
];
const course = {
  id: 1,
  course_name: 'Math 101',
  course_code: 'MATH101',
  semester: 'Fall 2024',
  credits: 3,
  is_active: true,
  // A course's own name for its final: the Final Exam kind by its words, not the standard name.
  evaluation_rules: [
    { category: 'Homework', weight: 40 },
    { category: 'Τελική Εξέταση Θεωρίας', weight: 60 },
  ],
};
const answer = (data: unknown) => ({ data, status: 200, statusText: 'OK', headers: {}, config: {} as unknown as Record<string, unknown> });
const grade = (over: Partial<Grade>): Grade => ({
  id: 1,
  student_id: 1,
  course_id: 1,
  assignment_name: 'Final Exam A',
  category: 'Final Exam',
  grade: 90,
  max_grade: 100,
  weight: 1,
  date_submitted: '2026-01-30',
  is_retake: false,
  ...over,
});

let storedGrades: Grade[] = [];
let finalSummary: Record<string, unknown> = {};

const renderForm = async (lang: 'en' | 'el' = 'en') => {
  localStorage.setItem('i18nextLng', lang);
  await act(async () => {
    await i18n.changeLanguage(lang);
  });
  const { container } = render(
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <BrowserRouter>
          <DateTimeSettingsProvider>
            <GradingView students={students} courses={[course]} />
          </DateTimeSettingsProvider>
        </BrowserRouter>
      </LanguageProvider>
    </I18nextProvider>
  );
  fireEvent.change(container.querySelector('select[name="studentId"]')!, { target: { value: '1' } });
  fireEvent.change(container.querySelector('select[name="courseId"]')!, { target: { value: '1' } });
  return container;
};

const choose = (container: HTMLElement, category: string) =>
  fireEvent.change(container.querySelector('select[name="category"]')!, { target: { value: category } });

const fillScore = (container: HTMLElement) => {
  fireEvent.change(container.querySelector('input[name="grade"]')!, { target: { value: '45' } });
  fireEvent.change(container.querySelector('input[name="max_grade"]')!, { target: { value: '100' } });
};

const save = async (container: HTMLElement, api: 'create' | 'update' = 'create', call = 1) => {
  fillScore(container);
  fireEvent.click(container.querySelector('[data-testid="grade-form"] button[type="submit"]')!);
  await waitFor(() => expect(apiModule.gradesAPI[api]).toHaveBeenCalledTimes(call));
  return vi.mocked(apiModule.gradesAPI[api]).mock.calls[call - 1];
};

describe('Grade Entry: the date an exam was taken and the retake mark', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storedGrades = [];
    finalSummary = {};
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}), text: async () => '' } as unknown as Response));
    vi.mocked(apiModule.default.get).mockImplementation(async (url: string) => {
      if (url === '/grades/') return answer(storedGrades);
      if (url.includes('/final-grade')) return answer(finalSummary);
      return answer([]);
    });
    vi.mocked(apiModule.enrollmentsAPI.getEnrolledStudents).mockResolvedValue(students);
    vi.mocked(apiModule.gradesAPI.create).mockResolvedValue({});
    vi.mocked(apiModule.gradesAPI.update).mockResolvedValue({});
  });

  it('offers both for the final exam and saves the day chosen with the mark', async () => {
    const container = await renderForm();
    choose(container, 'Final Exam');

    const day = screen.getByLabelText('Date the exam was taken');
    expect(day).toHaveValue(formatLocalDate(new Date()));
    const mark = screen.getByLabelText('Retake (replaces the earlier sitting)');
    expect(mark).not.toBeChecked();
    expect(screen.getByTestId('grading-exam-sitting')).toHaveTextContent(
      'Tick it for the student who sits the final exam again. The retake counts in the final grade and the earlier sitting no longer does; a retake under 50 fails the course.'
    );

    fireEvent.change(day, { target: { value: '2026-02-10' } });
    fireEvent.click(mark);
    const [payload] = await save(container);

    expect(payload).toEqual(expect.objectContaining({ category: 'Final Exam', date_submitted: '2026-02-10', is_retake: true }));
  });

  it('clears the mark after a save and keeps the day for the next grade of that exam', async () => {
    const container = await renderForm();
    choose(container, 'Final Exam');
    fireEvent.change(screen.getByLabelText('Date the exam was taken'), { target: { value: '2026-02-10' } });
    fireEvent.click(screen.getByLabelText('Retake (replaces the earlier sitting)'));
    await save(container);

    choose(container, 'Final Exam');
    await waitFor(() => expect(screen.getByLabelText('Retake (replaces the earlier sitting)')).not.toBeChecked());
    expect(screen.getByLabelText('Date the exam was taken')).toHaveValue('2026-02-10');
    expect((await save(container, 'create', 2))[0]).toEqual(expect.objectContaining({ date_submitted: '2026-02-10', is_retake: false }));
  });

  it("reads a course's own name for its final exam as one, and offers the midterm the same", async () => {
    const container = await renderForm();
    choose(container, 'Τελική Εξέταση Θεωρίας');
    expect(screen.getByLabelText('Retake (replaces the earlier sitting)')).toBeInTheDocument();

    choose(container, 'Midterm Exam');
    expect(screen.getByLabelText('Date the exam was taken')).toBeInTheDocument();
    expect(screen.getByTestId('grading-exam-sitting')).toHaveTextContent(
      'Tick it for the student who sits the midterm again. The retake counts in the final grade and the earlier sitting no longer does.'
    );
  });

  it('offers neither for another category, which is saved as no retake on the day it is entered', async () => {
    const container = await renderForm();
    choose(container, 'Final Exam');
    fireEvent.click(screen.getByLabelText('Retake (replaces the earlier sitting)'));
    choose(container, 'Homework');
    fireEvent.change(container.querySelector('input[name="assignmentName"]')!, { target: { value: 'HW 1' } });

    expect(screen.queryByTestId('grading-exam-sitting')).not.toBeInTheDocument();
    expect((await save(container))[0]).toEqual(
      expect.objectContaining({ category: 'Homework', date_submitted: formatLocalDate(new Date()), is_retake: false })
    );
  });

  it('says the same in Greek', async () => {
    const container = await renderForm('el');
    choose(container, 'Final Exam');

    expect(screen.getByLabelText('Ημερομηνία που δόθηκε η εξέταση')).toBeInTheDocument();
    expect(screen.getByLabelText('Επαναληπτική (αντικαθιστά την προηγούμενη)')).toBeInTheDocument();
    expect(screen.getByTestId('grading-exam-sitting')).toHaveTextContent('Επιλέξτε το για τον σπουδαστή που δίνει ξανά την τελική εξέταση.');
  });

  it("fills an edited grade's own day and mark, and saves them", async () => {
    storedGrades = [grade({ id: 7, is_retake: true, date_submitted: '2026-02-10', grade: 45 })];
    const container = await renderForm();
    const row = await screen.findByTestId('grading-history-row-7');
    fireEvent.click(within(row).getByText('Edit'));

    await waitFor(() => expect(screen.getByLabelText('Retake (replaces the earlier sitting)')).toBeChecked());
    expect(screen.getByLabelText('Date the exam was taken')).toHaveValue('2026-02-10');
    fireEvent.click(screen.getByLabelText('Retake (replaces the earlier sitting)'));
    const [id, payload] = await save(container, 'update');

    expect(id).toBe(7);
    expect(payload).toEqual(expect.objectContaining({ date_submitted: '2026-02-10', is_retake: false }));
  });

  it('leaves an undated exam grade undated when it is edited', async () => {
    // The review of 2026-11-24: an edit dated an undated grade on the day of the edit.
    storedGrades = [grade({ id: 8, date_submitted: undefined })];
    const container = await renderForm();
    fireEvent.click(within(await screen.findByTestId('grading-history-row-8')).getByText('Edit'));

    await waitFor(() => expect(screen.getByLabelText('Date the exam was taken')).toHaveValue(''));
    const [, payload] = await save(container, 'update');

    expect(payload).not.toHaveProperty('date_submitted');
  });

  it('marks the retake in the history and the sitting it replaced as not counted', async () => {
    storedGrades = [
      grade({ id: 1, assignment_name: 'Final Exam A', grade: 95, date_submitted: '2026-02-12' }),
      grade({ id: 2, assignment_name: 'Final Exam B', grade: 45, date_submitted: '2026-01-30', is_retake: true }),
      grade({ id: 3, assignment_name: 'Midterm Exam A', category: 'Midterm Exam', grade: 60 }),
      grade({ id: 4, assignment_name: 'Midterm Exam B', category: 'Midterm Exam', grade: 70, date_submitted: '2026-02-01' }),
    ];
    await renderForm();

    const first = await screen.findByTestId('grading-history-row-1');
    expect(first).toHaveTextContent('Replaced by the retake: not counted');
    const retake = screen.getByTestId('grading-history-row-2');
    expect(retake).toHaveTextContent('Retake');
    expect(retake).not.toHaveTextContent('not counted');
    // No retake of the midterm: the latest sitting counts, as before, and nothing is marked.
    expect(screen.getByTestId('grading-history-row-3')).not.toHaveTextContent('not counted');
    expect(screen.getByTestId('grading-history-row-4')).not.toHaveTextContent('Retake');
  });

  it('flags a failed retake of the final exam as the absence limit is, the final grade still shown', async () => {
    finalSummary = { final_grade: 63, gpa: 2.5, letter_grade: 'D', final_exam_retake: { date: '2026-02-10', percentage: 45, failed: true } };
    await renderForm();

    const warning = await screen.findByTestId('final-exam-retake-warning');
    expect(warning).toHaveTextContent('Failed: the final exam retake is under 50.');
    expect(warning).toHaveTextContent('45%. A retake of the final exam under 50 fails the course whatever the final grade');
    expect(screen.getByTestId('grading-final-exam-retake-badge')).toHaveTextContent('Failed: the final exam retake is under 50 (45% on');
    expect(screen.getByTestId('grading-final-summary')).toHaveTextContent('63%');
  });

  it('flags nothing for a retake of 50 or more', async () => {
    finalSummary = { final_grade: 80, final_exam_retake: { date: '2026-02-10', percentage: 60, failed: false } };
    await renderForm();

    await screen.findByTestId('grading-final-summary');
    expect(screen.queryByTestId('final-exam-retake-warning')).not.toBeInTheDocument();
  });
});
