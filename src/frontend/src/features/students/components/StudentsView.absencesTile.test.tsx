/**
 * The Students page card with its real tiles (plan todo 77): the absences over the attendance
 * rate are Absent and Excused, as the rate and the ΜΙΕΕΚ limit count them, and every count takes
 * a status whatever its case, as the rate does.
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';
import { LanguageProvider } from '@/LanguageContext';
import { DateTimeSettingsProvider } from '@/contexts/DateTimeSettingsContext';
import { attendanceAPI } from '@/api/api';
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
  attendanceAPI: { getByStudent: vi.fn() },
  gradesAPI: { getByStudent: vi.fn().mockResolvedValue([]) },
  analyticsAPI: { getAllCoursesSummary: vi.fn().mockResolvedValue(null) },
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

const openCard = async (lang: 'en' | 'el', statuses: string[]) => {
  vi.mocked(attendanceAPI.getByStudent).mockResolvedValue(
    statuses.map((status, i) => ({ id: i + 1, student_id: 1, course_id: 9, status })) as never
  );
  localStorage.setItem('i18nextLng', lang);
  await act(async () => {
    await i18n.changeLanguage(lang);
  });
  render(
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <DateTimeSettingsProvider>
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
        </DateTimeSettingsProvider>
      </LanguageProvider>
    </I18nextProvider>
  );
  fireEvent.click(screen.getByTestId('student-expand-btn-1'));
  return screen.findByTestId('student-card-absences');
};

// The row of the card's attendance details whose label is `label`, e.g. "Present:1".
const detailRow = (label: string) => screen.getByText(`${label}:`).parentElement!;

describe('Students page card: the absences tile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('counts Absent and Excused as the absences over the rate', async () => {
    // Present 3, Excused 1: 1 absence of 4 over 75 % (it read 0/4 over 75 %).
    const tile = await openCard('en', ['Present', 'Present', 'Present', 'Excused']);

    expect(tile).toHaveTextContent('1/4');
    expect(tile.parentElement!).toHaveTextContent('Absences');
    expect(tile.parentElement!).toHaveTextContent('75.0%');
  });

  it('says the same in Greek', async () => {
    const tile = await openCard('el', ['Present', 'Late', 'Late', 'Excused']);

    expect(tile).toHaveTextContent('1/4');
    expect(tile.parentElement!).toHaveTextContent('Απουσίες');
    expect(tile.parentElement!).toHaveTextContent('75.0%');
  });

  it('counts every status whatever its case, as the rate does', async () => {
    // A semester file can bring "present", "late", "Absent " (the API itself takes only
    // "Present"...); the rate took them and the counts beside it did not.
    const tile = await openCard('en', ['present', 'late', 'Absent ']);

    expect(tile).toHaveTextContent('1/3');
    expect(tile.parentElement!).toHaveTextContent('66.7%');
    expect(detailRow('Present')).toHaveTextContent('Present:1');
    expect(detailRow('Late')).toHaveTextContent('Late:1');
    expect(detailRow('Absent')).toHaveTextContent('Absent:1');
  });
});
