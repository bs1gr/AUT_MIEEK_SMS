/**
 * StudentResultCard - Display individual student search result
 * Issue #147 - STEP 6: SearchResults Component
 *
 * Features:
 * - Student name and ID
 * - Email and status badge
 * - Enrollment type
 * - Course list preview
 * - Click to view details
 *
 * Author: AI Agent
 * Date: January 26, 2026
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  UserIcon,
  EnvelopeIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import { StudentSearchResult } from '../types/search';

export interface StudentResultCardProps {
  student: StudentSearchResult;
  onClick?: () => void;
  className?: string;
}

export const StudentResultCard: React.FC<StudentResultCardProps> = ({
  student,
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
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'graduated':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
      aria-label={`${t('type.student')}: ${student.first_name} ${student.last_name}`}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
            <UserIcon className="h-6 w-6 text-indigo-600" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name and status */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {student.first_name} {student.last_name}
            </h3>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                student.status
              )}`}
            >
              {t(`students.status.${student.status}`)}
            </span>
          </div>

          {/* Student ID */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <span className="font-mono">{student.student_id}</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500">{student.enrollment_type}</span>
          </div>

          {/* Email */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <EnvelopeIcon className="h-4 w-4 text-gray-400" />
            <a
              href={`mailto:${student.email}`}
              className="hover:text-indigo-600 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {student.email}
            </a>
          </div>

          {/* Courses */}
          {student.courses && student.courses.length > 0 && (
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <AcademicCapIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-gray-500">{t('students.courses')}:</span>{' '}
                <span className="text-gray-700">
                  {student.courses.slice(0, 3).join(', ')}
                  {student.courses.length > 3 && (
                    <span className="text-gray-500">
                      {' '}
                      +{student.courses.length - 3} {t('students.more')}
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Relevance score (optional, for debugging) */}
          {student.relevance_score !== undefined && (
            <div className="mt-2 text-xs text-gray-400">
              {t('results.relevance')}: {student.relevance_score.toFixed(2)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
