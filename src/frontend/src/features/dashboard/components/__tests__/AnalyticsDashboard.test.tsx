import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n/config';
import { LanguageProvider } from '@/LanguageContext';
import type { ClassOverview, StudentOverview, StudentOverviewCourse } from '@/api/hooks/useAnalytics';
import { AnalyticsDashboard } from '../AnalyticsDashboard';

const get = vi.hoisted(() => vi.fn());

vi.mock('@/api/api', () => ({
  apiClient: { get },
  extractAPIResponseData: (data: unknown) => data,
}));
vi.mock('../../hooks/useAnalyticsExport', () => ({
  useAnalyticsExport: () => ({ exportPDF: vi.fn(), exportExcel: vi.fn(), isExporting: false, exportError: null }),
}));
vi.mock('../../hooks/useDashboards', () => ({
  useDashboards: () => ({ dashboards: [], defaultDashboard: null }),
}));
vi.mock('@/contexts/DateTimeSettingsContext', () => ({
  useDateTimeFormatter: () => ({ formatDate: (d: string) => d }),
}));
// recharts needs layout; the charts' own rendering is not what these tests are about.
vi.mock('recharts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('recharts')>()),
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const attendance = (present: number, absent: number) => ({
  present,
  late: 0,
  absent,
  excused: 0,
  recorded: present + absent,
  rate: present + absent ? (present / (present + absent)) * 100 : null,
});

const course = (id: number, code: string, final: number | null, extra: Partial<StudentOverviewCourse> = {}): StudentOverviewCourse => ({
  id,
  course_code: code,
  course_name: `Course ${code}`,
  final_grade: final,
  grade_basis: final === null ? null : 'rules',
  grade_count: final === null ? 0 : 2,
  passing: final === null ? null : final >= 50,
  class_average: final === null ? null : 60,
  rank: final === null ? null : 1,
  ranked_of: final === null ? 0 : 3,
  attendance: attendance(4, 1),
  absence: { status: 'ok', absences: 1, allowed_absences: 4, remaining_absences: 3, absence_percent: 2.4, limit_percent: 10 },
  grades: final === null ? [] : [{ date: '2026-10-01', category: 'Final Exam', assignment: 'Exam', percentage: final }],
  ...extra,
});

const studentOverview = (id: number, name: string, courses: StudentOverviewCourse[]): StudentOverview => {
  const finals = courses.map((c) => c.final_grade).filter((g): g is number => g !== null);
  return {
    student: { id, student_id: `S${id}`, name, academic_year: 'A', class_division: 'A1', is_active: true },
    summary: {
      courses: courses.length,
      graded_courses: finals.length,
      average_final_grade: finals.length ? finals.reduce((a, b) => a + b, 0) / finals.length : null,
      passing: finals.filter((g) => g >= 50).length,
      failing: finals.filter((g) => g < 50).length,
      attendance: attendance(4, 1),
      absence_status: 'ok',
      at_risk: finals.some((g) => g < 50),
    },
    courses,
  };
};

const classOverview: ClassOverview = {
  scope: { academic_year: null, class_division: null, course_id: null },
  filters: { academic_years: ['A', 'B'], class_divisions: ['A1', 'A2'] },
  summary: {
    students: 2,
    courses: 3,
    enrollments: 3,
    graded_enrollments: 2,
    average_final_grade: 55,
    pass_rate: 50,
    attendance_rate: 80,
    at_risk_students: 1,
  },
  distribution: [
    { band: '0-49', count: 1 },
    { band: '50-59', count: 0 },
    { band: '60-69', count: 0 },
    { band: '70-79', count: 1 },
    { band: '80-89', count: 0 },
    { band: '90-100', count: 0 },
  ],
  courses: [
    {
      id: 1, course_code: 'MATH', course_name: 'Course MATH', students: 2, graded: 2, average_final_grade: 55,
      passing: 1, failing: 1, attendance_rate: 80, attendance: attendance(8, 2), absence_warning: 0, absence_insufficient: 0,
    },
  ],
  students: [
    {
      id: 1, student_id: 'S1', name: 'Anna Alpha', academic_year: 'A', class_division: 'A1', courses: 2,
      average_final_grade: 74, failing_courses: [], attendance_rate: 80, absence_status: 'ok', at_risk: false,
    },
    {
      id: 2, student_id: 'S2', name: 'Bob Beta', academic_year: 'A', class_division: 'A2', courses: 1,
      average_final_grade: 34, failing_courses: ['Course CHEM'], attendance_rate: 50, absence_status: 'warning', at_risk: true,
    },
  ],
};

const students: Record<number, StudentOverview> = {
  1: studentOverview(1, 'Anna Alpha', [course(1, 'MATH', 74), course(2, 'PHYS', null)]),
  2: studentOverview(2, 'Bob Beta', [course(3, 'CHEM', 34)]),
};

const renderPage = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <MemoryRouter>
            <AnalyticsDashboard />
          </MemoryRouter>
        </QueryClientProvider>
      </LanguageProvider>
    </I18nextProvider>
  );

const optionLabels = (select: HTMLElement) => within(select).getAllByRole('option').map((o) => o.textContent);

describe('AnalyticsDashboard', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    get.mockReset();
    get.mockImplementation(async (url: string) => {
      if (url === '/analytics/overview') return { data: classOverview };
      const match = url.match(/^\/analytics\/student\/(\d+)\/overview$/);
      if (match) return { data: students[Number(match[1])] };
      throw new Error(`unexpected ${url}`);
    });
  });
  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  it("offers only the selected student's enrolled courses", async () => {
    renderPage();
    const courseSelect = await screen.findByTestId('analytics-course-select');
    await waitFor(() => expect(optionLabels(courseSelect)).toEqual(['All courses', 'Course MATH', 'Course PHYS']));

    fireEvent.change(screen.getByTestId('analytics-student-select'), { target: { value: '2' } });
    await waitFor(() => expect(optionLabels(courseSelect)).toEqual(['All courses', 'Course CHEM']));
  });

  it('shows a dash, not 0%, for a course with no grades yet', async () => {
    renderPage();
    const table = await screen.findByTestId('analytics-student-courses');
    const phys = within(table).getByText('Course PHYS').closest('tr') as HTMLElement;
    expect(within(phys).getAllByText('—').length).toBeGreaterThan(0);
    expect(within(phys).queryByText('0.0%')).toBeNull();
    expect(within(table).getByText('74.0%')).toBeInTheDocument();
  });

  it('narrows to one course: its final grade in the cards and its grade list', async () => {
    renderPage();
    const courseSelect = await screen.findByTestId('analytics-course-select');
    await waitFor(() => expect(optionLabels(courseSelect)).toContain('Course MATH'));
    fireEvent.change(courseSelect, { target: { value: '1' } });

    expect(await screen.findByTestId('analytics-grade-list')).toBeInTheDocument();
    const cards = screen.getAllByTestId('summary-card');
    expect(within(cards[0]).getByText('Final Grade')).toBeInTheDocument();
    expect(within(cards[0]).getByText('74.0%')).toBeInTheDocument();
    expect(within(cards[0]).getByText('Class average 60.0%')).toBeInTheDocument();
    expect(within(screen.getByTestId('analytics-student-courses')).queryByText('Course PHYS')).toBeNull();
  });

  it('class view lists students at risk with the reason, and opens a student', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Class Analytics' }));
    const atRisk = await screen.findByTestId('analytics-at-risk');
    expect(within(atRisk).getByText('Needs Attention (1)')).toBeInTheDocument();
    expect(within(atRisk).getByText('Course CHEM')).toBeInTheDocument();
    expect(within(atRisk).getByText('Near the limit')).toBeInTheDocument();
    expect(within(atRisk).queryByText('Anna Alpha')).toBeNull();

    fireEvent.click(within(atRisk).getByRole('button', { name: 'Bob Beta' }));
    await waitFor(() =>
      expect((screen.getByTestId('analytics-student-select') as HTMLSelectElement).value).toBe('2')
    );
  });

  it('sends the academic year filter to the API', async () => {
    renderPage();
    const year = await screen.findByRole('combobox', { name: /Academic Year/ });
    await waitFor(() => expect(optionLabels(year)).toEqual(['All years', 'A', 'B']));
    fireEvent.change(year, { target: { value: 'B' } });
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith('/analytics/overview', { params: { academic_year: 'B' } })
    );
  });

  it.each(['en', 'el'])('has a translation for every visible text (%s)', async (lang) => {
    await i18n.changeLanguage(lang);
    const { container } = renderPage();
    await screen.findByTestId('analytics-student-courses');
    fireEvent.click(screen.getAllByRole('button', { pressed: false })[0]);
    await screen.findByTestId('analytics-at-risk');
    expect(container.textContent).not.toMatch(/analytics\.|dashboard\.(select|default|manage)/);
  });
});
