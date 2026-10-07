import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import AttendanceView from '../AttendanceView';
import AttendancePerformanceModal from '../AttendancePerformanceModal';
import * as apiModule from '@/api/api';

const stableLanguageMock = {
  t: () => '',
  language: 'en',
};

const stableDateTimeMock = {
  formatDate: (value: Date | string) => (value instanceof Date ? value.toISOString().split('T')[0] : String(value)),
  formatMonthYear: (_value: Date) => 'Test Month',
  formatWeekday: (_value: Date, _locale?: string) => 'Weekday',
};

vi.mock('@/api/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/LanguageContext', () => ({
  useLanguage: () => stableLanguageMock,
}));

vi.mock('@/contexts/DateTimeSettingsContext', () => ({
  useDateTimeFormatter: () => stableDateTimeMock,
}));

vi.mock('@/hooks/useAutosave', () => ({
  useAutosave: () => ({
    isSaving: false,
    isPending: false,
  }),
}));

vi.mock('@/features/attendance/utils/offlineAttendanceQueue', () => ({
  enqueueAttendanceSyncSnapshot: vi.fn(),
  getAttendanceSyncQueue: vi.fn(() => []),
  getPendingAttendanceSyncCount: vi.fn(() => 0),
  removeAttendanceSyncSnapshot: vi.fn(),
}));

const mockStudents = [
  {
    id: 1,
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    student_id: 'S001',
    enrollment_date: '2026-01-01',
    is_active: true,
  },
];

const mockCourses = [
  {
    id: 1,
    course_code: 'MATH101',
    course_name: 'Math 101',
    semester: 'Fall 2026',
    credits: 3,
    is_active: true,
    evaluation_rules: [
      { category: 'Class Participation', weight: 10 },
      { category: 'No participation', weight: 0 },
      { category: 'Minor participation', weight: 0 },
      { category: 'Minor participation (mobile usage)', weight: 5 },
    ],
  },
  {
    id: 2,
    course_code: 'OLD101',
    course_name: 'No Active Enrollments',
    semester: 'Fall 2026',
    credits: 3,
    is_active: true,
    evaluation_rules: [],
  },
];

const specialParticipationScores: Record<string, number> = {
  'No participation': 0,
  'Minor participation': 4,
  'Minor participation (mobile usage)': 2,
};

const renderPerformanceModal = (dailyPerformance: Record<string, number> = {}) => {
  const setPerformanceScore = vi.fn();
  const setSpecialParticipationOption = vi.fn();

  render(
    <AttendancePerformanceModal
      t={() => ''}
      formatDate={(value) => String(value)}
      formatWeekday={() => 'Weekday'}
      localeOverride="en-US"
      selectedDate={new Date('2026-10-01T12:00:00')}
      selectedStudentForPerformance={mockStudents[0]}
      evaluationCategories={mockCourses[0].evaluation_rules}
      dailyPerformance={dailyPerformance}
      getAggregatedStatus={() => ({ status: undefined, isMixed: false, hasAny: false })}
      translateCategory={(category) => category}
      getSpecialParticipationScore={(category) => specialParticipationScores[category] ?? null}
      setPerformanceScore={setPerformanceScore}
      clearPerformanceScore={vi.fn()}
      setSpecialParticipationOption={setSpecialParticipationOption}
      setShowPerformanceModal={vi.fn()}
      showToast={vi.fn()}
    />,
  );

  return { setPerformanceScore, setSpecialParticipationOption };
};

describe('AttendanceView - Special Participation Labels', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(apiModule.default.get).mockImplementation(async (url: string) => {
      if (url.startsWith('/daily-performance/date/')) {
        return {
          data: [
            {
              id: 101,
              student_id: 1,
              category: 'Minor participation (mobile usage)',
              score: 8,
            },
          ],
        };
      }
      // AttendanceView uses apiClient (not fetch) after the Android migration.
      if (url.includes('/enrollments/course/1/students')) {
        return { data: mockStudents };
      }
      if (url.includes('/enrollments/course/') && url.includes('/students')) {
        return { data: [] };
      }
      if (/\/courses\/\d+$/.test(url)) {
        return { data: mockCourses[0] };
      }
      if (url.includes('/courses')) {
        return { data: { items: mockCourses } };
      }
      if (url.includes('/attendance/')) {
        return { data: [] };
      }
      return { data: [] };
    });

    vi.mocked(apiModule.default.post).mockResolvedValue({ data: { id: 999 } });
    vi.mocked(apiModule.default.put).mockResolvedValue({ data: {} });
    vi.mocked(apiModule.default.delete).mockResolvedValue({ data: {} });

    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.includes('/enrollments/course/1/students')) {
        return {
          ok: true,
          status: 200,
          json: async () => mockStudents,
          text: async () => JSON.stringify(mockStudents),
        } as unknown as Response;
      }

      if (url.includes('/enrollments/course/2/students')) {
        return {
          ok: true,
          status: 200,
          json: async () => [],
          text: async () => '[]',
        } as unknown as Response;
      }

      if (url.includes('/courses/1')) {
        return {
          ok: true,
          status: 200,
          json: async () => mockCourses[0],
          text: async () => JSON.stringify(mockCourses[0]),
        } as unknown as Response;
      }

      return {
        ok: true,
        status: 200,
        json: async () => [],
        text: async () => '[]',
      } as unknown as Response;
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows a custom applied label when stored special score differs from canonical preset', async () => {
    renderPerformanceModal({ '1-Minor participation (mobile usage)': 8 });

    const specialOptions = await screen.findByTestId('special-participation-options');
    expect(within(specialOptions).getByText('Applied (8/10, custom)')).toBeInTheDocument();
    expect(within(specialOptions).queryByText('Applied (2/10)')).not.toBeInTheDocument();
  });

  it('groups optional participation observations under the participation assessment', async () => {
    const { setPerformanceScore, setSpecialParticipationOption } = renderPerformanceModal({
      '1-Minor participation (mobile usage)': 8,
    });

    const specialOptions = await screen.findByTestId('special-participation-options');
    expect(within(specialOptions).getAllByRole('checkbox')).toHaveLength(3);
    expect(within(specialOptions).getAllByText('Not assessed — no score is recorded')).toHaveLength(2);
    expect(within(specialOptions).queryByText('Not applied (10/10)')).not.toBeInTheDocument();
    expect(within(specialOptions).getByRole('checkbox', { name: 'Daily Performance: Minor participation (mobile usage)' })).toBeChecked();
    expect(within(specialOptions).getByRole('checkbox', { name: 'Daily Performance: No participation' })).not.toBeChecked();
    expect(within(specialOptions).getByRole('checkbox', { name: 'Daily Performance: No participation' }).closest('div')).toHaveClass('sm:grid-cols-3');
    expect(setSpecialParticipationOption).not.toHaveBeenCalled();

    fireEvent.click(within(specialOptions).getByRole('checkbox', { name: 'Daily Performance: No participation' }));
    expect(setSpecialParticipationOption).toHaveBeenCalledWith(1, 'No participation', true);

    fireEvent.click(screen.getByLabelText("Include in today's assessment"));
    expect(setPerformanceScore).toHaveBeenCalledWith(1, 'Class Participation', 0);
  });

  it('offers only courses with active enrolled students for attendance', async () => {
    render(<AttendanceView courses={mockCourses} students={mockStudents} />);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'MATH101 - Math 101' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('option', { name: 'OLD101 - No Active Enrollments' })).not.toBeInTheDocument();
  });

  it('keeps the selected course while enrollments are re-checked', async () => {
    const get = vi.mocked(apiModule.default.get);
    const enrollmentChecks = () =>
      get.mock.calls.filter(([url]) => String(url).includes('/enrollments/course/2/students')).length;

    render(<AttendanceView courses={mockCourses} students={mockStudents} />);
    const select = await screen.findByTestId('attendance-course-select');
    await screen.findByRole('option', { name: 'MATH101 - Math 101' });
    expect(enrollmentChecks()).toBe(1);

    // Selecting a course fetches its details, which replaces the course list and re-runs the
    // enrollment check. The selection used to be cleared while that check ran.
    fireEvent.change(select, { target: { value: '1' } });

    await waitFor(() => expect(get).toHaveBeenCalledWith('/courses/1'));
    await waitFor(() => expect(enrollmentChecks()).toBe(2));
    await new Promise((resolve) => setTimeout(resolve, 200)); // let the re-check settle
    expect(select).toHaveValue('1');
  });
});
