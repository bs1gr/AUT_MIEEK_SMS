/**
 * Advanced Search Page
 * Issue #147: Frontend Advanced Search UI & Filters
 *
 * Main page component orchestrating all search UI elements.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSearch, useSavedSearches } from '../hooks/useSearch';
import SearchBar from './components/SearchBar';
import AdvancedFilters from './components/AdvancedFilters';
import { SearchResults } from './components/SearchResults';
import { SearchResultItem } from '../types/search';

/**
 * AdvancedSearchPage Component
 *
 * Displays:
 * - Search bar with real-time input
 * - Advanced filter builder
 * - Faceted navigation sidebar
 * - Search results with entity-specific cards
 * - Saved searches management
 * - Pagination controls
 */
export const AdvancedSearchPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    state,
    results,
    isLoading,
    error,
    setQuery,
    setEntityType,
    setFilters,
    setSortBy,
    refetch,
  } =
    useSearch();

  // Handler for result card clicks - navigate to detail page
  const handleResultClick = (result: SearchResultItem) => {
    switch (result.type) {
      case 'student':
        navigate(`/students/${result.id}`);
        break;
      case 'course':
        navigate(`/courses/${result.id}`);
        break;
      case 'grade':
        // Grades don't have detail pages, could navigate to student profile
        navigate(`/students/${result.student_id || result.id}`);
        break;
    }
  };

  // TODO: Implement component render
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('search.page_title')}
          </h1>
          <p className="mt-2 text-gray-600">
            {t('search.page_description')}
          </p>
        </div>

        <div className="grid grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="col-span-1">
            {/* TODO: Faceted navigation component */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">{t('search.facets.title')}</h2>
              <p className="text-gray-500">{t('common.placeholder')}</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-3">
            {/* Search Bar */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <SearchBar
                  query={state.query}
                  onQueryChange={setQuery}
                  entityType={state.entityType}
                  onEntityTypeChange={setEntityType}
                  onSearch={() => refetch()}
                  searchHistory={[]}
                  showHistory={false}
                />
              </div>

            {/* Advanced Filters */}
              <AdvancedFilters
                className="mb-6"
                filters={state.filters}
                onFiltersChange={setFilters}
                entityType={state.entityType}
              />

            {/* Saved Searches */}
            {/* TODO: SavedSearches component */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <p className="text-gray-500">{t('common.placeholder')}</p>
            </div>

            {/* Search Results */}
            <div className="bg-white rounded-lg shadow mb-6">
              <SearchResults
                results={results?.items || []}
                total={results?.total || 0}
                isLoading={isLoading}
                error={error ? error.message : null}
                sortBy={state.sort_by}
                onSortChange={(sortBy) => setSortBy(sortBy)}
                onResultClick={handleResultClick}
                onRetry={() => refetch()}
              />
            </div>

            {/* Pagination */}
            {/* TODO: Pagination component */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearchPage;
