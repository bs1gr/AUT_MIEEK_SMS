import React from 'react';
import { useTranslation } from 'react-i18next';

interface SearchPaginationProps {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  onPageChange: (nextPage: number) => void;
  className?: string;
}

export const SearchPagination: React.FC<SearchPaginationProps> = ({
  page,
  limit,
  total,
  hasMore,
  onPageChange,
  className = '',
}) => {
  const { t } = useTranslation();

  const currentStart = total === 0 ? 0 : page * limit + 1;
  const currentEnd = Math.min(total, (page + 1) * limit);

  // Safe translation with fallback
  const rangeText = t('search:pagination.range', {
    defaultValue: `${currentStart}-${currentEnd} of ${total} results`,
    start: currentStart,
    end: currentEnd,
    total
  });

  const pageLabel = t('search:pageLabel', {
    defaultValue: `Page ${page + 1}`,
    page: page + 1
  });

  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <div className="text-sm text-gray-600">
        {rangeText}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white disabled:opacity-60 hover:bg-gray-50"
        >
          {t('common:previous', { defaultValue: 'Previous' })}
        </button>
        <span className="text-sm text-gray-700">{pageLabel}</span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasMore && (page + 1) * limit >= total}
          className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white disabled:opacity-60 hover:bg-gray-50"
        >
          {t('common:next', { defaultValue: 'Next' })}
        </button>
      </div>
    </div>
  );
};

export default SearchPagination;
