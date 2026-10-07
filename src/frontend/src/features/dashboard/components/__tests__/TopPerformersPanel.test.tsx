import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n/config';
import { LanguageProvider, useLanguage } from '@/LanguageContext';
import TopPerformersPanel from '../TopPerformersPanel';

const get = vi.hoisted(() => vi.fn());
vi.mock('@/api/api', () => ({ apiClient: { get }, extractAPIResponseData: (d: unknown) => d }));

const student = (id: number, name: string, final: number | null, attendance: number | null, exams: number | null, extra = {}) => ({
  id, student_id: `S${id}`, name, academic_year: 'A', class_division: 'A1', courses: 2, credits: 6,
  average_final_grade: final, exam_average: exams, attendance_rate: attendance, failing_courses: [],
  absence_status: 'ok', participation_forfeited: [], at_risk: false, ...extra,
});

const students = [
  student(1, 'Anna Alpha', 72, 95, 60),
  student(2, 'Bob Beta', 88, 70, null),
  student(3, 'Cleo Gamma', null, 100, null), // nothing graded yet
  student(4, 'Dora Delta', 45, 80, 40, { failing_courses: ['Physics'] }),
];

const Panel = () => {
  const { t } = useLanguage();
  return <TopPerformersPanel t={t} onExportGrades={vi.fn()} />;
};

const renderPanel = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <Panel />
        </QueryClientProvider>
      </LanguageProvider>
    </I18nextProvider>
  );

const names = (panel: HTMLElement) => within(panel).getAllByRole('listitem').map((li) => li.querySelector('p')?.textContent);

describe('TopPerformersPanel', () => {
  beforeEach(async () => {
    localStorage.setItem('i18nextLng', 'en');
    await i18n.changeLanguage('en');
    get.mockReset().mockResolvedValue({ data: { students } });
  });

  it('ranks by average final grade, leaving out students with nothing graded', async () => {
    renderPanel();
    const panel = await screen.findByTestId('top-performers');
    await within(panel).findByText('Bob Beta');
    expect(names(panel)).toEqual(['Bob Beta', 'Anna Alpha', 'Dora Delta']);
    expect(within(panel).getByText('88.0%')).toBeInTheDocument();
    expect(within(panel).getByText('Below 50%: Physics')).toBeInTheDocument();
    expect(within(panel).getByText('Final 88.0% · Attendance 70.0% · Exams —')).toBeInTheDocument();
    expect(within(panel).queryByText(/0\.0% · F|\/20/)).toBeNull();
    expect(get).toHaveBeenCalledWith('/analytics/overview', { params: {} });
  });

  it('ranks by attendance and by exams', async () => {
    renderPanel();
    const panel = await screen.findByTestId('top-performers');
    await within(panel).findByText('Bob Beta');

    fireEvent.click(within(panel).getByRole('tab', { name: 'Attendance' }));
    expect(names(panel)).toEqual(['Cleo Gamma', 'Anna Alpha', 'Dora Delta', 'Bob Beta']);

    fireEvent.click(within(panel).getByRole('tab', { name: 'Exams' }));
    expect(names(panel)).toEqual(['Anna Alpha', 'Dora Delta']);
  });

  it('says so when nobody is graded yet', async () => {
    get.mockResolvedValue({ data: { students: [student(3, 'Cleo Gamma', null, 100, null)] } });
    renderPanel();
    expect(await screen.findByText('No active student has a graded course yet.')).toBeInTheDocument();
  });

  it('is translated in Greek', async () => {
    localStorage.setItem('i18nextLng', 'el');
    await i18n.changeLanguage('el');
    const { container } = renderPanel();
    await screen.findByText('Bob Beta');
    expect(screen.getByRole('tab', { name: 'Τελικός βαθμός' })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/dashboard\.|analytics\./);
  });
});
