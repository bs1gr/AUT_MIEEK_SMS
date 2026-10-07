import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n/config';
import { LanguageProvider, useLanguage } from '@/LanguageContext';
import { AttendanceNotRecorded, StudentsNeedingAttention } from '../DashboardAttentionPanels';

const get = vi.hoisted(() => vi.fn());
vi.mock('@/api/api', () => ({ apiClient: { get }, extractAPIResponseData: (d: unknown) => d }));

const student = (id: number, name: string, extra: Record<string, unknown>) => ({
  id, student_id: `S${id}`, name, academic_year: 'A', class_division: 'A1', courses: 2,
  average_final_grade: 60, failing_courses: [], attendance_rate: 90, absence_status: 'ok',
  participation_forfeited: [], at_risk: false, ...extra,
});

const overview = {
  students: [
    student(1, 'Anna Alpha', {}),
    student(2, 'Bob Beta', { failing_courses: ['Physics'], at_risk: true, absence_status: 'warning' }),
    student(3, 'Cleo Gamma', { participation_forfeited: ['Electronics'], at_risk: true }),
  ],
};
const gaps = {
  from: '2026-10-01',
  to: '2026-10-07',
  courses_checked: 2,
  missing: [{ id: 9, course_code: 'AUT0105', course_name: 'Electronics', missing_dates: ['2026-10-05', '2026-10-07'] }],
  unscheduled: [{ id: 4, course_code: 'X', course_name: 'No schedule' }],
};

const Panels = () => {
  const { t } = useLanguage();
  return (
    <>
      <StudentsNeedingAttention t={t} />
      <AttendanceNotRecorded t={t} formatDate={(d) => d.split('-').reverse().join('/')} />
    </>
  );
};

const renderPanels = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <MemoryRouter>
            <Panels />
          </MemoryRouter>
        </QueryClientProvider>
      </LanguageProvider>
    </I18nextProvider>
  );

describe('Dashboard attention panels', () => {
  beforeEach(async () => {
    // LanguageProvider takes the language from localStorage first.
    localStorage.setItem('i18nextLng', 'en');
    await i18n.changeLanguage('en');
    get.mockReset();
    get.mockImplementation(async (url: string) => {
      if (url === '/analytics/overview') return { data: overview };
      if (url === '/analytics/attendance-gaps') return { data: gaps };
      throw new Error(url);
    });
  });

  it('lists only students at risk, with the reasons', async () => {
    renderPanels();
    const panel = await screen.findByTestId('dashboard-needs-attention');
    expect(await within(panel).findByText('Students Needing Attention (2)')).toBeInTheDocument();
    expect(within(panel).getByText('Bob Beta')).toBeInTheDocument();
    expect(within(panel).getByText('Below 50%: Physics')).toBeInTheDocument();
    expect(within(panel).getByText('Class Participation lost: Electronics')).toBeInTheDocument();
    expect(within(panel).queryByText('Anna Alpha')).toBeNull();
    // Failing comes before a lost Class Participation share.
    const names = within(panel).getAllByRole('listitem').map((li) => li.querySelector('p')?.textContent);
    expect(names).toEqual(['Bob Beta', 'Cleo Gamma']);
  });

  it('lists the scheduled days without attendance', async () => {
    renderPanels();
    const panel = await screen.findByTestId('dashboard-attendance-gaps');
    expect(await within(panel).findByText('Attendance Not Recorded (1)')).toBeInTheDocument();
    expect(within(panel).getByText('05/10/2026, 07/10/2026')).toBeInTheDocument();
    expect(within(panel).getByText(/from 01\/10\/2026 to 07\/10\/2026/)).toBeInTheDocument();
    expect(within(panel).getByText('Courses without a teaching schedule cannot be checked: 1')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/analytics/attendance-gaps', { params: { days: 7 } });
  });

  it('is fully translated in Greek', async () => {
    localStorage.setItem('i18nextLng', 'el');
    await i18n.changeLanguage('el');
    const { container } = renderPanels();
    await screen.findByText('Σπουδαστές που Χρειάζονται Προσοχή (2)');
    await screen.findByText('Παρουσίες που Δεν Καταχωρίστηκαν (1)');
    expect(container.textContent).not.toMatch(/dashboard\.|analytics\./);
  });
});
