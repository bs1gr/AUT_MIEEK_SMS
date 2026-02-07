/**
 * GradeResultCard - Display individual grade search result
 * Issue #147 - STEP 6: SearchResults Component
 *
 * Features:
 * - Student and course info
 * - Grade and points display
 * - Grade badge with color coding
 * - Click to view details
 *
 * Author: AI Agent
 * Date: January 26, 2026
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChartBarIcon,
  UserIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import { GradeSearchResult } from '../types/search';

export interface GradeResultCardProps {
  grade: GradeSearchResult;
  onClick?: () => void;
  className?: string;
}

export const GradeResultCard: React.FC<GradeResultCardProps> = ({
  grade,
  onClick,
  className = '',
}) => {
  const { t } = useTranslation('search');

  /**
   * Get grade badge color based on grade letter/points
   */
  const getGradeColor = (gradeValue: string, points: number): string => {
    // Check letter grade first
    if (gradeValue.startsWith('A')) return 'bg-green-100 text-green-800';
    if (gradeValue.startsWith('B')) return 'bg-blue-100 text-blue-800';
    if (gradeValue.startsWith('C')) return 'bg-yellow-100 text-yellow-800';
    if (gradeValue.startsWith('D')) return 'bg-orange-100 text-orange-800';
    if (gradeValue.startsWith('F')) return 'bg-red-100 text-red-800';

    // Fallback to points threshold
    if (points >= 90) return 'bg-green-100 text-green-800';
    if (points >= 80) return 'bg-blue-100 text-blue-800';
    if (points >= 70) return 'bg-yellow-100 text-yellow-800';
    if (points >= 60) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div
      className={`border border-gray-200 rounded-lg p-4 hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer ${className}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-label={`${t('type.grade')}: ${grade.student_name} - ${grade.course_code} - ${grade.grade}`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
            <ChartBarIcon className="h-6 w-6 text-purple-600" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Grade badge and points */}
          <div className="flex items-center gap-3 mb-2">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-md text-lg font-bold ${getGradeColor(
                grade.grade,
                grade.points
              )}`}
            >
              {grade.grade}
            </span>
            <span className="text-2xl font-semibold text-gray-700">
              {grade.points}
              <span className="text-sm text-gray-500 ml-1">
                {t('grades.outOf', { max: 100 })} {t('grades.points')}
              </span>
            </span>
          </div>

          {/* Student info */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <UserIcon className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500">{t('grades.student')}:</span>
            <span className="text-gray-700 font-medium">{grade.student_name}</span>
          </div>

          {/* Course info */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <BookOpenIcon className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500">{t('grades.course')}:</span>
            <span className="font-mono text-indigo-600 font-medium">
              {grade.course_code}
            </span>
          </div>

          {/* Relevance score (optional, for debugging) */}
          {grade.relevance_score !== undefined && (
            <div className="mt-2 text-xs text-gray-400">
              {t('results.relevance')}: {grade.relevance_score.toFixed(2)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
