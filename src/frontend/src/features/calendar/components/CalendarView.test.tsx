import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CalendarView from './CalendarView';
import type { Course } from '@/types';

const t = (key: string, opts?: Record<string, unknown>) => (opts?.count !== undefined ? `${key}:${opts.count}` : key);
vi.mock('@/LanguageContext', () => ({
  useLanguage: () => ({ t }),
}));

const course = (id: number, code: string, isActive: boolean): Course =>
  ({
    id,
    course_code: code,
    course_name: `Course ${code}`,
    semester: 'Winter 2025',
    credits: 3,
    is_active: isActive,
    teaching_schedule: { Tuesday: { periods: 2, start_time: '17:00', duration: 45 } },
  }) as unknown as Course;

const renderView = (courses: Course[], onSetCourseActive?: (id: number, active: boolean) => Promise<void>) =>
  render(
    <MemoryRouter>
      <CalendarView courses={courses} onSetCourseActive={onSetCourseActive} />
    </MemoryRouter>
  );

describe('CalendarView', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('leaves ended (inactive) courses off the weekly schedule', () => {
    renderView([course(1, 'AUT0203', true), course(2, 'AUT0100', false)]);

    expect(screen.getByText('AUT0203 - Course AUT0203')).toBeInTheDocument();
    expect(screen.queryByText('AUT0100 - Course AUT0100')).not.toBeInTheDocument();
  });

  it('marks a course as ended after confirmation', async () => {
    const user = userEvent.setup();
    const onSetCourseActive = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderView([course(1, 'AUT0203', true)], onSetCourseActive);

    await user.click(screen.getByRole('button', { name: 'markCourseEnded: AUT0203' }));

    expect(window.confirm).toHaveBeenCalled();
    expect(onSetCourseActive).toHaveBeenCalledWith(1, false);
  });

  it('does nothing when the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const onSetCourseActive = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderView([course(1, 'AUT0203', true)], onSetCourseActive);

    await user.click(screen.getByRole('button', { name: 'markCourseEnded: AUT0203' }));

    expect(onSetCourseActive).not.toHaveBeenCalled();
  });

  it('lists ended courses and can reactivate one', async () => {
    const user = userEvent.setup();
    const onSetCourseActive = vi.fn().mockResolvedValue(undefined);
    renderView([course(1, 'AUT0203', true), course(2, 'AUT0100', false)], onSetCourseActive);

    await user.click(screen.getByRole('button', { name: /endedCourses:1/ }));
    expect(screen.getByText('AUT0100 - Course AUT0100')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /reactivateCourse/ }));
    expect(onSetCourseActive).toHaveBeenCalledWith(2, true);
  });

  it('explains that a course without students cannot be reactivated (409)', async () => {
    const user = userEvent.setup();
    const onSetCourseActive = vi.fn().mockRejectedValue({ response: { status: 409 } });
    renderView([course(2, 'AUT0100', false)], onSetCourseActive);

    await user.click(screen.getByRole('button', { name: /endedCourses:1/ }));
    await user.click(screen.getByRole('button', { name: /reactivateCourse/ }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('reactivateCourseNoStudents'));
  });

  it('shows an error when ending the course fails', async () => {
    const user = userEvent.setup();
    const onSetCourseActive = vi.fn().mockRejectedValue(new Error('403'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderView([course(1, 'AUT0203', true)], onSetCourseActive);

    await user.click(screen.getByRole('button', { name: 'markCourseEnded: AUT0203' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('endCourseFailed'));
  });

  it('renders read-only (no end buttons) without a handler', () => {
    renderView([course(1, 'AUT0203', true)]);
    expect(screen.queryByRole('button', { name: /markCourseEnded/ })).not.toBeInTheDocument();
  });
});
