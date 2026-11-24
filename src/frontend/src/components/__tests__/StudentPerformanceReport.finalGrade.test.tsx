/**
 * Plan todo 83: a course's figure in the student report is its final grade once its Final Exam is
 * graded (the server's grade_basis "final"), named so; before, the average of the period's grades,
 * under "Grades" as before. Real English and Greek texts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';
import { LanguageProvider } from '@/LanguageContext';
import StudentPerformanceReport from '@/components/StudentPerformanceReport';
import { reportsAPI } from '@/api/api';

vi.mock('@/api/api', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  reportsAPI: { generateStudentReport: vi.fn(), downloadStudentReport: vi.fn() },
}));

const grades = (average: number) => ({
  total_assignments: 2,
  average_grade: average,
  average_percentage: average,
  highest_grade: 90,
  lowest_grade: 40,
  grade_trend: 'stable',
});
const report = {
  student_name: 'Final Student',
  student_email: 'final@example.com',
  report_period: 'month',
  start_date: '2026-10-24',
  end_date: '2026-11-23',
  overall_grades: grades(67.5),
  courses: [
    { course_code: 'F1', course_title: 'Course Final', grades: grades(60), grade_basis: 'final' },
    { course_code: 'A1', course_title: 'Course Average', grades: grades(75), grade_basis: 'average' },
  ],
};

const open = async (lang: 'en' | 'el') => {
  vi.mocked(reportsAPI.generateStudentReport).mockResolvedValue(report as never);
  localStorage.setItem('i18nextLng', lang);
  await act(async () => {
    await i18n.changeLanguage(lang);
  });
  render(
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <MemoryRouter>
          <StudentPerformanceReport studentId={1} />
        </MemoryRouter>
      </LanguageProvider>
    </I18nextProvider>
  );
  fireEvent.click(await screen.findByRole('button', { name: lang === 'en' ? /generate/i : /δημιουργία αναφοράς/i }));
  await screen.findByText(/Course Final/);
};

describe('Student performance report: a course by its final grade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('names the final grade of a course whose Final Exam is graded', async () => {
    await open('en');

    expect(screen.getByTestId('report-course-grade-label-F1')).toHaveTextContent('Final grade:');
    expect(screen.getByTestId('report-course-grade-label-A1')).toHaveTextContent('Grades:');
  });

  it('says it in Greek', async () => {
    await open('el');

    expect(screen.getByTestId('report-course-grade-label-F1')).toHaveTextContent('Τελικός βαθμός:');
    expect(screen.getByTestId('report-course-grade-label-A1')).toHaveTextContent('Βαθμοί:');
  });
});
