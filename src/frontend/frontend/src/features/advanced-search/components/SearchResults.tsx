/**
 * SearchResults - Container component for displaying search results
 * Issue #147 - STEP 6: SearchResults Component
 *
 * Features:
 * - Display results with entity-specific cards
 * - Loading skeleton state
 * - Empty state message
 * - Error state with retry
 * - Sort dropdown
 * - Results count display
 *
 * Author: AI Agent
 * Date: January 26, 2026
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  AdjustmentsHorizontalIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { SearchResultItem } from '../types/search';
import { StudentResultCard } from './StudentResultCard';
import { CourseResultCard } from './CourseResultCard';
import { GradeResultCard } from './GradeResultCard';

export interface SearchResultsProps {
  results: SearchResultItem[];
  total: number;
  isLoading: boolean;
  error: string | null;
  sortBy: string;
  onSortChange: (sortBy: string) => void;
  onResultClick?: (result: SearchResultItem) => void;
  onRetry?: () => void;
  className?: string;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  total,
  isLoading,
  error,
  sortBy,
  onSortChange,
  onResultClick,
  onRetry,
  className = '',
}) => {
  const { t } = useTranslation('search');

  /**
   * Render loading skeleton
   */
  const renderSkeleton = () => (
    <div className="space-y-4" role="status" aria-label={t('results.loading')}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="border border-gray-200 rounded-lg p-4 animate-pulse"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-200 rounded w-5/6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  /**
   * Render empty state
   */
  const renderEmpty = () => (
    <div className="text-center py-12" role="status">
      <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-4 text-lg font-medium text-gray-900">
        {t('results.empty')}
      </h3>
      <p className="mt-2 text-sm text-gray-500">{t('results.emptyHint')}</p>
    </div>
  );

  /**
   * Render error state
   */
  const renderError = () => (
    <div className="text-center py-12" role="alert">
      <ExclamationCircleIcon className="mx-auto h-12 w-12 text-red-500" />
      <h3 className="mt-4 text-lg font-medium text-gray-900">
        {t('results.error')}
      </h3>
      <p className="mt-2 text-sm text-gray-500">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {t('results.retry')}
        </button>
      )}
    </div>
  );

  /**
   * Render individual result card based on type
   */
  const renderResultCard = (result: SearchResultItem, index: number) => {
    const handleClick = () => {
      if (onResultClick) {
        onResultClick(result);
      }
    };

    switch (result.type) {
      case 'student':
        return (
          <StudentResultCard
            key={`student-${result.id}-${index}`}
            student={result}
            onClick={handleClick}
          />
        );
      case 'course':
        return (
          <CourseResultCard
            key={`course-${result.id}-${index}`}
            course={result}
            onClick={handleClick}
          />
        );
      case 'grade':
        return (
          <GradeResultCard
            key={`grade-${result.id}-${index}`}
            grade={result}
            onClick={handleClick}
          />
        );
      default:
        return null;
    }
  };

  /**
   * Render sort dropdown
   */
  const renderSortDropdown = () => (
    <div className="flex items-center gap-2">
      <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-500" />
      <label htmlFor="sort-by" className="text-sm text-gray-700">
        {t('results.sortBy')}:
      </label>
      <select
        id="sort-by"
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
        className="border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
        aria-label={t('results.sortBy')}
      >
        <option value="relevance">{t('results.sort.relevance')}</option>
        <option value="name">{t('results.sort.name')}</option>
        <option value="created_at">{t('results.sort.newest')}</option>
        <option value="updated_at">{t('results.sort.updated')}</option>
      </select>
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className={`search-results ${className}`}>
        {renderSkeleton()}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`search-results ${className}`}>
        {renderError()}
      </div>
    );
  }

  // Empty state
  if (results.length === 0) {
    return (
      <div className={`search-results ${className}`}>
        {renderEmpty()}
      </div>
    );
  }

  // Results state
  return (
    <div className={`search-results ${className}`}>
      {/* Header with count and sort */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
        <div className="text-sm text-gray-700">
          <span className="font-medium">{total}</span>{' '}
          {total === 1 ? t('results.result') : t('results.results')}
        </div>
        {renderSortDropdown()}
      </div>

      {/* Results list */}
      <div className="space-y-4" role="list" aria-label={t('results.list')}>
        {results.map((result, index) => (
          <React.Fragment key={`result-${result.id}-${index}`}>
            {renderResultCard(result, index)}
            {index < results.length - 1 && (
              <div className="border-t-2 border-gray-600 dark:border-gray-400 my-2" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
