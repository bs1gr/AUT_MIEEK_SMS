/**
 * SearchResults - Component for displaying search results with pagination.
 *
 * Features:
 * - Display results in a clean, organized table
 * - Pagination controls
 * - Loading and error states
 * - Result type icons
 * - Empty state messaging
 *
 * Author: AI Agent
 * Date: January 17, 2026
 * Version: 1.0.0
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { SearchResult } from '../hooks/useSearch';
import './SearchResults.css';

interface SearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  hasMore: boolean;
  onLoadMore: () => void;
  onResultClick?: (result: SearchResult) => void;
  pageSize?: number;
  className?: string;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  isLoading,
  error,
  currentPage,
  hasMore,
  onLoadMore,
  onResultClick,
  className = ''
}) => {
  const { t } = useTranslation();

  /**
   * Get display name for a result
   */
  const getResultName = (result: SearchResult): string => {
    if (result.display_name) {
      return result.display_name;
    }

    if (result.type === 'student' && result.first_name && result.last_name) {
      return `${result.first_name} ${result.last_name}`;
    }

    if (result.type === 'course') {
      return result.course_name || t('search.unknownCourse', 'Unknown Course');
    }

    if (result.type === 'grade') {
      return result.student_name || t('search.unknownStudent', 'Unknown Student');
    }

    return t('search.unknown', 'Unknown');
  };

  /**
   * Get secondary info for a result
   */
  const getResultSecondary = (result: SearchResult): string => {
    if (result.secondary_info) {
      return result.secondary_info;
    }

    if (result.type === 'student') {
      return result.email || result.enrollment_number || '';
    }

    if (result.type === 'course') {
      return result.course_code || '';
    }

    if (result.type === 'grade') {
      return result.course_name || '';
    }

    return '';
  };

  /**
   * Get icon for result type
   */
  const getResultIcon = (type: string): string => {
    switch (type) {
      case 'student':
        return '👤';
      case 'course':
        return '📚';
      case 'grade':
        return '📊';
      default:
        return '📄';
    }
  };

  /**
   * Render loading state
   */
  if (isLoading && results.length === 0) {
    return (
      <div className={`search-results ${className}`}>
        <div className="loading-state">
          <div className="spinner" role="status" aria-live="polite"></div>
          <p>{t('search.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <div className={`search-results ${className}`}>
        <div className="error-state" role="alert" aria-live="assertive">
          <ExclamationTriangleIcon
            className="error-icon"
            role="img"
            aria-label={t('search.errorIcon', 'Error')}
          />
          <h3>{t('search.errorTitle', 'Error')}</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  /**
   * Render empty state
   */
  if (!isLoading && results.length === 0) {
    return (
      <div className={`search-results ${className}`}>
        <div className="empty-state">
          <p>{t('search.noResults', 'No results found')}</p>
        </div>
      </div>
    );
  }

  /**
   * Render results table
   */
  return (
    <div className={`search-results ${className}`}>
      <div className="results-container">
        <div className="results-header">
          <h3>
            {t('search.results', 'Results')}
            <span className="result-count">({results.length})</span>
          </h3>
        </div>

        <div className="results-table-wrapper">
          <table
            className="results-table"
            style={{ display: isLoading ? 'none' : undefined }}
          >
            <thead>
              <tr>
                <th scope="col" aria-label={t('search.column.icon', 'Icon')}></th>
                <th scope="col">{t('search.column.name', 'Name')}</th>
                <th scope="col">{t('search.column.type', 'Type')}</th>
                <th scope="col">{t('search.column.value', 'Value')}</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr
                  key={`${result.type}-${result.id}-${index}`}
                  className="result-row"
                  onClick={() => onResultClick?.(result)}
                >
                  <td className="result-icon">
                    <span
                      className="icon"
                      role="img"
                      aria-label={t(`search.type.${result.type}`)}
                    >
                      {getResultIcon(result.type)}
                    </span>
                  </td>

                  <td className="result-main">
                    <div className="result-name">{getResultName(result)}</div>
                    <div className="result-secondary">
                      {getResultSecondary(result)}
                    </div>
                  </td>

                  <td className="result-type">
                    <span className={`type-badge type-${result.type}`}>
                      {t(`search.type.${result.type}`)}
                    </span>
                  </td>

                  <td className="result-value">
                    {result.type === 'grade' && result.grade_value != null && (
                      <span className="grade-value">
                        {result.grade_value.toFixed(1)}
                      </span>
                    )}
                    {result.type === 'course' && result.credits !== undefined && (
                      <span className="credits-value">
                        {result.credits} {t('search.credits', 'credits')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {hasMore && (
          <div className="pagination">
            {currentPage > 0 && (
              <button
                className="pagination-button"
                onClick={() => onLoadMore()}
                aria-label={t('common.previous')}
                disabled={isLoading}
              >
                <ChevronLeftIcon className="pagination-icon" />
                {t('common.previous')}
              </button>
            )}

            <span className="page-info">
              {t('search.page', 'Page')} {currentPage + 1}
            </span>

            <button
              className="pagination-button"
              onClick={onLoadMore}
              aria-label={t('common.next')}
              disabled={isLoading}
            >
              {t('common.next')}
              <ChevronRightIcon className="pagination-icon" />
            </button>
          </div>
        )}

        {isLoading && results.length > 0 && (
          <div className="loading-more">
            <span className="spinner-small" role="status" aria-live="polite"></span>
            {t('search.loadingMore', 'Loading...')}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
