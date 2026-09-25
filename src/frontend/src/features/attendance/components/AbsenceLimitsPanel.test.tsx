import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AbsenceLimitsPanel from './AbsenceLimitsPanel';
import { attendanceAPI, enrollmentsAPI } from '@/api/api';
import type { AbsenceLimitStatus, Student } from '@/types';

vi.mock('@/api/api', () => ({
  attendanceAPI: { getCourseAbsenceStatus: vi.fn() },
  enrollmentsAPI: { setExtendedAbsenceApproval: vi.fn() },
}));

const mockedAttendance = attendanceAPI as unknown as { getCourseAbsenceStatus: ReturnType<typeof vi.fn> };
const mockedEnrollments = enrollmentsAPI as unknown as { setExtendedAbsenceApproval: ReturnType<typeof vi.fn> };

const t = (key: string) => key;

const students = [
  { id: 1, first_name: 'Anna', last_name: 'Alpha' },
  { id: 2, first_name: 'Babis', last_name: 'Beta' },
] as Student[];

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
  limit_percent: 10,
  base_limit_percent: 10,
  extended_limit_percent: 15,
  extended_approved: false,
  extended_absence_approved_at: null,
  extended_absence_note: null,
  allowed_absences: 4,
  remaining_absences: 3,
  status: 'ok',
  attendance_insufficient: false,
  ...overrides,
});

describe('AbsenceLimitsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing without a course', () => {
    const { container } = render(<AbsenceLimitsPanel t={t} courseId="" students={students} showToast={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
    expect(mockedAttendance.getCourseAbsenceStatus).not.toHaveBeenCalled();
  });

  it('lists insufficient students first with their status', async () => {
    mockedAttendance.getCourseAbsenceStatus.mockResolvedValue([
      row({ student_id: 1 }),
      row({ student_id: 2, absences: 5, status: 'insufficient', attendance_insufficient: true, remaining_absences: 0 }),
    ]);

    render(<AbsenceLimitsPanel t={t} courseId={7} students={students} showToast={vi.fn()} />);

    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3));
    const [, first, second] = screen.getAllByRole('row');
    expect(within(first).getByText('Beta Babis')).toBeInTheDocument();
    expect(within(first).getByText('absenceLimitStatusInsufficient')).toBeInTheDocument();
    expect(within(second).getByText('Alpha Anna')).toBeInTheDocument();
    expect(within(second).getByText('absenceLimitStatusOk')).toBeInTheDocument();
    expect(mockedAttendance.getCourseAbsenceStatus).toHaveBeenCalledWith(7);
  });

  it('shows the no-schedule hint when the limit cannot be calculated', async () => {
    mockedAttendance.getCourseAbsenceStatus.mockResolvedValue([
      row({ status: 'unknown', scheduled_periods: 0, allowed_absences: null, remaining_absences: null }),
    ]);

    render(<AbsenceLimitsPanel t={t} courseId={7} students={students} showToast={vi.fn()} />);

    expect(await screen.findByText('absenceLimitUnknownHelp')).toBeInTheDocument();
    expect(screen.getByText('absenceLimitStatusUnknown')).toBeInTheDocument();
  });

  it('records the Directorate approval and reloads', async () => {
    const user = userEvent.setup();
    const showToast = vi.fn();
    mockedAttendance.getCourseAbsenceStatus
      .mockResolvedValueOnce([row({ absences: 5, status: 'insufficient', attendance_insufficient: true })])
      .mockResolvedValueOnce([row({ absences: 5, status: 'warning', extended_approved: true, limit_percent: 15 })]);
    mockedEnrollments.setExtendedAbsenceApproval.mockResolvedValue({});

    render(<AbsenceLimitsPanel t={t} courseId={7} students={students} showToast={showToast} />);

    await user.click(await screen.findByRole('checkbox'));

    expect(await screen.findByText('absenceLimitStatusWarning')).toBeInTheDocument();
    expect(mockedEnrollments.setExtendedAbsenceApproval).toHaveBeenCalledWith(7, 1, true, '');
    expect(showToast).toHaveBeenCalledWith('absenceLimitApprovalSaved', 'success');
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('reports a failed approval without changing the row', async () => {
    const user = userEvent.setup();
    const showToast = vi.fn();
    mockedAttendance.getCourseAbsenceStatus.mockResolvedValue([row({})]);
    mockedEnrollments.setExtendedAbsenceApproval.mockRejectedValue(new Error('403'));

    render(<AbsenceLimitsPanel t={t} courseId={7} students={students} showToast={showToast} />);

    await user.click(await screen.findByRole('checkbox'));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('absenceLimitApprovalFailed', 'error'));
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('shows an error when the status cannot be loaded', async () => {
    mockedAttendance.getCourseAbsenceStatus.mockRejectedValue(new Error('boom'));

    render(<AbsenceLimitsPanel t={t} courseId={7} students={students} showToast={vi.fn()} />);

    expect(await screen.findByText('absenceLimitLoadFailed')).toBeInTheDocument();
  });
});
