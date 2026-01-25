import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearch } from './useSearch';
import { useSearchFacets } from './useSearchFacets';
import SearchSortControls from './SearchSortControls';
import SearchPagination from './SearchPagination';
import SearchFacets from './SearchFacets';

export const SearchView: React.FC = () => {
  const { t } = useTranslation();
  const translate = (key: string, fallback: string, options: Record<string, unknown> = {}) => {
    const value = t(key, { defaultValue: fallback, ...options });
    return value === key ? fallback : value;
  };
  const {
    searchQuery,
    setSearchQuery,
    searchType,
    setSearchType,
    searchResults,
    totalResults,
    isLoading,
    error,
    page,
    setPage,
    limit,
    setLimit,
    sort,
    setSort,
    hasMore,
    setFilters,
  } = useSearch();

  const { data: facetsData, isLoading: loadingFacets } = useSearchFacets(searchQuery);

  const typeOptions = useMemo(
    () => [
      { value: 'students', label: t('search.stats.students', { defaultValue: 'students' }).toLowerCase() },
      { value: 'courses', label: t('search.stats.courses', { defaultValue: 'courses' }).toLowerCase() },
      { value: 'grades', label: t('search.stats.grades', { defaultValue: 'grades' }).toLowerCase() },
    ],
    [t]
  );

  const handleFacetSelect = (facet: string, value: string) => {
    setFilters([{ field: facet, operator: 'equals', value }]);
    setPage(0);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(Math.max(0, nextPage));
  };

  const handleLimitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextLimit = Number(event.target.value) || 20;
    setLimit(nextLimit);
    setPage(0);
  };

  const placeholder = translate('search.placeholder.students', 'Search students...').toLowerCase();

  const renderResultPrimary = (result: any) => {
    if (result.display_name) return result.display_name;
    if (result.first_name || result.last_name) {
      return `${result.first_name || ''} ${result.last_name || ''}`.trim();
    }
    return result.name || t('search.unknown');
  };

  const renderResultSecondary = (result: any) => {
    if (result.email) return result.email;
    if (result.course_code) return result.course_code;
    if (result.course_name) return result.course_name;
    return result.type;
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="search-type">
              {translate('search.typeLabel', 'Type')}
            </label>
            <select
              id="search-type"
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as any)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 w-full md:w-1/2">
            <label className="text-sm font-medium text-gray-700" htmlFor="search-input">
              {translate('search.queryLabel', 'Search query')}
            </label>
            <input
              id="search-input"
              type="text"
              value={searchQuery}
              placeholder={placeholder}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="search-limit">
              {translate('search.limitLabel', 'Results per page')}
            </label>
            <select
              id="search-limit"
              value={limit}
              onChange={handleLimitChange}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[10, 20, 50].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <SearchSortControls sort={sort} onChange={(next) => { setSort(next); setPage(0); }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <SearchFacets facets={facetsData?.facets} loading={loadingFacets} onSelect={handleFacetSelect} />
        </div>
        <div className="lg:col-span-2 space-y-3">
          <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-gray-800">
                  {translate('search.resultsTitle', 'Results')}
                </h3>
                <p className="text-sm text-gray-500">
                  {translate('search.resultsSummary', `${totalResults} total results`, { count: totalResults })}
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md" role="alert">
                {error instanceof Error ? error.message : String(error)}
              </div>
            )}

            {!error && searchResults.length === 0 && !isLoading && (
              <div className="p-4 text-sm text-gray-600 border border-gray-200 rounded-md bg-gray-50">
                {translate('search.noResults', 'No results found')}
              </div>
            )}

            <ul className="divide-y divide-gray-100">
              {searchResults.map((result, index) => (
                <li key={`${result.type}-${result.id}-${index}`} className="py-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{renderResultPrimary(result)}</p>
                      <p className="text-xs text-gray-600">{renderResultSecondary(result)}</p>
                    </div>
                    <button
                      type="button"
                      className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-100"
                    >
                      {t(`search.type.${result.type}`)}
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {isLoading && (
              <div className="mt-3 text-sm text-gray-500">{t('search.loading')}</div>
            )}
          </div>

          <SearchPagination
            page={page}
            limit={limit}
            total={totalResults}
            hasMore={hasMore}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </div>
  );
};

export default SearchView;
