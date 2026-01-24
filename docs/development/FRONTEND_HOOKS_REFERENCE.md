# Frontend Hooks Reference

This document provides a reference for the custom hooks available in the Student Management System frontend, including those introduced in $11.18.0.

## Core Hooks

### `useRateLimit`

**Location:** `src/hooks/useRateLimit.ts`

Prevents rapid-fire execution of functions (e.g., double form submissions).

```typescript
const { isRateLimited, call } = useRateLimit(delayMs);

// Usage
call(() => saveData());

```text
### `useErrorRecovery`

**Location:** `src/hooks/useErrorRecovery.ts`

Manages error state and retry logic with exponential backoff strategies.

```typescript
const { error, handleError, retry, reset } = useErrorRecovery({
  strategy: 'backoff',
  maxRetries: 3,
  onRetry: () => refetch()
});

```text
### `usePerformanceMonitor`

**Location:** `src/hooks/usePerformanceMonitor.ts`

Logs component render times in development mode to identify performance bottlenecks.

```typescript
usePerformanceMonitor('ComponentName');

```text
### `useVirtualScroll`

**Location:** `src/hooks/useVirtualScroll.ts`

Calculates visible items for large lists to improve rendering performance.

```typescript
const { startIndex, endIndex, offsetY, totalHeight } = useVirtualScroll({
  itemHeight: 50,
  containerHeight: 600,
  itemsCount: 1000
});

```text
## Feature Hooks

### `useStudents`

**Location:** `src/features/students/useStudents.ts`

Manages student data fetching, caching, and mutations (CRUD).

```typescript
const { students, isLoading, createStudent, updateStudent } = useStudents();

```text
### `useSearch`

**Location:** `src/features/search/useSearch.ts`

Manages global search state, filters, and saved searches.

```typescript
const { filters, addFilter, savedSearches } = useSearch();

```text
## Utility Hooks

### `useToast`

**Location:** `src/hooks/useToast.ts`

Manages toast notifications for user feedback.

### `useModal`

**Location:** `src/hooks/useModal.ts`

Manages modal open/close state.

---
**Note:** Always prefer using these hooks over implementing raw logic in components to ensure consistency and testability.

