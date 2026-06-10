import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import testI18n from '@/test-utils/i18n-test-wrapper';
import { LanguageProvider } from '@/LanguageContext';
import DashboardManager from '../DashboardManager';
import { useDashboards } from '../../hooks/useDashboards';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../../hooks/useDashboards');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const mockDashboards = [
  {
    id: 1,
    name: 'Math Performance',
    description: 'Dashboard for tracking math student performance',
    configuration: { charts: ['performance', 'gradeDistribution'] },
    is_default: true,
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-10T00:00:00Z',
  },
  {
    id: 2,
    name: 'Attendance Analysis',
    description: 'Focus on attendance patterns',
    configuration: { charts: ['attendance', 'trend'] },
    is_default: false,
    created_at: '2024-01-11T00:00:00Z',
    updated_at: '2024-01-11T00:00:00Z',
  },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <I18nextProvider i18n={testI18n}>
      <LanguageProvider>
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </BrowserRouter>
      </LanguageProvider>
    </I18nextProvider>
  );
}

describe('DashboardManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard manager with title', () => {
    (useDashboards as any).mockReturnValue({
      dashboards: mockDashboards,
      isLoadingDashboards: false,
      createDashboard: vi.fn(),
      isCreating: false,
      updateDashboard: vi.fn(),
      isUpdating: false,
      deleteDashboard: vi.fn(),
      isDeleting: false,
      setDefaultDashboard: vi.fn(),
      isSettingDefault: false,
    });

    render(<DashboardManager />, { wrapper: createWrapper() });

    expect(screen.getByText(/Dashboard Manager/i)).toBeInTheDocument();
  });

  it('displays list of dashboards', async () => {
    (useDashboards as any).mockReturnValue({
      dashboards: mockDashboards,
      isLoadingDashboards: false,
      createDashboard: vi.fn(),
      isCreating: false,
      updateDashboard: vi.fn(),
      isUpdating: false,
      deleteDashboard: vi.fn(),
      isDeleting: false,
      setDefaultDashboard: vi.fn(),
      isSettingDefault: false,
    });

    render(<DashboardManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Math Performance')).toBeInTheDocument();
      expect(screen.getByText('Attendance Analysis')).toBeInTheDocument();
    });
  });

  it('shows default dashboard badge', async () => {
    (useDashboards as any).mockReturnValue({
      dashboards: mockDashboards,
      isLoadingDashboards: false,
      createDashboard: vi.fn(),
      isCreating: false,
      updateDashboard: vi.fn(),
      isUpdating: false,
      deleteDashboard: vi.fn(),
      isDeleting: false,
      setDefaultDashboard: vi.fn(),
      isSettingDefault: false,
    });

    render(<DashboardManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      const badges = screen.getAllByText(/Default/i);
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  it('displays chart count for each dashboard', async () => {
    (useDashboards as any).mockReturnValue({
      dashboards: mockDashboards,
      isLoadingDashboards: false,
      createDashboard: vi.fn(),
      isCreating: false,
      updateDashboard: vi.fn(),
      isUpdating: false,
      deleteDashboard: vi.fn(),
      isDeleting: false,
      setDefaultDashboard: vi.fn(),
      isSettingDefault: false,
    });

    render(<DashboardManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      const chartCounts = screen.getAllByText(/Charts:/i);
      expect(chartCounts.length).toBeGreaterThan(0);
    });
  });

  it('shows empty state when no dashboards exist', () => {
    (useDashboards as any).mockReturnValue({
      dashboards: [],
      isLoadingDashboards: false,
      createDashboard: vi.fn(),
      isCreating: false,
      updateDashboard: vi.fn(),
      isUpdating: false,
      deleteDashboard: vi.fn(),
      isDeleting: false,
      setDefaultDashboard: vi.fn(),
      isSettingDefault: false,
    });

    render(<DashboardManager />, { wrapper: createWrapper() });

    expect(screen.getByText(/No dashboards yet. Create one to get started/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    (useDashboards as any).mockReturnValue({
      dashboards: [],
      isLoadingDashboards: true,
      createDashboard: vi.fn(),
      isCreating: false,
      updateDashboard: vi.fn(),
      isUpdating: false,
      deleteDashboard: vi.fn(),
      isDeleting: false,
      setDefaultDashboard: vi.fn(),
      isSettingDefault: false,
    });

    const { container } = render(<DashboardManager />, { wrapper: createWrapper() });

    // Check for spinner
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('opens create dialog on new dashboard button click', async () => {
    (useDashboards as any).mockReturnValue({
      dashboards: [],
      isLoadingDashboards: false,
      createDashboard: vi.fn(),
      isCreating: false,
      updateDashboard: vi.fn(),
      isUpdating: false,
      deleteDashboard: vi.fn(),
      isDeleting: false,
      setDefaultDashboard: vi.fn(),
      isSettingDefault: false,
    });

    const user = userEvent.setup();
    render(<DashboardManager />, { wrapper: createWrapper() });

    const newButton = screen.getByText(/New Dashboard/i);
    await user.click(newButton);

    // Dialog should appear - look for the dialog title
    await waitFor(() => {
      expect(screen.getByText(/New Dashboard/i)).toBeInTheDocument();
    });
  });

  it('shows delete confirmation when delete button clicked', async () => {
    (useDashboards as any).mockReturnValue({
      dashboards: mockDashboards,
      isLoadingDashboards: false,
      createDashboard: vi.fn(),
      isCreating: false,
      updateDashboard: vi.fn(),
      isUpdating: false,
      deleteDashboard: vi.fn(),
      isDeleting: false,
      setDefaultDashboard: vi.fn(),
      isSettingDefault: false,
    });

    const user = userEvent.setup();
    render(<DashboardManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Math Performance')).toBeInTheDocument();
    });

    // Find and click first delete button (trash icon is harder to find)
    const deleteButtons = screen.getAllByTitle(/Delete/i);
    await user.click(deleteButtons[0]);

    // Confirmation should appear
    await waitFor(() => {
      expect(screen.getByText(/Are you sure/i)).toBeInTheDocument();
    });
  });

  it('calls deleteDashboard when delete confirmed', async () => {
    const deleteMock = vi.fn();
    (useDashboards as any).mockReturnValue({
      dashboards: mockDashboards,
      isLoadingDashboards: false,
      createDashboard: vi.fn(),
      isCreating: false,
      updateDashboard: vi.fn(),
      isUpdating: false,
      deleteDashboard: deleteMock,
      isDeleting: false,
      setDefaultDashboard: vi.fn(),
      isSettingDefault: false,
    });

    const user = userEvent.setup();
    render(<DashboardManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Math Performance')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButtons = screen.getAllByTitle(/Delete/i);
    await user.click(deleteButtons[0]);

    // Find and click confirm button
    await waitFor(() => {
      expect(screen.getByText(/Are you sure/i)).toBeInTheDocument();
    });

    // Get all delete buttons and click the confirmation one (last one in the DOM)
    const allDeleteButtons = screen.getAllByRole('button', { name: /Delete/i });
    const confirmButton = allDeleteButtons[allDeleteButtons.length - 1];
    await user.click(confirmButton);

    expect(deleteMock).toHaveBeenCalledWith(1, expect.any(Object));
  });

  it('calls setDefaultDashboard when star button clicked', async () => {
    const setDefaultMock = vi.fn();
    (useDashboards as any).mockReturnValue({
      dashboards: mockDashboards,
      isLoadingDashboards: false,
      createDashboard: vi.fn(),
      isCreating: false,
      updateDashboard: vi.fn(),
      isUpdating: false,
      deleteDashboard: vi.fn(),
      isDeleting: false,
      setDefaultDashboard: setDefaultMock,
      isSettingDefault: false,
    });

    const user = userEvent.setup();
    render(<DashboardManager />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Attendance Analysis')).toBeInTheDocument();
    });

    // Find star button for non-default dashboard
    const setDefaultButtons = screen.getAllByTitle(/Set as default/i);
    if (setDefaultButtons.length > 0) {
      await user.click(setDefaultButtons[0]);
      expect(setDefaultMock).toHaveBeenCalled();
    }
  });
});
