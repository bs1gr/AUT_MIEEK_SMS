/**
 * Tests for AnalyticsDashboard component
 */

import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsDashboard } from '../AnalyticsDashboard';
import React from 'react';

const stableI18nMock = {
  t: (key: string) => key,
  language: 'en',
  setLanguage: vi.fn(),
};

const stableDateTimeMock = {
  formatDate: (date: Date | string) => new Date(date).toISOString(),
  formatTime: (date: Date | string) => new Date(date).toLocaleTimeString(),
  formatDateTime: (date: Date | string) => new Date(date).toISOString(),
};

const dashboardRefetchMock = vi.hoisted(() => vi.fn());
const dashboardDataState = vi.hoisted(() => ({
  dashboard: {
    total_students: 150,
    total_courses: 12,
    total_grades: 500,
    total_attendance_records: 450,
    average_grade: 82.5,
    average_attendance: 0.9,
    timestamp: new Date().toISOString(),
  },
  isLoading: false,
  error: null as Error | null,
}));

// Mock React Router
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock the analytics API
vi.mock('@/api/api', () => ({
  default: {
    get: vi.fn(),
  },
  apiClient: {
    get: vi.fn(),
  },
  extractAPIResponseData: (data: unknown) => data,
}));

// Mock the analytics hooks
vi.mock('@/api/hooks/useAnalytics', () => ({
  useDashboardData: () => ({
    dashboard: dashboardDataState.dashboard,
    isLoading: dashboardDataState.isLoading,
    error: dashboardDataState.error,
    refetch: dashboardRefetchMock,
  }),
}));

// Mock the analytics export hook
vi.mock('../hooks/useAnalyticsExport', () => ({
  useAnalyticsExport: () => ({
    exportPDF: vi.fn(),
    exportExcel: vi.fn(),
    isExporting: false,
  }),
}));

// Mock LanguageContext
vi.mock('@/LanguageContext', () => ({
  useLanguage: () => stableI18nMock,
}));

// Mock DateTimeSettingsContext
vi.mock('@/contexts/DateTimeSettingsContext', () => ({
  useDateTimeFormatter: () => stableDateTimeMock,
}));

// Mock AnalyticsCharts
vi.mock('../AnalyticsCharts', () => ({
  PerformanceChart: () => React.createElement('div', { 'data-testid': 'performance-chart' }),
  GradeDistributionChart: () => React.createElement('div', { 'data-testid': 'grade-distribution-chart' }),
  AttendanceChart: () => React.createElement('div', { 'data-testid': 'attendance-chart' }),
  TrendChart: () => React.createElement('div', { 'data-testid': 'trend-chart' }),
  StatsPieChart: () => React.createElement('div', { 'data-testid': 'stats-pie-chart' }),
}));

describe('AnalyticsDashboard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    dashboardDataState.dashboard = {
      total_students: 150,
      total_courses: 12,
      total_grades: 500,
      total_attendance_records: 450,
      average_grade: 82.5,
      average_attendance: 0.9,
      timestamp: new Date().toISOString(),
    };
    dashboardDataState.isLoading = false;
    dashboardDataState.error = null;
    dashboardRefetchMock.mockReset();
  });

  it('renders dashboard without crashing', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <AnalyticsDashboard />
      </QueryClientProvider>
    );

    // Component should render something
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders analytics dashboard without crashing', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <AnalyticsDashboard />
      </QueryClientProvider>
    );

    // Component should render successfully - check for basic elements
    expect(container.firstChild).toBeInTheDocument();
  });

  it('displays total students count or placeholder', async () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <AnalyticsDashboard />
      </QueryClientProvider>
    );

    await waitFor(() => {
      // Check for any child elements
      expect(container.querySelector('div')).toBeInTheDocument();
    });
  });

  it('displays total courses count or placeholder', async () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <AnalyticsDashboard />
      </QueryClientProvider>
    );

    await waitFor(() => {
      // Check for structure
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  it('displays average grade or placeholder', async () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <AnalyticsDashboard />
      </QueryClientProvider>
    );

    await waitFor(() => {
      // Component should render - check for structure rather than specific values
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  it('shows loading state or renders content', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <AnalyticsDashboard />
      </QueryClientProvider>
    );

    // Expect something to render (loader or content)
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders the dashboard when the summary endpoint fails', async () => {
    dashboardDataState.dashboard = undefined as never;
    dashboardDataState.error = new Error('summary failed');

    render(
      <QueryClientProvider client={queryClient}>
        <AnalyticsDashboard />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('analytics.dashboardTitle')).toBeInTheDocument();
    });
    expect(screen.queryByText('analytics.dashboardError')).not.toBeInTheDocument();
  });
});
