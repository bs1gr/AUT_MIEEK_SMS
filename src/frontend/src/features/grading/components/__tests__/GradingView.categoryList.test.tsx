/**
 * The Grading page's category list after todo 77 point 2's second review (2026-11-23): a course's
 * own rules under their own names, a standard name in the page's language, and a grade being
 * edited keeps its category. Real Greek texts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';
import { LanguageProvider } from '@/LanguageContext';
import GradingView from '../GradingView';
import * as apiModule from '../../../../api/api';
import { DateTimeSettingsProvider } from '../../../../contexts/DateTimeSettingsContext';

vi.mock('../../../../api/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  gradesAPI: { submitGrade: vi.fn(), create: vi.fn(), update: vi.fn() },
  enrollmentsAPI: { getEnrolledStudents: vi.fn(), getByStudent: vi.fn() },
}));

const students = [
  { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com', student_id: 'S001', enrollment_date: '2024-01-01', is_active: true },
];
const course = (rules: Array<{ category: string; weight: number }>) => [
  { id: 1, course_name: 'Math 101', course_code: 'MATH101', semester: 'Fall 2024', credits: 3, is_active: true, evaluation_rules: rules },
];
const answer = (data: unknown) => ({ data, status: 200, statusText: 'OK', headers: {}, config: {} as unknown as Record<string, unknown> });

const open = async (rules: Array<{ category: string; weight: number }>, grades: unknown[] = []) => {
  vi.mocked(apiModule.default.get).mockImplementation(async (url: string) =>
    answer(url.startsWith('/grades') ? grades : url.includes('/final-grade') ? { final_grade: 70, category_breakdown: {} } : [])
  );
  localStorage.setItem('i18nextLng', 'el');
  await act(async () => {
    await i18n.changeLanguage('el');
  });
  const { container } = render(
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <BrowserRouter>
          <DateTimeSettingsProvider>
            <GradingView students={students} courses={course(rules)} />
          </DateTimeSettingsProvider>
        </BrowserRouter>
      </LanguageProvider>
    </I18nextProvider>
  );
  fireEvent.change(container.querySelector('select[name="studentId"]')!, { target: { value: '1' } });
  fireEvent.change(container.querySelector('select[name="courseId"]')!, { target: { value: '1' } });
  const select = () => container.querySelector('select[name="category"]') as HTMLSelectElement;
  const labels = () => Array.from(select().querySelectorAll('option')).map((o) => o.textContent);
  return { container, select, labels };
};

describe('Grading page: the category list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}), text: async () => '' } as unknown as Response));
    vi.mocked(apiModule.enrollmentsAPI.getEnrolledStudents).mockResolvedValue(students);
  });

  it('offers a template rule under its own name', async () => {
    // It read as homework and was hidden behind «Εργασία»; the «Συνεχής Αξιολόγηση» option did not
    // reach it. Now both do (the owner: tasks of the lesson belong to Συνεχής Αξιολόγηση).
    const { labels } = await open([
      { category: 'Συμμετοχή στο Μάθημα', weight: 10 },
      { category: 'Συνεχής Αξιολόγηση (Εκπόνηση εργασιών στο σπίτι)', weight: 20 },
      { category: 'Ενδιάμεση Εξέταση', weight: 30 },
      { category: 'Τελική Εξέταση', weight: 40 },
    ]);

    expect(labels()).toContain('Συνεχής Αξιολόγηση (Εκπόνηση εργασιών στο σπίτι)');
    // A standard name already offered is not offered twice.
    expect(labels().filter((l) => l === 'Τελική Εξέταση')).toHaveLength(1);
    expect(labels().filter((l) => l === 'Συμμετοχή στο Μάθημα')).toHaveLength(1);
  });

  it('names a course\'s "Exam" and "Exercises" rules as typed, not as the Final Exam and Homework', async () => {
    // The review: «Τελική Εξέταση» was offered twice, and a grade filed under the wrong one replaced
    // the final (an imported course: «Θεωρητική Εξέταση» -> "Exam", «Ασκήσεις» -> "Exercises").
    const { labels } = await open([
      { category: 'Exam', weight: 40 },
      { category: 'Exercises', weight: 20 },
      { category: 'Final Exam', weight: 40 },
    ]);

    expect(labels()).toEqual(expect.arrayContaining(['Exam', 'Exercises']));
    expect(labels().filter((l) => l === 'Τελική Εξέταση')).toHaveLength(1);
    expect(labels().filter((l) => l === 'Εργασία')).toHaveLength(1);
  });

  it('keeps an edited grade\'s own category in the box', async () => {
    // Filed under "Homework/Assignments" when the list offered it: the box showed «Ενδιάμεση
    // Εξέταση» while the grade kept its category, and choosing the midterm changed nothing.
    const grade = {
      id: 9, student_id: 1, course_id: 1, assignment_name: 'HW 1', category: 'Homework/Assignments',
      grade: 15, max_grade: 20, weight: 1, date_submitted: '2026-01-20', date_assigned: '2026-01-20',
    };
    const { select } = await open(
      [{ category: 'Homework/Assignments', weight: 50 }, { category: 'Final Exam', weight: 50 }],
      [grade]
    );

    fireEvent.click(await screen.findByRole('button', { name: /Επεξεργασία/ }));

    await waitFor(() => expect(select().value).toBe('Homework/Assignments'));
    expect(select().selectedOptions[0].textContent).toBe('Εργασία');
  });

  it('shows a grade filed under a course\'s own rule once, though the server title-cased it', async () => {
    const rule = 'Συνεχής Αξιολόγηση (Εκπόνηση εργασιών στο σπίτι)';
    const stored = 'Συνεχής Αξιολόγηση (Εκπόνηση Εργασιών Στο Σπίτι)';
    const grade = {
      id: 10, student_id: 1, course_id: 1, assignment_name: 'Task', category: stored,
      grade: 15, max_grade: 20, weight: 1, date_submitted: '2026-01-20', date_assigned: '2026-01-20',
    };
    const { select, labels } = await open([{ category: rule, weight: 40 }, { category: 'Final Exam', weight: 60 }], [grade]);

    fireEvent.click(await screen.findByRole('button', { name: /Επεξεργασία/ }));

    await waitFor(() => expect(select().value).toBe(stored));
    expect(labels().filter((l) => (l ?? '').toLowerCase().startsWith('συνεχής αξιολόγηση (')).length).toBe(1);
  });
});
