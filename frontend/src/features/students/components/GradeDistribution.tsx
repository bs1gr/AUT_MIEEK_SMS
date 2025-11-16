import React from 'react';
import { useLanguage } from '@/LanguageContext';

export interface GradeDistributionData {
  distribution: Record<'A' | 'B' | 'C' | 'D' | 'F', number>;
  total: number;
}

interface GradeDistributionProps {
  data: GradeDistributionData;
}

const GradeDistribution: React.FC<GradeDistributionProps> = ({ data }) => {
  const { t } = useLanguage();
  const progressColorClasses: Record<string, string> = {
    A: 'grade-progress--a',
    B: 'grade-progress--b',
    C: 'grade-progress--c',
    D: 'grade-progress--d',
    F: 'grade-progress--f',
  };

  if (!data.total) {
    return null;
  }

  return (
    <div className="border rounded-lg p-4 bg-white shadow-md">
      <div className="font-semibold text-gray-800 mb-3">{t('gradeDistribution') || 'Grade Distribution'}</div>
      <div className="space-y-3">
        {Object.entries(data.distribution).map(([grade, count]) => {
          const percentage = data.total > 0 ? (count / data.total) * 100 : 0;
          return (
            <div key={grade}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-700">{t('grade')} {grade}</span>
                <span className="text-gray-600">{count} {t('assignments')} ({percentage.toFixed(0)}%)</span>
              </div>
              <div className="grade-progress-track" role="presentation">
                <progress
                  className={`grade-progress ${progressColorClasses[grade] || 'grade-progress--default'}`}
                  value={percentage}
                  max={100}
                  aria-label={`${t('grade')} ${grade}`}
                ></progress>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GradeDistribution;
