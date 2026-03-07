import { useState, useCallback } from 'react';
import { SearchHistoryEntry } from '@/features/advanced-search/types/search';
import { safeLocalStorage, ErrorHandler } from '@/utils/errorHandling';

const STORAGE_KEY = 'sms.search.history';
const MAX_ENTRIES = 10;

function loadHistory(): SearchHistoryEntry[] {
  try {
    const parsed = safeLocalStorage<SearchHistoryEntry[]>('get', STORAGE_KEY);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    ErrorHandler.logError(error, { operation: 'loadSearchHistory' });
    return [];
  }
}

function saveHistory(entries: SearchHistoryEntry[]): void {
  try {
    safeLocalStorage('set', STORAGE_KEY, entries);
  } catch (error) {
    ErrorHandler.logError(error, { operation: 'saveSearchHistory' });
  }
}

export const useSearchHistory = () => {
  const [entries, setEntries] = useState<SearchHistoryEntry[]>(() => loadHistory());

  const addEntry = useCallback((query: string, entity_type?: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newEntry: SearchHistoryEntry = {
      id,
      query,
      entity_type,
      timestamp: Date.now(),
    };
    setEntries((prev) => {
      const next = [newEntry, ...prev.filter((e) => e.query !== query)].slice(0, MAX_ENTRIES);
      saveHistory(next);
      return next;
    });
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveHistory(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setEntries([]);
    saveHistory([]);
  }, []);

  return {
    entries,
    addEntry,
    removeEntry,
    clearAll,
  };
};
