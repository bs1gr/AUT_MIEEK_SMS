import React from 'react';
import { render, screen, within, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';
import { LanguageProvider } from '@/LanguageContext';
import type { Student } from '@/types';
import StudentsView from './StudentsView';

vi.mock('framer-motion', () => {
  const motion = new Proxy({}, {
    get: (_target, prop: string) =>
      ({ children, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) =>
        React.createElement(prop, props, children),
  });
  return { motion, AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</> };
});

vi.mock('@/api/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/api')>()),
  coursesAPI: { getAll: vi.fn().mockResolvedValue([]) },
}));

// The card itself is covered by StudentCard.test; here only which students show, and in what order.
vi.mock('./StudentCard', () => ({
  default: ({ student }: { student: Student }) => <li data-testid="student-row">{student.last_name}</li>,
}));

const student = (id: number, last_name: string, academic_year?: string, class_division?: string, is_active = true): Student => ({
  id,
  student_id: `S${id}`,
  first_name: 'X',
  last_name,
  email: `s${id}@example.com`,
  enrollment_date: '2025-09-01',
  is_active,
  academic_year,
  class_division,
});

const students: Student[] = [
  student(1, 'Papadopoulos', 'B', 'B1'),
  student(2, 'Andreou', 'A', 'A2'),
  student(3, 'Georgiou', 'A', 'A1'),
  student(4, 'Christou'),
  student(6, 'Ioannou', undefined, 'A5'),
  student(5, 'Demetriou', 'A', 'A10', false),
];

async function renderView(language: 'en' | 'el' = 'en') {
  localStorage.setItem('i18nextLng', language);
  await act(async () => {
    await i18n.changeLanguage(language);
  });
  render(
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <MemoryRouter>
          <StudentsView
            students={students}
            loading={false}
            setShowAddModal={vi.fn()}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onViewProfile={vi.fn()}
          />
        </MemoryRouter>
      </LanguageProvider>
    </I18nextProvider>
  );
}

const rows = () => screen.queryAllByTestId('student-row').map((row) => row.textContent);
const choose = (testId: string, value: string) => fireEvent.change(screen.getByTestId(testId), { target: { value } });
const optionLabels = (testId: string) =>
  within(screen.getByTestId(testId)).getAllByRole('option').map((option) => option.textContent);

describe('StudentsView filters and sorting', () => {
  beforeEach(() => localStorage.clear());

  it('keeps the active-students default: active listed by name, inactive collapsed', async () => {
    await renderView();
    expect(rows()).toEqual(['Andreou', 'Christou', 'Georgiou', 'Ioannou', 'Papadopoulos']);
    expect(screen.getByText(/Inactive Students \(1\)/)).toBeInTheDocument();
  });

  it('offers the values present, naturally ordered, plus "Not set"', async () => {
    await renderView();
    expect(optionLabels('student-year-filter')).toEqual(['All years', 'Class A', 'Class B', 'Not set']);
    expect(optionLabels('student-division-filter')).toEqual(['All divisions', 'A1', 'A2', 'A5', 'A10', 'B1', 'Not set']);
  });

  it('filters by academic year, by class division, and by a missing value', async () => {
    await renderView();
    choose('student-year-filter', 'B');
    expect(rows()).toEqual(['Papadopoulos']);

    choose('student-year-filter', '');
    choose('student-division-filter', 'A2');
    expect(rows()).toEqual(['Andreou']);

    choose('student-division-filter', '__not_set__');
    expect(rows()).toEqual(['Christou']);

    choose('student-division-filter', '');
    choose('student-year-filter', '__not_set__');
    expect(rows()).toEqual(['Christou', 'Ioannou']);
  });

  it('applies the filters to inactive students as well', async () => {
    await renderView();
    choose('student-division-filter', 'A10');
    expect(rows()).toEqual([]);
    expect(screen.getByText(/Inactive Students \(1\)/)).toBeInTheDocument();
  });

  it('sorts by class division or by academic year, students without a value last', async () => {
    await renderView();
    choose('student-sort-select', 'division');
    expect(rows()).toEqual(['Georgiou', 'Andreou', 'Ioannou', 'Papadopoulos', 'Christou']);

    // Year first (A, B, then none), then division: Ioannou has a division but no year.
    choose('student-sort-select', 'year');
    expect(rows()).toEqual(['Georgiou', 'Andreou', 'Papadopoulos', 'Ioannou', 'Christou']);
  });

  it('clears filters and sorting in one step', async () => {
    await renderView();
    expect(screen.queryByTestId('student-filters-clear')).not.toBeInTheDocument();
    choose('student-year-filter', 'A');
    choose('student-sort-select', 'division');
    fireEvent.click(screen.getByTestId('student-filters-clear'));
    expect(rows()).toEqual(['Andreou', 'Christou', 'Georgiou', 'Ioannou', 'Papadopoulos']);
    expect(screen.queryByTestId('student-filters-clear')).not.toBeInTheDocument();
  });

  it('shows the controls in Greek', async () => {
    await renderView('el');
    expect(optionLabels('student-year-filter')).toEqual(['Όλες οι τάξεις', 'Τάξη Α', 'Τάξη Β', 'Χωρίς τιμή']);
    expect(optionLabels('student-sort-select')).toEqual(['Όνομα', 'Τμήμα τάξης', 'Τάξη']);
    expect(screen.getByTestId('student-filters')).toHaveTextContent('Τμήμα Τάξης');
  });
});
