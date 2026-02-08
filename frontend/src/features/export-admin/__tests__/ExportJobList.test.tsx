/**
 * Tests for ExportJobList component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactElement } from 'react';
import i18n from 'i18next';
import { I18nextProvider } from 'react-i18next';
import ExportJobList from '../components/ExportJobList';
import { ExportJob } from '../types/export';
import { useExportJobs } from '../hooks/useExportAdmin';
import { DateTimeSettingsProvider } from '@/contexts/DateTimeSettingsContext';

// Initialize i18n for tests
i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: {
      exportAdmin: {
        filters: 'Filters',
        search: 'Search exports...',
        filterType: 'Filter by Type',
        filterStatus: 'Filter by Status',
        all: 'All',
        columns: {
          id: 'ID',
          type: 'Type',
          format: 'Format',
          status: 'Status',
          progress: 'Progress',
          size: 'Size',
          duration: 'Duration',
          created: 'Created',
          actions: 'Actions',
        },
        actions: {
          view: 'View Details',
          download: 'Download',
          rerun: 'Re-run',
          delete: 'Delete',
        },
        status: {
          pending: 'Pending',
          processing: 'Processing',
          completed: 'Completed',
          failed: 'Failed',
        },
        type: {
          students: 'Students',
          courses: 'Courses',
          grades: 'Grades',
        },
        format: {
          excel: 'EXCEL',
          csv: 'CSV',
          pdf: 'PDF',
        },
        noJobs: 'No export jobs found',
        showing: 'Showing',
        of: 'of',
        units: {
          bytes: 'B',
          kilobytes: 'KB',
          megabytes: 'MB',
          secondsShort: 's',
        },
        confirmDelete: 'Are you sure?',
        noFile: 'No file available',
      },
    },
  },
});

// Custom render function
const renderWithProviders = (
  ui: ReactElement,
  options?: { queryClient?: QueryClient }
) => {
  const testQueryClient =
    options?.queryClient ||
    new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={testQueryClient}>
      <I18nextProvider i18n={i18n}>
        <DateTimeSettingsProvider>{children}</DateTimeSettingsProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper });
};

// Mock hooks
vi.mock('../hooks/useExportAdmin', () => ({
  useExportJobs: vi.fn(() => ({
    data: {
      data: {
        items: [
          {
            id: '12345678-aaaa',
            export_type: 'students',
            export_format: 'excel',
            status: 'completed',
            created_at: '2026-01-31T10:00:00Z',
            progress_percent: 100,
            file_size_bytes: 1048576,
            duration_seconds: 1.5,
            file_path: '/exports/students-1.xlsx',
          },
          {
            id: '87654321-bbbb',
            export_type: 'courses',
            export_format: 'csv',
            status: 'processing',
            created_at: '2026-01-31T11:00:00Z',
            progress_percent: 45,
            file_size_bytes: 2048,
            duration_seconds: 2.2,
          },
        ] as ExportJob[],
        total: 2,
      },
    },
    isLoading: false,
    error: null,
  })),
  useDeleteExport: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useDownloadExport: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useRerunExport: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

describe('ExportJobList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders filters section', () => {
    renderWithProviders(<ExportJobList />);

    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderWithProviders(<ExportJobList />);

    const searchInput = screen.getByPlaceholderText('Search exports...');
    expect(searchInput).toBeInTheDocument();
  });

  it('renders filter dropdowns', () => {
    renderWithProviders(<ExportJobList />);

    const comboBoxes = screen.getAllByRole('combobox');
    expect(comboBoxes).toHaveLength(2);
    expect(screen.getAllByText('All').length).toBeGreaterThan(0);
  });

  it('displays table headers', () => {
    renderWithProviders(<ExportJobList />);

    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Format')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('displays export job rows', () => {
    renderWithProviders(<ExportJobList />);

    expect(screen.getByText('12345678')).toBeInTheDocument();
    expect(screen.getByText('Students')).toBeInTheDocument();
    expect(screen.getByText('EXCEL')).toBeInTheDocument();

    expect(screen.getByText('87654321')).toBeInTheDocument();
    expect(screen.getByText('Courses')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
  });

  it('displays progress bars with correct percentages', () => {
    renderWithProviders(<ExportJobList />);

    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('displays status badges', () => {
    renderWithProviders(<ExportJobList />);

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('filters jobs by search query', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExportJobList />);

    const searchInput = screen.getByPlaceholderText('Search exports...');
    await user.type(searchInput, 'students');

    await waitFor(() => {
      expect(screen.getByText('Students')).toBeInTheDocument();
    });
  });

  it('opens dropdown menu on actions click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExportJobList />);

    const row = screen.getByText('Students').closest('tr');
    if (!row) throw new Error('Row not found');
    const actionButton = within(row).getAllByRole('button')[0];
    await user.click(actionButton);

    await waitFor(() => {
      expect(screen.getByText('View Details')).toBeInTheDocument();
      expect(screen.getByText('Download')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  it('shows loading skeleton when data is loading', () => {
    vi.mocked(useExportJobs)
      .mockReturnValueOnce({
        data: null,
        isLoading: true,
        error: null,
      })
      .mockReturnValueOnce({
        data: null,
        isLoading: true,
        error: null,
      });

    renderWithProviders(<ExportJobList />);

    expect(screen.queryByPlaceholderText('Search exports...')).not.toBeInTheDocument();
  });

  it('shows empty state when no jobs found', () => {
    vi.mocked(useExportJobs)
      .mockReturnValueOnce({
        data: { data: { items: [], total: 0 } },
        isLoading: false,
        error: null,
      })
      .mockReturnValueOnce({
        data: { data: { items: [], total: 0 } },
        isLoading: false,
        error: null,
      });

    renderWithProviders(<ExportJobList />);

    expect(screen.getByText('No export jobs found')).toBeInTheDocument();
  });
});
