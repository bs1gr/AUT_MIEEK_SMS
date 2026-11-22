/**
 * Plan todo 72: attendance recorded where the course's schedule no longer has a lesson.
 *
 * When a day lost a period, the absences already recorded in it vanished from the sheet but
 * still counted in the limits; and past dates on a weekday the course no longer has were greyed
 * out in the calendar, although their records were there. The calendar now opens such a date,
 * marked, and the sheet names a period outside the schedule as such.
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import AttendanceCalendar from '../AttendanceCalendar';
import AttendanceStudentList from '../AttendanceStudentList';

const t = (key: string, options?: Record<string, unknown>) =>
  options && 'number' in options ? `${key}:${options.number}` : key;

describe('the calendar', () => {
  // Mondays and Wednesdays were taught; the schedule now has Wednesdays only.
  const monday = new Date(2026, 9, 5);
  const tuesday = new Date(2026, 9, 6);
  const wednesday = new Date(2026, 9, 7);
  const renderCalendar = (setSelectedDate = vi.fn()) => {
    render(
      <AttendanceCalendar
        t={t}
        previousMonth={vi.fn()}
        nextMonth={vi.fn()}
        monthYear="October 2026"
        dayNamesShort={['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']}
        days={[monday, tuesday, wednesday]}
        isTeachingDay={(day) => day?.getDay() === 3}
        isToday={() => false}
        isSelected={() => false}
        datesWithAttendance={new Set(['2026-10-05', '2026-10-07'])}
        setSelectedDate={setSelectedDate}
      />
    );
    return setSelectedDate;
  };

  it('opens a past date with records on a weekday the schedule no longer has, marked as such', () => {
    const setSelectedDate = renderCalendar();

    const outside = screen.getByTestId('calendar-day-outside-2026-10-05');
    expect(outside).toBeEnabled();
    expect(outside).toHaveAttribute('title', 'attendanceOutsideScheduleDayTitle');
    fireEvent.click(outside);
    expect(setSelectedDate).toHaveBeenCalledWith(monday);
    expect(screen.getByText('attendanceOutsideScheduleLegend')).toBeInTheDocument();
  });

  it('keeps a day without a lesson and without records closed', () => {
    renderCalendar();
    expect(screen.getByRole('button', { name: '6' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '7' })).toBeEnabled();
    expect(screen.queryByTestId('calendar-day-outside-2026-10-07')).not.toBeInTheDocument();
  });
});

describe('the sheet', () => {
  it('names a period that holds records outside the schedule', () => {
    render(
      <AttendanceStudentList
        t={t}
        formatDate={(value) => String(value)}
        selectedDate={new Date(2026, 9, 7)}
        selectedCourse={1}
        enrolledStudents={[{ id: 1, first_name: 'Maria', last_name: 'Georgiou', student_id: 'S1', email: 'm@example.com' } as never]}
        evaluationCategories={[]}
        hasMultiplePeriods
        activePeriods={[1, 2, 3]}
        outsideSchedulePeriods={[3]}
        getStudentPeriodStatuses={() => ({ 3: 'Absent' })}
        getAggregatedStatus={() => ({ status: 'Absent', isMixed: true, hasAny: true })}
        isStudentExpanded={() => true}
        toggleStudentPeriods={vi.fn()}
        setAttendance={vi.fn()}
        clearPeriodAttendance={vi.fn()}
        clearStudentAttendance={vi.fn()}
        setSelectedStudentForPerformance={vi.fn()}
        setShowPerformanceModal={vi.fn()}
      />
    );

    expect(screen.getByTestId('period-label-1')).toHaveTextContent('periodLabel:1');
    expect(screen.getByTestId('period-label-3')).toHaveTextContent('periodOutsideScheduleLabel:3');
    expect(within(screen.getByTestId('period-label-2').parentElement!).queryByText(/outside/i)).not.toBeInTheDocument();
  });
});
