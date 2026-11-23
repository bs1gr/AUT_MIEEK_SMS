/**
 * The course editor and the Attendance rule (plan todo 77 point 2; the owner, 2026-11-23): a rule
 * typed «Παρουσία» or «Παρουσίες» is the Attendance rule, which counts the periods attended. Until
 * then the editor saved it as Class Participation, which never counts them, and showed it the
 * participation observations. Greek page texts throughout.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const course = (rules: Course['evaluation_rules']): Course =>
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
    evaluation_rules: rules,
  }) as Course;

const openCourse = async (c: Course) => {
  api.getAll.mockResolvedValue([c]);
  const view = render(
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <CoursesView courses={[c]} />
      </LanguageProvider>
    </I18nextProvider>
  );
  const select = (await screen.findAllByRole('combobox'))[0];
  fireEvent.change(select, { target: { value: String(c.id) } });
  await waitFor(() => expect(view.container.querySelector('input[list="categories-0"]')).not.toBeNull());
  return view.container;
};

const savedRules = async () => {
  fireEvent.click(screen.getByRole('button', { name: /Αποθήκευση Αλλαγών/ }));
  await waitFor(() => expect(api.put).toHaveBeenCalled());
  return api.put.mock.calls[0][1].evaluation_rules;
};

describe('CoursesView: the Attendance rule', () => {
  beforeEach(async () => {
    localStorage.setItem('i18nextLng', 'el');
    await act(async () => {
      await i18n.changeLanguage('el');
    });
    api.getAll.mockReset();
    api.put.mockReset().mockResolvedValue({ data: {} });
    const totals = { periods_per_week: 0, scheduled_periods: 0, allowed_absences: null, participation_allowed_absences: null };
    api.preview.mockReset().mockResolvedValue({
      course_id: 5, before: totals, after: totals, enrolled_students: 0, has_attendance: false, changes: [],
    });
  });

  it('saves a rule stored as «Παρουσία» as Attendance, without the participation observations', async () => {
    await openCourse(course([{ category: 'Παρουσία', weight: 20 }, { category: 'Final Exam', weight: 80 }]));

    // Not Class Participation: no observation deductions are offered for it.
    expect(screen.queryByTestId('special-participation-weights')).toBeNull();
    expect(await savedRules()).toEqual([
      expect.objectContaining({ category: 'Attendance', weight: 20 }),
      expect.objectContaining({ category: 'Final Exam', weight: 80 }),
    ]);
  });

  it('saves a rule typed «Παρουσίες» as Attendance', async () => {
    const container = await openCourse(course([{ category: 'Final Exam', weight: 80 }, { category: '', weight: 20 }]));

    fireEvent.change(container.querySelector('input[list="categories-1"]')!, { target: { value: 'Παρουσίες' } });

    expect((await savedRules())[1]).toEqual(expect.objectContaining({ category: 'Attendance', weight: 20 }));
  });

  it('treats «Παρουσία και Συμμετοχή» as Class Participation, with its observations, and keeps its name', async () => {
    const container = await openCourse(course([{ category: 'Final Exam', weight: 80 }, { category: '', weight: 20 }]));

    fireEvent.change(container.querySelector('input[list="categories-1"]')!, { target: { value: 'Παρουσία και Συμμετοχή' } });

    expect(await screen.findByTestId('special-participation-weights')).toBeInTheDocument();
    const rules = await savedRules();
    // As typed: the final grade reads it as Class Participation by its words (the owner,
    // 2026-11-23: "Rename only standard names").
    expect(rules[1]).toEqual(expect.objectContaining({ category: 'Παρουσία και Συμμετοχή', weight: 20 }));
    expect(rules.map((r: { category: string }) => r.category)).toEqual(
      expect.arrayContaining(['No participation', 'Minor participation (mobile usage)', 'Minor participation'])
    );
  });

  it('saves a course unchanged keeps its own rule names, so a save never changes a grade', async () => {
    // Todo 77 point 2's review: a save turned «1η» and «2η Ενδιάμεση Εξέταση» into "Midterm Exam"
    // twice, and the templates' «… και Ενδιάμεση Εξέταση)» into a Midterm, changing final grades.
    const own = [
      { category: '1η Ενδιάμεση Εξέταση', weight: 15 },
      { category: '2η Ενδιάμεση Εξέταση', weight: 15 },
      { category: 'Συνεχής Αξιολόγηση (Εκπόνηση εργασιών στο σπίτι και Ενδιάμεση Εξέταση)', weight: 20 },
      { category: 'Αξιολόγηση εργαστηριακών μετρήσεων, εκτέλεση εργαστηριακής εργασίας', weight: 20 },
      { category: 'Τελική Εξέταση', weight: 30 },
    ];
    await openCourse(course(own));

    expect((await savedRules()).map((r: { category: string }) => r.category)).toEqual([
      '1η Ενδιάμεση Εξέταση',
      '2η Ενδιάμεση Εξέταση',
      'Συνεχής Αξιολόγηση (Εκπόνηση εργασιών στο σπίτι και Ενδιάμεση Εξέταση)',
      'Αξιολόγηση εργαστηριακών μετρήσεων, εκτέλεση εργαστηριακής εργασίας',
      // A standard name, in either language, is saved as that category.
      'Final Exam',
    ]);
  });

  it('offers the Attendance rule in the list, and names a stored one «Παρουσία»', async () => {
    const container = await openCourse(course([{ category: 'Attendance', weight: 20 }, { category: 'Final Exam', weight: 80 }]));

    const options = Array.from(container.querySelectorAll('#categories-0 option')).map((o) => o.getAttribute('label'));
    expect(options).toContain('Attendance / Παρουσία');
    expect(screen.getByText('Παρουσία', { selector: 'span.font-medium' })).toBeInTheDocument();
  });
});
