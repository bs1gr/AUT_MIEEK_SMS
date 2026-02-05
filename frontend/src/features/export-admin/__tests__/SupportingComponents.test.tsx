/**
 * Tests for supporting export-admin components
 * (EmailConfigPanel, ExportSettingsPanel, ExportDetailModal, etc.)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactElement } from 'react';
import i18n from 'i18next';
import { I18nextProvider } from 'react-i18next';
import {
  EmailConfigPanel,
  ExportSettingsPanel,
  ExportDetailModal,
  PerformanceAnalytics,
  ExportMetricsChart,
} from '../components/index';

// Initialize i18n for tests
i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: {
      exportAdmin: {
        email: {
          title: 'Email Configuration',
          description: 'Configure export email notifications',
          host: 'SMTP Host',
          hostPlaceholder: 'smtp.example.com',
          port: 'SMTP Port',
          portPlaceholder: '587',
          username: 'SMTP Username',
          usernamePlaceholder: 'user@example.com',
          password: 'SMTP Password',
          passwordPlaceholder: '••••••••',
          fromEmail: 'From Email',
          fromEmailPlaceholder: 'noreply@example.com',
          adminEmails: 'Admin Emails',
          adminEmailsPlaceholder: 'admin@example.com',
          adminEmailsHint: 'One email per line',
          testButton: 'Test Connection',
        },
        settings: {
          title: 'Export Settings',
          description: 'Configure export defaults',
          retentionDays: 'Retention Period (Days)',
          retentionDaysHint: 'Delete exports older than this period',
          maxConcurrent: 'Max Concurrent Exports',
          maxConcurrentHint: 'Maximum number of simultaneous exports',
          timeout: 'Export Timeout (Seconds)',
          timeoutHint: 'Maximum time allowed for export generation',
          maxRecords: 'Max Records per Export',
          maxRecordsHint: 'Limit the number of records per export (0 = unlimited)',
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
        analytics: {
          avgDuration: 'Avg Duration',
          successRate: 'Success Rate',
          totalExports: 'Total Exports',
          byFormat: 'Export Format Breakdown',
        },
        metrics: {
          duration: 'Duration Trend',
          durationDesc: 'Average export duration over time',
          successRate: 'Success Rate',
          successRateDesc: 'Successful vs failed exports',
          success: 'Success',
          failure: 'Failure',
        },
        actions: {
          save: 'Save',
          saving: 'Saving',
          testing: 'Testing',
          close: 'Close',
        },
        status: {
          completed: 'Completed',
        },
        type: {
          students: 'Students',
        },
        format: {
          excel: 'Excel',
        },
        success: 'success',
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

describe('EmailConfigPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email configuration title', () => {
    renderWithProviders(
      <EmailConfigPanel config={{ smtp_host: '', smtp_port: 587, smtp_user: '', smtp_password: '', from_email: '', from_name: '' }} onSave={async () => {}} onTest={async () => {}} />
    );

    expect(screen.getByText('Email Configuration')).toBeInTheDocument();
  });

  it('renders all SMTP form fields', () => {
    renderWithProviders(
      <EmailConfigPanel config={{ smtp_host: '', smtp_port: 587, smtp_user: '', smtp_password: '', from_email: '', from_name: '' }} onSave={async () => {}} onTest={async () => {}} />
    );

    expect(screen.getByPlaceholderText('smtp.example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('587')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('user@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('noreply@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('admin@example.com')).toBeInTheDocument();
  });

  it('renders save and test buttons', () => {
    renderWithProviders(
      <EmailConfigPanel config={{ smtp_host: '', smtp_port: 587, smtp_user: '', smtp_password: '', from_email: '', from_name: '' }} onSave={async () => {}} onTest={async () => {}} />
    );

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /test connection/i })).toBeInTheDocument();
  });

  it('allows input in form fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <EmailConfigPanel config={{ smtp_host: '', smtp_port: 587, smtp_user: '', smtp_password: '', from_email: '', from_name: '' }} onSave={async () => {}} onTest={async () => {}} />
    );

    const hostInput = screen.getByPlaceholderText('smtp.example.com');
    await user.type(hostInput, 'smtp.gmail.com');

    expect(hostInput).toHaveValue('smtp.gmail.com');
  });
});

describe('ExportSettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders settings title', () => {
    renderWithProviders(
      <ExportSettingsPanel settings={{ default_format: 'excel', max_file_size_mb: 100, retention_days: 30, auto_delete_old_exports: true }} onSave={async () => {}} />
    );

    expect(screen.getByText('Export Settings')).toBeInTheDocument();
  });

  it('renders all settings fields with hints', () => {
    renderWithProviders(
      <ExportSettingsPanel settings={{ default_format: 'excel', max_file_size_mb: 100, retention_days: 30, auto_delete_old_exports: true }} onSave={async () => {}} />
    );

    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs).toHaveLength(4);
    expect(screen.getByText(/delete exports older than this period/i)).toBeInTheDocument();

    expect(screen.getByText(/maximum number of simultaneous exports/i)).toBeInTheDocument();

    expect(screen.getByText(/maximum time allowed for export generation/i)).toBeInTheDocument();

    expect(screen.getByText(/limit the number of records/i)).toBeInTheDocument();
  });

  it('renders save settings button', () => {
    renderWithProviders(
      <ExportSettingsPanel settings={{ default_format: 'excel', max_file_size_mb: 100, retention_days: 30, auto_delete_old_exports: true }} onSave={async () => {}} />
    );

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('accepts numeric input in settings fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ExportSettingsPanel settings={{ default_format: 'excel', max_file_size_mb: 100, retention_days: 30, auto_delete_old_exports: true }} onSave={async () => {}} />
    );

    const retentionInput = screen.getAllByRole('spinbutton')[0];
    await user.clear(retentionInput);
    fireEvent.change(retentionInput, { target: { value: '90' } });

    expect(retentionInput).toHaveValue(90);
  });
});

describe('ExportDetailModal', () => {
  const mockExport = {
    id: '123',
    export_type: 'students',
    export_format: 'excel',
    status: 'completed',
    progress_percent: 100,
    created_at: '2026-01-31T10:00:00Z',
    updated_at: '2026-01-31T10:05:00Z',
    duration_seconds: 1.2,
    file_size_bytes: 1048576,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when open with job data', () => {
    renderWithProviders(
      <ExportDetailModal open={true} export={mockExport} onClose={vi.fn()} />
    );

    expect(screen.getByText('Export Details')).toBeInTheDocument();
  });

  it('displays job details correctly', () => {
    renderWithProviders(
      <ExportDetailModal open={true} export={mockExport} onClose={vi.fn()} />
    );

    expect(screen.getByText('123')).toBeInTheDocument();
    expect(screen.getByText('Students')).toBeInTheDocument();
    expect(screen.getByText('Excel')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('displays progress bar with correct percentage', () => {
    renderWithProviders(
      <ExportDetailModal open={true} export={mockExport} onClose={vi.fn()} />
    );

    expect(screen.getAllByText('100%').length).toBeGreaterThan(0);
  });

  it('calls onClose when close button clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <ExportDetailModal open={true} export={mockExport} onClose={onClose} />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('displays error section when job has error', () => {
    const exportWithError = { ...mockExport, error_message: 'Export failed due to timeout' };

    renderWithProviders(
      <ExportDetailModal open={true} export={exportWithError} onClose={vi.fn()} />
    );

    expect(screen.getByText('Export failed due to timeout')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    renderWithProviders(
      <ExportDetailModal open={false} export={mockExport} onClose={vi.fn()} />
    );

    expect(screen.queryByText('Export Details')).not.toBeInTheDocument();
  });
});

describe('PerformanceAnalytics', () => {
  const mockMetrics = {
    average_duration_seconds: 120.5,
    success_rate_percent: 95.7,
    total_exports: 342,
    by_format: {
      excel: { count: 180, success_rate: 96.2 },
      csv: { count: 120, success_rate: 94.1 },
      pdf: { count: 42, success_rate: 92.4 },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all metric cards', () => {
    renderWithProviders(<PerformanceAnalytics metrics={mockMetrics} />);

    expect(screen.getByText('Avg Duration')).toBeInTheDocument();
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
    expect(screen.getByText('Total Exports')).toBeInTheDocument();
  });

  it('displays metric values correctly', () => {
    renderWithProviders(<PerformanceAnalytics metrics={mockMetrics} />);

    expect(screen.getByText('120.50s')).toBeInTheDocument();
    expect(screen.getByText('95.7%')).toBeInTheDocument();
    expect(screen.getByText('342')).toBeInTheDocument();
  });

  it('renders format breakdown section', () => {
    renderWithProviders(<PerformanceAnalytics metrics={mockMetrics} />);

    expect(screen.getByText('Export Format Breakdown')).toBeInTheDocument();
    expect(screen.getByText('180')).toBeInTheDocument(); // Excel
    expect(screen.getByText('120')).toBeInTheDocument(); // CSV
    expect(screen.getByText('42')).toBeInTheDocument(); // PDF
  });
});

describe('ExportMetricsChart', () => {
  const mockMetrics = {
    trend_data: [
      { date: '2026-01-25', duration_ms: 110, success_count: 45, failure_count: 2 },
      { date: '2026-01-26', duration_ms: 125, success_count: 50, failure_count: 1 },
      { date: '2026-01-27', duration_ms: 115, success_count: 48, failure_count: 3 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders chart container', () => {
    renderWithProviders(<ExportMetricsChart metrics={mockMetrics} />);

    expect(screen.getByText('Duration Trend')).toBeInTheDocument();
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
  });

  it('displays duration trend chart', () => {
    renderWithProviders(<ExportMetricsChart metrics={mockMetrics} />);

    expect(screen.getByText('Average export duration over time')).toBeInTheDocument();
  });
});
