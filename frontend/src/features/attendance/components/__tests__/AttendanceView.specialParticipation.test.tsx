import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AttendanceView from '../AttendanceView';
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
      { category: 'Minor participation (mobile usage)', weight: 5 },
    ],
  },
];

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
    render(<AttendanceView courses={mockCourses} students={mockStudents} />);

    fireEvent.change(screen.getByTestId('attendance-course-select'), {
      target: { value: '1' },
    });

    const dayButtons = screen.getAllByRole('button').filter((button) => {
      const label = (button.textContent || '').trim();
      return /^\d+$/.test(label) && !button.hasAttribute('disabled');
    });

    expect(dayButtons.length).toBeGreaterThan(0);
    fireEvent.click(dayButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /rate/i }));

    expect(await screen.findByText('Applied (8/10, custom)')).toBeInTheDocument();
    expect(screen.queryByText('Applied (2/10)')).not.toBeInTheDocument();
  });
});
