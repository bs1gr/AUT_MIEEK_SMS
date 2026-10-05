/**
 * PredictiveAnalyticsPanel Component
 * Displays predictive insights for student performance, attendance, and risk assessment
 * (data: GET /analytics/predictive/student, see usePredictiveAnalytics). The backend sends
 * codes for trends, risk levels and recommendations; they are translated here.
 */

import React from 'react';
import { AlertCircle, TrendingUp, ArrowDown, Activity, Award, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  AttendancePrediction,
  FinalGradeProjection,
  GradePrediction,
  RiskAssessment,
} from '../types/analytics';

interface PredictiveAnalyticsPanelProps {
  gradePredictions?: GradePrediction[];
  attendancePredictions?: AttendancePrediction[];
  riskAssessment?: RiskAssessment | null;
  finalGradeProjection?: FinalGradeProjection | null;
  insufficientData?: string[];
  isLoading?: boolean;
  error?: string | null;
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const PredictiveAnalyticsPanel: React.FC<PredictiveAnalyticsPanelProps> = ({
  gradePredictions = [],
  attendancePredictions = [],
  riskAssessment,
  finalGradeProjection,
  insufficientData = [],
  isLoading = false,
  error = null,
}) => {
  const { t, i18n } = useTranslation('analytics');
  const locale = i18n.language?.startsWith('el') ? 'el-GR' : 'en-GB';

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString(locale);
  // The backend names weekdays in English; 2024-01-01 was a Monday.
  const formatWeekday = (day: string) => {
    const index = WEEKDAYS.indexOf(day);
    return index < 0
      ? day
      : new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2024, 0, 1 + index));
  };

  // Risk color mapping
  const getRiskColor = (level: string): string => {
    switch (level) {
      case 'low':
        return 'bg-green-50 border-green-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      case 'high':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getRiskBadgeColor = (level: string): string => {
    switch (level) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') {
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    } else if (trend === 'declining') {
      return <ArrowDown className="w-4 h-4 text-red-600" />;
    }
    return <Activity className="w-4 h-4 text-gray-600" />;
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-900">{t('predictive.error')}</h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-100 rounded-lg p-4 h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  const hasPredictions =
    Boolean(riskAssessment) || Boolean(finalGradeProjection) || gradePredictions.length > 0 || attendancePredictions.length > 0;

  return (
    <div className="space-y-6">
      {insufficientData.length > 0 && (
        <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3" data-testid="predictions-insufficient">
          {t('predictive.insufficient')}
        </p>
      )}

      {/* Risk Assessment Card */}
      {riskAssessment && (
        <div className={`border rounded-lg p-6 ${getRiskColor(riskAssessment.risk_level)}`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-semibold">{t('predictive.risk.assessment')}</h3>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskBadgeColor(riskAssessment.risk_level)}`}>
              {t(`predictive.risk.${riskAssessment.risk_level}`)} ({riskAssessment.risk_score.toFixed(0)}/100)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white bg-opacity-60 rounded p-3">
              <p className="text-xs text-gray-600">{t('predictive.risk.grades')}</p>
              <p className="text-2xl font-bold text-gray-900">{riskAssessment.grade_average.toFixed(0)}%</p>
            </div>
            <div className="bg-white bg-opacity-60 rounded p-3">
              <p className="text-xs text-gray-600">{t('predictive.risk.attendance')}</p>
              <p className="text-2xl font-bold text-gray-900">{riskAssessment.attendance_rate.toFixed(0)}%</p>
            </div>
            <div className="bg-white bg-opacity-60 rounded p-3">
              <p className="text-xs text-gray-600">{t('predictive.risk.trend')}</p>
              <div className="flex items-center gap-1 mt-1">
                {getTrendIcon(riskAssessment.factors.trend)}
                <span className="text-sm font-semibold">{t(`predictive.trend.${riskAssessment.factors.trend}`)}</span>
              </div>
            </div>
          </div>

          {riskAssessment.recommendations.length > 0 && (
            <div className="bg-white bg-opacity-50 rounded p-3">
              <p className="text-xs font-semibold text-gray-700 mb-2">{t('predictive.risk.recommendations')}</p>
              <ul className="space-y-1">
                {riskAssessment.recommendations.map((code) => (
                  <li key={code} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5" aria-hidden="true">•</span>
                    <span>{t(`predictive.recommendation.${code}`, { defaultValue: code })}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade Predictions */}
        {gradePredictions.length > 0 && (
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">{t('predictive.grades.forecast')}</h3>
            </div>

            <div className="space-y-2">
              {gradePredictions.slice(0, 4).map((pred) => (
                <div key={pred.date} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <p className="text-sm text-gray-600">{formatDate(pred.date)}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pred.predicted_grade}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-10 text-right">{pred.predicted_grade.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{t('predictive.confidence')}</p>
                    <p className="text-sm font-semibold text-gray-900">{pred.confidence.toFixed(0)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Final Grade Projection */}
        {finalGradeProjection && (
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold">{t('predictive.final.grade')}</h3>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-red-50 rounded p-2">
                  <p className="text-xs text-gray-600">{t('predictive.scenario.pessimistic')}</p>
                  <p className="text-xl font-bold text-red-600">{finalGradeProjection.scenarios.pessimistic.toFixed(0)}%</p>
                </div>
                <div className="bg-blue-50 rounded p-2 border-2 border-blue-200">
                  <p className="text-xs text-gray-600">{t('predictive.scenario.realistic')}</p>
                  <p className="text-xl font-bold text-blue-600">{finalGradeProjection.scenarios.realistic.toFixed(0)}%</p>
                </div>
                <div className="bg-green-50 rounded p-2">
                  <p className="text-xs text-gray-600">{t('predictive.scenario.optimistic')}</p>
                  <p className="text-xl font-bold text-green-600">{finalGradeProjection.scenarios.optimistic.toFixed(0)}%</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-600 mb-1">{t('predictive.confidence')}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${finalGradeProjection.confidence_percentage}%` }} />
                  </div>
                  <span className="text-sm font-semibold">{finalGradeProjection.confidence_percentage.toFixed(0)}%</span>
                </div>
              </div>

              <p className="text-sm text-gray-700 bg-blue-50 rounded p-2">
                {t(`predictive.final.${finalGradeProjection.recommendation}`, {
                  defaultValue: finalGradeProjection.recommendation,
                })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Attendance Predictions */}
      {attendancePredictions.length > 0 && (
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold">{t('predictive.attendance.patterns')}</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {attendancePredictions.map((pred) => (
              <div key={pred.day} className={`rounded-lg p-2 text-center border ${getRiskColor(pred.risk_level)}`}>
                <p className="text-xs font-semibold text-gray-700 mb-1">{formatWeekday(pred.day)}</p>
                <span className="text-sm font-bold text-gray-900">{pred.predicted_attendance_rate.toFixed(0)}%</span>
                <p className="text-xs text-gray-500 mt-1">{t(`predictive.risk.${pred.risk_level}`)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      {hasPredictions && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-blue-900">
            <span className="font-semibold">{t('predictive.info.title')}:</span> {t('predictive.info.description')}
          </p>
        </div>
      )}
    </div>
  );
};

export default PredictiveAnalyticsPanel;
