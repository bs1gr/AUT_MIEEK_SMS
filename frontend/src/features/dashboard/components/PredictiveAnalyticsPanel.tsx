/**
 * PredictiveAnalyticsPanel Component
 * Displays predictive insights for student performance, attendance, and risk assessment.
 */

import React from 'react';
import { AlertCircle, TrendingUp, ArrowDown, Activity, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface GradePrediction {
  date: string;
  predicted_grade: number;
  confidence: number;
}

interface AttendancePrediction {
  day: string;
  predicted_attendance_rate: number;
  risk_level: 'low' | 'medium' | 'high';
  sample_size: number;
}

interface RiskAssessment {
  risk_level: 'low' | 'medium' | 'high';
  risk_score: number;
  color: string;
  grade_average: number;
  attendance_rate: number;
  factors: {
    grades: string;
    attendance: string;
    trend: string;
  };
  recommendations: string[];
}

interface FinalGradeProjection {
  predicted_final_grade: number;
  confidence_percentage: number;
  scenarios: {
    optimistic: number;
    realistic: number;
    pessimistic: number;
  };
  current_average: number;
  recommendation: string;
}

interface PredictiveAnalyticsPanelProps {
  gradePredictions?: GradePrediction[];
  attendancePredictions?: AttendancePrediction[];
  riskAssessment?: RiskAssessment;
  finalGradeProjection?: FinalGradeProjection;
  isLoading?: boolean;
  error?: string | null;
}

export const PredictiveAnalyticsPanel: React.FC<PredictiveAnalyticsPanelProps> = ({
  gradePredictions = [],
  attendancePredictions = [],
  riskAssessment,
  finalGradeProjection,
  isLoading = false,
  error = null,
}) => {
  const { t } = useTranslation();

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

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case 'improving':
        return t('analytics.predictive.trend.improving', 'Improving');
      case 'declining':
        return t('analytics.predictive.trend.declining', 'Declining');
      default:
        return t('analytics.predictive.trend.stable', 'Stable');
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-900">
            {t('analytics.predictive.error', 'Predictive Analysis Error')}
          </h3>
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

  return (
    <div className="space-y-6">
      {/* Risk Assessment Card */}
      {riskAssessment && (
        <div className={`border rounded-lg p-6 ${getRiskColor(riskAssessment.risk_level)}`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-semibold">
                {t('analytics.predictive.risk.assessment', 'Risk Assessment')}
              </h3>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskBadgeColor(riskAssessment.risk_level)}`}>
              {riskAssessment.risk_level.toUpperCase()} ({riskAssessment.risk_score.toFixed(0)}/100)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white bg-opacity-60 rounded p-3">
              <p className="text-xs text-gray-600">
                {t('analytics.predictive.risk.grades', 'Grade Average')}
              </p>
              <p className="text-2xl font-bold text-gray-900">{riskAssessment.grade_average}</p>
            </div>
            <div className="bg-white bg-opacity-60 rounded p-3">
              <p className="text-xs text-gray-600">
                {t('analytics.predictive.risk.attendance', 'Attendance')}
              </p>
              <p className="text-2xl font-bold text-gray-900">{riskAssessment.attendance_rate.toFixed(0)}%</p>
            </div>
            <div className="bg-white bg-opacity-60 rounded p-3">
              <p className="text-xs text-gray-600">
                {t('analytics.predictive.risk.trend', 'Trend')}
              </p>
              <div className="flex items-center gap-1 mt-1">
                {getTrendIcon(riskAssessment.factors.trend)}
                <span className="text-sm font-semibold">{getTrendLabel(riskAssessment.factors.trend)}</span>
              </div>
            </div>
          </div>

          {riskAssessment.recommendations.length > 0 && (
            <div className="bg-white bg-opacity-50 rounded p-3">
              <p className="text-xs font-semibold text-gray-700 mb-2">
                {t('analytics.predictive.risk.recommendations', 'Recommendations')}
              </p>
              <ul className="space-y-1">
                {riskAssessment.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>{rec}</span>
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
              <h3 className="text-lg font-semibold">
                {t('analytics.predictive.grades.forecast', 'Grade Forecast')}
              </h3>
            </div>

            <div className="space-y-2">
              {gradePredictions.slice(0, 4).map((pred, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <p className="text-sm text-gray-600">
                      {new Date(pred.date).toLocaleDateString()}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${pred.predicted_grade}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">
                        {pred.predicted_grade.toFixed(0)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {t('analytics.predictive.confidence', 'Confidence')}
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {pred.confidence.toFixed(0)}%
                    </p>
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
              <h3 className="text-lg font-semibold">
                {t('analytics.predictive.final.grade', 'Final Grade Projection')}
              </h3>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-red-50 rounded p-2">
                  <p className="text-xs text-gray-600">
                    {t('analytics.predictive.scenario.pessimistic', 'Pessimistic')}
                  </p>
                  <p className="text-xl font-bold text-red-600">
                    {finalGradeProjection.scenarios.pessimistic}
                  </p>
                </div>
                <div className="bg-blue-50 rounded p-2 border-2 border-blue-200">
                  <p className="text-xs text-gray-600">
                    {t('analytics.predictive.scenario.realistic', 'Realistic')}
                  </p>
                  <p className="text-xl font-bold text-blue-600">
                    {finalGradeProjection.scenarios.realistic}
                  </p>
                </div>
                <div className="bg-green-50 rounded p-2">
                  <p className="text-xs text-gray-600">
                    {t('analytics.predictive.scenario.optimistic', 'Optimistic')}
                  </p>
                  <p className="text-xl font-bold text-green-600">
                    {finalGradeProjection.scenarios.optimistic}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-600 mb-1">
                  {t('analytics.predictive.confidence', 'Confidence')}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${finalGradeProjection.confidence_percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold">
                    {finalGradeProjection.confidence_percentage.toFixed(0)}%
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-700 bg-blue-50 rounded p-2">
                {finalGradeProjection.recommendation}
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
            <h3 className="text-lg font-semibold">
              {t('analytics.predictive.attendance.patterns', 'Attendance Patterns')}
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {attendancePredictions.map((pred) => (
              <div
                key={pred.day}
                className={`rounded-lg p-2 text-center border ${getRiskColor(pred.risk_level)}`}
              >
                <p className="text-xs font-semibold text-gray-700 mb-1">{pred.day.slice(0, 3)}</p>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-sm font-bold text-gray-900">
                    {pred.predicted_attendance_rate.toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {t(`analytics.predictive.risk.${pred.risk_level}`, pred.risk_level)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">ℹ️ {t('analytics.predictive.info.title', 'About Predictions')}:</span>{' '}
          {t(
            'analytics.predictive.info.description',
            'Predictions are based on historical data and trends. Individual student circumstances may vary. Always verify with actual assessments and records.'
          )}
        </p>
      </div>
    </div>
  );
};

export default PredictiveAnalyticsPanel;
