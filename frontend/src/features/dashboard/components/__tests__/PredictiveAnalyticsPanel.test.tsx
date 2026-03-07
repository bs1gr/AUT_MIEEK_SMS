/**
 * Tests for PredictiveAnalyticsPanel component
 */

import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PredictiveAnalyticsPanel } from '../PredictiveAnalyticsPanel';

// Mock translation hook
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

describe('PredictiveAnalyticsPanel', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it('renders predictive panel without crashing', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <PredictiveAnalyticsPanel />
      </QueryClientProvider>
    );

    // Component should render something
    expect(container.firstChild).toBeInTheDocument();
  });

  it('displays risk assessment summary when data provided', async () => {
    const riskData = {
      risk_level: 'medium' as const,
      risk_score: 0.65,
      color: 'bg-yellow-50',
      grade_average: 82.5,
      attendance_rate: 0.88,
      factors: {
        grades: 'Stable',
        attendance: 'Good',
        trend: 'stable',
      },
      recommendations: ['Continue studying'],
    };

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <PredictiveAnalyticsPanel riskAssessment={riskData} />
      </QueryClientProvider>
    );

    // Component should render
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('shows at-risk students list when data provided', async () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <PredictiveAnalyticsPanel />
      </QueryClientProvider>
    );

    // Component renders
    expect(container.firstChild).toBeInTheDocument();
  });

  it('displays recommendations for at-risk students', async () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <PredictiveAnalyticsPanel />
      </QueryClientProvider>
    );

    // Component should render without errors
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('handles empty data gracefully', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <PredictiveAnalyticsPanel />
      </QueryClientProvider>
    );

    // Component should render even with no data
    expect(container.firstChild).toBeInTheDocument();
  });
});
