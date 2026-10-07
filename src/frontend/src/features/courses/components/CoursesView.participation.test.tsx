import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n/config';
import { LanguageProvider } from '@/LanguageContext';
import type { Course } from '@/types';
import CoursesView from './CoursesView';

const api = vi.hoisted(() => ({ getAll: vi.fn(), put: vi.fn() }));

vi.mock('@/api/api', () => ({
  default: { put: api.put },
  coursesAPI: { getAll: api.getAll },
  studentsAPI: { getAllPages: vi.fn().mockResolvedValue([]) },
  enrollmentsAPI: { getEnrolledStudents: vi.fn().mockResolvedValue([]), getByStudent: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/hooks', () => ({ usePerformanceMonitor: () => undefined }));

const course = (overrides: Partial<Course> = {}): Course =>
  ({
    id: 5,
    course_code: 'AUT0105',
    course_name: 'Electronics',
    semester: 'A',
    credits: 3,
    is_active: true,
    hours_per_week: 0,
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
  return screen.findByTestId('special-participation-weights');
};

describe('CoursesView: Class Participation sub-weights and absence limits', () => {
  beforeEach(async () => {
    localStorage.setItem('i18nextLng', 'en');
    await i18n.changeLanguage('en');
    api.getAll.mockReset();
    api.put.mockReset().mockResolvedValue({ data: {} });
  });

  it('shows Class Participation as its whole share, split into the special sub-weights', async () => {
    const panel = await renderCourses();
    // The share is 7 + 2 + 1 = 10; the special rules are not separate rows.
    expect(screen.getAllByDisplayValue('10').length).toBeGreaterThanOrEqual(2); // share, participation limit
    expect(screen.getByDisplayValue('90')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('No participation')).toBeNull();
    expect(within(panel).getByLabelText('No participation')).toHaveValue(2);
    expect(within(panel).getByLabelText('Minor participation')).toHaveValue(1);
    expect(within(panel).getByLabelText('Minor participation (mobile usage)')).toHaveValue(0);
    expect(screen.getByTestId('participation-ratings-weight')).toHaveTextContent('7.0%');
    const limits = screen.getByTestId('course-absence-limits');
    expect(within(limits).getByLabelText('Fail limit (% of periods)')).toHaveValue(30);
    expect(within(limits).getByLabelText('Class Participation limit (% of periods)')).toHaveValue(10);
  });

  it('saves Class Participation as the remainder plus the three special rules, and the limits', async () => {
    const panel = await renderCourses();
    fireEvent.change(within(panel).getByLabelText('Minor participation (mobile usage)'), { target: { value: '0.5' } });
    fireEvent.change(within(screen.getByTestId('course-absence-limits')).getByLabelText('Fail limit (% of periods)'), {
      target: { value: '25' },
    });
    await waitFor(() => expect(screen.getByTestId('participation-ratings-weight')).toHaveTextContent('6.5%'));

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => expect(api.put).toHaveBeenCalled());
    const [url, payload] = api.put.mock.calls[0];
    expect(url).toBe('/courses/5');
    expect(payload.evaluation_rules).toEqual([
      expect.objectContaining({ category: 'Class Participation', weight: 6.5 }),
      expect.objectContaining({ category: 'Final Exam', weight: 90 }),
      { category: 'No participation', weight: 2 },
      { category: 'Minor participation', weight: 1 },
      { category: 'Minor participation (mobile usage)', weight: 0.5 },
    ]);
    expect(payload.absence_limit_percent).toBe(25);
    expect(payload.participation_limit_percent).toBe(10);
  });

  it('refuses sub-weights larger than the Class Participation share', async () => {
    const panel = await renderCourses();
    fireEvent.change(within(panel).getByLabelText('No participation'), { target: { value: '12' } });
    expect(await within(panel).findByText('The special sub-weights are larger than the Class Participation share.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(api.put).not.toHaveBeenCalled();
  });

  it('gives a course without limits the 30% fail and 10% Class Participation defaults', async () => {
    await renderCourses(course({ absence_limit_percent: undefined, participation_limit_percent: undefined }));
    const limits = screen.getByTestId('course-absence-limits');
    expect(within(limits).getByLabelText('Fail limit (% of periods)')).toHaveValue(30);
    expect(within(limits).getByLabelText('Class Participation limit (% of periods)')).toHaveValue(10);
  });
});
