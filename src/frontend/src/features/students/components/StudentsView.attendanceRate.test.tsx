import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';
import { LanguageProvider } from '@/LanguageContext';
import type { Student } from '@/types';
import StudentsView from './StudentsView';

vi.mock('framer-motion', () => {
  const motion = new Proxy(
    {},
    {
      get:
        (_target, prop: string) =>
        ({ children, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) =>
          React.createElement(prop, props, children),
    }
  );
  return { motion, AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</> };
});

vi.mock('@/api/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/api')>()),
  coursesAPI: { getAll: vi.fn().mockResolvedValue([]) },
  attendanceAPI: {
    getByStudent: vi.fn().mockResolvedValue(
      ['Present', 'Late', 'Late', 'Excused'].map((status, i) => ({ id: i + 1, student_id: 1, course_id: 9, status }))
    ),
  },
  gradesAPI: { getByStudent: vi.fn().mockResolvedValue([]) },
  analyticsAPI: { getAllCoursesSummary: vi.fn().mockResolvedValue(null) },
}));

// The card itself is not what this is about: it shows the rate the page worked out.
vi.mock('./StudentCard', () => ({
  default: ({
    student,
    stats,
    onToggleExpand,
  }: {
    student: Student;
    stats?: { attendance?: { attendanceRate?: string } };
    onToggleExpand: (id: number) => void;
  }) => (
    <li>
      <button type="button" onClick={() => onToggleExpand(student.id)}>
        {student.last_name}
      </button>
      <span data-testid="card-attendance-rate">{stats?.attendance?.attendanceRate ?? ''}</span>
    </li>
  ),
}));

const student: Student = {
  id: 1,
  student_id: 'S1',
  first_name: 'Anna',
  last_name: 'Andreou',
  email: 's1@example.com',
  enrollment_date: '2025-09-01',
  is_active: true,
};

describe('StudentsView: the attendance rate of a student', () => {
  it('counts Present and Late as attended, Excused as an absence (todo 77)', async () => {
    // Present, Late, Late, Excused: 3 of 4. It counted Present and Excused: 50.
    localStorage.setItem('i18nextLng', 'en');
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    render(
      <I18nextProvider i18n={i18n}>
        <LanguageProvider>
          <MemoryRouter>
            <StudentsView
              students={[student]}
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

    fireEvent.click(screen.getByRole('button', { name: 'Andreou' }));

    expect(await screen.findByText('75.0')).toBeInTheDocument();
  });
});
