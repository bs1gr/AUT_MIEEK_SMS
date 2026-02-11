/**
 * Advanced Search Page
 * Issue #147: Frontend Advanced Search UI & Filters
 *
 * Main page component orchestrating all search UI elements.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSearch } from './hooks/useSearch';
import SearchBar from './components/SearchBar';
// import AdvancedFilters from './components/AdvancedFilters'; // Not used in current implementation
import { AdvancedQueryBuilder } from './components/AdvancedQueryBuilder';
import { SearchResults } from './components/SearchResults';
import { SearchResultItem } from './types/search';
import { FacetedNavigation } from './components/FacetedNavigation';
import { SearchHistorySidebar } from './components/SearchHistorySidebar';
import { useSearchHistory } from './hooks/useSearchHistory';

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
  const { t } = useTranslation('search');
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
    toggleFacet,
    clearFacet,
  } =
    useSearch();

  const { entries: historyEntries, addEntry } = useSearchHistory();

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
            <FacetedNavigation
              className="mb-6"
              facets={results?.facets || {}}
              selected={state.selectedFacets || {}}
              onToggle={toggleFacet}
              onClearFacet={clearFacet}
            />

            <SearchHistorySidebar
              className="mb-6"
              onSelect={(q) => setQuery(q)}
            />
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
                  onSearch={() => {
                    if (state.query?.trim()) {
                      addEntry(state.query, state.entityType);
                    }
                    refetch();
                  }}
                  searchHistory={historyEntries.map((entry) => entry.query)}
                  showHistory={true}
                />
              </div>

            {/* Advanced Query Builder (wraps AdvancedFilters) */}
              <AdvancedQueryBuilder
                className="mb-6"
                filters={state.filters}
                onFiltersChange={setFilters}
                entityType={state.entityType}
              />

            {/* Saved Searches */}
            {/* INCOMPLETE: SavedSearches component - tracked in UNIFIED_WORK_PLAN.md */}
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
                sortBy={state.sortBy}
                onSortChange={(sortBy) => setSortBy(sortBy)}
                onResultClick={handleResultClick}
                onRetry={() => refetch()}
              />
            </div>

            {/* Pagination */}
            {/* INCOMPLETE: Pagination component - tracked in UNIFIED_WORK_PLAN.md */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearchPage;
