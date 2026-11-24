/**
 * Where no evaluation rule takes a student's grades, the final grade is their mean, each by its
 * Weight and an exam by its latest grade, less any absence penalty (the owner, 2026-11-23, plan
 * todo 77 point 3), and the Grading page says so. Until then the page had no final grade for a
 * course without rules, and 0 for grades outside the rules. Real English and Greek texts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';
import { LanguageProvider } from '@/LanguageContext';
import GradingView from '../GradingView';
import * as apiModule from '../../../../api/api';
import { DateTimeSettingsProvider } from '../../../../contexts/DateTimeSettingsContext';

vi.mock('../../../../api/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
  gradesAPI: { submitGrade: vi.fn(), create: vi.fn() },
  enrollmentsAPI: { getEnrolledStudents: vi.fn(), getByStudent: vi.fn() },
}));

const students = [
  { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com', student_id: 'S001', enrollment_date: '2024-01-01', is_active: true },
];
const courses = [
  { id: 1, course_name: 'Math 101', course_code: 'MATH101', semester: 'Fall 2024', credits: 3, is_active: true, evaluation_rules: [] },
];
const answer = (data: unknown) => ({ data, status: 200, statusText: 'OK', headers: {}, config: {} as unknown as Record<string, unknown> });

const fromMean = {
  student_id: 1,
  course_id: 1,
  final_grade: 77.5,
  gpa: 3.1,
  letter_grade: 'C+',
  total_weight_used: 0,
  grade_basis: 'average',
  category_breakdown: {},
};
const fromRules = {
  ...fromMean,
  total_weight_used: 100,
  grade_basis: 'rules',
  category_breakdown: { Homework: { average: 77.5, weight: 100, contribution: 77.5, total_items: 2 } },
};

const openSummary = async (lang: 'en' | 'el', data: unknown) => {
  vi.mocked(apiModule.default.get).mockImplementation(async (url: string) =>
    answer(url.includes('/final-grade') ? data : [])
  );
  localStorage.setItem('i18nextLng', lang);
  await act(async () => {
    await i18n.changeLanguage(lang);
  });
  const { container } = render(
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <BrowserRouter>
          <DateTimeSettingsProvider>
            <GradingView students={students} courses={courses} />
          </DateTimeSettingsProvider>
        </BrowserRouter>
      </LanguageProvider>
    </I18nextProvider>
  );
  fireEvent.change(container.querySelector('select[name="studentId"]')!, { target: { value: '1' } });
  fireEvent.change(container.querySelector('select[name="courseId"]')!, { target: { value: '1' } });
  return screen.findByTestId('grading-final-summary');
};

describe('Grading page: a final grade no evaluation rule makes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}), text: async () => '' } as unknown as Response));
    vi.mocked(apiModule.enrollmentsAPI.getEnrolledStudents).mockResolvedValue(students);
  });

  it('shows the grade and says it is the mean of the grades by their Weight', async () => {
    const summary = await openSummary('en', fromMean);

    expect(summary).toHaveTextContent('77.5%');
    expect(screen.getByTestId('grading-final-from-mean')).toHaveTextContent(
      'No evaluation rule applies to these grades, so the final grade is their mean: each grade counts as often as its Weight says, and of Midterm Exam and Final Exam only the retake, else the latest. Any absence penalty comes off the mean.'
    );
    // No empty list of categories under it.
    expect(summary).not.toHaveTextContent('Category Breakdown');
  });

  it('says the same in Greek', async () => {
    await openSummary('el', fromMean);

    expect(screen.getByTestId('grading-final-from-mean')).toHaveTextContent(
      'Κανένας κανόνας αξιολόγησης δεν αντιστοιχεί σε αυτούς τους βαθμούς, οπότε ο τελικός βαθμός είναι ο μέσος όρος τους'
    );
    expect(screen.getByTestId('grading-final-from-mean')).toHaveTextContent('Βαρύτητά του');
  });

  it('lists the categories, without the note, when the rules make the grade', async () => {
    const summary = await openSummary('en', fromRules);

    expect(screen.queryByTestId('grading-final-from-mean')).not.toBeInTheDocument();
    expect(summary).toHaveTextContent('Category Breakdown');
    expect(summary).toHaveTextContent('Homework: 77.5% (w 100%)');
  });

  it('adds no note for an older server, which does not say how the grade was made', async () => {
    const older: Record<string, unknown> = { ...fromRules };
    delete older.grade_basis;
    await openSummary('en', older);

    expect(screen.queryByTestId('grading-final-from-mean')).not.toBeInTheDocument();
  });
});
