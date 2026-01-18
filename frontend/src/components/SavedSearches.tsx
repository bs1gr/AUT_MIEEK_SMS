/**
 * SavedSearches - Component for managing saved/favorite searches.
 *
 * Features:
 * - Save current search with custom name
 * - View saved searches list
 * - Load saved search
 * - Delete saved search
 * - Persistent storage (localStorage)
 *
 * Author: AI Agent
 * Date: January 17, 2026
 * Version: 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StarIcon,
  TrashIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { SearchFilters } from '../hooks/useSearch';
import './SavedSearches.css';

interface SavedSearch {
  id: string;
  name: string;
  searchType: 'students' | 'courses' | 'grades';
  query: string;
  filters: SearchFilters;
  createdAt: number;
  lastUsed?: number;
}

interface SavedSearchesProps {
  searchType: 'students' | 'courses' | 'grades';
  currentQuery: string;
  currentFilters: SearchFilters;
  onLoadSearch: (query: string, filters: SearchFilters) => void;
  className?: string;
}

const STORAGE_KEY = 'sms_saved_searches';
const MAX_SAVED_SEARCHES = 10;

export const SavedSearches: React.FC<SavedSearchesProps> = ({
  searchType,
  currentQuery,
  currentFilters,
  onLoadSearch,
  className = ''
}) => {
  const { t } = useTranslation();
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newSearchName, setNewSearchName] = useState('');
  const [error, setError] = useState<string>('');

  /**
   * Load saved searches from localStorage
   */
  const loadSavedSearches = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const searches = JSON.parse(stored) as SavedSearch[];
        // Filter by search type and sort by last used
        const filtered = searches
          .filter(s => s.searchType === searchType)
          .sort((a, b) => (b.lastUsed || b.createdAt) - (a.lastUsed || a.createdAt));
        setSavedSearches(filtered);
      }
    } catch (err) {
      console.error('Error loading saved searches:', err);
      setError(t('search.saved.loadError'));
    }
  }, [searchType, t]);

  useEffect(() => {
    loadSavedSearches();
  }, [loadSavedSearches]);

  /**
   * Load saved searches from storage
   */
  // (Moved above to useCallback)

  /**
   * Save current search
   */
  const handleSaveSearch = () => {
    if (!newSearchName.trim()) {
      setError(t('search.saved.nameRequired'));
      return;
    }

    if (savedSearches.length >= MAX_SAVED_SEARCHES) {
      setError(t('search.saved.maxReached', { max: MAX_SAVED_SEARCHES }));
      return;
    }

    try {
      const allSearches = getAllSearches();
      const newSearch: SavedSearch = {
        id: `search_${Date.now()}`,
        name: newSearchName.trim(),
        searchType,
        query: currentQuery,
        filters: currentFilters,
        createdAt: Date.now(),
        lastUsed: Date.now()
      };

      allSearches.push(newSearch);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allSearches));

      setSavedSearches([newSearch, ...savedSearches]);
      setNewSearchName('');
      setShowSaveForm(false);
      setError('');
    } catch (err) {
      console.error('Error saving search:', err);
      setError(t('search.saved.saveError'));
    }
  };

  /**
   * Get all saved searches from storage
   */
  const getAllSearches = (): SavedSearch[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  /**
   * Load a saved search
   */
  const handleLoadSearch = (search: SavedSearch) => {
    try {
      // Update last used time
      const allSearches = getAllSearches();
      const updated = allSearches.map(s =>
        s.id === search.id ? { ...s, lastUsed: Date.now() } : s
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Call parent handler
      onLoadSearch(search.query, search.filters);

      // Update local state
      setSavedSearches(updated
        .filter(s => s.searchType === searchType)
        .sort((a, b) => (b.lastUsed || b.createdAt) - (a.lastUsed || a.createdAt))
      );

      setIsOpen(false);
    } catch (err) {
      console.error('Error loading search:', err);
      setError(t('search.saved.loadError'));
    }
  };

  /**
   * Delete a saved search
   */
  const handleDeleteSearch = (id: string) => {
    try {
      const allSearches = getAllSearches();
      const filtered = allSearches.filter(s => s.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

      setSavedSearches(savedSearches.filter(s => s.id !== id));
      setError('');
    } catch (err) {
      console.error('Error deleting search:', err);
      setError(t('search.saved.deleteError'));
    }
  };

  /**
   * Format time since last used
   */
  const formatTimeSince = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${t('search.saved.ago')}`;
    if (hours > 0) return `${hours}h ${t('search.saved.ago')}`;
    if (minutes > 0) return `${minutes}m ${t('search.saved.ago')}`;
    return `${t('search.saved.justNow')}`;
  };

  return (
    <div className={`saved-searches ${className}`}>
      {/* Saved searches button */}
      <button
        className={`saved-button ${isOpen ? 'open' : ''}`}
        onClick={() => {
          setIsOpen(!isOpen);
          setShowSaveForm(false);
        }}
        aria-expanded={isOpen}
        aria-label={t('search.saved.title')}
      >
        <StarIcon className="save-icon" />
        <span>{savedSearches.length}</span>
      </button>

      {/* Saved searches dropdown */}
      {isOpen && (
        <div className="saved-panel">
          <div className="saved-header">
            <h3>{t('search.saved.title')}</h3>
            <button
              className="close-button"
              onClick={() => {
                setIsOpen(false);
                setShowSaveForm(false);
              }}
              aria-label={t('common.close')}
            >
              <XMarkIcon className="close-icon" />
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="error-message" role="alert">
              {error}
              <button
                className="error-close"
                onClick={() => setError('')}
                aria-label={t('common.close')}
              >
                <XMarkIcon className="error-icon" />
              </button>
            </div>
          )}

          {/* Save current search form */}
          {showSaveForm ? (
            <div className="save-form">
              <input
                type="text"
                value={newSearchName}
                onChange={(e) => setNewSearchName(e.target.value)}
                placeholder={t('search.saved.enterName')}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleSaveSearch();
                }}
                autoFocus
              />
              <div className="form-buttons">
                <button
                  className="save-confirm-button"
                  onClick={handleSaveSearch}
                  disabled={!newSearchName.trim()}
                >
                  <CheckIcon className="check-icon" />
                  {t('common.save')}
                </button>
                <button
                  className="save-cancel-button"
                  onClick={() => {
                    setShowSaveForm(false);
                    setNewSearchName('');
                  }}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <button
              className="save-current-button"
              onClick={() => setShowSaveForm(true)}
              disabled={!currentQuery.trim()}
            >
              <PlusIcon className="plus-icon" />
              {t('search.saved.saveCurrent')}
            </button>
          )}

          {/* Saved searches list */}
          {savedSearches.length > 0 ? (
            <div className="searches-list">
              {savedSearches.map(search => (
                <div key={search.id} className="search-item">
                  <button
                    className="search-button"
                    onClick={() => handleLoadSearch(search)}
                    title={`Query: "${search.query}"`}
                  >
                    <StarIconSolid className="star-icon-solid" />
                    <div className="search-info">
                      <div className="search-name">{search.name}</div>
                      <div className="search-meta">
                        {search.query && (
                          <span className="search-query">&quot;{search.query}&quot;</span>
                        )}
                        {search.lastUsed && (
                          <span className="search-time">
                            {formatTimeSince(search.lastUsed)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  <button
                    className="delete-button"
                    onClick={() => handleDeleteSearch(search.id)}
                    aria-label={t('common.delete')}
                  >
                    <TrashIcon className="trash-icon" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>{t('search.saved.noSearches')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SavedSearches;
