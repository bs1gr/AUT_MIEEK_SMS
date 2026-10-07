import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import AbsenceLimitsPanel from './AbsenceLimitsPanel';
import { attendanceAPI } from '@/api/api';
import type { AbsenceLimitStatus, Student } from '@/types';

vi.mock('@/api/api', () => ({
  attendanceAPI: { getCourseAbsenceStatus: vi.fn() },
}));

const mockedAttendance = attendanceAPI as unknown as { getCourseAbsenceStatus: ReturnType<typeof vi.fn> };

const t = (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key);

const students = [
  { id: 1, first_name: 'Anna', last_name: 'Alpha' },
  { id: 2, first_name: 'Babis', last_name: 'Beta' },
  { id: 3, first_name: 'Gogo', last_name: 'Gamma' },
] as Student[];

// 42 scheduled periods: fail over 12 (30%), Class Participation lost over 4 (10%).
const row = (overrides: Partial<AbsenceLimitStatus>): AbsenceLimitStatus => ({
  student_id: 1,
  course_id: 7,
  semester_weeks: 14,
  periods_per_week: 3,
  scheduled_periods: 42,
  absences: 1,
  unexcused_absences: 1,
  excused_absences: 0,
  absence_percent: 2.38,
  limit_percent: 30,
  allowed_absences: 12,
  remaining_absences: 11,
  participation_limit_percent: 10,
  participation_allowed_absences: 4,
  participation_forfeited: false,
  status: 'ok',
  attendance_insufficient: false,
  ...overrides,
});

describe('AbsenceLimitsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing without a course', () => {
    const { container } = render(<AbsenceLimitsPanel t={t} courseId="" students={students} />);
    expect(container).toBeEmptyDOMElement();
    expect(mockedAttendance.getCourseAbsenceStatus).not.toHaveBeenCalled();
  });

  it('lists failed students first, then those who lost Class Participation', async () => {
    mockedAttendance.getCourseAbsenceStatus.mockResolvedValue([
      row({ student_id: 1 }),
      row({ student_id: 2, absences: 13, status: 'insufficient', attendance_insufficient: true, remaining_absences: 0, participation_forfeited: true }),
      row({ student_id: 3, absences: 5, participation_forfeited: true, remaining_absences: 7 }),
    ]);

    render(<AbsenceLimitsPanel t={t} courseId={7} students={students} />);

    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(4));
    const [, first, second, third] = screen.getAllByRole('row');
    expect(within(first).getByText('Beta Babis')).toBeInTheDocument();
    expect(within(first).getByText('absenceLimitStatusInsufficient')).toBeInTheDocument();
    expect(within(second).getByText('Gamma Gogo')).toBeInTheDocument();
    expect(within(second).getByText('absenceLimitParticipationLost {"allowed":4}')).toBeInTheDocument();
    expect(within(second).getByText('absenceLimitStatusOk')).toBeInTheDocument();
    expect(within(third).getByText('Alpha Anna')).toBeInTheDocument();
    expect(within(third).getByText('absenceLimitParticipationKept {"allowed":4}')).toBeInTheDocument();
    expect(within(third).getByText('absenceLimitAllowed {"allowed":12,"limit":30}')).toBeInTheDocument();
    expect(mockedAttendance.getCourseAbsenceStatus).toHaveBeenCalledWith(7);
  });

  it('has no Directorate approval control any more', async () => {
    mockedAttendance.getCourseAbsenceStatus.mockResolvedValue([row({})]);
    render(<AbsenceLimitsPanel t={t} courseId={7} students={students} />);
    await screen.findByText('Alpha Anna');
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('shows the no-schedule hint when the limits cannot be calculated', async () => {
    mockedAttendance.getCourseAbsenceStatus.mockResolvedValue([
      row({
        status: 'unknown', scheduled_periods: 0, allowed_absences: null, remaining_absences: null,
        participation_allowed_absences: null,
      }),
    ]);

    render(<AbsenceLimitsPanel t={t} courseId={7} students={students} />);

    expect(await screen.findByText('absenceLimitUnknownHelp')).toBeInTheDocument();
    expect(screen.getByText('absenceLimitStatusUnknown')).toBeInTheDocument();
  });

  it('shows an error when the status cannot be loaded', async () => {
    mockedAttendance.getCourseAbsenceStatus.mockRejectedValue(new Error('boom'));

    render(<AbsenceLimitsPanel t={t} courseId={7} students={students} />);

    expect(await screen.findByText('absenceLimitLoadFailed')).toBeInTheDocument();
  });
});
