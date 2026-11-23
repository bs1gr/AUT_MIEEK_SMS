import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';
import { LanguageProvider, useLanguage } from '@/LanguageContext';
import AbsenceLimitsPanel, { type AbsenceLimitsPanelProps } from './AbsenceLimitsPanel';
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

  it('names the Lates beside the absences, as not absences', async () => {
    // Plan todo 77: a Late is attended, not an absence; its number is here for the evaluation.
    mockedAttendance.getCourseAbsenceStatus.mockResolvedValue([
      row({ student_id: 1, late: 3 }),
      row({ student_id: 2 }),
      row({ student_id: 3, late: 0 }),
    ]);

    render(<AbsenceLimitsPanel t={t} courseId={7} students={students} />);

    expect(await screen.findByTestId('absence-limit-late-1')).toHaveTextContent('absenceLimitLate {"count":3}');
    // None from an older server (no field at all), nor for a student without a Late (this
    // server's 0).
    expect(screen.queryByTestId('absence-limit-late-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('absence-limit-late-3')).not.toBeInTheDocument();
  });

  // The page's own texts, through the namespaces the Attendance page looks a bare key up in.
  const WithPageTexts = (props: Omit<AbsenceLimitsPanelProps, 't'>) => {
    const { t } = useLanguage();
    return <AbsenceLimitsPanel t={t} {...props} />;
  };

  it.each([
    ['en', 1, 'Late: 1 (not an absence)'],
    ['en', 2, 'Late: 2 (not absences)'],
    ['el', 1, 'Αργοπορία: 1 (δεν είναι απουσία)'],
    ['el', 2, 'Αργοπορίες: 2 (δεν είναι απουσίες)'],
  ] as const)('in %s, %i Late reads "%s"', async (lang, late, text) => {
    mockedAttendance.getCourseAbsenceStatus.mockResolvedValue([row({ student_id: 1, late })]);
    localStorage.setItem('i18nextLng', lang);
    await act(async () => {
      await i18n.changeLanguage(lang);
    });

    render(
      <I18nextProvider i18n={i18n}>
        <LanguageProvider>
          <WithPageTexts courseId={7} students={students} />
        </LanguageProvider>
      </I18nextProvider>
    );

    expect(await screen.findByTestId('absence-limit-late-1')).toHaveTextContent(text);
    // The help above says the same word as the Attendance page's button.
    expect(screen.getByTestId('absence-limits-panel')).toHaveTextContent(
      lang === 'el' ? 'οι αργοπορίες όχι' : 'Late does not'
    );
  });

  it('names every value for the phone layout, where the header row is not shown', async () => {
    // jsdom has no layout, so this checks what the layout is made of; the widths themselves
    // were measured in a browser (412 px: nothing cut off, every status in view).
    mockedAttendance.getCourseAbsenceStatus.mockResolvedValue([
      row({ student_id: 1 }),
      row({ student_id: 2, absences: 13, status: 'insufficient', attendance_insufficient: true }),
    ]);

    render(<AbsenceLimitsPanel t={t} courseId={7} students={students} />);

    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3));
    const [header, first] = screen.getAllByRole('row');

    // The header row is for the table only, the labels inside the cells for the phone only.
    expect(header.closest('thead')).toHaveClass('hidden', 'sm:table-header-group');
    const labels = within(first).getAllByTestId('absence-limit-phone-label');
    expect(labels.map((label) => label.textContent)).toEqual([
      'absenceLimitColumnAbsences:',
      'absenceLimitColumnParticipation:',
      'absenceLimitColumnAllowed:',
    ]);
    labels.forEach((label) => expect(label).toHaveClass('sm:hidden'));

    // A student is a two-column block on a phone and a table row from 640 px up, with the
    // status in the first line, beside the name.
    expect(first).toHaveClass('grid', 'sm:table-row');
    const status = within(first).getByText('absenceLimitStatusInsufficient').closest('td');
    expect(status).toHaveClass('row-start-1', 'col-start-2');
    within(first).getAllByRole('cell').forEach((cell) => expect(cell).toHaveClass('block', 'sm:table-cell'));
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
