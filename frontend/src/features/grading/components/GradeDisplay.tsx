/**
 * GradeDisplay Component
 * Location: frontend/src/components/GradeDisplay.jsx
 *
 * A reusable component to display grades in multiple formats:
 * - GPA (0-4.0)
 * - Percentage (0-100)
 * - Greek Scale (0-20)
 */

import { useLanguage } from '@/LanguageContext';
import { Award } from 'lucide-react';
import {
  gpaToPercentage,
  gpaToGreekScale,
  getGreekGradeColor,
  getGreekGradeDescription,
  formatAllGrades
} from '@/utils/gradeUtils';

/**
 * Display grade in all three formats
 */
type GradeDisplayProps = {
  gpa: number;
  showGPA?: boolean;
  showPercentage?: boolean;
  showGreekScale?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'card' | 'inline' | 'minimal';
};

const GradeDisplay = ({
  gpa,
  showGPA = true,
  showPercentage = true,
  showGreekScale = true,
  size = 'medium',
  variant = 'default'
}: GradeDisplayProps) => {
  const { t, language } = useLanguage();

  if (!gpa || gpa === 0) {
    return (
      <div className="text-gray-400 text-sm">
        {t('noGradesRecorded')}
      </div>
    );
  }

  const grades = formatAllGrades(gpa);
  // language comes from useLanguage and can be string; cast to expected union type
  const description = getGreekGradeDescription(parseFloat(grades.greekGrade), (language as 'en' | 'el') || 'el');

  // Size configurations
  const sizeClasses = {
    small: {
      main: 'text-lg',
      secondary: 'text-sm',
      label: 'text-xs'
    },
    medium: {
      main: 'text-2xl',
      secondary: 'text-base',
      label: 'text-sm'
    },
    large: {
      main: 'text-4xl',
      secondary: 'text-xl',
      label: 'text-base'
    }
  };

  const sizes = sizeClasses[size] || sizeClasses.medium;

  // Variant: Default (stacked)
  if (variant === 'default') {
    return (
      <div className="space-y-3">
        {showGreekScale && (
          <div className="text-center">
            <p className={`${sizes.main} font-bold ${grades.color}`}>
              {grades.greekGrade}
            </p>
            <p className={`${sizes.label} text-gray-500`}>
              {t('greekScale')} {t('outOf20')}
            </p>
            <p className={`${sizes.label} ${grades.color} font-medium mt-1`}>
              {description}
            </p>
          </div>
        )}

        {showPercentage && (
          <div className="text-center border-t pt-2">
            <p className={`${sizes.secondary} font-semibold ${grades.color}`}>
              {grades.percentage}%
            </p>
            <p className={`${sizes.label} text-gray-400`}>
              {t('percentage')}
            </p>
          </div>
        )}

        {showGPA && (
          <div className="text-center border-t pt-2">
            <p className={`${sizes.secondary} font-semibold text-gray-600`}>
              {grades.gpa}
            </p>
            <p className={`${sizes.label} text-gray-400`}>
              GPA {t('outOf')} 4.0
            </p>
          </div>
        )}
      </div>
    );
  }

  // Variant: Card (with background)
  if (variant === 'card') {
    return (
      <div className={`bg-gradient-to-br ${grades.bgColor} rounded-xl shadow-lg p-6 text-white`}>
        <div className="flex items-center justify-between mb-4">
          <Award size={24} />
          <span className="text-xs opacity-75 uppercase">{t('performance')}</span>
        </div>

        {showGreekScale && (
          <div className="mb-3">
            <p className={`${sizes.main} font-bold`}>
              {grades.greekGrade}
            </p>
            <p className={`${sizes.label} opacity-90`}>
              {t('greekScale')} {t('outOf20')}
            </p>
            <p className={`${sizes.label} opacity-95 font-medium mt-1`}>
              {description}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between text-sm opacity-90 border-t border-white border-opacity-20 pt-3">
          {showPercentage && (
            <div>
              <span className="font-semibold">{grades.percentage}%</span>
            </div>
          )}
          {showGPA && (
            <div>
                <span>{t('gpa')}: {grades.gpa}</span>
              </div>
          )}
        </div>
      </div>
    );
  }

  // Variant: Inline (horizontal)
  if (variant === 'inline') {
    return (
      <div className="flex items-center space-x-4">
        {showGreekScale && (
          <div className="flex items-baseline space-x-1">
            <span className={`${sizes.main} font-bold ${grades.color}`}>
              {grades.greekGrade}
            </span>
            <span className={`${sizes.label} text-gray-500`}>/20</span>
          </div>
        )}

        {showPercentage && (
          <div className="flex items-baseline space-x-1">
            <span className={`${sizes.secondary} font-semibold ${grades.color}`}>
              {grades.percentage}%
            </span>
          </div>
        )}

        {showGPA && (
          <div className="flex items-baseline space-x-1">
            <span className={`${sizes.secondary} text-gray-600`}>
              {t('gpa')}: {grades.gpa}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Variant: Minimal (just the main grade)
  if (variant === 'minimal') {
    return (
      <div className="inline-flex items-baseline space-x-2">
        <span className={`${sizes.main} font-bold ${grades.color}`}>
          {showGreekScale ? grades.greekGrade : showPercentage ? `${grades.percentage}%` : grades.gpa}
        </span>
        <span className={`${sizes.label} text-gray-500`}>
          {showGreekScale ? '/20' : showPercentage ? '' : '/4.0'}
        </span>
      </div>
    );
  }

  return null;
};

/**
 * Grade Comparison Component
 * Shows multiple grades side by side
 */
export const GradeComparison = ({ grades, labels }: { grades: number[]; labels?: string[] }) => {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {grades.map((gpa, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <h4 className="font-semibold text-gray-700 mb-3">
            {labels?.[index] || `${t('course')} ${index + 1}`}
          </h4>
          <GradeDisplay gpa={gpa} variant="default" size="small" />
        </div>
      ))}
    </div>
  );
};

/**
 * Grade Progress Bar
 */
export const GradeProgressBar = ({ gpa, showLabel = true }: { gpa: number; showLabel?: boolean }) => {
  const { t } = useLanguage();
  const percentage = gpaToPercentage(gpa);
  const greekGrade = gpaToGreekScale(gpa);
  const color = getGreekGradeColor(greekGrade);

  const bgColorMap = {
    'text-green-600': 'bg-green-600',
    'text-blue-600': 'bg-blue-600',
    'text-yellow-600': 'bg-yellow-600',
    'text-orange-600': 'bg-orange-600',
    'text-red-600': 'bg-red-600',
  };

  const bgColor = (bgColorMap as Record<string, string>)[color] || 'bg-gray-600';

  return (
    <div className="space-y-2">
      {showLabel && (
          <div className="flex justify-between text-sm">
          <span className={`font-semibold ${color}`}>
            {greekGrade.toFixed(1)} {t('outOf20')}
          </span>
          <span className="text-gray-600">
            {percentage.toFixed(0)}%
          </span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-3">
        {/* using an arbitrary width class to avoid inline styles; round percentage to integer for class name */}
        <div
          className={`${bgColor} h-3 rounded-full transition-all duration-500 w-[${Math.round(
            percentage
          )}%]`}
        />
      </div>
    </div>
  );
};

export default GradeDisplay;
