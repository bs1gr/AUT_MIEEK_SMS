# Phase 4 STEP 7-9: Advanced Search Features Implementation Guide

**Version**: 1.17.6 (Starting Jan 30, 2026)
**Status**: 🚀 IN PROGRESS
**Estimated Duration**: 16 hours total
**Scope**: STEP 7 (FacetedNavigation), STEP 8 (SearchHistory), STEP 9 (AdvancedQueryBuilder)

---

## 📋 Overview

This document provides detailed specifications and implementation guidance for the three optional advanced search features that extend Phase 4 Issue #142:

### Context
- **Phase 4 Core** (STEPs 1-6): ✅ COMPLETE - PR #150 merged Jan 26
- **Phase 4 Performance** (Issue #149): ✅ COMPLETE - Production ready with 380ms p95
- **Phase 4 Optional** (STEPs 7-9): 🚀 STARTING NOW

### High-Level Features

| STEP | Feature | Purpose | Complexity | Hours |
|------|---------|---------|------------|-------|
| 7 | **FacetedNavigation** | Sidebar with filtered facets | High | 5-6 |
| 8 | **SearchHistory** | Track & manage search history | Medium | 3-4 |
| 9 | **AdvancedQueryBuilder** | Complex query construction UI | High | 5-6 |

---

## 🎯 STEP 7: FacetedNavigation Component

### Purpose
Implement a faceted search sidebar that displays dynamic facet counts and allows filtering by multiple dimensions simultaneously.

### Key Features

#### 1. **Facet Display**
- Display available facets (status, enrollment type, grade range, created date, etc.)
- Show count of results for each facet value
- Hierarchical facets (e.g., grade: A, B, C, D, F)
- Collapsible facet categories

#### 2. **Facet Filtering**
- Multi-select facet values
- Real-time facet count updates as filters change
- "Show more" expand button for facets with many values
- Clear facet filters option

#### 3. **Facet Analytics**
- Popular facet combinations
- Suggested facet filters based on query
- "Trending" facets indicator

### File Structure
```
frontend/src/features/advanced-search/
├── components/
│   ├── FacetedNavigation.tsx          (main container, 250+ lines)
│   ├── FacetCategory.tsx              (facet group, 180+ lines)
│   ├── FacetValue.tsx                 (individual facet, 120+ lines)
│   └── FacetSelector.tsx              (facet UI, 150+ lines)
├── hooks/
│   └── useFacets.ts                   (facet logic, 200+ lines)
├── services/
│   └── facet-service.ts               (API + business logic, 300+ lines)
└── __tests__/
    ├── FacetedNavigation.test.tsx      (15+ tests)
    ├── FacetCategory.test.tsx          (12+ tests)
    └── useFacets.test.ts               (18+ tests)
```

### Backend Support Required
- `/api/v1/students/facets` - GET facets for students
- `/api/v1/courses/facets` - GET facets for courses
- Response format:
```json
{
  "facets": {
    "status": {
      "label": "Status",
      "values": [
        { "value": "active", "count": 245, "selected": false },
        { "value": "inactive", "count": 12, "selected": false }
      ]
    },
    "enrollmentType": { ... },
    "gradeRange": { ... }
  }
}
```

### Acceptance Criteria
- [ ] FacetedNavigation renders with 5+ facet categories
- [ ] Multi-select facet filtering works
- [ ] Facet counts update in real-time
- [ ] Hierarchical facets display correctly
- [ ] Keyboard navigation supported
- [ ] 45+ test cases passing
- [ ] i18n support (EN/EL) complete
- [ ] Performance: Facet updates < 200ms

---

## 🎯 STEP 8: SearchHistory Component

### Purpose
Implement persistent search history tracking and management for improved user experience.

### Key Features

#### 1. **History Tracking**
- Automatically record all searches
- Store: query, filters, sort, results count, timestamp
- Limit to 50 most recent searches per user
- Optional: sync across sessions

#### 2. **History Management**
- Display history timeline/list
- Search in history
- Delete individual searches
- Clear all history option
- Pin/star favorite searches
- Duplicate detection (don't record identical searches)

#### 3. **Quick Access**
- Recent searches dropdown in SearchBar
- Most frequent searches section
- Time-based grouping (Today, Yesterday, This Week, etc.)
- Quick re-execute saved search

### File Structure
```
frontend/src/features/advanced-search/
├── components/
│   ├── SearchHistory.tsx              (main container, 200+ lines)
│   ├── HistoryItem.tsx                (single entry, 120+ lines)
│   ├── HistoryTimeline.tsx            (timeline view, 180+ lines)
│   └── HistoryStats.tsx               (analytics, 100+ lines)
├── hooks/
│   └── useSearchHistory.ts            (hook + logic, 250+ lines)
├── services/
│   └── search-history-service.ts      (API + persistence, 400+ lines)
└── __tests__/
    ├── SearchHistory.test.tsx         (12+ tests)
    ├── useSearchHistory.test.ts       (20+ tests)
    └── search-history-service.test.ts (15+ tests)
```

### Backend Support Required
- `/api/v1/search/history` - GET user's search history
- `POST /api/v1/search/history` - Record new search
- `DELETE /api/v1/search/history/:id` - Delete entry
- `DELETE /api/v1/search/history` - Clear all
- `PATCH /api/v1/search/history/:id/pin` - Pin/unpin search

### Database Changes
New table: `SearchHistory`
```sql
CREATE TABLE search_history (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL (FK: users.id),
    entity_type VARCHAR(50),  -- 'student', 'course', 'grade'
    query TEXT,
    filters JSONB,
    sort_by VARCHAR(50),
    result_count INT,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMP,
    executed_at TIMESTAMP,
    deleted_at TIMESTAMP (soft delete),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Acceptance Criteria
- [ ] Searches automatically recorded in history
- [ ] History displays in reverse chronological order
- [ ] History persists across sessions
- [ ] Delete/clear history functions work
- [ ] Time-based grouping displays correctly
- [ ] Pin/star functionality works
- [ ] Recent searches dropdown accessible
- [ ] 47+ test cases passing
- [ ] i18n support (EN/EL) complete
- [ ] Performance: Load history < 300ms

---

## 🎯 STEP 9: AdvancedQueryBuilder Component

### Purpose
Implement an advanced UI for constructing complex multi-criteria queries without writing code.

### Key Features

#### 1. **Query Builder Interface**
- Visual query construction with AND/OR logic
- Drag-and-drop filter reordering
- Grouping with parentheses (AND (filter1 OR filter2) AND filter3)
- Undo/redo functionality
- Query preview showing generated search

#### 2. **Query Templates**
- Pre-built common queries (e.g., "Active Students", "Low Performers")
- Save custom queries as templates
- Template library with descriptions
- Share templates with other users

#### 3. **Query Operators**
- Field-specific operators (equals, contains, between, greater than, etc.)
- Type-aware input validation
- Autocomplete suggestions
- Query syntax help/documentation

#### 4. **Advanced Options**
- Filter combinations visualization
- Query complexity indicator
- Performance estimation
- Results preview

### File Structure
```
frontend/src/features/advanced-search/
├── components/
│   ├── AdvancedQueryBuilder.tsx       (main container, 300+ lines)
│   ├── QueryCondition.tsx             (single condition, 200+ lines)
│   ├── ConditionGroup.tsx             (grouped conditions, 180+ lines)
│   ├── QueryPreview.tsx               (visual preview, 150+ lines)
│   └── QueryTemplates.tsx             (template library, 200+ lines)
├── hooks/
│   ├── useQueryBuilder.ts             (builder logic, 350+ lines)
│   └── useQueryTemplates.ts           (template logic, 250+ lines)
├── services/
│   └── query-builder-service.ts       (API + business logic, 400+ lines)
├── utils/
│   ├── query-parser.ts                (parse query to UI, 200+ lines)
│   ├── query-generator.ts             (UI to API format, 200+ lines)
│   └── query-validator.ts             (validation logic, 150+ lines)
└── __tests__/
    ├── AdvancedQueryBuilder.test.tsx  (18+ tests)
    ├── QueryCondition.test.tsx        (12+ tests)
    ├── useQueryBuilder.test.ts        (25+ tests)
    └── query-*-service.test.ts        (45+ tests)
```

### Backend Support Required
- `/api/v1/query-templates` - GET available templates
- `POST /api/v1/query-templates` - Create custom template
- `PATCH /api/v1/query-templates/:id` - Update template
- `DELETE /api/v1/query-templates/:id` - Delete template
- `/api/v1/search/preview` - Preview results without executing

### Database Changes
New table: `QueryTemplate`
```sql
CREATE TABLE query_template (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL (FK: users.id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    entity_type VARCHAR(50),  -- 'student', 'course', 'grade'
    query_structure JSONB,    -- Serialized query object
    is_public BOOLEAN DEFAULT false,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP (soft delete),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Acceptance Criteria
- [ ] Query builder renders with drag-drop support
- [ ] AND/OR logic works correctly
- [ ] Query preview generates valid API queries
- [ ] Template library functions
- [ ] Save/load templates works
- [ ] Undo/redo functionality works
- [ ] Query validation prevents invalid queries
- [ ] 60+ test cases passing
- [ ] i18n support (EN/EL) complete
- [ ] Performance: Query generation < 100ms

---

## 📊 Implementation Timeline

### Phase 1: Foundation (Days 1-2, 4-5 hours)
- [ ] Backend API endpoints for facets (STEP 7)
- [ ] Database migrations for search_history and query_template tables
- [ ] Schema exports and Pydantic models
- [ ] 20+ backend integration tests

### Phase 2: STEP 7 Frontend (Days 2-3, 5-6 hours)
- [ ] FacetedNavigation component structure
- [ ] Facet display and filtering logic
- [ ] Real-time facet count updates
- [ ] Integration with AdvancedSearchPage
- [ ] i18n translation keys (EN/EL)
- [ ] 45+ unit and integration tests

### Phase 3: STEP 8 Frontend (Days 3-4, 3-4 hours)
- [ ] SearchHistory data model and service
- [ ] History tracking in useSearch hook
- [ ] SearchHistory UI components
- [ ] Time-based grouping and display
- [ ] Pin/favorite functionality
- [ ] i18n translation keys (EN/EL)
- [ ] 47+ unit and integration tests

### Phase 4: STEP 9 Frontend (Days 4-5, 5-6 hours)
- [ ] AdvancedQueryBuilder component
- [ ] Query parser and generator utils
- [ ] Template library UI
- [ ] Drag-and-drop reordering
- [ ] Query preview and validation
- [ ] i18n translation keys (EN/EL)
- [ ] 60+ unit and integration tests

### Phase 5: Integration & Testing (Days 5-6, 2-3 hours)
- [ ] E2E tests for all three features
- [ ] Performance profiling and optimization
- [ ] Cross-browser compatibility testing
- [ ] Accessibility audit (WCAG 2.1)
- [ ] Final smoke tests

### Phase 6: Documentation & Cleanup (Days 6-7, 1-2 hours)
- [ ] Update user documentation
- [ ] Update developer guide
- [ ] Create feature overview
- [ ] Version increment (v1.17.6 → v1.17.6)
- [ ] Final commit and tag

---

## 💻 Development Workflow

### For Each STEP:
1. **Specification Review**: Verify requirements understood
2. **Backend API**: Implement endpoints and tests (if needed)
3. **Data Model**: Define types, interfaces, services
4. **Components**: Build UI components and hooks
5. **Tests**: Write comprehensive test coverage
6. **i18n**: Add translation keys (EN/EL)
7. **Integration**: Wire into AdvancedSearchPage
8. **Validation**: Run full test suite and smoke tests

### Branch Strategy
```
main (stable)
  └── feature/phase4-step7-9-advanced
      ├── step7/faceted-navigation (feature branch)
      ├── step8/search-history (feature branch)
      └── step9/query-builder (feature branch)
```

### Commit Convention
```
feat(advanced-search): Add STEP 7 FacetedNavigation component

- Implement FacetedNavigation container component
- Add FacetCategory and FacetValue sub-components
- Create useFacets custom hook with filtering logic
- Add 45+ test cases covering all functionality
- Support i18n for EN/EL translations

Closes #142 (STEP 7)
```

---

## 🧪 Testing Strategy

### Unit Tests (Per Component/Hook)
- Component rendering in different states
- Props validation and error handling
- Event handlers (click, change, keyboard)
- Conditional rendering logic
- API response handling

### Integration Tests
- Complete user workflows
- Component interactions
- State management flows
- Error recovery scenarios
- Performance benchmarks

### E2E Tests
- Full search workflows with new features
- Multi-step operations (create, search, save, share)
- Accessibility compliance
- Cross-browser consistency

### Test Coverage Goals
- **Unit**: > 90% code coverage
- **Integration**: 100% feature coverage
- **E2E**: 100% critical path coverage
- **Overall**: > 85% codebase coverage

---

## 📝 i18n Keys Required

### STEP 7: FacetedNavigation
```javascript
facets: {
  title: "Search Filters",
  showMore: "Show {{count}} more",
  showLess: "Show less",
  clearAll: "Clear all filters",
  noResults: "No facets available",
  categories: {
    status: "Status",
    enrollmentType: "Enrollment Type",
    gradeRange: "Grade Range",
    createdDate: "Created Date"
  }
}
```

### STEP 8: SearchHistory
```javascript
history: {
  title: "Search History",
  recent: "Recent Searches",
  today: "Today",
  yesterday: "Yesterday",
  thisWeek: "This Week",
  older: "Older",
  empty: "No searches yet",
  clearAll: "Clear all history",
  delete: "Delete search",
  pin: "Pin search",
  unpin: "Unpin search",
  resultCount: "{{count}} result"
}
```

### STEP 9: AdvancedQueryBuilder
```javascript
queryBuilder: {
  title: "Advanced Query Builder",
  preview: "Query Preview",
  templates: "Query Templates",
  addCondition: "Add condition",
  addGroup: "Add group",
  and: "AND",
  or: "OR",
  clear: "Clear query",
  undo: "Undo",
  redo: "Redo",
  execute: "Search",
  saveTemplate: "Save as template",
  templates: "Browse templates",
  empty: "No query built yet"
}
```

---

## ✅ Success Criteria

### Overall
- [ ] All 3 STEPs implemented with full feature set
- [ ] 152+ test cases passing (45 + 47 + 60)
- [ ] No regressions (all Phase 4 core features still work)
- [ ] Performance: Each feature responds in < 300ms
- [ ] i18n complete for EN/EL languages
- [ ] No console errors or warnings
- [ ] Accessibility: WCAG 2.1 AA compliant
- [ ] Documentation complete and updated

### Quality Metrics
- Code coverage: > 85%
- Test pass rate: 100%
- E2E test pass rate: 100%
- Linting: 0 errors
- Type checking: 0 errors
- Bundle size impact: < 50KB gzipped

---

## 🚀 Next Steps

1. ✅ Review this specification
2. 🔄 Implement STEP 7: FacetedNavigation (6 hours)
3. 🔄 Implement STEP 8: SearchHistory (4 hours)
4. 🔄 Implement STEP 9: AdvancedQueryBuilder (6 hours)
5. 🔄 Integration & Testing (3 hours)
6. 📦 Create PR and merge to main
7. 🚀 Release v1.17.6

---

## 📚 Related Documentation

- Phase 4 Work Plan: [docs/plans/UNIFIED_WORK_PLAN.md](docs/plans/UNIFIED_WORK_PLAN.md)
- Issue #142: Advanced Search & Filtering
- Backend API: [backend/API_PERMISSIONS_REFERENCE.md](backend/API_PERMISSIONS_REFERENCE.md)
- Frontend Architecture: [docs/development/ARCHITECTURE.md](docs/development/ARCHITECTURE.md)

---

**Document Created**: January 30, 2026
**Last Updated**: January 30, 2026
**Status**: 🟢 Ready for Implementation
