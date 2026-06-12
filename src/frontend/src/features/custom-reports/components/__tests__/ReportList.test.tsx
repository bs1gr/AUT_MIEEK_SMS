import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportList from '../ReportList';

const mocks = vi.hoisted(() => ({
  getGeneratedReports: vi.fn(),
  mutate: vi.fn(),
}));

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
      i18n: { language: 'en' },
    }),
  };
});

vi.mock('@/contexts/DateTimeSettingsContext', () => ({
  useDateTimeFormatter: () => ({
    formatDateTime: () => '2026-03-16 10:00:00',
  }),
}));

vi.mock('@/api/customReportsAPI', () => ({
  customReportsAPI: {
    getGeneratedReports: (...args: unknown[]) => mocks.getGeneratedReports(...args),
  },
  reportTemplatesAPI: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    importDefaults: vi.fn(),
  },
}));

vi.mock('@/hooks/useCustomReports', async () => {
  const actual = await vi.importActual('@/hooks/useCustomReports');

  return {
    ...actual,
    useCustomReports: () => ({
      data: [
        {
          id: 101,
          name: 'Attendance Export',
          description: 'Export attendance history',
          report_type: 'attendance',
          export_format: 'pdf',
          created_at: '2026-03-16T10:00:00Z',
          email_recipients: [],
        },
      ],
      isLoading: false,
      error: null,
    }),
    useCreateTemplate: () => ({ mutate: mocks.mutate, isPending: false }),
    useDeleteReport: () => ({ mutate: mocks.mutate, mutateAsync: vi.fn(), isPending: false }),
    useGenerateReport: () => ({ mutate: mocks.mutate, isPending: false }),
    useDownloadReport: () => ({ mutate: mocks.mutate, isPending: false }),
    useDeleteGeneratedReport: () => ({ mutate: mocks.mutate, isPending: false }),
    useImportDefaultTemplates: () => ({ mutate: mocks.mutate, isPending: false }),
  };
});

describe('ReportList superseded history toggle', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mocks.mutate.mockReset();
    mocks.getGeneratedReports.mockReset();

    const activeOnly = [
      {
        id: 1,
        report_id: 101,
        status: 'completed',
        generated_at: '2026-03-16T10:00:00Z',
        file_path: 'exports/report_active.pdf',
        error_message: null,
      },
    ];

    const withSuperseded = [
      ...activeOnly,
      {
        id: 2,
        report_id: 101,
        status: 'superseded',
        generated_at: '2026-03-16T09:00:00Z',
        file_path: 'exports/report_superseded.pdf',
        error_message: null,
      },
    ];

    mocks.getGeneratedReports.mockImplementation(
      async (_reportId: number, options?: { include_superseded?: boolean }) =>
        options?.include_superseded ? withSuperseded : activeOnly
    );
  });

  it('flips include_superseded query and updates visible list when toggle is enabled', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ReportList />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByTitle('viewGeneratedReports'));

    await waitFor(() => {
      expect(mocks.getGeneratedReports).toHaveBeenCalledWith(
        101,
        expect.objectContaining({ include_superseded: false })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('report_active.pdf')).toBeTruthy();
    });
    expect(screen.queryByText('report_superseded.pdf')).toBeNull();

    fireEvent.click(screen.getByLabelText('showSupersededHistory'));

    await waitFor(() => {
      expect(mocks.getGeneratedReports).toHaveBeenCalledWith(
        101,
        expect.objectContaining({ include_superseded: true })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('report_superseded.pdf')).toBeTruthy();
    });
    expect(screen.getByText('SUPERSEDED')).toBeTruthy();
  });
});
