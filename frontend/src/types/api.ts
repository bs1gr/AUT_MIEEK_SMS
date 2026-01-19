/**
 * Type definitions for API responses and data models
 * Provides structured typing for all API interactions
 */

// API Response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    request_id?: string;
    timestamp?: string;
    version?: string;
  };
}

// Pagination types
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta?: {
    request_id?: string;
    timestamp?: string;
    version?: string;
    total: number;
    page: number;
    page_size: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

// Common entity types
export interface Student {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  [key: string]: unknown;
}

export interface Course {
  id: number;
  name: string;
  code: string;
  description?: string;
  [key: string]: unknown;
}

export interface Grade {
  id: number;
  student_id: number;
  course_id: number;
  grade: number;
  [key: string]: unknown;
}

export interface User {
  id: number;
  email: string;
  username?: string;
  role: string;
  [key: string]: unknown;
}

// Test-specific types
export type MockApiResponse<T> = Partial<ApiResponse<T>>;
export type ApiMockFunction = (...args: unknown[]) => unknown; // Using function type for test mocking compatibility
