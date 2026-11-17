import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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

vi.mock('./StudentCard', () => ({
  default: ({ student }: { student: Student }) => <li data-testid="student-row">{student.last_name}</li>,
}));

const earlier: Student = {
  id: 1,
  student_id: 'S1',
  first_name: 'Anna',
  last_name: 'Andreou',
  email: 's1@example.com',
  enrollment_date: '2025-09-01',
  is_active: true,
};

type ViewProps = Partial<React.ComponentProps<typeof StudentsView>>;

async function renderView(props: ViewProps, language: 'en' | 'el' = 'en') {
  localStorage.setItem('i18nextLng', language);
  await act(async () => {
    await i18n.changeLanguage(language);
  });
  return render(
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <MemoryRouter>
          <StudentsView
            students={[]}
            loading={false}
            setShowAddModal={vi.fn()}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onViewProfile={vi.fn()}
            {...props}
          />
        </MemoryRouter>
      </LanguageProvider>
    </I18nextProvider>
  );
}

// Until November 2026 the Students page said "No students found" when its list could not be
// loaded: no message, and nothing to try again with.
describe('StudentsView: a list that could not be loaded', () => {
  it('says so and offers to try again, instead of "No students found"', async () => {
    const onRetry = vi.fn();
    await renderView({ loadFailed: true, onRetry });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('The list of students could not be loaded.');
    expect(screen.queryByText('No students found')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('says it in Greek on a Greek page', async () => {
    await renderView({ loadFailed: true, onRetry: vi.fn() }, 'el');

    expect(screen.getByRole('alert')).toHaveTextContent('Η λίστα των σπουδαστών δεν φορτώθηκε.');
    expect(screen.getByRole('button', { name: 'Δοκιμάστε ξανά' })).toBeInTheDocument();
    expect(screen.queryByText('Δεν βρέθηκαν σπουδαστές')).not.toBeInTheDocument();
  });

  it('shows the placeholders, not the message, while the list is asked for again', async () => {
    await renderView({ loadFailed: true, loading: true, onRetry: vi.fn() });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('No students found')).not.toBeInTheDocument();
  });

  it('keeps the students of an earlier load on the screen under the message', async () => {
    await renderView({ loadFailed: true, onRetry: vi.fn(), students: [earlier] });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getAllByTestId('student-row').map((row) => row.textContent)).toEqual(['Andreou']);
  });

  it('still says "No students found" for a list that loaded and is empty', async () => {
    await renderView({});

    expect(screen.getByText('No students found')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });
});
