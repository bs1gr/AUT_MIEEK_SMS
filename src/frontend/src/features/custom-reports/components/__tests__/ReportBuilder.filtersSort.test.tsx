import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportBuilder, { canonicalOperator, sortRulesFrom } from '../ReportBuilder';

// Plan todo 75 stage 5: the builder saves its filters and its sort as lists. It saved them as
// dicts: one filter per field kept (the last), and a sort the report generator never read.
const createReportMutateAsync = vi.fn();
const generateAndDownload = vi.hoisted(() => vi.fn());

vi.mock('../../utils/generateAndDownload', () => ({
  generateAndDownload,
  ReportGenerationError: class extends Error {},
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue || key,
    i18n: { language: 'en' },
  }),
}));
vi.mock('@/api/api', () => ({ coursesAPI: { getAll: vi.fn().mockResolvedValue([]) } }));
vi.mock('@/hooks/useCustomReports', () => ({
  useCreateReport: () => ({ mutateAsync: createReportMutateAsync, isPending: false }),
  useUpdateReport: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCustomReport: () => ({ data: null }),
}));
vi.mock('../FieldSelector', () => ({ default: () => React.createElement('div') }));
vi.mock('../FilterBuilder', () => ({ default: () => React.createElement('div') }));
vi.mock('../SortBuilder', () => ({ default: () => React.createElement('div') }));
vi.mock('../../utils/templateLocalization', () => ({
  getLocalizedTemplateText: (template: { name?: string; description?: string }) => ({
    name: template.name || '',
    description: template.description || '',
  }),
}));

const saveWith = async (initialData: Record<string, unknown>) => {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ReportBuilder initialData={{ description: '', default_export_format: 'csv', is_system: false, ...initialData }} />
    </QueryClientProvider>
  );
  for (let step = 0; step < 3; step += 1) fireEvent.click(screen.getByTestId('report-next-step'));
  fireEvent.click(screen.getByTestId('report-save-btn'));
  await waitFor(() => expect(createReportMutateAsync).toHaveBeenCalledTimes(1));
  return createReportMutateAsync.mock.calls[0][0];
};

describe('ReportBuilder: filters and sort', () => {
  beforeEach(() => {
    createReportMutateAsync.mockReset();
    createReportMutateAsync.mockResolvedValue({ id: 1 });
  });

  it('saves two filters on one field and a sort of two rules, as lists', async () => {
    const payload = await saveWith({
      name: 'Middle band',
      report_type: 'student',
      fields: ['first_name', 'last_name', 'gpa'],
      filters: [
        { field: 'gpa', operator: 'gte', value: 60 },
        { field: 'gpa', operator: 'lt', value: 80 },
      ],
      sort_by: [
        { field: 'gpa', order: 'desc' },
        { field: 'last_name', order: 'asc' },
      ],
    });

    expect(payload.filters).toEqual([
      { field: 'gpa', operator: 'greater_than_or_equal', value: 60 },
      { field: 'gpa', operator: 'less_than', value: 80 },
    ]);
    expect(payload.sort_by).toEqual([
      { field: 'gpa', order: 'desc' },
      { field: 'last_name', order: 'asc' },
    ]);
  });

  it('reads an older report: a dict of filters and the {field, direction} sort', async () => {
    const payload = await saveWith({
      name: 'Older',
      report_type: 'student',
      fields: ['first_name', 'last_name'],
      filters: { last_name: { operator: 'starts_with', value: 'Α' } },
      sort_by: { field: 'last_name', direction: 'desc' },
    });

    expect(payload.filters).toEqual([{ field: 'last_name', operator: 'starts_with', value: 'Α' }]);
    expect(payload.sort_by).toEqual([{ field: 'last_name', order: 'desc' }]);
  });

  it('saves, then makes the file and downloads it, before leaving the builder', async () => {
    generateAndDownload.mockResolvedValue('report_1.pdf');
    const onSuccess = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ReportBuilder
          onSuccess={onSuccess}
          initialData={{ name: 'Now', report_type: 'student', fields: ['first_name'], default_export_format: 'excel', is_system: false }}
        />
      </QueryClientProvider>
    );
    for (let step = 0; step < 3; step += 1) fireEvent.click(screen.getByTestId('report-next-step'));

    fireEvent.click(screen.getByTestId('report-save-download-btn'));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(1));
    expect(createReportMutateAsync).toHaveBeenCalledTimes(1);
    expect(generateAndDownload).toHaveBeenCalledWith(1, { exportFormat: 'excel', language: 'en' });
  });

  it('saves no filters and no sort when there are none', async () => {
    const payload = await saveWith({ name: 'Plain', report_type: 'student', fields: ['first_name'], filters: [], sort_by: [] });

    expect(payload.filters).toBeUndefined();
    expect(payload.sort_by).toBeUndefined();
  });
});

describe('sortRulesFrom and canonicalOperator', () => {
  it('reads every saved shape of a sort', () => {
    expect(sortRulesFrom([{ field: 'gpa', order: 'DESC' }, { field: 'x', direction: 'desc' }])).toEqual([
      { field: 'gpa', order: 'desc' },
      { field: 'x', order: 'desc' },
    ]);
    expect(sortRulesFrom({ field: 'last_name', direction: 'asc' })).toEqual([{ field: 'last_name', order: 'asc' }]);
    expect(sortRulesFrom({ last_name: 'desc', first_name: 'asc' })).toEqual([
      { field: 'last_name', order: 'desc' },
      { field: 'first_name', order: 'asc' },
    ]);
    expect(sortRulesFrom(null)).toEqual([]);
  });

  it('names the operators as the filter step offers them', () => {
    expect(['gte', 'lt', 'eq', 'LTE', undefined, 'between'].map(canonicalOperator)).toEqual([
      'greater_than_or_equal',
      'less_than',
      'equals',
      'less_than_or_equal',
      'equals',
      'between',
    ]);
  });
});
