/**
 * Tests for ExportDashboard component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactElement } from 'react';
import i18n from 'i18next';
import { I18nextProvider } from 'react-i18next';
import ExportDashboard from '../components/ExportDashboard';
import { useExportJobs } from '../hooks/useExportAdmin';

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
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper });
};

// Mock hooks
vi.mock('../hooks/useExportAdmin', () => ({
  useExportJobs: vi.fn(() => ({
    data: { data: { total: 150, items: Array.from({ length: 45 }, () => ({ id: 'job' })) } },
    isLoading: false,
    error: null,
  })),
  useExportJob: vi.fn(() => ({
    data: { id: 'job-1', status: 'completed', created_at: '2024-01-01' },
    isLoading: false,
    error: null,
  })),
  useExportMetrics: vi.fn(() => ({
    data: {
      success_rate_percent: 95.5,
    },
    isLoading: false,
  })),
  useExportSchedules: vi.fn(() => ({
    data: { data: [{ id: '1', is_active: true }, { id: '2', is_active: false }] },
    isLoading: false,
  })),
  useRefreshExports: vi.fn(() => vi.fn()),
}));

// Mock child components
vi.mock('../components/ExportJobList', () => ({
  default: () => <div data-testid="export-job-list">Export Job List</div>,
}));

vi.mock('../components/ExportScheduler', () => ({
  default: () => <div data-testid="export-scheduler">Export Scheduler</div>,
}));

vi.mock('../components/index', () => ({
  ExportMetricsChart: () => <div data-testid="metrics-chart">Metrics Chart</div>,
  EmailConfigPanel: () => <div data-testid="email-config">Email Config</div>,
  ExportSettingsPanel: () => <div data-testid="settings-panel">Settings Panel</div>,
  ExportDetailModal: () => <div data-testid="detail-modal">Detail Modal</div>,
  PerformanceAnalytics: () => <div data-testid="performance-analytics">Performance</div>,
}));

describe('ExportDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard title and description', () => {
    renderWithProviders(<ExportDashboard />);

    expect(screen.getByText('Export Management')).toBeInTheDocument();
    expect(screen.getByText('Manage export jobs, schedules, and settings')).toBeInTheDocument();
  });

  it('renders refresh button', () => {
    renderWithProviders(<ExportDashboard />);

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    expect(refreshButton).toBeInTheDocument();
  });

  it('displays quick stats cards', () => {
    renderWithProviders(<ExportDashboard />);

    expect(screen.getByText('Total Exports')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('Recent Exports')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
  });

  it('renders all 6 tab triggers', () => {
    renderWithProviders(<ExportDashboard />);

    expect(screen.getByRole('tab', { name: /export jobs/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /schedules/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /metrics/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /email config/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /analytics/i })).toBeInTheDocument();
  });

  it('shows ExportJobList by default (jobs tab)', () => {
    renderWithProviders(<ExportDashboard />);

    expect(screen.getByTestId('export-job-list')).toBeInTheDocument();
  });

  it('switches to schedules tab on click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExportDashboard />);

    const schedulesTab = screen.getByRole('tab', { name: /schedules/i });
    await user.click(schedulesTab);

    await waitFor(() => {
      expect(screen.getByTestId('export-scheduler')).toBeInTheDocument();
    });
  });

  it('switches to metrics tab on click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExportDashboard />);

    const metricsTab = screen.getByRole('tab', { name: /metrics/i });
    await user.click(metricsTab);

    await waitFor(() => {
      expect(metricsTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('switches to settings tab on click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExportDashboard />);

    const settingsTab = screen.getByRole('tab', { name: /settings/i });
    await user.click(settingsTab);

    await waitFor(() => {
      expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
    });
  });

  it('calls onRefresh when refresh button clicked', async () => {
    const onRefresh = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<ExportDashboard onRefresh={onRefresh} />);

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('displays error alert when jobs fail to load', () => {
    vi.mocked(useExportJobs).mockReturnValueOnce({
      data: null,
      isLoading: false,
      error: new Error('Failed to load'),
    });

    renderWithProviders(<ExportDashboard />);

    expect(screen.getByText('Error loading export data')).toBeInTheDocument();
  });
});
