import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

/**
 * Props for SearchBar component
 */
interface SearchBarProps {
  /** Current search query */
  query: string;
  /** Callback when query changes */
  onQueryChange: (query: string) => void;
  /** Current entity type filter */
  entityType: 'students' | 'courses' | 'grades' | 'all';
  /** Callback when entity type changes */
  onEntityTypeChange: (type: 'students' | 'courses' | 'grades' | 'all') => void;
  /** Callback when search is submitted */
  onSearch?: (query: string) => void;
  /** Search history items */
  searchHistory?: string[];
  /** Callback when history item selected */
  onHistorySelect?: (query: string) => void;
  /** Show search history dropdown */
  showHistory?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Debounce delay in ms */
  debounceMs?: number;
  /** CSS class name */
  className?: string;
  /** Is loading state */
  isLoading?: boolean;
  /** Auto-focus on mount */
  autoFocus?: boolean;
}

/**
 * SearchBar Component
 *
 * Provides real-time search input with:
 * - Entity type selector (students/courses/grades/all)
 * - 300ms debounce
 * - Clear button
 * - Search history dropdown
 * - Keyboard navigation (arrow keys, Enter)
 * - Full accessibility (ARIA labels, semantic HTML)
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState('');
 * const [entityType, setEntityType] = useState('all');
 *
 * <SearchBar
 *   query={query}
 *   onQueryChange={setQuery}
 *   entityType={entityType}
 *   onEntityTypeChange={setEntityType}
 *   searchHistory={history}
 * />
 * ```
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onQueryChange,
  entityType,
  onEntityTypeChange,
  onSearch,
  searchHistory = [],
  onHistorySelect,
  showHistory = true,
  placeholder,
  debounceMs = 300,
  className = '',
  isLoading = false,
  autoFocus = false,
}) => {
  const { t } = useTranslation();
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Default placeholder from i18n if not provided
  const defaultPlaceholder = placeholder || t('search.search_placeholder', 'Search students, courses, grades...');

  /**
   * Handle input change with debounce
   */
  const handleInputChange = useCallback(
    (value: string) => {
      onQueryChange(value);
      setHighlightedIndex(-1);

      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounce timer for search callback
      if (onSearch) {
        debounceTimerRef.current = setTimeout(() => {
          onSearch(value);
        }, debounceMs);
      }
    },
    [onQueryChange, onSearch, debounceMs]
  );

  /**
   * Handle clear button click
   */
  const handleClear = useCallback(() => {
    onQueryChange('');
    setHighlightedIndex(-1);
    setShowHistoryDropdown(false);
    inputRef.current?.focus();
  }, [onQueryChange]);

  /**
   * Handle entity type change
   */
  const handleEntityTypeChange = useCallback(
    (newType: string) => {
      onEntityTypeChange(newType as 'students' | 'courses' | 'grades' | 'all');
      inputRef.current?.focus();
    },
    [onEntityTypeChange]
  );

  /**
   * Handle history item selection
   */
  const handleHistorySelect = useCallback(
    (historyQuery: string) => {
      onQueryChange(historyQuery);
      if (onHistorySelect) {
        onHistorySelect(historyQuery);
      }
      setShowHistoryDropdown(false);
      setHighlightedIndex(-1);
      if (onSearch) {
        onSearch(historyQuery);
      }
    },
    [onQueryChange, onHistorySelect, onSearch]
  );

  /**
   * Handle keyboard navigation in history dropdown
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const historyItems = searchHistory.filter((_, i) => i < 5); // Show max 5 items

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setShowHistoryDropdown(true);
          setHighlightedIndex((prev) =>
            prev < historyItems.length - 1 ? prev + 1 : prev
          );
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (highlightedIndex > 0) {
            setHighlightedIndex(highlightedIndex - 1);
          }
          break;

        case 'Enter':
          e.preventDefault();
          if (showHistoryDropdown && highlightedIndex >= 0) {
            handleHistorySelect(historyItems[highlightedIndex]);
          } else if (onSearch) {
            onSearch(query);
          }
          break;

        case 'Escape':
          e.preventDefault();
          setShowHistoryDropdown(false);
          setHighlightedIndex(-1);
          break;

        default:
          break;
      }
    },
    [searchHistory, highlightedIndex, showHistoryDropdown, query, onSearch, handleHistorySelect]
  );

  /**
   * Focus input on mount if autoFocus is true
   */
  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  /**
   * Close history dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowHistoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`search-bar ${className}`} data-testid="search-bar">
      <div className="flex gap-2 items-end">
        {/* Search Input */}
        <div className="flex-1 relative">
          <label
            htmlFor="search-input"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t('search.search_label', 'Search')}
          </label>
          <div className="relative">
            <MagnifyingGlassIcon
              className="absolute left-3 top-3 h-5 w-5 text-gray-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              id="search-input"
              type="text"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (showHistory && searchHistory.length > 0) {
                  setShowHistoryDropdown(true);
                }
              }}
              placeholder={defaultPlaceholder}
              aria-label={t('search.search_aria_label', 'Search for students, courses, or grades')}
              aria-autocomplete="list"
              aria-expanded={showHistoryDropdown && searchHistory.length > 0}
              aria-controls="search-history-dropdown"
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              disabled={isLoading}
              data-testid="search-input"
            />
            {query && (
              <button
                onClick={handleClear}
                aria-label={t('search.clear_search', 'Clear search')}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                data-testid="clear-button"
              >
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Search History Dropdown */}
          {showHistoryDropdown && searchHistory.length > 0 && (
            <ul
              id="search-history-dropdown"
              className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
              role="listbox"
              data-testid="search-history-dropdown"
            >
              {searchHistory.slice(0, 5).map((item, index) => (
                <li
                  key={`${item}-${index}`}
                  className={`px-3 py-2 cursor-pointer transition-colors ${
                    index === highlightedIndex
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => handleHistorySelect(item)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  role="option"
                  aria-selected={index === highlightedIndex}
                  data-testid={`search-history-item-${index}`}
                >
                  <div className="flex items-center gap-2">
                    <MagnifyingGlassIcon className="h-4 w-4" aria-hidden="true" />
                    <span>{item}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Entity Type Selector */}
        <div>
          <label
            htmlFor="entity-type-select"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t('search.filter_by_type', 'Type')}
          </label>
          <select
            id="entity-type-select"
            value={entityType}
            onChange={(e) => handleEntityTypeChange(e.target.value)}
            aria-label={t('search.entity_type_aria_label', 'Filter by entity type')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            disabled={isLoading}
            data-testid="entity-type-select"
          >
            <option value="all">{t('search.all_types', 'All')}</option>
            <option value="students">{t('search.students', 'Students')}</option>
            <option value="courses">{t('search.courses', 'Courses')}</option>
            <option value="grades">{t('search.grades', 'Grades')}</option>
          </select>
        </div>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div
          className="mt-2 text-sm text-gray-500"
          role="status"
          aria-label={t('search.loading', 'Loading search results')}
          data-testid="loading-indicator"
        >
          {t('search.searching', 'Searching...')}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
