import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { SavedSearches } from '../SavedSearches';
import * as useSearchModule from '../useSearch';

// Mock translations
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (key === 'search.showingSearches') {
        return `Showing ${options?.count} of ${options?.total} searches`;
      }
      return key;
    },
  }),
}));

// Mock the useSearch hook
vi.mock('../useSearch', () => ({
  useSearch: vi.fn(() => ({
    savedSearches: [],
    loadingSavedSearches: false,
    deleteSavedSearch: vi.fn(),
    toggleFavoriteSavedSearch: vi.fn(),
    loadSavedSearch: vi.fn(),
  })),
}));

describe('SavedSearches Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should render component with header', () => {
    render(<SavedSearches />, { wrapper });

    expect(screen.getByText('search.savedSearches')).toBeInTheDocument();
    expect(screen.getByText('search.savedSearchesDescription')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    vi.mocked(useSearchModule.useSearch).mockReturnValue({
      savedSearches: [],
      loadingSavedSearches: true,
      deleteSavedSearch: vi.fn(),
      toggleFavoriteSavedSearch: vi.fn(),
      loadSavedSearch: vi.fn(),
    } as any);

    render(<SavedSearches />, { wrapper });

    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });

  it('should show empty state when no searches', () => {
    render(<SavedSearches />, { wrapper });

    expect(screen.getByText('search.noSavedSearches')).toBeInTheDocument();
    expect(screen.getByText('search.createFirstSearch')).toBeInTheDocument();
  });

  it('should render list of saved searches', () => {
    const mockSearches = [
      {
        id: 1,
        name: 'My Search',
        description: 'Test description',
        search_type: 'students' as const,
        query: 'john',
        is_favorite: false,
        created_at: '2026-01-22T10:00:00Z',
        updated_at: '2026-01-22T10:00:00Z',
      },
      {
        id: 2,
        name: 'Another Search',
        search_type: 'courses' as const,
        query: 'math',
        is_favorite: true,
        created_at: '2026-01-21T10:00:00Z',
        updated_at: '2026-01-21T10:00:00Z',
      },
    ];

    vi.mocked(useSearchModule.useSearch).mockReturnValue({
      savedSearches: mockSearches,
      loadingSavedSearches: false,
      deleteSavedSearch: vi.fn(),
      toggleFavoriteSavedSearch: vi.fn(),
      loadSavedSearch: vi.fn(),
    } as any);

    render(<SavedSearches />, { wrapper });

    expect(screen.getByText('My Search')).toBeInTheDocument();
    expect(screen.getByText('Another Search')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('should filter by search type', async () => {
    const mockSearches = [
      {
        id: 1,
        name: 'Student Search',
        search_type: 'students' as const,
        query: 'john',
        is_favorite: false,
        created_at: '2026-01-22T10:00:00Z',
        updated_at: '2026-01-22T10:00:00Z',
      },
      {
        id: 2,
        name: 'Course Search',
        search_type: 'courses' as const,
        query: 'math',
        is_favorite: false,
        created_at: '2026-01-21T10:00:00Z',
        updated_at: '2026-01-21T10:00:00Z',
      },
    ];

    vi.mocked(useSearchModule.useSearch).mockReturnValue({
      savedSearches: mockSearches,
      loadingSavedSearches: false,
      deleteSavedSearch: vi.fn(),
      toggleFavoriteSavedSearch: vi.fn(),
      loadSavedSearch: vi.fn(),
    } as any);

    render(<SavedSearches />, { wrapper });

    const typeFilter = screen.getByRole('combobox', { name: /search.filterByType/i });
    fireEvent.change(typeFilter, { target: { value: 'students' } });

    await waitFor(() => {
      expect(screen.getByText('Student Search')).toBeInTheDocument();
      expect(screen.queryByText('Course Search')).not.toBeInTheDocument();
    });
  });

  it('should filter by favorites only', async () => {
    const mockSearches = [
      {
        id: 1,
        name: 'Favorite Search',
        search_type: 'students' as const,
        query: 'john',
        is_favorite: true,
        created_at: '2026-01-22T10:00:00Z',
        updated_at: '2026-01-22T10:00:00Z',
      },
      {
        id: 2,
        name: 'Regular Search',
        search_type: 'students' as const,
        query: 'jane',
        is_favorite: false,
        created_at: '2026-01-21T10:00:00Z',
        updated_at: '2026-01-21T10:00:00Z',
      },
    ];

    vi.mocked(useSearchModule.useSearch).mockReturnValue({
      savedSearches: mockSearches,
      loadingSavedSearches: false,
      deleteSavedSearch: vi.fn(),
      toggleFavoriteSavedSearch: vi.fn(),
      loadSavedSearch: vi.fn(),
    } as any);

    render(<SavedSearches />, { wrapper });

    const favoritesButton = screen.getByText('search.favoritesOnly');
    fireEvent.click(favoritesButton);

    await waitFor(() => {
      expect(screen.getByText('Favorite Search')).toBeInTheDocument();
      expect(screen.queryByText('Regular Search')).not.toBeInTheDocument();
    });
  });

  it('should call onLoadSearch when load button clicked', async () => {
    const mockOnLoadSearch = vi.fn();
    const mockLoadSavedSearch = vi.fn();
    const mockSearch = {
      id: 1,
      name: 'My Search',
      search_type: 'students' as const,
      query: 'john',
      is_favorite: false,
      created_at: '2026-01-22T10:00:00Z',
      updated_at: '2026-01-22T10:00:00Z',
    };

    vi.mocked(useSearchModule.useSearch).mockReturnValue({
      savedSearches: [mockSearch],
      loadingSavedSearches: false,
      deleteSavedSearch: vi.fn(),
      toggleFavoriteSavedSearch: vi.fn(),
      loadSavedSearch: mockLoadSavedSearch,
    } as any);

    render(<SavedSearches onLoadSearch={mockOnLoadSearch} />, { wrapper });

    const loadButton = screen.getByRole('button', { name: /search.loadSearch/i });
    fireEvent.click(loadButton);

    expect(mockLoadSavedSearch).toHaveBeenCalledWith(mockSearch);
    expect(mockOnLoadSearch).toHaveBeenCalledWith(mockSearch);
  });

  it('should toggle favorite when heart button clicked', async () => {
    const mockToggleFavorite = vi.fn().mockResolvedValue({});
    const mockSearch = {
      id: 1,
      name: 'My Search',
      search_type: 'students' as const,
      query: 'john',
      is_favorite: false,
      created_at: '2026-01-22T10:00:00Z',
      updated_at: '2026-01-22T10:00:00Z',
    };

    vi.mocked(useSearchModule.useSearch).mockReturnValue({
      savedSearches: [mockSearch],
      loadingSavedSearches: false,
      deleteSavedSearch: vi.fn(),
      toggleFavoriteSavedSearch: mockToggleFavorite,
      loadSavedSearch: vi.fn(),
    } as any);

    render(<SavedSearches />, { wrapper });

    const favoriteButton = screen.getByRole('button', { name: /search.toggleFavorite/i });
    fireEvent.click(favoriteButton);

    await waitFor(() => {
      expect(mockToggleFavorite).toHaveBeenCalledWith(1);
    });
  });

  it('should delete search after confirmation', async () => {
    const mockDeleteSavedSearch = vi.fn().mockResolvedValue({});
    const mockSearch = {
      id: 1,
      name: 'My Search',
      search_type: 'students' as const,
      query: 'john',
      is_favorite: false,
      created_at: '2026-01-22T10:00:00Z',
      updated_at: '2026-01-22T10:00:00Z',
    };

    vi.mocked(useSearchModule.useSearch).mockReturnValue({
      savedSearches: [mockSearch],
      loadingSavedSearches: false,
      deleteSavedSearch: mockDeleteSavedSearch,
      toggleFavoriteSavedSearch: vi.fn(),
      loadSavedSearch: vi.fn(),
    } as any);

    // Mock window.confirm
    global.confirm = vi.fn(() => true);

    render(<SavedSearches />, { wrapper });

    const deleteButton = screen.getByRole('button', { name: /common.delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteSavedSearch).toHaveBeenCalledWith(1);
    });
  });

  it('should show results count', () => {
    const mockSearches = [
      {
        id: 1,
        name: 'Search 1',
        search_type: 'students' as const,
        query: 'john',
        is_favorite: false,
        created_at: '2026-01-22T10:00:00Z',
        updated_at: '2026-01-22T10:00:00Z',
      },
      {
        id: 2,
        name: 'Search 2',
        search_type: 'courses' as const,
        query: 'math',
        is_favorite: false,
        created_at: '2026-01-21T10:00:00Z',
        updated_at: '2026-01-21T10:00:00Z',
      },
    ];

    vi.mocked(useSearchModule.useSearch).mockReturnValue({
      savedSearches: mockSearches,
      loadingSavedSearches: false,
      deleteSavedSearch: vi.fn(),
      toggleFavoriteSavedSearch: vi.fn(),
      loadSavedSearch: vi.fn(),
    } as any);

    render(<SavedSearches />, { wrapper });

    expect(screen.getByText(/Showing 2 of 2 searches/i)).toBeInTheDocument();
  });
});
