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
      <div className="font-semibold text-gray-800 mb-3">{t('gradeStatistics') || 'Grade Statistics'}</div>
      {!insights ? (
        <div className="text-sm text-gray-500 text-center py-4">{t('noGradesYet') || 'No grades yet'}</div>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-600">{t('totalAssignments') || 'Total Assignments'}:</span>
            <span className="font-semibold text-gray-800">{insights.count}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-600">{t('highest') || 'Highest'}:</span>
            <span className="font-semibold text-green-600">{t('percentageWithGreek', { percentage: insights.maxPercentage.toFixed(1), greek: insights.maxGreek.toFixed(1) })}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-600">{t('lowest') || 'Lowest'}:</span>
            <span className="font-semibold text-red-600">{t('percentageWithGreek', { percentage: insights.minPercentage.toFixed(1), greek: insights.minGreek.toFixed(1) })}</span>
          </div>
          <div className="flex justify-between items-center py-2 bg-indigo-50 rounded mt-2">
            <span className="font-semibold text-gray-800">{t('averageGrade')}:</span>
            <span className="font-bold text-indigo-600 text-lg">{t('percentageWithGreek', { percentage: insights.avgPercentage.toFixed(1), greek: insights.avgGreek.toFixed(1) })}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeStatistics;
