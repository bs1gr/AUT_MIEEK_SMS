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

const observationCourse = () =>
  course({
    evaluation_rules: [
      { category: 'Class Participation', weight: 10 },
      { category: 'No participation', weight: 0, deduction_percent: 70 },
      { category: 'Minor participation (mobile usage)', weight: 0, deduction_percent: 0 },
      { category: 'Final Exam', weight: 90 },
    ],
  });

describe('CoursesView: participation observation deductions and absence limits', () => {
  beforeEach(async () => {
    localStorage.setItem('i18nextLng', 'en');
    await i18n.changeLanguage('en');
    api.getAll.mockReset();
    api.put.mockReset().mockResolvedValue({ data: {} });
  });

  it('shows Class Participation whole, each observation as a share of the day, and what stays for presence', async () => {
    const panel = await renderCourses(observationCourse());
    expect(screen.getAllByDisplayValue('10').length).toBeGreaterThanOrEqual(2); // share, participation limit
    expect(screen.getByDisplayValue('90')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('No participation')).toBeNull();
    expect(within(panel).getByLabelText('No participation')).toHaveValue(70);
    expect(within(panel).getByLabelText('Minor participation (mobile usage)')).toHaveValue(0);
    expect(within(panel).getByLabelText('Minor participation')).toHaveValue(20); // not saved: default
    expect(within(panel).getAllByText('% of the day')).toHaveLength(3);
    expect(screen.getByTestId('presence-credit-No participation')).toHaveTextContent('30% of the day stays for presence');
    const limits = screen.getByTestId('course-absence-limits');
    expect(within(limits).getByLabelText('Fail limit (% of periods)')).toHaveValue(30);
    expect(within(limits).getByLabelText('Class Participation limit (% of periods)')).toHaveValue(10);
  });

  it('gives an old-layout course Class Participation back and the defaults by severity', async () => {
    const panel = await renderCourses(); // 7 + 2 + 1
    expect(screen.getAllByDisplayValue('10').length).toBeGreaterThanOrEqual(2);
    expect(within(panel).getByLabelText('No participation')).toHaveValue(60);
    expect(within(panel).getByLabelText('Minor participation (mobile usage)')).toHaveValue(40);
    expect(within(panel).getByLabelText('Minor participation')).toHaveValue(20);
    expect(screen.getByTestId('presence-credit-Minor participation')).toHaveTextContent('80% of the day stays for presence');
  });

  it('saves Class Participation whole, the observations as weight-0 percentages, and the limits', async () => {
    const panel = await renderCourses();
    fireEvent.change(within(panel).getByLabelText('Minor participation (mobile usage)'), { target: { value: '50' } });
    fireEvent.change(within(screen.getByTestId('course-absence-limits')).getByLabelText('Fail limit (% of periods)'), {
      target: { value: '25' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => expect(api.put).toHaveBeenCalled());
    const [url, payload] = api.put.mock.calls[0];
    expect(url).toBe('/courses/5');
    expect(payload.evaluation_rules).toEqual([
      expect.objectContaining({ category: 'Class Participation', weight: 10 }),
      expect.objectContaining({ category: 'Final Exam', weight: 90 }),
      { category: 'No participation', weight: 0, deduction_percent: 60 },
      { category: 'Minor participation (mobile usage)', weight: 0, deduction_percent: 50 },
      { category: 'Minor participation', weight: 0, deduction_percent: 20 },
    ]);
    expect(payload.absence_limit_percent).toBe(25);
    expect(payload.participation_limit_percent).toBe(10);
  });
  it('gives a course without limits the 30% fail and 10% Class Participation defaults', async () => {
    await renderCourses(course({ absence_limit_percent: undefined, participation_limit_percent: undefined }));
    const limits = screen.getByTestId('course-absence-limits');
    expect(within(limits).getByLabelText('Fail limit (% of periods)')).toHaveValue(30);
    expect(within(limits).getByLabelText('Class Participation limit (% of periods)')).toHaveValue(10);
  });
});
