/**
 * Plan todo 78 point 2 (the owner, 2026-11-24): "an Excused day should close Rate the way Absent
 * does, and clear ratings already saved for that day". Excused is an absence (todo 77 point 1), but
 * the Attendance page closed Rate and the participation ticks only for a student marked Absent; a
 * tick on an Excused day made it an attended day, so it took its slice of Class Participation.
 * A day is an absence when every period recorded is Absent or Excused, mixed or not.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AttendanceStudentList from '../AttendanceStudentList';
import AttendancePerformanceModal from '../AttendancePerformanceModal';
import { aggregateDayStatuses } from '@/features/attendance/utils/dayStatus';
import type { Student } from '@/types';

const students: Student[] = [
  { id: 1, first_name: 'Λία', last_name: 'Αντωνίου', email: 'a@example.com', student_id: 'S001', enrollment_date: '2026-01-01', is_active: true },
] as Student[];

const renderList = (periodStatuses: Record<number, string>) => {
  render(
    <AttendanceStudentList
      t={() => ''}
      formatDate={(value) => String(value)}
      selectedDate={new Date('2026-10-01T12:00:00')}
      selectedCourse={1}
      enrolledStudents={students}
      evaluationCategories={[{ category: 'Class Participation', weight: 10 }]}
      hasMultiplePeriods
      activePeriods={Object.keys(periodStatuses).map(Number)}
      getStudentPeriodStatuses={() => periodStatuses}
      getAggregatedStatus={() => aggregateDayStatuses(Object.values(periodStatuses))}
      isStudentExpanded={() => false}
      toggleStudentPeriods={vi.fn()}
      setAttendance={vi.fn()}
      clearPeriodAttendance={vi.fn()}
      clearStudentAttendance={vi.fn()}
      setSelectedStudentForPerformance={vi.fn()}
      setShowPerformanceModal={vi.fn()}
    />,
  );
  return screen.getByRole('button', { name: /Rate/ });
};

describe('an Excused day closes Rate as an Absent one does', () => {
  it.each([
    ['Excused in every period', { 1: 'Excused', 2: 'Excused' }],
    ['Absent in every period', { 1: 'Absent', 2: 'Absent' }],
    ['Absent and Excused', { 1: 'Absent', 2: 'Excused' }],
  ])('closes Rate for a student %s', (_label, statuses) => {
    expect(renderList(statuses)).toBeDisabled();
  });

  it.each([
    ['present', { 1: 'Present', 2: 'Present' }],
    ['late', { 1: 'Late', 2: 'Late' }],
    ['excused in one period and present in another', { 1: 'Excused', 2: 'Present' }],
  ])('keeps Rate open for a student %s', (_label, statuses) => {
    expect(renderList(statuses)).toBeEnabled();
  });

  it('closes the rating dialog for an Excused day and says why', () => {
    render(
      <AttendancePerformanceModal
        t={() => ''}
        formatDate={(value) => String(value)}
        formatWeekday={() => 'Weekday'}
        localeOverride="en-US"
        selectedDate={new Date('2026-10-01T12:00:00')}
        selectedStudentForPerformance={students[0]}
        evaluationCategories={[
          { category: 'Class Participation', weight: 10 },
          { category: 'No participation', weight: 0, deductionPercent: 60 },
        ]}
        dailyPerformance={{}}
        getAggregatedStatus={() => aggregateDayStatuses(['Excused', 'Excused'])}
        translateCategory={(category) => category}
        getSpecialParticipationScore={(category) => (category === 'No participation' ? 0 : null)}
        setPerformanceScore={vi.fn()}
        clearPerformanceScore={vi.fn()}
        setSpecialParticipationOption={vi.fn()}
        setShowPerformanceModal={vi.fn()}
        showToast={vi.fn()}
      />,
    );

    expect(screen.getByText('Student is marked Absent or Excused this day. Performance rating is disabled.')).toBeInTheDocument();
    for (const box of screen.getAllByRole('checkbox')) expect(box).toBeDisabled();
  });
});

describe('the day of a student', () => {
  it('is an absence when every period recorded is Absent or Excused, in any case', () => {
    expect(aggregateDayStatuses(['Excused', 'absent'])).toEqual({ status: undefined, isMixed: true, hasAny: true, isAbsence: true });
    expect(aggregateDayStatuses(['Excused'])).toEqual({ status: 'Excused', isMixed: false, hasAny: true, isAbsence: true });
    expect(aggregateDayStatuses(['Excused', 'Late']).isAbsence).toBe(false);
    expect(aggregateDayStatuses(['Tardy']).isAbsence).toBe(false);
    expect(aggregateDayStatuses([])).toEqual({ status: undefined, isMixed: false, hasAny: false, isAbsence: false });
  });
});
