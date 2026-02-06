import React from 'react';
import { useLanguage } from '@/LanguageContext';

export interface GradeInsights {
  count: number;
  avgPercentage: number;
  avgGreek: number;
  maxPercentage: number;
  maxGreek: number;
  minPercentage: number;
  minGreek: number;
  letterGrade: string;
}

interface GradeStatisticsProps {
  insights: GradeInsights | null;
}

const GradeStatistics: React.FC<GradeStatisticsProps> = ({ insights }) => {
  const { t } = useLanguage();

  return (
    <div className="border rounded-lg p-4 bg-white shadow-md">
      <div className="font-semibold text-slate-900 mb-3">{t('gradeStatistics') || 'Grade Statistics'}</div>
      {!insights ? (
        <div className="text-sm text-slate-600 text-center py-4 font-semibold">{t('noGradesYet') || 'No grades recorded yet'}</div>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-slate-700 font-semibold">{t('totalAssignments') || 'Total Assignments'}:</span>
            <span className="font-semibold text-slate-900">{insights.count}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-slate-700 font-semibold">{t('highest') || 'Highest'}:</span>
            <span className="font-semibold text-green-600">{t('percentageWithGreek', { percentage: insights.maxPercentage.toFixed(1), greek: insights.maxGreek.toFixed(1) })}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-slate-700 font-semibold">{t('lowest') || 'Lowest'}:</span>
            <span className="font-semibold text-red-600">{t('percentageWithGreek', { percentage: insights.minPercentage.toFixed(1), greek: insights.minGreek.toFixed(1) })}</span>
          </div>
          <div className="flex justify-between items-center py-2 bg-slate-50 rounded mt-2">
            <span className="font-semibold text-slate-900">{t('averageGrade')}:</span>
            <span className="font-bold text-slate-900 text-lg">{t('percentageWithGreek', { percentage: insights.avgPercentage.toFixed(1), greek: insights.avgGreek.toFixed(1) })}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeStatistics;
