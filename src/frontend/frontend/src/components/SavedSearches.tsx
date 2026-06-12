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

export interface SavedSearch {
  id: string;
  name: string;
  searchType: 'students' | 'courses' | 'grades';
  query: string;
  filters: SearchFilters;
  createdAt: number;
  lastUsed?: number;
  // Legacy compatibility for earlier data shape
  timestamp?: number;
}

interface SavedSearchesProps {
  searchType: 'students' | 'courses' | 'grades';
  currentQuery: string;
  currentFilters: SearchFilters;
  onLoadSearch: (search: SavedSearch) => void;
  className?: string;
}

const STORAGE_KEY = 'sms_saved_searches';
const MAX_SAVED_SEARCHES = 10;

type SavedSearchMap = Record<SavedSearch['searchType'], SavedSearch[]>;

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
        const parsed = JSON.parse(stored);
        const byType: SavedSearchMap = Array.isArray(parsed)
          ? parsed.reduce((acc: SavedSearchMap, item: SavedSearch) => {
              const type = item.searchType || searchType;
              acc[type] = acc[type] ? [...acc[type], item] : [item];
              return acc;
            }, { students: [], courses: [], grades: [] } as SavedSearchMap)
          : (parsed as SavedSearchMap);

        const normalized = (byType[searchType] || []).map((item) => ({
          ...item,
          searchType: item.searchType || searchType,
          createdAt:
            item.createdAt ||
            (item as unknown as { timestamp?: number }).timestamp ||
            Date.now(),
          lastUsed: item.lastUsed ||
            item.createdAt ||
            (item as unknown as { timestamp?: number }).timestamp ||
            Date.now()
        }));

        const filtered = normalized
          .sort((a, b) => (b.lastUsed || b.createdAt) - (a.lastUsed || a.createdAt));

        setSavedSearches(filtered);
      }
    } catch (err) {
      console.error('Error loading saved searches:', err);
      setSavedSearches([]);
      setError(t('search.saved.loadError', { defaultValue: 'Error loading saved searches' }));
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
      setError(t('search.saved.nameRequired', { defaultValue: 'Name required' }));
      return;
    }

    if (savedSearches.length >= MAX_SAVED_SEARCHES) {
      setError(
        t('search.saved.maxReached', {
          max: MAX_SAVED_SEARCHES,
          defaultValue: 'Maximum saved searches reached'
        })
      );
      return;
    }

    try {
      const allSearches = getAllSearches();
      const forType = allSearches[searchType] || [];
      const now = Date.now();
      const newSearch: SavedSearch = {
        id: `search_${now}`,
        name: newSearchName.trim(),
        searchType,
        query: currentQuery,
        filters: currentFilters,
        createdAt: now,
        lastUsed: now,
        // Backward compatibility for legacy tests that expect `timestamp`
        timestamp: now
      };

      const updatedForType = [newSearch, ...forType];
      allSearches[searchType] = updatedForType.slice(0, MAX_SAVED_SEARCHES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allSearches));

      setSavedSearches(updatedForType.slice(0, MAX_SAVED_SEARCHES));
      setNewSearchName('');
      setShowSaveForm(false);
      setError('');
    } catch (err) {
      console.error('Error saving search:', err);
      setError(t('search.saved.saveError', { defaultValue: 'Failed to save search' }));
    }
  };

  /**
   * Get all saved searches from storage
   */
  const getAllSearches = (): SavedSearchMap => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return { students: [], courses: [], grades: [] };

      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.reduce((acc: SavedSearchMap, item: SavedSearch) => {
          const type = item.searchType || searchType;
          acc[type] = acc[type] ? [...acc[type], item] : [item];
          return acc;
        }, { students: [], courses: [], grades: [] } as SavedSearchMap);
      }

      return parsed as SavedSearchMap;
    } catch {
      return { students: [], courses: [], grades: [] };
    }
  };

  /**
   * Load a saved search
   */
  const handleLoadSearch = (search: SavedSearch) => {
    try {
      // Update last used time
      const now = Date.now();
      const allSearches = getAllSearches();
      const updatedForType = (allSearches[searchType] || []).map((s) =>
        s.id === search.id ? { ...s, lastUsed: now, timestamp: now } : s
      );
      allSearches[searchType] = updatedForType;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allSearches));

      // Call parent handler
      onLoadSearch({ ...search, lastUsed: now, timestamp: now });

      // Update local state
      setSavedSearches(
        updatedForType.sort(
          (a, b) => (b.lastUsed || b.createdAt) - (a.lastUsed || a.createdAt)
        )
      );

      setIsOpen(false);
    } catch (err) {
      console.error('Error loading search:', err);
      setError(t('search.saved.loadError', { defaultValue: 'Error loading saved searches' }));
    }
  };

  /**
   * Delete a saved search
   */
  const handleDeleteSearch = (id: string) => {
    try {
      const allSearches = getAllSearches();
      const filtered = (allSearches[searchType] || []).filter(s => s.id !== id);
      allSearches[searchType] = filtered;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allSearches));

      setSavedSearches(filtered);
      setError('');
    } catch (err) {
      console.error('Error deleting search:', err);
      setError(t('search.saved.deleteError', { defaultValue: 'Failed to delete search' }));
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

    if (days > 0)
      return `${days}d ${t('search.saved.ago', { defaultValue: 'ago' })}`;
    if (hours > 0)
      return `${hours}h ${t('search.saved.ago', { defaultValue: 'ago' })}`;
    if (minutes > 0)
      return `${minutes}m ${t('search.saved.ago', { defaultValue: 'ago' })}`;
    return `${t('search.saved.justNow', { defaultValue: 'Just now' })}`;
  };

  return (
    <div className={`saved-searches ${className}`}>
      {/* Saved searches button */}
      <button
        className={`saved-button ${isOpen ? 'open' : ''}`}
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          setShowSaveForm(next);
        }}
        aria-expanded={isOpen}
        aria-label={t('search.saved.toggle', { defaultValue: 'Search history' })}
      >
        <StarIcon className="save-icon" />
        <span>{savedSearches.length}</span>
      </button>

      {/* Saved searches dropdown */}
      {isOpen && (
        <div className="saved-panel">
          <div className="saved-header">
            <h3>{t('search.saved.title', { defaultValue: 'Saved Searches' })}</h3>
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
                placeholder={t('search.saved.enterName', { defaultValue: 'Save search name' })}
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
                aria-label={t('common.save')}
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
              aria-label={t('search.saved.saveCurrent', { defaultValue: 'Save current search' })}
            >
              <PlusIcon className="plus-icon" />
              {t('search.saved.saveCurrent', { defaultValue: 'Save current search' })}
            </button>
          )}

          {/* Saved searches list */}
          {savedSearches.length > 0 ? (
            <div className="searches-list" role="list" aria-label={t('search.saved.title', { defaultValue: 'Saved Searches' })}>
              {savedSearches.map((search) => (
                <div key={search.id} className="search-item" role="listitem">
                  <button
                    className="search-button"
                    onClick={() => handleLoadSearch(search)}
                    title={`Query: "${search.query}"`}
                    aria-label={t('search.saved.loadSearch', { defaultValue: 'Load saved search' })}
                  >
                    <StarIconSolid className="star-icon-solid" />
                    <div className="search-info">
                      <div className="search-name">{search.name}</div>
                      <div className="search-meta">
                        {search.query && (
                          <span className="search-query">&quot;{search.query}&quot;</span>
                        )}
                        {(search.lastUsed || search.createdAt) && (
                          <span className="search-time">
                            {formatTimeSince(search.lastUsed || search.createdAt)}
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
              <p>{t('search.saved.noSearches', { defaultValue: 'No saved searches yet' })}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SavedSearches;
