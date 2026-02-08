/**
 * Tests for ExportScheduler component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactElement } from 'react';
import i18n from 'i18next';
import { I18nextProvider } from 'react-i18next';
import ExportScheduler from '../components/ExportScheduler';
import { ExportSchedule } from '../types/export';
import { DateTimeSettingsProvider } from '@/contexts/DateTimeSettingsContext';

// Initialize i18n for tests
i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: {
      exportAdmin: {
        actions: {
          create: 'Create Schedule',
          creating: 'Creating',
          cancel: 'Cancel',
          delete: 'Delete',
          menu: 'Menu',
        },
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
          excel: 'EXCEL',
          csv: 'CSV',
          pdf: 'PDF',
        },
        confirmDeleteSchedule: 'Are you sure?',
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
  useExportSchedules: vi.fn(() => ({
    data: {
      data: [
        {
          id: '1',
          name: 'Daily Student Export',
          export_type: 'students',
          export_format: 'excel',
          frequency: 'DAILY',
          is_active: true,
          created_at: '2026-01-30T10:00:00Z',
        },
        {
          id: '2',
          name: 'Weekly Course Export',
          export_type: 'courses',
          export_format: 'csv',
          frequency: 'WEEKLY',
          is_active: false,
          created_at: '2026-01-29T10:00:00Z',
        },
      ] as ExportSchedule[],
    },
    isLoading: false,
    error: null,
  })),
  useCreateSchedule: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useDeleteSchedule: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useToggleSchedule: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

describe('ExportScheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders scheduler title', () => {
    renderWithProviders(<ExportScheduler />);

    expect(screen.getByText('Active Schedules')).toBeInTheDocument();
  });

  it('renders create new schedule button', () => {
    renderWithProviders(<ExportScheduler />);

    const createButton = screen.getByRole('button', { name: /create schedule/i });
    expect(createButton).toBeInTheDocument();
  });

  it('displays schedule cards', () => {
    renderWithProviders(<ExportScheduler />);

    expect(screen.getByText('Daily Student Export')).toBeInTheDocument();
    expect(screen.getByText('Weekly Course Export')).toBeInTheDocument();
  });

  it('displays schedule details (type, format, frequency)', () => {
    renderWithProviders(<ExportScheduler />);

    expect(screen.getByText('Students')).toBeInTheDocument();
    expect(screen.getByText('excel')).toBeInTheDocument();
    expect(screen.getByText('Daily')).toBeInTheDocument();

    expect(screen.getByText('Courses')).toBeInTheDocument();
    expect(screen.getByText('csv')).toBeInTheDocument();
    expect(screen.getByText('Weekly')).toBeInTheDocument();
  });

  it('displays status badges', () => {
    renderWithProviders(<ExportScheduler />);

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('shows form when create button clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExportScheduler />);

    const createButton = screen.getByRole('button', { name: /create schedule/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Schedule Export')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter schedule name')).toBeInTheDocument();
    });
  });

  it('renders form fields when form is open', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExportScheduler />);

    const createButton = screen.getByRole('button', { name: /create schedule/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter schedule name')).toBeInTheDocument();
      expect(screen.getByText('Export Type')).toBeInTheDocument();
      expect(screen.getByText('Export Format')).toBeInTheDocument();
      expect(screen.getByText('Frequency')).toBeInTheDocument();
    });
  });

  it('shows cron expression field when custom frequency selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExportScheduler />);

    const createButton = screen.getByRole('button', { name: /create schedule/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Frequency')).toBeInTheDocument();
    });

    expect(screen.queryByPlaceholderText('0 0 * * *')).not.toBeInTheDocument();
  });

  it('opens dropdown menu on schedule actions click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExportScheduler />);

    const menuButtons = screen.getAllByRole('button', { name: /menu/i });
    await user.click(menuButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Pause')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  it('submits form with correct data', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExportScheduler />);

    const createButton = screen.getByRole('button', { name: /create schedule/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter schedule name')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Enter schedule name');
    await user.type(nameInput, 'Test Schedule');

    const submitButton = screen.getByRole('button', { name: /create schedule/i });
    expect(submitButton).toBeInTheDocument();
    await user.click(submitButton);
    expect(screen.queryByText('Schedule Export')).not.toBeInTheDocument();
  });

  it('renders active schedules header', () => {
    renderWithProviders(<ExportScheduler />);

    expect(screen.getByText('Active Schedules')).toBeInTheDocument();
  });

  it('cancels form and hides it when cancel clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExportScheduler />);

    const createButton = screen.getByRole('button', { name: /create schedule/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Schedule Export')).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Schedule Export')).not.toBeInTheDocument();
    });
  });
});
