/**
 * CourseResultCard - Display individual course search result
 * Issue #147 - STEP 6: SearchResults Component
 *
 * Features:
 * - Course code and name
 * - Description preview
 * - Instructor name
 * - Status badge
 * - Click to view details
 *
 * Author: AI Agent
 * Date: January 26, 2026
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpenIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { CourseSearchResult } from '../types/search';

export interface CourseResultCardProps {
  course: CourseSearchResult;
  onClick?: () => void;
  className?: string;
}

export const CourseResultCard: React.FC<CourseResultCardProps> = ({
  course,
  onClick,
  className = '',
}) => {
  const { t } = useTranslation('search');

  /**
   * Get status badge color
   */
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Truncate description to max length
   */
  const truncateDescription = (text: string | undefined, maxLength = 120): string => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
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
      aria-label={`${t('type.course')}: ${course.code} - ${course.name}`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <BookOpenIcon className="h-6 w-6 text-blue-600" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Code, name and status */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm font-semibold text-indigo-600">
              {course.code}
            </span>
            <span className="text-gray-400">•</span>
            <h3 className="text-base font-semibold text-gray-900 truncate flex-1">
              {course.name}
            </h3>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                course.status
              )}`}
            >
              {t(`courses.status.${course.status}`)}
            </span>
          </div>

          {/* Description */}
          {course.description && (
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
              {truncateDescription(course.description)}
            </p>
          )}

          {/* Instructor */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <UserCircleIcon className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500">{t('courses.instructor')}:</span>
            <span className="text-gray-700">{course.instructor}</span>
          </div>

          {/* Relevance score (optional, for debugging) */}
          {course.relevance_score !== undefined && (
            <div className="mt-2 text-xs text-gray-400">
              {t('results.relevance')}: {course.relevance_score.toFixed(2)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
