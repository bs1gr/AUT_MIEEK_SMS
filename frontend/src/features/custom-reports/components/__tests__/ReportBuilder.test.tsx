import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportBuilder from '../ReportBuilder';

const createReportMutateAsync = vi.fn();
const updateReportMutateAsync = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue || key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/hooks/useCustomReports', () => ({
  useCreateReport: () => ({
    mutateAsync: createReportMutateAsync,
    isPending: false,
  }),
  useUpdateReport: () => ({
    mutateAsync: updateReportMutateAsync,
    isPending: false,
  }),
  useCustomReport: () => ({
    data: null,
  }),
}));

vi.mock('../FieldSelector', () => ({
  default: () => React.createElement('div', { 'data-testid': 'field-selector-stub' }),
}));

vi.mock('../FilterBuilder', () => ({
  default: () => React.createElement('div', { 'data-testid': 'filter-builder-stub' }),
}));

vi.mock('../SortBuilder', () => ({
  default: () => React.createElement('div', { 'data-testid': 'sort-builder-stub' }),
}));

vi.mock('../../utils/templateLocalization', () => ({
  getLocalizedTemplateText: (template: { name?: string; description?: string }) => ({
    name: template.name || '',
    description: template.description || '',
  }),
}));

describe('ReportBuilder', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    createReportMutateAsync.mockReset();
    updateReportMutateAsync.mockReset();
    createReportMutateAsync.mockResolvedValue({ id: 123 });
  });

  it('normalizes legacy grade fields and relational id before save', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ReportBuilder
          initialData={{
            name: 'Legacy Grade Template',
            description: 'legacy payload',
            report_type: 'grade',
            default_export_format: 'csv',
            fields: ['id', 'grade_value', 'course_id'],
            filters: [],
            sort_by: [],
            is_system: false,
          }}
        />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByTestId('report-next-step'));
    fireEvent.click(screen.getByTestId('report-next-step'));
    fireEvent.click(screen.getByTestId('report-next-step'));
    fireEvent.click(screen.getByTestId('report-save-btn'));

    await waitFor(() => {
      expect(createReportMutateAsync).toHaveBeenCalledTimes(1);
    });

    const payload = createReportMutateAsync.mock.calls[0][0];
    expect(payload.report_type).toBe('grade');
    expect(payload.export_format).toBe('csv');
    expect(payload.fields.fields).toEqual(['student_id', 'grade', 'course_id']);
    expect(payload.fields.columns).toEqual([
      { key: 'student_id', label: 'student_id' },
      { key: 'grade', label: 'grade' },
      { key: 'course_id', label: 'course_id' },
    ]);
  });

  it('normalizes student attendance templates to user-facing student identifiers before save', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ReportBuilder
          initialData={{
            name: 'Attendance Summary - All Students',
            description: 'attendance payload',
            report_type: 'student',
            default_export_format: 'pdf',
            fields: ['id', 'first_name', 'last_name', 'attendance_rate'],
            filters: [{ field: 'attendance_rate', operator: 'lt', value: 80 }],
            sort_by: [{ field: 'id', order: 'asc' }],
            is_system: false,
          }}
        />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByTestId('report-next-step'));
    fireEvent.click(screen.getByTestId('report-next-step'));
    fireEvent.click(screen.getByTestId('report-next-step'));
    fireEvent.click(screen.getByTestId('report-save-btn'));

    await waitFor(() => {
      expect(createReportMutateAsync).toHaveBeenCalledTimes(1);
    });

    const payload = createReportMutateAsync.mock.calls[0][0];
    expect(payload.report_type).toBe('student');
    expect(payload.fields.fields).toEqual(['student_id', 'first_name', 'last_name', 'attendance_rate']);
    expect(payload.fields.columns).toEqual([
      { key: 'student_id', label: 'student_id' },
      { key: 'first_name', label: 'first_name' },
      { key: 'last_name', label: 'last_name' },
      { key: 'attendance_rate', label: 'attendance_rate' },
    ]);
  });
});
