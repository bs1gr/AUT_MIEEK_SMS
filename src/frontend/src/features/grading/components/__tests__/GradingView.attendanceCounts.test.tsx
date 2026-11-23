/**
 * The Grading page's final-grade summary names the periods by status, a Late among the attended
 * and counted for the teacher's evaluation: one of the four places the owner named (2026-11-23,
 * plan todo 77). Until then only the Profile's breakdown showed them. Real English and Greek texts.
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
  {
    id: 1,
    course_name: 'Math 101',
    course_code: 'MATH101',
    semester: 'Fall 2024',
    credits: 3,
    is_active: true,
    evaluation_rules: [
      { category: 'Attendance', weight: 20 },
      { category: 'Homework', weight: 80 },
    ],
  },
];
const answer = (data: unknown) => ({ data, status: 200, statusText: 'OK', headers: {}, config: {} as unknown as Record<string, unknown> });

// Present, Present, Present, Late, Absent: the Attendance rule counts 4 of 5.
const finalGrade = (attendance?: Record<string, number>) => ({
  student_id: 1,
  course_id: 1,
  final_grade: 80,
  gpa: 3,
  letter_grade: 'B',
  category_breakdown: {
    Attendance: { average: 80, weight: 20, contribution: 16, total_items: 1 },
    Homework: { average: 80, weight: 80, contribution: 64, total_items: 1 },
  },
  ...(attendance ? { attendance } : {}),
});

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
  // The summary is drawn once the final grade has come (not a percentage: the rules card shows
  // the weights before any answer).
  await screen.findByTestId('grading-final-summary');
};

describe('Grading page: the periods by status in the final-grade summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}), text: async () => '' } as unknown as Response));
    vi.mocked(apiModule.enrollmentsAPI.getEnrolledStudents).mockResolvedValue(students);
  });

  it('counts the periods by status and names the Lates for the evaluation', async () => {
    await openSummary('en', finalGrade({ present: 3, late: 1, absent: 1, excused: 0, recorded: 5 }));

    const counts = await screen.findByTestId('grading-attendance-counts');
    expect(counts).toHaveTextContent('Attendance: Present 3 · Late 1 · Absent 1 · Excused 0');
    expect(counts).toHaveTextContent('A Late counts as attended, not as an absence');
  });

  it('says the same in Greek, with the words of the Attendance page', async () => {
    await openSummary('el', finalGrade({ present: 3, late: 1, absent: 1, excused: 2, recorded: 7 }));

    const counts = await screen.findByTestId('grading-attendance-counts');
    expect(counts).toHaveTextContent('Παρουσίες: Παρών 3 · Αργοπορία 1 · Απών 1 · Δικαιολογημένος 2');
    expect(counts).toHaveTextContent('Η αργοπορία μετρά ως παρουσία');
  });

  it('counts without the note when there is no Late', async () => {
    await openSummary('en', finalGrade({ present: 4, late: 0, absent: 1, excused: 0, recorded: 5 }));

    const counts = await screen.findByTestId('grading-attendance-counts');
    expect(counts).toHaveTextContent('Present 4 · Late 0');
    expect(counts).not.toHaveTextContent('A Late counts as attended');
  });

  it('says nothing of attendance with no period recorded', async () => {
    // What this server sends for a student with nothing recorded: the counts, all 0.
    await openSummary('en', finalGrade({ present: 0, late: 0, absent: 0, excused: 0, recorded: 0 }));
    expect(screen.getByTestId('grading-final-summary')).toHaveTextContent('80%');
    expect(screen.queryByTestId('grading-attendance-counts')).not.toBeInTheDocument();
  });

  it('says nothing of attendance from an older server, which sends no counts', async () => {
    await openSummary('en', finalGrade());
    expect(screen.queryByTestId('grading-attendance-counts')).not.toBeInTheDocument();
  });
});
