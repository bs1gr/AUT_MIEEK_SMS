import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { SearchBar } from './SearchBar';
import * as useSearchModule from './useSearch';

type UseSearchReturn = ReturnType<typeof useSearchModule.useSearch>;

const baseUseSearchReturn: UseSearchReturn = {
  searchQuery: '',
  setSearchQuery: vi.fn(),
  searchType: 'students',
  setSearchType: vi.fn(),
  filters: [],
  setFilters: vi.fn(),
  debouncedQuery: '',
  page: 0,
  setPage: vi.fn(),
  limit: 20,
  setLimit: vi.fn(),
  sort: { field: 'relevance', direction: 'desc' },
  setSort: vi.fn(),
  searchResults: [],
  totalResults: 0,
  hasMore: false,
  isLoading: false,
  error: null,
  savedSearches: [],
  loadingSavedSearches: false,
  createSavedSearch: vi.fn(),
  deleteSavedSearch: vi.fn(),
  toggleFavoriteSavedSearch: vi.fn(),
  loadSavedSearch: vi.fn(),
  addFilter: vi.fn(),
  removeFilter: vi.fn(),
  updateFilter: vi.fn(),
  clearSearch: vi.fn(),
};

// Mock translations
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock the useSearch hook
vi.mock('./useSearch', () => ({
  useSearch: vi.fn(() => baseUseSearchReturn),
}));

describe('SearchBar Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should render search input', () => {
    render(<SearchBar />, { wrapper });

    const input = screen.getByRole('textbox', { name: /search/i });
    expect(input).toBeInTheDocument();
  });

  it('should render search type selector on desktop', () => {
    render(<SearchBar />, { wrapper });

    const selector = screen.getByRole('combobox', { name: /searchType/i });
    expect(selector).toBeInTheDocument();
  });

  it('should call onSelectResult when a result is clicked', async () => {
    const mockOnSelectResult = vi.fn();
    const mockSearchResults = [
      { id: 1, name: 'John Doe', type: 'student' as const, metadata: {} },
    ];

    vi.mocked(useSearchModule.useSearch).mockReturnValue({
      ...baseUseSearchReturn,
      searchQuery: 'john',
      debouncedQuery: 'john',
      searchResults: mockSearchResults,
      totalResults: 1,
      isLoading: false,
    });

    render(<SearchBar onSelectResult={mockOnSelectResult} />, { wrapper });

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);

    const result = await screen.findByText('John Doe');
    fireEvent.click(result);

    expect(mockOnSelectResult).toHaveBeenCalledWith(mockSearchResults[0]);
  });

  it('should call onSearchTypeChange when search type changes', async () => {
    const mockOnSearchTypeChange = vi.fn();
    const { _rerender } = render(
      <SearchBar onSearchTypeChange={mockOnSearchTypeChange} />,
      { wrapper }
    );

    const selector = screen.getByRole('combobox');
    fireEvent.change(selector, { target: { value: 'courses' } });

    expect(mockOnSearchTypeChange).toHaveBeenCalledWith('courses');
  });

  it('should show loading indicator when searching', async () => {
    vi.mocked(useSearchModule.useSearch).mockReturnValue({
      ...baseUseSearchReturn,
      searchQuery: 'john',
      debouncedQuery: 'john',
      searchResults: [],
      totalResults: 0,
      isLoading: true,
    });

    render(<SearchBar />, { wrapper });

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('results')).toBeInTheDocument();
    });
  });

  it('should show clear button when query is not empty', () => {
    const { rerender } = render(<SearchBar />, { wrapper });

    vi.mocked(useSearchModule.useSearch).mockReturnValue({
      ...baseUseSearchReturn,
      searchQuery: 'test',
      debouncedQuery: 'test',
    });

    rerender(<SearchBar />);

    const clearButton = screen.getByRole('button', { name: /clear/i });
    expect(clearButton).toBeInTheDocument();
  });

  it('should display saved searches when dropdown is open', async () => {
    const mockSavedSearches = [
      {
        id: 1,
        name: 'My Saved Search',
        search_type: 'students' as const,
        query: 'test',
        is_favorite: true,
        created_at: '2026-01-22T10:00:00Z',
        updated_at: '2026-01-22T10:00:00Z',
      },
    ];

    vi.mocked(useSearchModule.useSearch).mockReturnValue({
      ...baseUseSearchReturn,
      savedSearches: mockSavedSearches,
    });

    render(<SearchBar />, { wrapper });

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('My Saved Search')).toBeInTheDocument();
    });
  });

  it('should close dropdown when clicking outside', async () => {
    render(
      <div>
        <SearchBar />
        <div data-testid="outside">Outside element</div>
      </div>,
      { wrapper }
    );

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);

    const outside = screen.getByTestId('outside');
    fireEvent.mouseDown(outside);

    // Dropdown should be closed (no longer visible)
    const dropdown = screen.queryByRole('listbox');
    expect(dropdown).not.toBeInTheDocument();
  });

  it('should apply autofocus when autoFocus prop is true', () => {
    render(<SearchBar autoFocus={true} />, { wrapper });

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(document.activeElement).toBe(input);
  });
});
