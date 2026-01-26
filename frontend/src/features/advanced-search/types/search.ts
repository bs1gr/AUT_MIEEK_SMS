/**
 * Advanced Search Types & Interfaces
 * Issue #147: Frontend Advanced Search UI & Filters
 *
 * Type definitions for search queries, results, filters, and related data structures.
 */

/**
 * Search query parameters for API requests
 */
export interface SearchQuery {
  q: string; // Search query string
  entity_type?: 'students' | 'courses' | 'grades' | 'all'; // Entity type filter
  filters: FilterCondition[]; // Advanced filter conditions
  sort_by?: 'relevance' | 'name' | 'created_at' | 'updated_at'; // Sort field
  sort_order?: 'asc' | 'desc'; // Sort order
  page: number; // Page number (1-indexed)
  page_size: number; // Results per page
}

/**
 * Filter condition for advanced search
 */
export interface FilterCondition {
  field: string; // Field name to filter on
  operator: FilterOperator; // Comparison operator
  value: string | number | [number, number]; // Filter value (single or range)
}

/**
 * Supported filter operators
 */
export type FilterOperator =
  | 'equals'
  | 'contains'
  | 'startsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'between'
  | 'isEmpty'
  | 'isNotEmpty';

/**
 * Search result wrapper from API
 */
export interface SearchResult<T = SearchResultItem> {
  success: boolean;
  data?: SearchResultData<T>;
  error?: SearchError;
}

/**
 * Search result data payload
 */
export interface SearchResultData<T = SearchResultItem> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  facets: Record<string, FacetValue[]>;
}

/**
 * Facet value with count
 */
export interface FacetValue {
  value: string | number;
  count: number;
  selected?: boolean;
}

/**
 * Search error response
 */
export interface SearchError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Search result item (student, course, or grade)
 */
export type SearchResultItem = StudentSearchResult | CourseSearchResult | GradeSearchResult;

/**
 * Student search result
 */
export interface StudentSearchResult {
  id: number;
  type: 'student';
  first_name: string;
  last_name: string;
  email: string;
  student_id: string;
  status: 'active' | 'inactive' | 'graduated';
  enrollment_type: string;
  courses: string[];
  created_at: string;
  updated_at: string;
  relevance_score?: number;
}

/**
 * Course search result
 */
export interface CourseSearchResult {
  id: number;
  type: 'course';
  code: string;
  name: string;
  description?: string;
  instructor: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  relevance_score?: number;
}

/**
 * Grade search result
 */
export interface GradeSearchResult {
  id: number;
  type: 'grade';
  student_id: number;
  student_name: string;
  course_id: number;
  course_code: string;
  grade: string;
  points: number;
  created_at: string;
  updated_at: string;
  relevance_score?: number;
}

/**
 * Saved search record
 */
export interface SavedSearch {
  id: number;
  name: string;
  description?: string;
  query: SearchQuery;
  is_favorite: boolean;
  result_count?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Search history entry
 */
export interface SearchHistoryEntry {
  id: string;
  query: string;
  entity_type?: string;
  timestamp: number;
}

/**
 * Advanced search page state
 */
export interface AdvancedSearchState {
  query: string;
  entityType: 'students' | 'courses' | 'grades' | 'all';
  filters: FilterCondition[];
  sortBy: 'relevance' | 'name' | 'created_at' | 'updated_at';
  sortOrder: 'asc' | 'desc';
  currentPage: number;
  pageSize: number;
  results?: SearchResultData;
  isLoading: boolean;
  error?: SearchError;
  selectedFacets: Record<string, string[]>;
}

/**
 * Filter field definition
 */
export interface FilterFieldDef {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'range';
  operators: FilterOperator[];
  options?: { value: string | number; label: string }[];
  placeholder?: string;
}

/**
 * Available filter fields by entity type
 */
export const FILTER_FIELDS: Record<string, FilterFieldDef[]> = {
  students: [
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      operators: ['equals'],
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'graduated', label: 'Graduated' },
      ],
    },
    {
      name: 'enrollment_type',
      label: 'Enrollment Type',
      type: 'select',
      operators: ['equals'],
      options: [
        { value: 'full_time', label: 'Full Time' },
        { value: 'part_time', label: 'Part Time' },
      ],
    },
    {
      name: 'created_at',
      label: 'Created Date',
      type: 'date',
      operators: ['greaterThan', 'lessThan', 'between'],
    },
  ],
  courses: [
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      operators: ['equals'],
      options: [
        { value: 'active', label: 'Active' },
        { value: 'archived', label: 'Archived' },
      ],
    },
    {
      name: 'code',
      label: 'Course Code',
      type: 'text',
      operators: ['equals', 'startsWith'],
      placeholder: 'e.g., CS101',
    },
  ],
  grades: [
    {
      name: 'grade',
      label: 'Grade',
      type: 'select',
      operators: ['equals'],
      options: [
        { value: 'A', label: 'A' },
        { value: 'B', label: 'B' },
        { value: 'C', label: 'C' },
        { value: 'D', label: 'D' },
        { value: 'F', label: 'F' },
      ],
    },
    {
      name: 'points',
      label: 'Points',
      type: 'number',
      operators: ['greaterThan', 'lessThan', 'between'],
    },
  ],
};
