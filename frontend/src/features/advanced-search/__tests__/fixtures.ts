/**
 * Advanced Search Test Utilities & Fixtures
 * Issue #147: Frontend Advanced Search UI & Filters
 *
 * Helper functions and fixtures for testing advanced search components.
 */

import {
  SearchQuery,
  SearchResult,
  SearchResultData,
  StudentSearchResult,
  CourseSearchResult,
  FilterCondition,
} from '../types/search';

/**
 * Mock search results for testing
 */
export const mockStudentResults: StudentSearchResult[] = [
  {
    id: 1,
    type: 'student',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    student_id: 'STU001',
    status: 'active',
    enrollment_type: 'full_time',
    courses: ['CS101', 'CS102'],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-25T00:00:00Z',
    relevance_score: 0.95,
  },
  {
    id: 2,
    type: 'student',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@example.com',
    student_id: 'STU002',
    status: 'active',
    enrollment_type: 'part_time',
    courses: ['CS101', 'CS103'],
    created_at: '2025-01-02T00:00:00Z',
    updated_at: '2025-01-25T00:00:00Z',
    relevance_score: 0.85,
  },
];

export const mockCourseResults: CourseSearchResult[] = [
  {
    id: 101,
    type: 'course',
    code: 'CS101',
    name: 'Introduction to Computer Science',
    description: 'Learn the basics of computer science',
    instructor: 'Prof. Smith',
    status: 'active',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-25T00:00:00Z',
    relevance_score: 0.9,
  },
  {
    id: 102,
    type: 'course',
    code: 'CS102',
    name: 'Data Structures',
    description: 'Learn about arrays, linked lists, trees, and graphs',
    instructor: 'Prof. Johnson',
    status: 'active',
    created_at: '2025-01-03T00:00:00Z',
    updated_at: '2025-01-25T00:00:00Z',
    relevance_score: 0.88,
  },
];

/**
 * Create mock search result
 */
export const createMockSearchResult = <T,>(
  items: T[],
  total: number = items.length
): SearchResult<T> => ({
  success: true,
  data: {
    items,
    total,
    page: 1,
    page_size: 20,
    facets: {
      status: [
        { value: 'active', count: 5 },
        { value: 'inactive', count: 2 },
      ],
      enrollment_type: [
        { value: 'full_time', count: 6 },
        { value: 'part_time', count: 1 },
      ],
    },
  },
});

/**
 * Create mock filter condition
 */
export const createMockFilter = (
  field: string,
  operator: string = 'equals',
  value: string | number = 'test'
): FilterCondition => ({
  field,
  operator: operator as any,
  value,
});

/**
 * Create mock search query
 */
export const createMockSearchQuery = (overrides?: Partial<SearchQuery>): SearchQuery => ({
  q: 'test',
  entity_type: 'all',
  filters: [],
  sort_by: 'relevance',
  sort_order: 'desc',
  page: 1,
  page_size: 20,
  ...overrides,
});
