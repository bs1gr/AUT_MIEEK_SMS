import { useTranslation } from 'react-i18next';
import { PredictiveAnalyticsPanel } from '@/features/dashboard/components/PredictiveAnalyticsPanel';
import { usePredictiveAnalytics } from '@/features/dashboard/hooks/usePredictiveAnalytics';

interface StudentPredictionsSectionProps {
  studentId: number;
}

/**
 * The Student Profile's outlook: risk, grade forecast, final-grade projection and attendance
 * by weekday. Hidden for users without the reports:view permission (the endpoint answers 403),
 * e.g. a student looking at their own profile.
 */
export default function StudentPredictionsSection({ studentId }: StudentPredictionsSectionProps) {
  const { t } = useTranslation('analytics');
  const { data, isLoading, error } = usePredictiveAnalytics({ studentId });

  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  if (status === 401 || status === 403) return null;

  return (
    <div className="mt-6 bg-white rounded-2xl shadow-lg p-6" data-testid="student-predictions">
      <h3 className="text-xl font-bold text-gray-800">{t('predictive.title')}</h3>
      <p className="text-sm text-gray-500 mb-4">{t('predictive.subtitle')}</p>
      <PredictiveAnalyticsPanel
        isLoading={isLoading}
        error={error ? error.message : null}
        gradePredictions={data?.grade_predictions}
        attendancePredictions={data?.attendance_predictions}
        riskAssessment={data?.risk_assessment}
        finalGradeProjection={data?.final_grade_projection}
        insufficientData={data?.insufficient_data}
      />
    </div>
  );
}
