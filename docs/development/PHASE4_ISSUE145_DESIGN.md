# Phase 4 Issue #145: Backend Full-Text Search API & Filters

**Issue**: #145
**Feature**: #142 (Advanced Search & Filtering)
**Status**: 🔄 IN PROGRESS - Design Phase
**Date Started**: January 25, 2026
**Target Completion**: February 8, 2026

---

## 📋 Overview

Implement a comprehensive full-text search API with advanced filtering, sorting, and pagination for the student management system. This will enable users to quickly find students by multiple criteria with ranked results.

---

## 🎯 Acceptance Criteria

- [ ] Full-text search endpoint returns ranked results
- [ ] Advanced filters (status, enrollment type, date ranges) apply correctly
- [ ] Sorting works on relevance, name, created/updated dates
- [ ] Pagination with indexes performs well (< 500ms for typical queries)
- [ ] 100% unit/integration test coverage
- [ ] Database indexes optimized for search performance
- [ ] Comprehensive error handling
- [ ] Full API documentation (OpenAPI/Swagger)

---

## 🏗️ Architecture Design

### 1. Database Schema & Indexes

**Existing Tables**:
- `student` - Core student data
- `enrollment` - Student-course relationships
- `course` - Course information

**New Search Indexes** (to be created via migration):

```sql
-- Full-text search index on student names and email
CREATE INDEX idx_student_fulltext ON student USING GIN (
    to_tsvector('english',
        COALESCE(first_name, '') || ' ' ||
        COALESCE(last_name, '') || ' ' ||
        COALESCE(email, '')
    )
);

-- Status filtering index
CREATE INDEX idx_student_status ON student(status);

-- Date range filtering indexes
CREATE INDEX idx_student_created_at ON student(created_at DESC);
CREATE INDEX idx_student_updated_at ON student(updated_at DESC);

-- Enrollment type filtering
CREATE INDEX idx_enrollment_type ON enrollment(enrollment_type);

-- Composite index for complex queries
CREATE INDEX idx_student_search_composite ON student(
    status,
    created_at DESC,
    id
) WHERE deleted_at IS NULL;
```

### 2. API Endpoints

#### Endpoint 1: Basic Full-Text Search

```
POST /api/v1/students/search
Content-Type: application/json

Request:
{
    "query": "John Doe",
    "limit": 20,
    "offset": 0
}

Response (200 OK):
{
    "success": true,
    "data": {
        "results": [
            {
                "id": 1,
                "first_name": "John",
                "last_name": "Doe",
                "email": "john.doe@example.com",
                "status": "active",
                "relevance_score": 0.95,
                "created_at": "2025-09-01T10:00:00Z"
            }
        ],
        "total": 1,
        "limit": 20,
        "offset": 0,
        "has_more": false
    },
    "meta": {
        "request_id": "req_abc123",
        "timestamp": "2026-01-25T10:00:00Z"
    }
}
```

#### Endpoint 2: Advanced Search with Filters

```
POST /api/v1/students/advanced-search
Content-Type: application/json

Request:
{
    "query": "John",
    "filters": {
        "status": "active",
        "enrollment_type": "full-time",
        "created_after": "2025-09-01",
        "created_before": "2025-12-31"
    },
    "sort": {
        "field": "relevance",  // or "name", "created_at", "updated_at"
        "direction": "desc"     // "asc" or "desc"
    },
    "limit": 20,
    "offset": 0
}

Response (200 OK):
{
    "success": true,
    "data": {
        "results": [...],
        "total": 42,
        "limit": 20,
        "offset": 0,
        "has_more": true,
        "filters_applied": {
            "status": "active",
            "enrollment_type": "full-time",
            "date_range": "2025-09-01 to 2025-12-31"
        }
    },
    "meta": {...}
}
```

#### Endpoint 3: Faceted Search (Optional)

```
GET /api/v1/students/search/facets?query=John

Response:
{
    "success": true,
    "data": {
        "status": {
            "active": 25,
            "inactive": 3,
            "suspended": 1
        },
        "enrollment_type": {
            "full-time": 20,
            "part-time": 9
        },
        "months": {
            "2025-09": 10,
            "2025-10": 8,
            "2025-11": 6,
            "2025-12": 4
        }
    },
    "meta": {...}
}
```

### 3. Implementation Layers

**Backend/search.py** (New Module):
```
SearchService
├── full_text_search(query, limit, offset)
├── advanced_search(query, filters, sort, limit, offset)
├── get_facets(query)
└── build_relevance_score(match_type, query)
```

**Backend/schemas/search.py** (Pydantic Models):
```
SearchQuery
AdvancedSearchQuery
SearchFilter
SearchSort
SearchResult
SearchResponse
```

**Backend/routers/routers_search.py** (API Endpoints):
```
@router.post("/students/search")
@router.post("/students/advanced-search")
@router.get("/students/search/facets")
```

### 4. Search Algorithm

**Ranking Logic** (TF-IDF + Field Weighting):

```python
relevance_score = (
    (name_match * 0.5) +      # 50% weight on name match
    (email_match * 0.3) +      # 30% weight on email match
    (bio_match * 0.2)          # 20% weight on bio/description match
)
```

**Match Types**:
- Exact match: score = 1.0
- Prefix match: score = 0.8
- Contains match: score = 0.6
- Partial word match: score = 0.4

---

## 📊 Testing Strategy

### Unit Tests

1. **SearchService Tests** (~20 tests)
   - `test_search_empty_query`
   - `test_search_single_match`
   - `test_search_multiple_matches`
   - `test_search_with_filters`
   - `test_search_with_sorting`
   - `test_search_pagination`
   - `test_search_performance`

### Integration Tests

2. **API Endpoint Tests** (~15 tests)
   - `test_post_search_success`
   - `test_post_advanced_search_with_filters`
   - `test_search_invalid_parameters`
   - `test_search_unauthorized`
   - `test_search_with_offset`

### Performance Tests

3. **Benchmark Tests** (~5 tests)
   - Test with 10k students
   - Test with complex filter combinations
   - Measure query execution time
   - Verify < 500ms target

---

## 🔄 Implementation Phases

### Phase 1: Schema & Indexes (Day 1)
1. Create Alembic migration for search indexes
2. Create SearchQuery and SearchFilter Pydantic models
3. Add database index creation

### Phase 2: Service Layer (Day 2)
1. Implement SearchService class
2. Add full_text_search method
3. Add advanced_search method
4. Implement sorting and pagination

### Phase 3: API Endpoints (Day 3)
1. Create routers_search.py
2. Implement `/students/search` endpoint
3. Implement `/students/advanced-search` endpoint
4. Add request validation and error handling

### Phase 4: Testing (Day 4)
1. Write unit tests for SearchService
2. Write integration tests for API endpoints
3. Write performance tests
4. Verify all tests pass

### Phase 5: Documentation & Optimization (Day 5)
1. Add OpenAPI documentation
2. Performance optimization if needed
3. Final testing and validation
4. Code review and merge

---

## 🧪 Test Coverage Target

- SearchService: 100% coverage (25+ tests)
- API Endpoints: 100% coverage (15+ tests)
- Performance: Critical path tested (5+ tests)
- **Total**: 40+ tests, 100% pass rate

---

## 📈 Performance Target

- Typical search (1-2 filter): < 200ms
- Complex search (5+ filters): < 500ms
- Pagination: < 100ms per page
- Index creation: < 1 minute on 10k records

---

## 🔐 Security Considerations

1. **Permission Checks**: Verify user can search students
2. **Input Validation**: Sanitize search query to prevent injection
3. **Rate Limiting**: Apply rate limits to search endpoints
4. **Soft Delete Filtering**: Automatically exclude deleted students

---

## 📝 Success Metrics

- ✅ All acceptance criteria met
- ✅ 40+ tests passing (100%)
- ✅ Performance targets met (< 500ms)
- ✅ Zero security issues
- ✅ Documentation complete
- ✅ Code review approved
- ✅ Ready to merge to main

---

## 📚 Related Documentation

- [UNIFIED_WORK_PLAN.md](./UNIFIED_WORK_PLAN.md) - Phase 4 overview
- [DEVELOPER_GUIDE_COMPLETE.md](./DEVELOPER_GUIDE_COMPLETE.md) - Dev patterns
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture

---

**Next Step**: Begin Phase 1 implementation (Schema & Indexes)
