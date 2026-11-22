/**
 * Plan todo 69: a save that changes a course's absence limits shows what it does first.
 *
 * The limits are counted from the periods per week for the whole semester, past weeks
 * included, so a new period count (or a new limit) rewrites every student's status. Before
 * such a save the page asks the server what it would do and shows the totals before and after
 * and the students whose status changes; it saves only after "Save the new schedule".
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n/config';
import { LanguageProvider } from '@/LanguageContext';
import type { Course } from '@/types';
import CoursesView from './CoursesView';

const api = vi.hoisted(() => ({ getAll: vi.fn(), put: vi.fn(), preview: vi.fn() }));

vi.mock('@/api/api', () => ({
  default: { put: api.put },
  coursesAPI: { getAll: api.getAll, previewScheduleChange: api.preview },
  studentsAPI: { getAllPages: vi.fn().mockResolvedValue([]) },
  enrollmentsAPI: { getEnrolledStudents: vi.fn().mockResolvedValue([]), getByStudent: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/hooks', () => ({ usePerformanceMonitor: () => undefined }));

const MONDAY_TWO = [{ day: 'Monday', periods: 2, start_time: '08:00', duration: 45 }];

// Stored with 3 periods a week; its schedule (what the page shows and saves) has 2.
const course = (overrides: Partial<Course> = {}): Course =>
  ({
    id: 5,
    course_code: 'AUT0105',
    course_name: 'Electronics',
    semester: 'A',
    credits: 3,
    is_active: true,
    hours_per_week: 1.5,
    periods_per_week: 3,
    teaching_schedule: MONDAY_TWO,
    absence_limit_percent: 30,
    participation_limit_percent: 10,
    evaluation_rules: [
      { category: 'Class Participation', weight: 7 },
      { category: 'No participation', weight: 2 },
      { category: 'Minor participation', weight: 1 },
      { category: 'Final Exam', weight: 90 },
    ],
    ...overrides,
  }) as Course;

const warning = {
  course_id: 5,
  before: { periods_per_week: 3, scheduled_periods: 42, allowed_absences: 12, participation_allowed_absences: 4 },
  after: { periods_per_week: 2, scheduled_periods: 28, allowed_absences: 8, participation_allowed_absences: 2 },
  enrolled_students: 3,
  has_attendance: true,
  changes: [
    {
      student_id: 41,
      student_name: 'Maria Georgiou',
      absences: 9,
      status_before: 'ok',
      status_after: 'insufficient',
      participation_forfeited_before: true,
      participation_forfeited_after: true,
    },
    {
      student_id: 42,
      student_name: 'Nikos Vlachou',
      absences: 3,
      status_before: 'ok',
      status_after: 'ok',
      participation_forfeited_before: false,
      participation_forfeited_after: true,
    },
  ],
  periods_change: true,
  suggested_from_week: null as number | null,
  semester_weeks: 14,
};

// Todo 71: the server's answer for a change from week N on (the weeks before keep 3 a week).
const fromWeek = (week: number) => {
  const total = 42 - (14 - week + 1);
  return {
    ...warning,
    suggested_from_week: 8,
    after: {
      periods_per_week: 2,
      scheduled_periods: total,
      allowed_absences: Math.floor(total * 0.3),
      participation_allowed_absences: Math.floor(total * 0.1),
    },
    changes: [],
  };
};

const renderCourses = async (c: Course = course()) => {
  api.getAll.mockResolvedValue([c]);
  render(
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <CoursesView courses={[c]} />
      </LanguageProvider>
    </I18nextProvider>
  );
  const select = (await screen.findAllByRole('combobox'))[0];
  fireEvent.change(select, { target: { value: String(c.id) } });
  await screen.findByTestId('special-participation-weights');
};

const save = () => fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

describe('CoursesView: a save that changes the absence limits', () => {
  beforeEach(async () => {
    localStorage.setItem('i18nextLng', 'en');
    await i18n.changeLanguage('en');
    api.getAll.mockReset();
    api.put.mockReset().mockResolvedValue({ data: {} });
    api.preview.mockReset().mockResolvedValue(warning);
  });

  it('shows the totals and the students whose status changes, and saves only after Save', async () => {
    await renderCourses();
    save();

    const dialog = await screen.findByTestId('schedule-change-dialog');
    expect(api.put).not.toHaveBeenCalled();
    expect(api.preview).toHaveBeenCalledWith(
      5,
      expect.objectContaining({
        teaching_schedule: [expect.objectContaining({ day: 'Monday', periods: 2 })],
        absence_limit_percent: 30,
        participation_limit_percent: 10,
      })
    );
    expect(within(dialog).getByText('The number of periods per week changes')).toBeInTheDocument();
    expect(within(dialog).getByTestId('schedule-change-periods_per_week')).toHaveTextContent('3 → 2');
    expect(within(dialog).getByTestId('schedule-change-scheduled_periods')).toHaveTextContent('Periods in the semester42 → 28');
    expect(within(dialog).getByTestId('schedule-change-allowed_absences')).toHaveTextContent('12 → 8');
    expect(within(dialog).getByTestId('schedule-change-student-41')).toHaveTextContent(
      'Maria Georgiou (9 absences)Sufficient → Insufficient (failed)'
    );
    // Her share was lost before and stays lost: only what changes is said.
    expect(within(dialog).getByTestId('schedule-change-student-41')).not.toHaveTextContent('Participation');
    expect(within(dialog).getByTestId('schedule-change-student-42')).toHaveTextContent(
      'Participation counts → Participation lost'
    );

    fireEvent.click(within(dialog).getByTestId('schedule-change-save'));

    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
    const [url, payload] = api.put.mock.calls[0];
    expect(url).toBe('/courses/5');
    expect(payload.teaching_schedule).toEqual([expect.objectContaining({ day: 'Monday', periods: 2 })]);
    await waitFor(() => expect(screen.queryByTestId('schedule-change-dialog')).not.toBeInTheDocument());
    expect(api.preview).toHaveBeenCalledTimes(1); // Save does not ask again
  });

  it('saves nothing when the teacher goes back to the schedule', async () => {
    await renderCourses();
    save();
    fireEvent.click(within(await screen.findByTestId('schedule-change-dialog')).getByTestId('schedule-change-cancel'));

    await waitFor(() => expect(screen.queryByTestId('schedule-change-dialog')).not.toBeInTheDocument());
    expect(api.put).not.toHaveBeenCalled();
  });

  it('saves nothing when the check cannot be made, and says so', async () => {
    api.preview.mockRejectedValue(new Error('offline'));
    await renderCourses();
    save();

    expect(
      await screen.findByText('What this change does to the absence limits could not be checked.')
    ).toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalled();
  });

  it('asks nothing when neither the periods nor the limits change', async () => {
    await renderCourses(course({ periods_per_week: 2 }));
    save();

    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
    expect(api.preview).not.toHaveBeenCalled();
    expect(screen.queryByTestId('schedule-change-dialog')).not.toBeInTheDocument();
  });

  describe('from which week a change of the periods applies (todo 71)', () => {
    beforeEach(() => {
      api.preview.mockImplementation(async (_id: number, request: { change_from_week?: number | null }) =>
        request.change_from_week ? fromWeek(request.change_from_week) : { ...warning, suggested_from_week: 8 }
      );
    });

    it('starts from the week we are in, shows what that keeps, and saves with it', async () => {
      await renderCourses();
      save();

      const dialog = await screen.findByTestId('schedule-change-dialog');
      expect(api.preview).toHaveBeenCalledTimes(2);
      expect(api.preview.mock.calls[1][1]).toMatchObject({ change_from_week: 8 });
      expect(within(dialog).getByTestId('schedule-change-from-week')).toBeChecked();
      expect(within(dialog).getByTestId('schedule-change-week')).toHaveValue(8);
      // Weeks 1-7 keep 3 periods: 21 + 7 x 2 = 35, not 28.
      expect(within(dialog).getByTestId('schedule-change-scheduled_periods')).toHaveTextContent('42 → 35');

      fireEvent.click(within(dialog).getByTestId('schedule-change-save'));

      await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
      expect(api.put.mock.calls[0][1]).toMatchObject({ schedule_change_from_week: 8 });
    });

    it('asks again for a correction of the whole semester, and saves it without a week', async () => {
      await renderCourses();
      save();
      const dialog = await screen.findByTestId('schedule-change-dialog');

      fireEvent.click(within(dialog).getByTestId('schedule-change-correction'));

      await waitFor(() =>
        expect(within(dialog).getByTestId('schedule-change-scheduled_periods')).toHaveTextContent('42 → 28')
      );
      expect(api.preview.mock.calls.at(-1)![1]).toMatchObject({ change_from_week: null });
      fireEvent.click(within(dialog).getByTestId('schedule-change-save'));

      await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
      expect(api.put.mock.calls[0][1]).not.toHaveProperty('schedule_change_from_week');
    });

    it('asks again for another week, and does not save a week outside the semester', async () => {
      await renderCourses();
      save();
      const dialog = await screen.findByTestId('schedule-change-dialog');
      const week = within(dialog).getByTestId('schedule-change-week');

      fireEvent.change(week, { target: { value: '10' } });
      await waitFor(() =>
        expect(within(dialog).getByTestId('schedule-change-scheduled_periods')).toHaveTextContent('42 → 37')
      );
      expect(api.preview.mock.calls.at(-1)![1]).toMatchObject({ change_from_week: 10 });

      fireEvent.change(week, { target: { value: '15' } });
      expect(within(dialog).getByTestId('schedule-change-save')).toBeDisabled();
      expect(api.preview.mock.calls.at(-1)![1]).toMatchObject({ change_from_week: 10 });
    });
  });

  it('saves at once when the change touches no student', async () => {
    api.preview.mockResolvedValue({ ...warning, enrolled_students: 0, has_attendance: false, changes: [] });
    await renderCourses();
    save();

    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('schedule-change-dialog')).not.toBeInTheDocument();
  });
});
