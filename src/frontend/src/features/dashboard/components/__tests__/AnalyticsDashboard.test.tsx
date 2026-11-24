import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n/config';
import { LanguageProvider } from '@/LanguageContext';
import type { ClassOverview, StudentCategory, StudentOverview, StudentOverviewCourse } from '@/api/hooks/useAnalytics';
import { AnalyticsDashboard } from '../AnalyticsDashboard';

const get = vi.hoisted(() => vi.fn());
const exportPDF = vi.hoisted(() => vi.fn());
const exportExcel = vi.hoisted(() => vi.fn());

vi.mock('@/api/api', () => ({
  apiClient: { get },
  extractAPIResponseData: (data: unknown) => data,
}));
vi.mock('../../hooks/useAnalyticsExport', () => ({
  useAnalyticsExport: () => ({ exportPDF, exportExcel, isExporting: false, exportError: null }),
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
  has_rules: true,
  grade_count: final === null ? 0 : 2,
  rating_count: 0,
  passing: final === null ? null : final >= 50,
  class_average: final === null ? null : 60,
  rank: final === null ? null : 1,
  ranked_of: final === null ? 0 : 3,
  attendance: attendance(4, 1),
  absence: {
    status: 'ok', absences: 1, allowed_absences: 12, remaining_absences: 11, absence_percent: 2.4, limit_percent: 30,
    participation_limit_percent: 10, participation_allowed_absences: 4, participation_forfeited: false,
  },
  grades: final === null ? [] : [{ date: '2026-10-01', category: 'Final Exam', assignment: 'Exam', percentage: final }],
  ...extra,
});

const studentOverview = (
  id: number,
  name: string,
  courses: StudentOverviewCourse[],
  categories?: StudentCategory[]
): StudentOverview => {
  const finals = courses.map((c) => c.final_grade).filter((g): g is number => g !== null);
  return {
    ...(categories ? { categories } : {}),
    student: { id, student_id: `S${id}`, name, academic_year: 'A', class_division: 'A1', is_active: true },
    summary: {
      courses: courses.length,
      graded_courses: finals.length,
      average_final_grade: finals.length ? finals.reduce((a, b) => a + b, 0) / finals.length : null,
      passing: finals.filter((g) => g >= 50).length,
      failing: finals.filter((g) => g < 50).length,
      attendance: attendance(4, 1),
      absence_status: 'ok',
      participation_forfeited: courses.filter((c) => c.absence.participation_forfeited).length,
      at_risk: finals.some((g) => g < 50),
    },
    courses,
  };
};

// Anna by category (plan todo 75 stage 3). Final exams: 74 in MATH (14 over its 60, a strength)
// and 60 in PHYS, so 67 against 61 across both, which stands out from nothing.
const categoryCourse = (id: number, code: string, average: number, classAverage: number, signal: StudentCategory['signal']) => ({
  id,
  course_code: code,
  course_name: `Course ${code}`,
  average,
  class_average: classAverage,
  signal,
});
const annaCategories: StudentCategory[] = [
  {
    key: 'final', label_key: 'final', name: 'Final Exam', average: 67, class_average: 61, difference: 6, signal: null,
    courses: [categoryCourse(1, 'MATH', 74, 60, 'strength'), categoryCourse(2, 'PHYS', 60, 62, null)],
  },
  {
    key: 'custom:οπτικοποιηση', label_key: null, name: 'Οπτικοποίηση', average: 40, class_average: 65, difference: -25,
    signal: 'difficulty', courses: [categoryCourse(1, 'MATH', 40, 65, 'difficulty')],
  },
  {
    key: 'custom:', label_key: 'uncategorized', name: '', average: 88, class_average: 70, difference: 18, signal: 'strength',
    courses: [categoryCourse(2, 'PHYS', 88, 70, 'strength')],
  },
];

const classOverview: ClassOverview = {
  categories: {
    columns: [
      { key: 'final', label_key: 'final', name: 'Final Exam' },
      { key: 'custom:οπτικοποιηση', label_key: null, name: 'Οπτικοποίηση' },
      { key: 'custom:', label_key: 'uncategorized', name: '' },
    ],
    averages: [67, 40, 88],
    students: [
      {
        id: 1, name: 'Anna Alpha', cells: [67, 40, 88], class_averages: [61, 65, 70],
        signals: [null, 'difficulty', 'strength'], difficulties: 1, strengths: 1,
      },
    ],
    courses: [{ id: 1, course_code: 'MATH', course_name: 'Course MATH', cells: [60, 65, null] }],
  },
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
      participation_forfeited: 1,
    },
  ],
  students: [
    {
      id: 1, student_id: 'S1', name: 'Anna Alpha', academic_year: 'A', class_division: 'A1', courses: 2,
      average_final_grade: 74, exam_average: 74, credits: 6, failing_courses: [], attendance_rate: 80,
      absence_status: 'ok', participation_forfeited: [], at_risk: false,
    },
    {
      id: 2, student_id: 'S2', name: 'Bob Beta', academic_year: 'A', class_division: 'A2', courses: 1,
      average_final_grade: 34, exam_average: 34, credits: 3, failing_courses: ['Course CHEM'], attendance_rate: 50,
      absence_status: 'warning', participation_forfeited: ['Course CHEM'], at_risk: true,
    },
  ],
};

const students: Record<number, StudentOverview> = {
  1: studentOverview(1, 'Anna Alpha', [course(1, 'MATH', 74), course(2, 'PHYS', null)], annaCategories),
  // Only Class Participation graded in CHEM, and lost to absences: no category counts.
  2: studentOverview(
    2,
    'Bob Beta',
    [
      course(3, 'CHEM', 34, {
        rating_count: 6,
        absence: {
          status: 'warning', absences: 10, allowed_absences: 12, remaining_absences: 2, absence_percent: 23.8, limit_percent: 30,
          participation_limit_percent: 10, participation_allowed_absences: 4, participation_forfeited: true,
        },
      }),
    ],
    []
  ),
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
    // LanguageProvider takes the language from localStorage first.
    localStorage.setItem('i18nextLng', 'en');
    await i18n.changeLanguage('en');
    exportPDF.mockReset();
    exportExcel.mockReset();
    get.mockReset();
    get.mockImplementation(async (url: string, config?: { params?: { course_id?: number } }) => {
      // As the server: the scope names the course asked for.
      const courseId = config?.params?.course_id ?? null;
      if (url === '/analytics/overview') return { data: { ...classOverview, scope: { ...classOverview.scope, course_id: courseId } } };
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
    expect(within(atRisk).getByText('Near the fail limit')).toBeInTheDocument();
    expect(within(atRisk).getByText('Class Participation lost: Course CHEM')).toBeInTheDocument();
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

  // Plan todo 75 stage 4: the export follows what the page shows.
  it('exports the student on screen and the chosen course', async () => {
    renderPage();
    const courseSelect = await screen.findByTestId('analytics-course-select');
    await waitFor(() => expect(optionLabels(courseSelect)).toContain('Course MATH'));
    fireEvent.change(courseSelect, { target: { value: '1' } });
    await screen.findByTestId('analytics-grade-list');

    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));

    // Anna: nobody chosen yet, so the selection's first student, as the page shows her.
    expect(exportPDF).toHaveBeenCalledWith({ academicYear: '', classDivision: '', courseId: 1, studentId: 1 });
  });

  it("exports the class view's selection, not every student", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Class Analytics' }));
    const year = await screen.findByRole('combobox', { name: /Academic Year/ });
    await waitFor(() => expect(optionLabels(year)).toEqual(['All years', 'A', 'B']));
    fireEvent.change(year, { target: { value: 'B' } });

    fireEvent.click(screen.getByRole('button', { name: 'Excel' }));

    expect(exportExcel).toHaveBeenCalledWith({ academicYear: 'B', classDivision: '', courseId: null });
    expect(screen.getByRole('button', { name: 'Excel' })).toHaveAttribute(
      'title',
      expect.stringContaining('follows the filters on screen')
    );
  });

  it('marks a course where Class Participation is lost, and counts the participation ratings', async () => {
    renderPage();
    const studentSelect = await screen.findByTestId('analytics-student-select');
    await waitFor(() => expect(optionLabels(studentSelect)).toContain('Bob Beta'));
    fireEvent.change(studentSelect, { target: { value: '2' } });
    const table = await screen.findByTestId('analytics-student-courses');
    await waitFor(() => expect(within(table).getByText('Course CHEM')).toBeInTheDocument());
    expect(within(table).getByText('Class Participation lost (over 10% absences)')).toBeInTheDocument();
    expect(within(table).getByText(/Participation ratings: 6/)).toBeInTheDocument();
  });

  it("narrows the category profile to the chosen course's own figures and marks", async () => {
    renderPage();
    const profile = await screen.findByTestId('analytics-category-profile');
    const finalRow = () => within(screen.getByTestId('analytics-category-final')).getAllByRole('cell');
    const finalBadge = () => within(screen.getByTestId('analytics-category-final')).getByRole('rowheader');
    // Across both courses: 67 against 61, no mark; the courses keep their own marks.
    expect(finalRow()[0]).toHaveTextContent('67.0%');
    expect(within(finalBadge()).queryByText('Strength')).toBeNull();
    expect(within(profile).getByText('Uncategorized')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('analytics-course-select'), { target: { value: '1' } });

    await waitFor(() => expect(finalRow()[0]).toHaveTextContent('74.0%'));
    expect(finalRow()[1]).toHaveTextContent('60.0%');
    expect(finalRow()[2]).toHaveTextContent('+14.0');
    expect(within(finalBadge()).getByText('Strength')).toBeInTheDocument();
    // PHYS's own category is not one of MATH's.
    expect(screen.queryByTestId('analytics-category-custom:')).toBeNull();
  });

  it('says Class Participation lost to absences is not counted, instead of "no grade yet"', async () => {
    renderPage();
    const studentSelect = await screen.findByTestId('analytics-student-select');
    await waitFor(() => expect(optionLabels(studentSelect)).toContain('Bob Beta'));
    fireEvent.change(studentSelect, { target: { value: '2' } });

    const profile = await screen.findByTestId('analytics-category-profile');
    await waitFor(() =>
      expect(profile).toHaveTextContent('No category counts yet: Class Participation lost to absences is not counted.')
    );
    expect(profile).not.toHaveTextContent('No category has a grade yet.');
  });

  it('explains a course whose grades are all outside its evaluation rules', async () => {
    // The final grade is the mean (by Weight) of grades no rule counts: the row says so, and the
    // profile says why nothing is counted, instead of "no grade yet".
    const outside = studentOverview(1, 'Anna Alpha', [course(1, 'MATH', 80, { grade_basis: 'average' })], []);
    const answer = get.getMockImplementation()!;
    get.mockImplementation(async (url: string, ...rest: unknown[]) =>
      url === '/analytics/student/1/overview' ? { data: outside } : answer(url, ...rest)
    );
    renderPage();

    const table = await screen.findByTestId('analytics-student-courses');
    expect(within(table).getByText(/grades outside the evaluation rules: their mean, by their Weight/)).toBeInTheDocument();
    expect(within(table).queryByText(/no evaluation rules/)).toBeNull();
    const profile = screen.getByTestId('analytics-category-profile');
    expect(profile).toHaveTextContent("No grade yet in a category the course's evaluation rules count");
    expect(profile).not.toHaveTextContent('No category has a grade yet.');
  });

  it('marks a course failed on a retake of the final exam under 50, whatever the final grade (todo 80)', async () => {
    const retake = studentOverview(1, 'Anna Alpha', [
      course(1, 'MATH', 63, { passing: false, final_exam_retake: { date: '2026-02-10', percentage: 45, failed: true } }),
      course(2, 'PHYS', 70, { final_exam_retake: { date: '2026-02-10', percentage: 60, failed: false } }),
    ]);
    const answer = get.getMockImplementation()!;
    get.mockImplementation(async (url: string, ...rest: unknown[]) =>
      url === '/analytics/student/1/overview' ? { data: retake } : answer(url, ...rest)
    );
    renderPage();

    const table = await screen.findByTestId('analytics-student-courses');
    const failed = await within(table).findByTestId('analytics-retake-failed-1');
    // The server's figure as it is (two decimals at most), and the day read at noon, so that no
    // time zone shows the day before (the formatter here is a stand-in that shows what it gets).
    expect(failed).toHaveTextContent('Failed: the final exam retake is under 50 (45%, 2026-02-10T12:00:00)');
    // The final grade stays as worked out, in red as a fail.
    expect(failed.closest('td')).toHaveTextContent('63.0%');
    expect(failed.closest('td')).toHaveClass('text-red-700');
    expect(within(table).queryByTestId('analytics-retake-failed-2')).toBeNull();
  });

  it('never shows a retake just under 50 as 50.0 (todo 80 review)', async () => {
    const retake = studentOverview(1, 'Anna Alpha', [
      course(1, 'MATH', 70, { passing: false, final_exam_retake: { date: '2026-02-10', percentage: 49.99, failed: true } }),
    ]);
    const answer = get.getMockImplementation()!;
    get.mockImplementation(async (url: string, ...rest: unknown[]) =>
      url === '/analytics/student/1/overview' ? { data: retake } : answer(url, ...rest)
    );
    renderPage();

    const failed = await within(await screen.findByTestId('analytics-student-courses')).findByTestId('analytics-retake-failed-1');
    expect(failed).toHaveTextContent('(49.99%,');
    expect(failed).not.toHaveTextContent('50.0%');
  });

  it('says how many students of the selection the class map leaves out', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Class Analytics' }));
    const matrix = await screen.findByTestId('analytics-category-matrix');
    // Bob has nothing counted in a category (his Class Participation was lost to absences).
    expect(matrix).toHaveTextContent('1 student of this selection has nothing counted in any category yet and is not listed.');
  });

  it('names the Lates under the attendance rates, for the evaluation (todo 77)', async () => {
    // A Late is attended, so the rate does not show it: its number is written under the rate.
    const withLates = studentOverview(
      1,
      'Anna Alpha',
      [course(1, 'MATH', 74, { attendance: { ...attendance(4, 1), late: 2, recorded: 7, rate: 85.7 } }), course(2, 'PHYS', null)],
      annaCategories
    );
    const classWithLates: ClassOverview = {
      ...classOverview,
      courses: [{ ...classOverview.courses[0], attendance: { ...classOverview.courses[0].attendance, late: 2 } }],
      students: classOverview.students.map((s) => (s.id === 2 ? { ...s, late: 3 } : s)),
    };
    const answer = get.getMockImplementation()!;
    get.mockImplementation(async (url: string, ...rest: unknown[]) => {
      if (url === '/analytics/student/1/overview') return { data: withLates };
      if (url === '/analytics/overview') return { data: classWithLates };
      return answer(url, ...rest);
    });
    renderPage();

    const table = await screen.findByTestId('analytics-student-courses');
    const math = within(table).getByText('Course MATH').closest('tr') as HTMLElement;
    await waitFor(() => expect(within(math).getByText('2 late')).toBeInTheDocument());
    const phys = within(table).getByText('Course PHYS').closest('tr') as HTMLElement;
    expect(within(phys).queryByTestId('analytics-late-count')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Class Analytics' }));
    const atRisk = await screen.findByTestId('analytics-at-risk');
    expect(within(atRisk).getByText('3 late')).toBeInTheDocument();
    const courses = screen.getByTestId('analytics-class-courses');
    expect(within(courses).getByText('2 late')).toBeInTheDocument();
  });

  it.each([
    ['el', 1, '1 αργοπορία'],
    ['el', 2, '2 αργοπορίες'],
    ['en', 1, '1 late'],
  ] as const)('names %s Lates in the page language: %i reads "%s"', async (lang, late, text) => {
    localStorage.setItem('i18nextLng', lang);
    await i18n.changeLanguage(lang);
    const withLates = studentOverview(
      1,
      'Anna Alpha',
      [course(1, 'MATH', 74, { attendance: { ...attendance(4, 1), late, recorded: 5 + late, rate: 80 } }), course(2, 'PHYS', null)],
      annaCategories
    );
    const answer = get.getMockImplementation()!;
    get.mockImplementation(async (url: string, ...rest: unknown[]) =>
      url === '/analytics/student/1/overview' ? { data: withLates } : answer(url, ...rest)
    );
    renderPage();

    const table = await screen.findByTestId('analytics-student-courses');
    const math = within(table).getByText('Course MATH').closest('tr') as HTMLElement;
    await waitFor(() => expect(within(math).getByTestId('analytics-late-count')).toHaveTextContent(new RegExp(`^${text}$`)));
  });

  it('shows no category profile from a server older than the categories', async () => {
    const { categories: _dropped, ...older } = students[1];
    void _dropped;
    const answer = get.getMockImplementation()!;
    get.mockImplementation(async (url: string, ...rest: unknown[]) =>
      url === '/analytics/student/1/overview' ? { data: older } : answer(url, ...rest)
    );
    renderPage();

    await screen.findByTestId('analytics-student-courses');
    expect(screen.queryByTestId('analytics-category-profile')).toBeNull();
  });

  it('opens a name of a course-filtered class map in that course, with focus on the student picker', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Class Analytics' }));
    const courseSelect = await screen.findByTestId('analytics-course-select');
    await waitFor(() => expect(optionLabels(courseSelect)).toContain('Course MATH'));
    fireEvent.change(courseSelect, { target: { value: '1' } });
    const matrix = await screen.findByTestId('analytics-category-matrix');
    expect(within(matrix).getByText('Students by category in this course')).toBeInTheDocument();

    fireEvent.click(within(matrix).getByRole('button', { name: 'Anna Alpha' }));

    const studentSelect = (await screen.findByTestId('analytics-student-select')) as HTMLSelectElement;
    await waitFor(() => expect(studentSelect.value).toBe('1'));
    await waitFor(() => expect((screen.getByTestId('analytics-course-select') as HTMLSelectElement).value).toBe('1'));
    expect(document.activeElement).toBe(studentSelect);
    await waitFor(() => expect(within(screen.getByTestId('analytics-category-final')).getAllByRole('cell')[0]).toHaveTextContent('74.0%'));
  });

  it.each(['en', 'el'])('has a translation for every visible text (%s)', async (lang) => {
    localStorage.setItem('i18nextLng', lang);
    await i18n.changeLanguage(lang);
    const { container } = renderPage();
    await screen.findByTestId('analytics-student-courses');
    // The student view with its category profile, then the class view with its map.
    await screen.findByTestId('analytics-category-table');
    expect(container.textContent).not.toMatch(/analytics\.|reports\.|dashboard\.(select|default|manage)/);
    fireEvent.click(screen.getAllByRole('button', { pressed: false })[0]);
    await screen.findByTestId('analytics-at-risk');
    await screen.findByTestId('analytics-category-matrix');
    expect(container.textContent).not.toMatch(/analytics\.|reports\.|dashboard\.(select|default|manage)/);
    if (lang === 'el') {
      expect(screen.getByText('Αναλυτικά Τάξης')).toBeInTheDocument();
      expect(screen.getAllByText('Χωρίς κατηγορία').length).toBeGreaterThan(0);
    }
  });
});
