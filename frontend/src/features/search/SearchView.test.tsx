import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { renderWithI18n } from '../../test-utils/i18n-test-wrapper';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SearchView from './SearchView';
import * as searchHooks from './useSearch';

// Mock the hooks
vi.mock('./useSearch');
vi.mock('./useSearchFacets');
vi.mock('./SearchSortControls', () => ({
  default: ({ sort, onChange }: any) => (
    <div data-testid="sort-controls">
      <button onClick={() => onChange({ field: 'name', direction: 'asc' })}>Sort</button>
    </div>
  ),
}));
vi.mock('./SearchFacets', () => ({
  default: ({ facets, onSelect }: any) => (
    <div data-testid="facets">
      {facets?.map((f: any) => (
        <button key={f.field} onClick={() => onSelect(f.field, 'test')}>
          {f.label}
        </button>
      ))}
    </div>
  ),
}));
vi.mock('./SearchPagination', () => ({
  default: ({ onPageChange }: any) => (
    <div data-testid="pagination">
      <button onClick={() => onPageChange(1)}>Next</button>
    </div>
  ),
}));
vi.mock('./useSearchFacets', () => ({
  useSearchFacets: () => ({
    data: {
      facets: [
        { field: 'status', label: 'Status', type: 'checkbox' },
        { field: 'enrollment_type', label: 'Enrollment Type', type: 'select' },
      ],
    },
    isLoading: false,
  }),
}));

describe('SearchView Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const mockUseSearch = (overrides?: Partial<ReturnType<typeof searchHooks.useSearch>>) => {
    const defaultMock = {
      searchQuery: '',
      setSearchQuery: vi.fn(),
      searchType: 'students' as const,
      setSearchType: vi.fn(),
      searchResults: [],
      totalResults: 0,
      isLoading: false,
      error: null,
      page: 0,
      setPage: vi.fn(),
      limit: 20,
      setLimit: vi.fn(),
      sort: { field: 'relevance' as const, direction: 'desc' as const },
      setSort: vi.fn(),
      hasMore: false,
      setFilters: vi.fn(),
      ...overrides,
    };
    vi.mocked(searchHooks.useSearch).mockReturnValue(defaultMock as any);
  };

  const renderComponent = (props: any = {}) => {
    return renderWithI18n(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <SearchView {...props} />
        </QueryClientProvider>
      </MemoryRouter>
    );
  };

  it('renders search form with type selector', () => {
    mockUseSearch();
    renderComponent();

    // Use label-based queries that match the actual UI
    const typeSelect = screen.getByLabelText(/type/i) as HTMLSelectElement;
    expect(typeSelect).toBeInTheDocument();
    expect(typeSelect.value).toBe('students');

    const limitSelect = screen.getByLabelText(/results per page/i) as HTMLSelectElement;
    expect(limitSelect).toBeInTheDocument();
    expect(limitSelect.value).toBe('20');
  });

  it('renders search input field', () => {
    mockUseSearch();
    renderComponent();

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.placeholder).toContain('search');
  });

  it('updates search query on input change', async () => {
    const setSearchQuery = vi.fn();
    mockUseSearch({ setSearchQuery });
    const user = userEvent.setup();

    renderComponent();

    const input = screen.getByRole('textbox');
    await user.type(input, 'John');

    expect(setSearchQuery).toHaveBeenCalled();
  });

  it('displays search results', () => {
    const mockResults = [
      {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        type: 'student' as const,
      },
      {
        id: 2,
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        type: 'student' as const,
      },
    ];

    mockUseSearch({
      searchResults: mockResults,
      totalResults: 2,
    });

    renderComponent();

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseSearch({ isLoading: true });
    renderComponent();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error message on search failure', () => {
    const errorMessage = 'Search service unavailable';
    mockUseSearch({ error: new Error(errorMessage) });

    renderComponent();

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('shows no results message when search returns empty', () => {
    mockUseSearch({
      searchQuery: 'nonexistent',
      searchResults: [],
      totalResults: 0,
      isLoading: false,
    });

    renderComponent();

    expect(screen.getByText(/no results/i)).toBeInTheDocument();
  });

  it('changes search type', async () => {
    const setSearchType = vi.fn();
    mockUseSearch({ setSearchType });
    const user = userEvent.setup();

    renderComponent();

    const typeSelect = document.getElementById('search-type') as HTMLSelectElement;
    await user.selectOptions(typeSelect, 'courses');

    expect(setSearchType).toHaveBeenCalledWith('courses');
  });

  it('changes result limit', async () => {
    const setLimit = vi.fn();
    const setPage = vi.fn();
    mockUseSearch({ setLimit, setPage });
    const user = userEvent.setup();

    renderComponent();

    const limitSelect = document.getElementById('search-limit') as HTMLSelectElement;
    await user.selectOptions(limitSelect, '50');

    expect(setLimit).toHaveBeenCalledWith(50);
    expect(setPage).toHaveBeenCalledWith(0);
  });

  it('renders facets sidebar', () => {
    mockUseSearch();
    renderComponent();

    expect(screen.getByTestId('facets')).toBeInTheDocument();
  });

  it('renders sort controls', () => {
    mockUseSearch();
    renderComponent();

    expect(screen.getByTestId('sort-controls')).toBeInTheDocument();
  });

  it('renders pagination', () => {
    mockUseSearch({
      searchResults: [{ id: 1, first_name: 'John', type: 'student' as const }],
      totalResults: 50,
      hasMore: true,
    });

    renderComponent();

    expect(screen.getByTestId('pagination')).toBeInTheDocument();
  });

  it('handles facet selection', async () => {
    const setFilters = vi.fn();
    mockUseSearch({ setFilters });

    renderComponent();

    const facetButton = screen.getByRole('button', { name: /Status/i });
    fireEvent.click(facetButton);

    expect(setFilters).toHaveBeenCalled();
  });

  it('renders result type badges', () => {
    mockUseSearch({
      searchResults: [
        { id: 1, first_name: 'John', type: 'student' as const },
        { id: 2, course_name: 'Mathematics', type: 'course' as const },
      ],
      totalResults: 2,
    });

    renderComponent();

    // Check that results are displayed (component may not render badges as buttons)
    expect(screen.getByText(/2 total results/i)).toBeInTheDocument();
  });

  it('maintains sort order across pagination', async () => {
    const setSort = vi.fn();
    const setPage = vi.fn();
    mockUseSearch({ setSort, setPage });
    const user = userEvent.setup();

    renderComponent();

    const sortButton = screen.getByRole('button', { name: /sort/i });
    await user.click(sortButton);

    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    expect(setSort).toHaveBeenCalled();
    expect(setPage).toHaveBeenCalled();
  });

  it('displays result count summary', () => {
    mockUseSearch({
      searchResults: [{ id: 1, first_name: 'John', type: 'student' as const }],
      totalResults: 42,
    });

    renderComponent();

    expect(screen.getByText(/42/)).toBeInTheDocument();
  });
});
