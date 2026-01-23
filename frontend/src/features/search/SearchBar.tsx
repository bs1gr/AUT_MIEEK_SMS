import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, Clock, Heart as HeartIcon } from 'lucide-react';
import { useSearch, type SearchResult, type SavedSearch } from './useSearch';

interface SearchBarProps {
  onSelectResult?: (result: SearchResult) => void;
  onSearchTypeChange?: (type: 'students' | 'courses' | 'grades') => void;
  className?: string;
  autoFocus?: boolean;
}

/**
 * SearchBar component for unified search across students, courses, and grades
 * Provides:
 * - Real-time search with debouncing
 * - Search type selection (students/courses/grades)
 * - Search result suggestions
 * - Recent searches history
 * - Quick access to saved searches
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  onSelectResult,
  onSearchTypeChange,
  className = '',
  autoFocus = false,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    searchQuery,
    setSearchQuery,
    searchType,
    setSearchType,
    searchResults,
    isLoading,
    savedSearches,
  } = useSearch();

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setShowRecent(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus input if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSearchTypeChange = (newType: 'students' | 'courses' | 'grades') => {
    setSearchType(newType);
    onSearchTypeChange?.(newType);
  };

  const handleResultClick = (result: SearchResult) => {
    onSelectResult?.(result);
    setIsOpen(false);
    setShowRecent(false);
  };

  const handleClear = () => {
    setSearchQuery('');
    setIsOpen(false);
  };

  const getSearchTypeLabel = () => {
    switch (searchType) {
      case 'students':
        return t('students.title');
      case 'courses':
        return t('courses.title');
      case 'grades':
        return t('grades.title');
      default:
        return t('common.search');
    }
  };

  const getFavoriteSavedSearches = () => {
    return savedSearches.filter((s: SavedSearch) => s.is_favorite);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Search Input Container */}
      <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:border-blue-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
        {/* Search Icon */}
        <div className="pl-3 text-gray-400">
          <Search size={18} />
        </div>

        {/* Search Type Selector (Mobile: Hidden) */}
        <select
          value={searchType}
          onChange={(e) => handleSearchTypeChange(e.target.value as any)}
          className="hidden sm:block px-2 py-2 text-sm font-medium text-gray-700 bg-transparent border-r border-gray-200 focus:outline-none cursor-pointer"
          aria-label={t('common.searchType')}
        >
          <option value="students">{t('students.title')}</option>
          <option value="courses">{t('courses.title')}</option>
          <option value="grades">{t('grades.title')}</option>
        </select>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="text"
          placeholder={t('common.searchPlaceholder') || `${t('common.search')} ${getSearchTypeLabel()}...`}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
            setShowRecent(false);
          }}
          onFocus={() => {
            setIsOpen(true);
            if (!searchQuery) {
              setShowRecent(true);
            }
          }}
          className="flex-1 px-3 py-2 text-sm text-gray-900 bg-transparent focus:outline-none"
          aria-label={t('common.search')}
          aria-expanded={isOpen}
          aria-controls="search-results"
        />

        {/* Clear Button */}
        {searchQuery && (
          <button
            onClick={handleClear}
            className="pr-3 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={t('common.clear')}
          >
            <X size={18} />
          </button>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="pr-3">
            <div className="animate-spin">
              <Search size={18} className="text-blue-500" />
            </div>
          </div>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div
          id="search-results"
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
        >
          {/* Search Results */}
          {searchQuery && searchResults.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50 border-b sticky top-0">
                {t('common.results')} ({searchResults.length})
              </div>
              <ul className="py-1">
                {searchResults.map((result: SearchResult) => (
                  <li key={`${result.type}-${result.id}`}>
                    <button
                      onClick={() => handleResultClick(result)}
                      className="w-full px-3 py-2 text-sm text-left text-gray-900 hover:bg-blue-50 transition-colors flex items-center justify-between"
                    >
                      <span className="flex-1 truncate">
                        {result.name}
                        {result.metadata?.email && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({result.metadata.email})
                          </span>
                        )}
                      </span>
                      <span className="ml-2 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {result.type}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* No Results Message */}
          {searchQuery && searchResults.length === 0 && !isLoading && (
            <div className="px-3 py-4 text-center text-sm text-gray-500">
              {t('common.noResults')}
            </div>
          )}

          {/* Favorite Saved Searches */}
          {!searchQuery && showRecent && getFavoriteSavedSearches().length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50 border-b flex items-center gap-1">
                <Heart size={12} className="text-red-500" />
                {t('search.favoriteSearches')}
              </div>
              <ul className="py-1">
                {getFavoriteSavedSearches().slice(0, 5).map((saved: SavedSearch) => (
                  <li key={saved.id}>
                    <button
                      onClick={() => {
                        setSearchQuery(saved.query || '');
                        handleSearchTypeChange(saved.search_type);
                        setIsOpen(false);
                      }}
                      className="w-full px-3 py-2 text-sm text-left text-gray-900 hover:bg-pink-50 transition-colors flex items-center gap-2"
                    >
                      <Heart size={14} className="text-red-500 flex-shrink-0" />
                      <span className="flex-1 truncate">{saved.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* All Saved Searches Link */}
          {!searchQuery && showRecent && savedSearches.length > 0 && (
            <div className="px-3 py-2 border-t">
              <button
                onClick={() => {
                  // This would trigger navigation to saved searches page
                  // Implementation depends on routing setup
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-1"
              >
                {t('search.viewAllSavedSearches')} ({savedSearches.length})
              </button>
            </div>
          )}

          {/* Empty State */}
          {!searchQuery && showRecent && savedSearches.length === 0 && (
            <div className="px-3 py-4 text-center text-sm text-gray-500">
              <Clock size={20} className="mx-auto mb-2 text-gray-400" />
              <p>{t('search.noSavedSearches')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
