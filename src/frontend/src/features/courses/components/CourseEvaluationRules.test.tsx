import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n/config';
import { LanguageProvider } from '@/LanguageContext';
import type { Course } from '@/types';
import CourseEvaluationRules from './CourseEvaluationRules';

const api = vi.hoisted(() => ({ getAll: vi.fn(), put: vi.fn() }));
const autosave = vi.hoisted(() => ({ save: null as null | (() => Promise<void>) }));

vi.mock('@/api/api', () => ({
  default: { put: api.put },
  coursesAPI: { getAll: api.getAll },
}));
// The real hook waits 2 s and only saves valid changes; here the test triggers the save itself.
vi.mock('@/hooks', () => ({
  useAutosave: (save: () => Promise<void>) => {
    autosave.save = save;
    return { isSaving: false, isPending: false };
  },
}));

const course = (overrides: Partial<Course> = {}): Course =>
  ({
    id: 5,
    course_code: 'AUT0105',
    course_name: 'Electronics',
    semester: 'A',
    credits: 3,
    is_active: true,
    absence_penalty: 0,
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

const renderEditor = async (courses: Course[] = [course()]) => {
  api.getAll.mockResolvedValue(courses);
  render(
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <CourseEvaluationRules />
      </LanguageProvider>
    </I18nextProvider>
  );
  const select = await screen.findByRole('combobox');
  await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(courses.length + 1));
  fireEvent.change(select, { target: { value: String(courses[0].id) } });
  return screen.findByTestId('special-participation-weights');
};

describe('CourseEvaluationRules: Class Participation sub-weights', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    api.getAll.mockReset();
    api.put.mockReset().mockResolvedValue({ data: {} });
    autosave.save = null;
  });

  it('shows Class Participation as its whole share, split into the special sub-weights', async () => {
    const panel = await renderEditor();
    // Two rule rows: Class Participation (7 + 2 + 1 = 10) and Final Exam; the specials are not rows.
    expect(screen.getAllByDisplayValue('10')).toHaveLength(2); // the share, and the 10% participation limit
    expect(screen.getByDisplayValue('90')).toBeInTheDocument();
    expect(within(panel).getByLabelText('No participation')).toHaveValue(2);
    expect(within(panel).getByLabelText('Minor participation')).toHaveValue(1);
    expect(within(panel).getByLabelText('Minor participation (mobile usage)')).toHaveValue(0);
    expect(screen.getByTestId('participation-ratings-weight')).toHaveTextContent('7.0%');
    expect(screen.getByLabelText('Fail limit (% of periods)')).toHaveValue(30);
    expect(screen.getByLabelText('Class Participation limit (% of periods)')).toHaveValue(10);
  });

  it('saves the share as Class Participation remainder plus the three special rules', async () => {
    const panel = await renderEditor();
    fireEvent.change(within(panel).getByLabelText('Minor participation (mobile usage)'), { target: { value: '0.5' } });
    await waitFor(() => expect(screen.getByTestId('participation-ratings-weight')).toHaveTextContent('6.5%'));

    await autosave.save!();

    expect(api.put).toHaveBeenCalledWith('/courses/5', {
      evaluation_rules: [
        expect.objectContaining({ category: 'Class Participation', weight: 6.5 }),
        expect.objectContaining({ category: 'Final Exam', weight: 90 }),
        { category: 'No participation', weight: 2 },
        { category: 'Minor participation', weight: 1 },
        { category: 'Minor participation (mobile usage)', weight: 0.5 },
      ],
      absence_penalty: 0,
      absence_limit_percent: 30,
      participation_limit_percent: 10,
    });
  });

  it('refuses sub-weights larger than the Class Participation share', async () => {
    const panel = await renderEditor();
    fireEvent.change(within(panel).getByLabelText('No participation'), { target: { value: '12' } });

    expect(await within(panel).findByText('The special sub-weights are larger than the Class Participation share.')).toBeInTheDocument();
    await expect(autosave.save!()).rejects.toThrow('Validation failed');
    expect(api.put).not.toHaveBeenCalled();
  });

  it('gives a course without limits the 30% fail and 10% Class Participation defaults', async () => {
    await renderEditor([course({ absence_limit_percent: undefined, participation_limit_percent: undefined })]);
    expect(screen.getByLabelText('Fail limit (% of periods)')).toHaveValue(30);
    expect(screen.getByLabelText('Class Participation limit (% of periods)')).toHaveValue(10);
  });
});
