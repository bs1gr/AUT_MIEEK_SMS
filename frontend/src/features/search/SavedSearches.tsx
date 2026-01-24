import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Heart as HeartIcon, Trash2, Search, Clock } from 'lucide-react';
import { useSearch, type SavedSearch } from './useSearch';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { useRateLimit } from '../../hooks/useRateLimit';

interface SavedSearchesProps {
  onLoadSearch?: (search: SavedSearch) => void;
  className?: string;
}

/**
 * SavedSearches component for managing user's saved searches
 * Features:
 * - List all saved searches
 * - Filter by search type
 * - Toggle favorite status
 * - Load saved search
 * - Delete saved search
 * - Show search metadata (type, date created)
 */
export const SavedSearches: React.FC<SavedSearchesProps> = ({
  onLoadSearch,
  className = '',
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<'all' | 'students' | 'courses' | 'grades'>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const { isRateLimited, call } = useRateLimit(1000); // 1 second cooldown

  const {
    savedSearches,
    loadingSavedSearches,
    deleteSavedSearch,
    toggleFavoriteSavedSearch,
    loadSavedSearch,
  } = useSearch();

  // Mutation for deleting saved search
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSavedSearch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
    },
  });

  // Mutation for toggling favorite
  const toggleFavoriteMutation = useMutation({
    mutationFn: (id: number) => toggleFavoriteSavedSearch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
    },
  });

  const handleLoadSearch = (search: SavedSearch) => {
    loadSavedSearch(search);
    onLoadSearch?.(search);
  };

  const handleToggleFavorite = (id: number) => {
    call(() => toggleFavoriteMutation.mutate(id));
  };

  const handleDelete = (id: number) => {
    if (window.confirm(t('search.confirmDeleteSearch'))) {
      call(() => deleteMutation.mutate(id));
    }
  };

  // Filter searches
  const filteredSearches = useMemo(() => (savedSearches || []).filter((search: SavedSearch) => {
    if (showFavoritesOnly && !search.is_favorite) return false;
    if (filterType !== 'all' && search.search_type !== filterType) return false;
    return true;
  }), [savedSearches, showFavoritesOnly, filterType]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(t('locale') || 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getSearchTypeLabel = (type: string) => {
    switch (type) {
      case 'students':
        return t('students.title');
      case 'courses':
        return t('courses.title');
      case 'grades':
        return t('grades.title');
      default:
        return type;
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {t('search.savedSearches')}
        </h2>
        <p className="text-sm text-gray-600">
          {t('search.savedSearchesDescription')}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Type Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as 'all' | 'students' | 'courses' | 'grades')}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label={t('search.filterByType')}
        >
          <option value="all">{t('common.all')}</option>
          <option value="students">{t('students.title')}</option>
          <option value="courses">{t('courses.title')}</option>
          <option value="grades">{t('grades.title')}</option>
        </select>

        {/* Favorites Toggle */}
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
            showFavoritesOnly
              ? 'bg-pink-50 border-pink-300 text-pink-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <HeartIcon size={16} className={showFavoritesOnly ? 'fill-current' : ''} />
          <span>{t('search.favoritesOnly')}</span>
        </button>
      </div>

      {/* Loading State */}
      {loadingSavedSearches && (
        <div className="py-4">
          <SkeletonLoader rows={3} />
        </div>
      )}

      {/* Empty State */}
      {!loadingSavedSearches && filteredSearches.length === 0 && (
        <div className="text-center py-8 px-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
          <Search size={48} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600 font-medium">
            {showFavoritesOnly
              ? t('search.noFavoriteSearches')
              : t('search.noSavedSearches')}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {t('search.createFirstSearch')}
          </p>
        </div>
      )}

      {/* Saved Searches List */}
      {!loadingSavedSearches && filteredSearches.length > 0 && (
        <div className="space-y-3">
          {filteredSearches.map((search: SavedSearch) => (
            <div
              key={search.id}
              className="p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                {/* Left: Search Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-gray-900 truncate">
                      {search.name}
                    </h3>
                    <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                      {getSearchTypeLabel(search.search_type)}
                    </span>
                  </div>

                  {search.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {search.description}
                    </p>
                  )}

                  {search.query && (
                    <p className="text-sm text-gray-500 italic mb-2">
                      &quot;{search.query}&quot;
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{formatDate(search.created_at)}</span>
                    </div>
                    {search.filters && (
                      <span className="px-2 py-0.5 bg-gray-100 rounded">
                        {Object.keys(search.filters).length} {t('search.filters')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                  {/* Favorite Toggle */}
                  <button
                    onClick={() => handleToggleFavorite(search.id)}
                    disabled={toggleFavoriteMutation.isPending || isRateLimited}
                    className={`p-2 rounded-lg transition-colors ${
                      search.is_favorite
                        ? 'text-red-500 bg-red-50 hover:bg-red-100'
                        : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                    }`}
                    aria-label={t('search.toggleFavorite')}
                  >
                    <HeartIcon
                      size={18}
                      className={search.is_favorite ? 'fill-current' : ''}
                    />
                  </button>

                  {/* Load Search */}
                  <button
                    onClick={() => handleLoadSearch(search)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    aria-label={t('search.loadSearch')}
                  >
                    <Search size={18} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(search.id)}
                    disabled={deleteMutation.isPending || isRateLimited}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label={t('common.delete')}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results Count */}
      {!loadingSavedSearches && filteredSearches.length > 0 && (
        <div className="mt-4 text-center text-sm text-gray-600">
          {t('search.showingSearches', {
            count: filteredSearches.length,
            total: savedSearches.length,
          })}
        </div>
      )}
    </div>
  );
};

export default SavedSearches;
