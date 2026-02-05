/**
 * Integration tests for export-admin flows
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactElement } from 'react';
import i18n from 'i18next';
import { I18nextProvider } from 'react-i18next';
import ExportDashboard from '../components/ExportDashboard';

const mockDeleteExport = vi.fn();
const mockDownloadExport = vi.fn();
const mockRerunExport = vi.fn();
const mockCreateSchedule = vi.fn();
const mockDeleteSchedule = vi.fn();
const mockToggleSchedule = vi.fn();

vi.mock('../hooks/useExportAdmin', () => ({
  useExportJobs: vi.fn(() => ({
    data: {
      data: {
        items: [
          {
            id: 'job-1',
            export_type: 'students',
            export_format: 'excel',
            status: 'completed',
            created_at: '2026-01-31T10:00:00Z',
            progress_percent: 100,
            file_size_bytes: 1048576,
            duration_seconds: 1.5,
            file_path: '/exports/students-1.xlsx',
          },
        ],
        total: 1,
      },
    },
    isLoading: false,
    error: null,
  })),
  useExportJob: vi.fn(() => ({
    data: {
      id: 'job-1',
      export_type: 'students',
      export_format: 'excel',
      status: 'completed',
      created_at: '2026-01-31T10:00:00Z',
      progress_percent: 100,
      file_size_bytes: 1048576,
      duration_seconds: 1.5,
      file_path: '/exports/students-1.xlsx',
    },
    isLoading: false,
    error: null,
  })),
  useExportSchedules: vi.fn(() => ({
    data: {
      data: [
        {
          id: 'schedule-1',
          name: 'Daily Student Export',
          export_type: 'students',
          export_format: 'excel',
          frequency: 'DAILY',
          is_active: true,
          created_at: '2026-01-30T10:00:00Z',
        },
      ],
    },
    isLoading: false,
  })),
  useExportMetrics: vi.fn(() => ({
    data: {
      success_rate_percent: 96.2,
      trend_data: [
        { date: '2026-01-25', duration_ms: 110, success_count: 5, failure_count: 0 },
      ],
    },
    isLoading: false,
  })),
  useRefreshExports: vi.fn(() => vi.fn()),
  useDeleteExport: vi.fn(() => ({ mutateAsync: mockDeleteExport, isPending: false })),
  useDownloadExport: vi.fn(() => ({ mutateAsync: mockDownloadExport, isPending: false })),
  useRerunExport: vi.fn(() => ({ mutateAsync: mockRerunExport, isPending: false })),
  useCreateSchedule: vi.fn(() => ({ mutateAsync: mockCreateSchedule, isPending: false })),
  useDeleteSchedule: vi.fn(() => ({ mutateAsync: mockDeleteSchedule, isPending: false })),
  useToggleSchedule: vi.fn(() => ({ mutateAsync: mockToggleSchedule, isPending: false })),
}));

// Initialize i18n for tests
i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: {
      exportAdmin: {
        title: 'Export Management',
        description: 'Manage export jobs, schedules, and settings',
        actions: {
          refresh: 'Refresh',
          newExport: 'New Export',
          create: 'Create Schedule',
          creating: 'Creating',
          cancel: 'Cancel',
          menu: 'Menu',
          view: 'View Details',
          download: 'Download',
          rerun: 'Re-run',
          delete: 'Delete',
          close: 'Close',
        },
        errors: {
          loadFailed: 'Error loading export data',
        },
        stats: {
          totalExports: 'Total Exports',
          allTime: 'All time',
          recentExports: 'Recent Exports',
          last30Days: 'Last 30 days',
          activeSchedules: 'Active Schedules',
          recurring: 'Recurring',
          successRate: 'Success Rate',
          recentSuccess: 'Recent success',
        },
        tabs: {
          jobs: 'Export Jobs',
          schedules: 'Schedules',
          metrics: 'Metrics',
          settings: 'Settings',
          email: 'Email Config',
          analytics: 'Analytics',
        },
        total: 'total',
        last7Days: 'Last 7 days',
        performanceAnalysis: 'Performance analysis',
        emailConfiguration: 'Email configuration',
        exportSettings: 'Export settings',
        loading: 'Loading',
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
        confirmDeleteSchedule: 'Delete schedule?',
        noFile: 'No file available',
        schedule: {
          createTitle: 'Schedule Export',
          createDescription: 'Create a new export schedule',
          name: 'Schedule Name',
          namePlaceholder: 'Enter schedule name',
          type: 'Export Type',
          format: 'Export Format',
          frequency: 'Frequency',
          frequencyHelp: 'Choose how often to run',
          cron: 'Cron Expression',
          cronPlaceholder: '0 0 * * *',
          cronHelp: 'Advanced scheduling',
          activeSchedules: 'Active Schedules',
          scheduleCount: '{{count}} schedules',
          new: 'New Schedule',
          noSchedules: 'No schedules found',
          noSchedulesHint: 'Create your first schedule',
          active: 'Active',
          inactive: 'Inactive',
          lastRun: 'Last Run',
          nextRun: 'Next Run',
          pause: 'Pause',
          resume: 'Resume',
        },
        frequency: {
          hourly: 'Hourly',
          daily: 'Daily',
          weekly: 'Weekly',
          monthly: 'Monthly',
          custom: 'Custom (Cron)',
        },
        type: {
          students: 'Students',
          courses: 'Courses',
          grades: 'Grades',
        },
        format: {
          excel: 'excel',
          csv: 'csv',
          pdf: 'pdf',
        },
        status: {
          completed: 'Completed',
          processing: 'Processing',
          pending: 'Pending',
          failed: 'Failed',
        },
        metrics: {
          duration: 'Duration Trend',
          durationDesc: 'Average export duration over time',
          successRate: 'Success Rate',
          successRateDesc: 'Successful vs failed exports',
          success: 'Success',
          failure: 'Failure',
        },
        detail: {
          title: 'Export Details',
          currentStatus: 'Current status',
          type: 'Type',
          format: 'Format',
          fileSize: 'File Size',
          duration: 'Duration',
          created: 'Created',
          updated: 'Updated',
          error: 'Error',
          progress: 'Progress',
        },
      },
    },
  },
});

const renderWithProviders = (ui: ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper });
};

describe('ExportAdmin integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders dashboard with jobs tab', () => {
    renderWithProviders(<ExportDashboard />);

    expect(screen.getByText('Export Management')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /jobs/i })).toHaveAttribute('data-state', 'active');
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('switches to schedules tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExportDashboard />);

    await user.click(screen.getByRole('tab', { name: /schedules/i }));

    expect(screen.getByText('Daily Student Export')).toBeInTheDocument();
  });

  it('displays job details correctly', () => {
    renderWithProviders(<ExportDashboard />);

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('allows deleting a job', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithProviders(<ExportDashboard />);

    const dataRows = screen.getAllByRole('row');
    const targetRow = dataRows.find((row) =>
      within(row).queryByRole('cell', { name: 'Students' })
    );
    expect(targetRow).toBeTruthy();

    const actionButton = within(targetRow as HTMLElement).getAllByRole('button')[0];
    await user.click(actionButton);

    await user.click(await screen.findByRole('menuitem', { name: /delete/i }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(mockDeleteExport).toHaveBeenCalledWith('job-1');
  });

  it('filters job list with search', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExportDashboard />);

    const searchInput = screen.getByPlaceholderText('Search exports...');
    await user.type(searchInput, 'no-matching-export');

    expect(screen.getByText('No export jobs found')).toBeInTheDocument();
  });
});
