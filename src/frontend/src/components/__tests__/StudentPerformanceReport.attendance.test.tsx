/**
 * The student performance report's attendance (plan todo 77): a Late counts as attended in the
 * rate, so the periods beside the rate count it too, and the report names the Lates and the
 * Excused, so the rate can be read off the counts. Real English and Greek texts.
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

// Present, Late, Late, Excused in one course: what the server sends since todo 77.
const attendance = (late: number, present: number) => ({
  total_days: 4,
  present,
  absent: 0,
  late,
  excused: 1,
  attendance_rate: ((present + late) / 4) * 100,
  unexcused_absences: 0,
});
const report = (late: number, present: number) => ({
  student_name: 'Late Student',
  student_email: 'late@example.com',
  report_period: 'month',
  start_date: '2026-10-24',
  end_date: '2026-11-23',
  overall_attendance: attendance(late, present),
  courses: [{ course_code: 'C1', course_title: 'Course One', attendance: attendance(late, present) }],
});

const open = async (lang: 'en' | 'el', data: unknown) => {
  vi.mocked(reportsAPI.generateStudentReport).mockResolvedValue(data as never);
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
  await screen.findByText(/Course One/);
};

describe('Student performance report: attendance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('counts the Lates among the periods attended, as the rate does, and names them', async () => {
    await open('en', report(2, 1));

    // 1 Present + 2 Late of 4: the rate 75 % and the periods beside it agree (was "1/4"). Periods,
    // not days: a record is one teaching period, and a day can have several.
    expect(screen.getByTestId('report-course-attendance-0')).toHaveTextContent('75% (3/4 periods attended) · 2 late');
    expect(screen.getByText('Periods recorded:').parentElement).toHaveTextContent('Periods recorded:4');
    expect(screen.getByTestId('report-overall-late')).toHaveTextContent('Late:2');
    expect(screen.getByTestId('report-overall-excused')).toHaveTextContent('Excused:1');
  });

  it('says the same in Greek, with the word of the Attendance page, one Late in the singular', async () => {
    await open('el', report(1, 2));

    expect(screen.getByTestId('report-course-attendance-0')).toHaveTextContent('75% (3/4 ώρες παρουσίας) · 1 αργοπορία');
    expect(screen.getByText('Καταγεγραμμένες ώρες:').parentElement).toHaveTextContent('Καταγεγραμμένες ώρες:4');
    expect(screen.getByTestId('report-overall-late')).toHaveTextContent('Αργοπορία:1');
    expect(screen.getByTestId('report-overall-excused')).toHaveTextContent('Δικαιολογημένος:1');
  });

  it('names no Late where there is none, and lists no count an older server does not send', async () => {
    const data = report(0, 3);
    delete (data.overall_attendance as Partial<typeof data.overall_attendance>).late;
    delete (data.overall_attendance as Partial<typeof data.overall_attendance>).excused;
    await open('en', data);

    expect(screen.getByTestId('report-course-attendance-0')).toHaveTextContent('75% (3/4 periods attended)');
    expect(screen.getByTestId('report-course-attendance-0')).not.toHaveTextContent('late');
    expect(screen.queryByTestId('report-overall-late')).not.toBeInTheDocument();
    expect(screen.queryByTestId('report-overall-excused')).not.toBeInTheDocument();
  });
});
