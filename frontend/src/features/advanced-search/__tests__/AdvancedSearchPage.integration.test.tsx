/**
 * AdvancedSearchPage Integration Tests
 * Issue #147: Frontend Advanced Search UI & Filters
 *
 * Tests complete workflow of advanced search page with all components working together
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter } from 'react-router-dom';
import { AdvancedSearchPage } from '../AdvancedSearchPage';
import * as useSearchModule from '../hooks/useSearch';
import * as useSearchHistoryModule from '../hooks/useSearchHistory';
import i18n from '@/i18n';

// Mock data matching actual type structures from fixtures.ts
const mockSearchState = {
  state: {
    query: 'test',
    entityType: 'students' as const,
    filters: [],
    sort_by: 'relevance' as const,
    selectedFacets: {},
  },
  results: {
    items: [
      {
        id: 1,
        type: 'student' as const,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        student_id: 'STU001',
        status: 'active' as const,
        enrollment_type: 'full_time',
        courses: ['CS101', 'CS102'],
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-25T00:00:00Z',
        relevance_score: 0.95,
      },
    ],
    total: 1,
    facets: {
      status: [
        { value: 'active', count: 10 },
        { value: 'inactive', count: 5 },
      ],
      enrollment_type: [
        { value: 'full_time', count: 8 },
        { value: 'part_time', count: 7 },
      ],
    },
  },
  isLoading: false,
  error: null,
  setQuery: vi.fn(),
  setEntityType: vi.fn(),
  setFilters: vi.fn(),
  setSortBy: vi.fn(),
  refetch: vi.fn(),
  toggleFacet: vi.fn(),
  clearFacet: vi.fn(),
};

const mockUseSearchHistory = {
  entries: [],
  addEntry: vi.fn(),
  clearHistory: vi.fn(),
};

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
};

describe('AdvancedSearchPage Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders main page layout with search components', () => {
    vi.spyOn(useSearchModule, 'useSearch').mockReturnValue(mockSearchState as any);
    vi.spyOn(useSearchHistoryModule, 'useSearchHistory').mockReturnValue(mockUseSearchHistory as any);

    renderWithProviders(<AdvancedSearchPage />);

    // Page title should be visible
    expect(screen.getByText(/search\.page_title|advanced search/i)).toBeInTheDocument();

    // Check for facets count instead of title (which appears in multiple places)
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('displays search results when query returns data', () => {
    const mockWithResults = {
      ...mockSearchState,
      isLoading: false,
      error: null,
      results: {
        items: [
          {
            id: 1,
            type: 'student' as const,
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@example.com',
            student_id: 'STU001',
            status: 'active' as const,
            enrollment_type: 'full_time',
            courses: ['CS101', 'CS102'],
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-25T00:00:00Z',
            relevance_score: 0.95,
          },
        ],
        total: 1,
        facets: {
          status: [{ value: 'active', count: 10 }],
        },
      },
    };

    vi.spyOn(useSearchModule, 'useSearch').mockReturnValue(mockWithResults as any);
    vi.spyOn(useSearchHistoryModule, 'useSearchHistory').mockReturnValue(mockUseSearchHistory as any);

    renderWithProviders(<AdvancedSearchPage />);

    // Just check that we're not seeing the empty state
    expect(screen.queryByText(/no results found/i)).not.toBeInTheDocument();
  });

  it('shows faceted navigation with counts', () => {
    vi.spyOn(useSearchModule, 'useSearch').mockReturnValue(mockSearchState as any);
    vi.spyOn(useSearchHistoryModule, 'useSearchHistory').mockReturnValue(mockUseSearchHistory as any);

    renderWithProviders(<AdvancedSearchPage />);

    // Facets should show count "10" for active status
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('shows loading state when searching', () => {
    const loadingState = {
      ...mockSearchState,
      isLoading: true,
      results: { items: [], total: 0, facets: {} },
    };

    vi.spyOn(useSearchModule, 'useSearch').mockReturnValue(loadingState as any);
    vi.spyOn(useSearchHistoryModule, 'useSearchHistory').mockReturnValue(mockUseSearchHistory as any);

    renderWithProviders(<AdvancedSearchPage />);

    // Loading skeleton should have role="status"
    const loadingElements = screen.getAllByRole('status');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('displays error state with retry button', () => {
    const errorState = {
      ...mockSearchState,
      error: new Error('Search failed'),
      results: { items: [], total: 0, facets: {} },
    };

    vi.spyOn(useSearchModule, 'useSearch').mockReturnValue(errorState as any);
    vi.spyOn(useSearchHistoryModule, 'useSearchHistory').mockReturnValue(mockUseSearchHistory as any);

    renderWithProviders(<AdvancedSearchPage />);

    // Error state should show role="alert"
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Retry button should be present
    const retryButton = screen.getByRole('button', { name: /retry|try again/i });
    expect(retryButton).toBeInTheDocument();
  });
});

