import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSearch, type SearchResult, type FilterCriteria } from './useSearch';
import { useSearchFacets } from './useSearchFacets';
import SearchSortControls from './SearchSortControls';
import SearchPagination from './SearchPagination';
import SearchFacets from './SearchFacets';

export const SearchView: React.FC = () => {
  const { t } = useTranslation('search');
  const navigate = useNavigate();
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

  const [gradeDateFrom, setGradeDateFrom] = useState('');
  const [gradeDateTo, setGradeDateTo] = useState('');

  const applyGradeDateFilters = useCallback(
    (currentFilters: FilterCriteria[]): FilterCriteria[] => {
      const filtered = currentFilters.filter(
        (filter) => !['date_from', 'date_to', 'date_assigned_from', 'date_assigned_to'].includes(filter.field)
      );

      if (searchType !== 'grades') {
        return filtered;
      }

      if (gradeDateFrom) {
        filtered.push({ field: 'date_from', operator: 'equals' as const, value: gradeDateFrom });
      }

      if (gradeDateTo) {
        filtered.push({ field: 'date_to', operator: 'equals' as const, value: gradeDateTo });
      }

      return filtered;
    },
    [gradeDateFrom, gradeDateTo, searchType]
  );

  useEffect(() => {
    if (searchType !== 'grades') {
      if (gradeDateFrom || gradeDateTo) {
        setGradeDateFrom('');
        setGradeDateTo('');
      }
      setFilters((prev) => applyGradeDateFilters(prev));
      return;
    }

    setFilters((prev) => applyGradeDateFilters(prev));
  }, [searchType, gradeDateFrom, gradeDateTo, applyGradeDateFilters, setFilters]);

  const { data: facetsData, isLoading: loadingFacets } = useSearchFacets(searchQuery);

  const typeOptions = useMemo(
    () => [
      { value: 'students', label: t('typeStudent', { defaultValue: 'Students' }) },
      { value: 'courses', label: t('typeCourse', { defaultValue: 'Courses' }) },
      { value: 'grades', label: t('typeGrade', { defaultValue: 'Grades' }) },
    ],
    [t]
  );

  const handleFacetSelect = (facet: string, value: string) => {
    setFilters((prev) => applyGradeDateFilters([
      ...prev.filter((filter) => filter.field !== facet),
      { field: facet, operator: 'equals' as const, value },
    ]));
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

  const handleResultClick = (result: any) => {
    // Navigate to the appropriate detail page based on result type
    switch (result.type) {
      case 'student':
        navigate(`/students/${result.id}`);
        break;
      case 'course':
        navigate(`/courses/${result.id}`);
        break;
      case 'grade':
        // For grades, navigate to the student's detail page
        if (result.student_id) {
          navigate(`/students/${result.student_id}`);
        }
        break;
      default:
        console.warn('Unknown result type:', result.type);
    }
  };

  const placeholder = useMemo(() => {
    const key = `placeholder.${searchType}`;
    return t(key, {
      defaultValue: `Search ${searchType}...`
    }).toLowerCase();
  }, [searchType, t]);

  const renderResultPrimary = (result: any) => {
    if (result.display_name) return result.display_name;
    if (result.first_name || result.last_name) {
      return `${result.first_name || ''} ${result.last_name || ''}`.trim();
    }
    return result.name || t('unknown');
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
              {t('typeLabel', { defaultValue: 'Type' })}
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

          {searchType === 'grades' && (
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="grade-date-from">
                  {t('fields.gradeDateFrom', { defaultValue: 'Date from' })}
                </label>
                <input
                  id="grade-date-from"
                  type="date"
                  value={gradeDateFrom}
                  onChange={(event) => setGradeDateFrom(event.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="grade-date-to">
                  {t('fields.gradeDateTo', { defaultValue: 'Date to' })}
                </label>
                <input
                  id="grade-date-to"
                  type="date"
                  value={gradeDateTo}
                  onChange={(event) => setGradeDateTo(event.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 w-full md:w-1/2">
            <label className="text-sm font-medium text-gray-700" htmlFor="search-input">
              {t('queryLabel', { defaultValue: 'Search query' })}
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
              {t('limitLabel', { defaultValue: 'Results per page' })}
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
          {searchType === 'grades' ? (
            <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm text-sm text-gray-600">
              {t('filters.gradeDateHint', { defaultValue: 'Use the date range above to filter historical grades.' })}
            </div>
          ) : (
            <SearchFacets facets={facetsData?.facets} loading={loadingFacets} onSelect={handleFacetSelect} />
          )}
        </div>
        <div className="lg:col-span-2 space-y-3">
          <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold text-gray-800">
                  {t('resultsTitle', { defaultValue: 'Results' })}
                </h3>
                <p className="text-sm text-gray-500">
                  {t('resultsSummary', { defaultValue: '{{count}} total results', count: totalResults })}
                </p>
              </div>
              {searchType === 'grades' && (gradeDateFrom || gradeDateTo) && (
                <div className="flex flex-wrap gap-2">
                  {gradeDateFrom && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      {t('filters.byDateFrom', { defaultValue: 'From' })}: {gradeDateFrom}
                    </span>
                  )}
                  {gradeDateTo && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      {t('filters.byDateTo', { defaultValue: 'To' })}: {gradeDateTo}
                    </span>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md" role="alert">
                {error instanceof Error ? error.message : String(error)}
              </div>
            )}

            {!error && searchResults.length === 0 && !isLoading && (
              <div className="p-4 text-sm text-gray-600 border border-gray-200 rounded-md bg-gray-50">
                {t('noResults', { defaultValue: 'No results found' })}
              </div>
            )}

            <ul className="divide-y divide-gray-100">
              {searchResults.map((result: SearchResult, index: number) => (
                <li key={`${result.type}-${result.id}-${index}`} className="py-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{renderResultPrimary(result)}</p>
                      <p className="text-xs text-gray-600">{renderResultSecondary(result)}</p>
                    </div>
                    <button
                      type="button"
                      className="px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 hover:border-blue-200 transition-colors cursor-pointer"
                      onClick={() => handleResultClick(result)}
                      aria-label={t('viewDetails', { defaultValue: 'View details' })}
                    >
                      {t(`type.${result.type}`)}
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {isLoading && (
              <div className="mt-3 text-sm text-gray-500">{t('loading')}</div>
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
