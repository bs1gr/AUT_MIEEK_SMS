import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';
import { apiClient } from '@/api/api';
import type { StudentPredictions } from '@/features/dashboard/types/analytics';
import StudentPredictionsSection from './StudentPredictionsSection';

vi.mock('@/api/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/api')>()),
  apiClient: { get: vi.fn() },
}));

const predictions: StudentPredictions = {
  student_id: 7,
  course_id: null,
  grade_trend: 'improving',
  grade_predictions: [{ date: '2026-10-12T00:00:00', predicted_grade: 81.4, confidence: 72 }],
  attendance_predictions: [{ day: 'Monday', predicted_attendance_rate: 90, risk_level: 'low', sample_size: 4 }],
  risk_assessment: {
    risk_level: 'low',
    risk_score: 5,
    grade_average: 76.2,
    attendance_rate: 90,
    factors: { grades: 'good', attendance: 'good', trend: 'improving' },
    recommendations: ['on_track'],
  },
  final_grade_projection: {
    predicted_final_grade: 76.2,
    confidence_percentage: 100,
    scenarios: { optimistic: 86.2, realistic: 76.2, pessimistic: 66.2 },
    current_average: 76.2,
    recommendation: 'good',
  },
  insufficient_data: [],
};

async function renderSection(language: 'en' | 'el' = 'en') {
  await act(async () => {
    await i18n.changeLanguage(language);
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <StudentPredictionsSection studentId={7} />
      </I18nextProvider>
    </QueryClientProvider>
  );
}

describe('StudentPredictionsSection', () => {
  beforeEach(() => vi.mocked(apiClient.get).mockReset());

  it('asks for this student and shows the translated outlook', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: predictions });
    await renderSection();
    expect(await screen.findByText('On track: keep up the current effort')).toBeInTheDocument();
    expect(screen.getByText('Outlook')).toBeInTheDocument();
    expect(screen.getByText('Low (5/100)')).toBeInTheDocument();
    expect(screen.getByText('Good progress: more practice would help')).toBeInTheDocument();
    expect(screen.getByText('Improving')).toBeInTheDocument();
    expect(vi.mocked(apiClient.get).mock.calls[0][0]).toBe('/analytics/predictive/student');
    expect(vi.mocked(apiClient.get).mock.calls[0][1]).toMatchObject({ params: { student_id: 7 } });
  });

  it('is in Greek for Greek users, weekdays included', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: predictions });
    await renderSection('el');
    expect(await screen.findByText('Σε καλό δρόμο: συνέχεια της ίδιας προσπάθειας')).toBeInTheDocument();
    expect(screen.getByText('Πρόβλεψη επίδοσης')).toBeInTheDocument();
    expect(screen.getByText('Χαμηλός (5/100)')).toBeInTheDocument();
    expect(screen.getByText(/^Δευ/)).toBeInTheDocument();
  });

  it('says when there is not enough data yet', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { ...predictions, grade_predictions: [], attendance_predictions: [], risk_assessment: null, final_grade_projection: null, insufficient_data: ['grades', 'attendance'] },
    });
    await renderSection();
    expect(await screen.findByTestId('predictions-insufficient')).toBeInTheDocument();
    expect(screen.queryByText('About predictions')).not.toBeInTheDocument();
  });

  it('stays hidden for users without permission (403)', async () => {
    // One request, as in the app; a persistent mockRejectedValue trips Vitest's unhandled-rejection check.
    vi.mocked(apiClient.get).mockRejectedValueOnce(Object.assign(new Error('Request failed with status code 403'), { response: { status: 403 } }));
    const { container } = await renderSection();
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });
});
