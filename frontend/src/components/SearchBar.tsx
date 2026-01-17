/**
 * SearchBar - Advanced search input component with real-time suggestions.
 *
 * Features:
 * - Real-time autocomplete suggestions
 * - Debounced API calls
 * - Keyboard navigation (arrow keys, Enter, Escape)
 * - Support for different search types (students, courses, grades)
 * - Responsive design
 *
 * Author: AI Agent
 * Date: January 17, 2026
 * Version: 1.0.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import useSearch, { SearchSuggestion } from '../hooks/useSearch';
import './SearchBar.css';

interface SearchBarProps {
  searchType?: 'students' | 'courses' | 'grades';
  placeholder?: string;
  onSearch: (query: string) => void;
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  className?: string;
  showStats?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchType = 'students',
  placeholder,
  onSearch,
  onSuggestionSelect,
  className = '',
  showStats = false
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { suggestions, getSuggestionsDebounced, search, statistics } = useSearch(searchType);

  /**
   * Handle input change - trigger suggestion search
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    setQuery(value);
    setSelectedIndex(-1);

    if (value.trim()) {
      setShowSuggestions(true);
      getSuggestionsDebounced(value, 300);
    } else {
      setShowSuggestions(false);
    }
  };

  /**
   * Handle suggestion selection
   */
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    onSuggestionSelect?.(suggestion);
    search(suggestion.text);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim()) {
      setShowSuggestions(false);
      onSearch(query);
      search(query);
    }
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > -1 ? prev - 1 : -1);
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else if (query.trim()) {
          handleSubmit(e as React.FormEvent<HTMLFormElement>);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;

      default:
        break;
    }
  };

  /**
   * Clear input
   */
  const handleClear = () => {
    setQuery('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  /**
   * Close suggestions when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const defaultPlaceholder = t(`search.placeholder.${searchType}`);

  return (
    <div className={`search-bar-container ${className}`}>
      <form onSubmit={handleSubmit} className="search-bar">
        <div className="search-input-wrapper">
          <MagnifyingGlassIcon className="search-icon" />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => query && suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={placeholder || defaultPlaceholder}
            className="search-input"
            autoComplete="off"
            aria-label={t('search.ariaLabel')}
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
          />

          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="clear-button"
              aria-label={t('common.clear')}
            >
              <XMarkIcon className="clear-icon" />
            </button>
          )}

          <button
            type="submit"
            className="search-button"
            aria-label={t('search.search')}
          >
            {t('search.search')}
          </button>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div ref={suggestionsRef} className="suggestions-dropdown">
            <div className="suggestions-list">
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.id}`}
                  className={`suggestion-item ${
                    index === selectedIndex ? 'selected' : ''
                  }`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  role="option"
                  aria-selected={index === selectedIndex}
                  type="button"
                >
                  <span className="suggestion-icon">
                    {suggestion.type === 'student' ? '👤' : '📚'}
                  </span>
                  <span className="suggestion-text">{suggestion.text}</span>
                  <span className="suggestion-type">
                    {t(`search.type.${suggestion.type}`)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No suggestions message */}
        {showSuggestions && query && suggestions.length === 0 && (
          <div className="suggestions-dropdown">
            <div className="no-suggestions">
              {t('search.noSuggestions')}
            </div>
          </div>
        )}
      </form>

      {/* Statistics */}
      {showStats && (
        <div className="search-stats">
          <div className="stat-item">
            <span className="stat-label">{t('search.stats.students')}:</span>
            <span className="stat-value">{statistics.total_students}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">{t('search.stats.courses')}:</span>
            <span className="stat-value">{statistics.total_courses}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">{t('search.stats.grades')}:</span>
            <span className="stat-value">{statistics.total_grades}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
