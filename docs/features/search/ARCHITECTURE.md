# Advanced Search & Filtering - Architecture Guide

**Feature**: #128 - Advanced Search & Filtering
**Version**: 1.0.0
**Status**: Production Ready
**Last Updated**: January 17, 2026

## System Architecture Overview

Advanced Search & Filtering is built with a layered architecture that separates concerns and enables scalability.

```text
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  SearchBar   │  │SearchResults │  │AdvancedFilters   │  │
│  │ (UI Input)   │  │ (Display)    │  │ (Filter Logic)   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                   │             │
│         │    ┌────────────┼───────────────────┘             │
│         │    │            │                                 │
│         └────┼────────────┼─────────────────┐               │
│              │            │                 │               │
│         ┌────▼────────────▼─────────────────▼────┐          │
│         │  useSearch Hook (State Management)    │          │
│         │  - Debounced API calls (300ms)      │          │
│         │  - Suggestion caching (in-memory)   │          │
│         │  - Pagination state                 │          │
│         └────┬───────────────────────────────┘          │
│              │                                           │
│         ┌────▼──────────────────────┐                   │
│         │   SavedSearches Component  │                   │
│         │ (localStorage persistence) │                   │
│         └────┬──────────────────────┘                   │
└──────────────┼──────────────────────────────────────────┘
               │
       ┌───────▼──────────┐
       │  HTTP Client     │
       │  (Axios)         │
       │  - Auth headers  │
       │  - Error handling│
       │  - Rate limiting │
       └───────┬──────────┘
               │
───────────────┼─────────────────── Network Boundary ─────────
               │
       ┌───────▼──────────────────────────────────────────┐
       │         API Layer (FastAPI)                     │
       ├────────────────────────────────────────────────┤
       │ POST /search/students (search by name/email)   │
       │ POST /search/courses (search by name/code)     │
       │ POST /search/grades (search by student/course) │
       │ POST /search/advanced (unified search)         │
       │ GET /search/suggestions (autocomplete)         │
       │ GET /search/statistics (entity counts)         │
       ├────────────────────────────────────────────────┤
       │ - RBAC permission checks                       │
       │ - Input validation & sanitization              │
       │ - Rate limiting (10-60 req/min)                │
       │ - APIResponse wrapper formatting               │
       └───────┬──────────────────────────────────────┘
               │
       ┌───────▼──────────────────────────────────────────┐
       │    Business Logic Layer (SearchService)        │
       ├────────────────────────────────────────────────┤
       │ - search_students()                            │
       │ - search_courses()                             │
       │ - search_grades()                              │
       │ - advanced_filter()                            │
       │ - rank_results()                               │
       │ - get_search_suggestions()                      │
       │ - get_search_statistics()                       │
       ├────────────────────────────────────────────────┤
       │ - Query building & optimization                │
       │ - Result ranking algorithm                     │
       │ - Soft-delete filtering (automatic)            │
       │ - Error handling & logging                     │
       └───────┬──────────────────────────────────────┘
               │
       ┌───────▼──────────────────────────────────────────┐
       │  Data Access Layer (SQLAlchemy ORM)            │
       ├────────────────────────────────────────────────┤
       │ - Student model (soft-delete aware)            │
       │ - Course model (soft-delete aware)             │
       │ - Grade model (soft-delete aware)              │
       │ - Database connection pooling                  │
       │ - Transaction management                       │
       └───────┬──────────────────────────────────────┘
               │
       ┌───────▼──────────────────────────────────────────┐
       │   Database Layer (PostgreSQL with Indexes)     │
       ├────────────────────────────────────────────────┤
       │ - 14 performance indexes                       │
       │ - Soft-delete filtering (deleted_at IS NULL)  │
       │ - Query optimization                          │
       │ - Transaction support                         │
       └────────────────────────────────────────────────┘

```text
---

## Data Flow Diagram

### Search Request Flow

```text
1. User Input
   └─> "Alice" typed in SearchBar
   └─> onChange handler

2. Frontend Hook
   └─> getSuggestionsDebounced('student', 'Alice')
   └─> 300ms debounce delay
   └─> Checks in-memory cache

3. Cache Check
   └─> Hit? Return cached results
   └─> Miss? Continue to API call

4. API Request
   └─> POST /search/students
   └─> { "query": "Alice", "page": 1, "page_size": 20 }
   └─> Headers: { "Authorization": "Bearer token" }

5. API Validation
   └─> RBAC permission check (students:view)
   └─> Input validation (query length, special chars)
   └─> Rate limit check (60 req/min for search)

6. Service Processing
   └─> SearchService.search_students()
   └─> Build SQL query with indexes
   └─> Filter by deleted_at IS NULL (soft-delete)
   └─> Execute query on database

7. Database Execution
   └─> Use index: idx_students_name
   └─> OR idx_students_email
   └─> Apply filters
   └─> Return results (20 per page)

8. Result Processing
   └─> SearchService ranks results
   └─> Calculates total count
   └─> Checks has_next page

9. Response Format
   └─> APIResponse wrapper
   └─> {
   │   "success": true,
   │   "data": {
   │     "results": [...],
   │     "page": 1,
   │     "page_size": 20,
   │     "total": 150,
   │     "has_next": true
   │   },
   │   "meta": { "request_id": "...", ... }
   │ }

10. Frontend Update
    └─> Update component state
    └─> Render results in table
    └─> Cache results for re-use

11. User View
    └─> Results displayed in SearchResults
    └─> Pagination controls shown
    └─> Can apply AdvancedFilters
    └─> Can save search via SavedSearches

```text
---

## Database Schema & Indexes

### Students Table

```sql
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    status VARCHAR(50),
    gpa DECIMAL(3, 2),
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Search Indexes
CREATE INDEX idx_students_name ON students(first_name, last_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_students_email ON students(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_students_created_at ON students(created_at) WHERE deleted_at IS NULL;

-- Composite Index for filters
CREATE INDEX idx_students_status_gpa ON students(status, gpa) WHERE deleted_at IS NULL;

```text
### Courses Table

```sql
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    credits INTEGER,
    description TEXT,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Search Indexes
CREATE INDEX idx_courses_name ON courses(name) WHERE deleted_at IS NULL;
CREATE INDEX idx_courses_code ON courses(code) WHERE deleted_at IS NULL;

-- Composite Index for filters
CREATE INDEX idx_courses_credits ON courses(credits) WHERE deleted_at IS NULL;

```text
### Grades Table

```sql
CREATE TABLE grades (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id),
    course_id INTEGER NOT NULL REFERENCES courses(id),
    grade DECIMAL(5, 2),
    grade_date DATE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Search Indexes
CREATE INDEX idx_grades_value ON grades(grade) WHERE deleted_at IS NULL;
CREATE INDEX idx_grades_student_course ON grades(student_id, course_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_grades_date ON grades(grade_date) WHERE deleted_at IS NULL;

-- Composite Index for range searches
CREATE INDEX idx_grades_value_date ON grades(grade, grade_date) WHERE deleted_at IS NULL;

```text
### Index Performance Analysis

```sql
-- Check index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename IN ('students', 'courses', 'grades')
ORDER BY idx_scan DESC;

-- Expected output for high-traffic search:
-- idx_students_name:        1000+ scans
-- idx_students_email:        800+ scans
-- idx_courses_name:          600+ scans
-- idx_courses_code:          400+ scans
-- idx_grades_value:          900+ scans

```text
---

## API Layer Architecture

### Endpoint Organization

```python
# backend/routers/routers_search.py

class SearchRouter:
    """Routes for advanced search endpoints"""

    # Student endpoints (2)
    POST /search/students         # Search students by name/email
    POST /search/courses          # Search courses by name/code

    # Grade endpoints (1)
    POST /search/grades           # Search grades with filters

    # Advanced endpoints (1)
    POST /search/advanced         # Unified search across entities

    # Utility endpoints (2)
    GET /search/suggestions       # Autocomplete suggestions
    GET /search/statistics        # Entity count statistics

    # Total: 6 endpoints

```text
### RBAC Implementation

```python
@router.post("/search/students")
@require_permission("students:view")
async def search_students(
    request: SearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search students with RBAC permission check"""

    # Permission check applied via decorator
    # Student users can only search all students (no filtering)
    # Teacher/Admin can apply filters

    service = SearchService(db)
    results = service.search_students(
        query=request.query,
        filters=request.filters,
        user=current_user  # User context for scoping
    )

    return success_response(results)

```text
### Input Validation Pipeline

```python
class SearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=255)
    filters: Optional[Dict] = Field(default_factory=dict)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)

    @field_validator('query')
    @classmethod
    def validate_query(cls, v):
        # Check for SQL injection patterns
        if any(char in v for char in [';', '--', '/*', '*/', 'DROP', 'DELETE']):
            raise ValueError('Invalid characters in query')

        # Check length
        if len(v) > 255:
            raise ValueError('Query too long')

        return v.strip()

```text
### Rate Limiting Strategy

```python
# Rate limits per endpoint type

RATE_LIMITS = {
    'search': {
        'limit': 60,           # 60 requests
        'period': 60,          # per 60 seconds
        'burst': 10            # allow 10 burst requests
    },
    'suggestions': {
        'limit': 30,
        'period': 60,
        'burst': 5
    },
    'statistics': {
        'limit': 10,
        'period': 60,
        'burst': 2
    }
}

@router.post("/search/students")
@limiter.limit(f"{RATE_LIMITS['search']['limit']}/minute")
async def search_students(...):
    pass

```text
---

## Service Layer Architecture

### SearchService Class Hierarchy

```python
class SearchService:
    """Core search service with all search logic"""

    def __init__(self, db_session: Session):
        self.db = db_session
        self.cache = {}  # In-memory suggestion cache

    # Core Search Methods (4)
    def search_students(query, filters, options) -> SearchResult
    def search_courses(query, filters, options) -> SearchResult
    def search_grades(query, filters, options) -> SearchResult
    def advanced_filter(entity, filters, options) -> SearchResult

    # Utility Methods (3)
    def rank_results(results) -> ranked_results
    def get_search_suggestions(entity, query) -> suggestions
    def get_search_statistics() -> statistics

    # Helper Methods (internal)
    def _build_query(entity, filters)
    def _apply_soft_delete_filter(query)
    def _paginate_results(query, page, page_size)
    def _handle_search_errors(exception)

```text
### Query Building Strategy

```python
def search_students(self, query, filters=None, options=None):
    """Build and execute student search query"""

    # Start with base query
    q = self.db.query(Student)

    # Apply soft-delete filter (automatic)
    q = q.filter(Student.deleted_at.is_(None))

    # Apply search query (name OR email)
    if query:
        q = q.filter(
            or_(
                Student.first_name.ilike(f'%{query}%'),
                Student.last_name.ilike(f'%{query}%'),
                Student.email.ilike(f'%{query}%')
            )
        )

    # Apply additional filters
    if filters:
        if 'status' in filters:
            q = q.filter(Student.status == filters['status'])
        if 'min_gpa' in filters:
            q = q.filter(Student.gpa >= filters['min_gpa'])

    # Apply pagination
    page = options.get('page', 1) if options else 1
    page_size = options.get('page_size', 20) if options else 20
    total = q.count()
    results = q.offset((page - 1) * page_size).limit(page_size).all()

    # Return structured result
    return SearchResult(
        results=results,
        page=page,
        page_size=page_size,
        total=total,
        has_next=page * page_size < total
    )

```text
### Result Ranking Algorithm

```python
def rank_results(self, results: List[Student], query: str) -> List[Student]:
    """Rank results by relevance to search query"""

    def calculate_score(student, query):
        score = 0
        query_lower = query.lower()

        # Exact match (highest priority)
        if student.first_name.lower() == query_lower:
            score += 100
        if student.email.lower().startswith(query_lower):
            score += 80

        # Prefix match
        if student.first_name.lower().startswith(query_lower):
            score += 50
        if student.last_name.lower().startswith(query_lower):
            score += 40

        # Contains match
        if query_lower in student.first_name.lower():
            score += 20
        if query_lower in student.email.lower():
            score += 10

        return score

    # Sort by relevance score
    scored = [(student, calculate_score(student, query)) for student in results]
    return [student for student, score in sorted(scored, key=lambda x: x[1], reverse=True)]

```text
---

## Frontend Component Architecture

### Component Hierarchy

```text
App
├── SearchPage
│   ├── SearchBar
│   │   ├── Input field
│   │   └── Suggestions dropdown
│   ├── EntitySelector
│   │   └── Tabs: Students, Courses, Grades
│   ├── SearchResults
│   │   ├── Results table
│   │   ├── Pagination controls
│   │   └── Loading state
│   ├── AdvancedFilters
│   │   ├── Filter controls
│   │   ├── Preset buttons
│   │   └── Apply/Reset buttons
│   └── SavedSearches
│       ├── Search list
│       └── CRUD buttons

State Management
└── useSearch Hook
    ├── search() method
    ├── getSuggestions() method
    ├── advancedFilter() method
    ├── loadMore() method
    └── clear() method

```text
### Component Data Flow

```text
SearchBar
  onChange -> handleQueryInput()
  -> getSuggestionsDebounced()
  -> Update suggestions state
  -> Render dropdown

User clicks suggestion
  -> setQuery()
  -> handleSearch()
  -> useSearch.search()
  -> Update results state
  -> SearchResults renders

User applies filters
  -> AdvancedFilters onChange
  -> advancedFilter()
  -> Update results
  -> SearchResults updates

User clicks "Save Search"
  -> SavedSearches onChange
  -> localStorage.setItem()
  -> Persist to localStorage

```text
### Hook State Management

```typescript
interface UseSearchState {
  // Current state
  loading: boolean;
  error: string | null;
  results: any[];
  suggestions: any[];

  // Pagination
  page: number;
  pageSize: number;
  totalResults: number;

  // Caching
  cache: Map<string, any[]>;
  lastQuery: string;

  // Timers
  debounceTimer: NodeJS.Timeout | null;
}

// State updates via:
// 1. useState() for results, loading, error
// 2. useRef() for cache and timers
// 3. useCallback() for memoized functions
// 4. useEffect() for cleanup

```text
---

## Performance Considerations

### Database Query Optimization

```sql
-- Without optimization (full table scan)
SELECT * FROM students
WHERE first_name LIKE '%Alice%';
-- Cost: 5000ms, full scan

-- With index (index scan)
SELECT * FROM students
WHERE first_name ILIKE 'Alice%'
  AND deleted_at IS NULL;
-- Cost: 15ms, index scan

```text
### Frontend Caching Strategy

```typescript
// Suggestion cache (in-memory)
const cache = new Map<string, any[]>();

function cacheGet(key: string): any[] | null {
    return cache.get(key) || null;
}

function cacheSet(key: string, value: any[]): void {
    if (cache.size > 100) {
        // Evict oldest entry
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
    }
    cache.set(key, value);
}

// Usage
const cached = cacheGet(`student:${query}`);
if (cached) {
    return cached;
}

const results = await api.getSuggestions('student', query);
cacheSet(`student:${query}`, results);
return results;

```text
### Pagination Strategy

```typescript
// Load results in chunks
const [page, setPage] = useState(1);
const [allResults, setAllResults] = useState([]);

async function loadMore(nextPage: number) {
    const results = await search(query, 'student', {}, {
        page: nextPage,
        page_size: 20
    });

    // Append to existing results
    setAllResults(prev => [...prev, ...results.results]);
    setPage(nextPage);
}

// Benefits:
// - First page loads quickly (20 items)
// - User can interact while loading more
// - Infinite scroll pattern possible
// - Memory efficient

```text
---

## Scalability Architecture

### Horizontal Scaling (Multiple Servers)

```text
Load Balancer
├── API Server 1 (Port 8000)
├── API Server 2 (Port 8001)
├── API Server 3 (Port 8002)
└── Database (PostgreSQL)
    └── Read Replicas for search

```text
### Caching Layer (Redis)

```python
# Add Redis for distributed caching

import redis

cache = redis.Redis(host='localhost', port=6379)

def get_suggestions_cached(entity, query):
    key = f"suggestions:{entity}:{query}"

    # Check cache
    cached = cache.get(key)
    if cached:
        return json.loads(cached)

    # Get from DB
    results = get_suggestions(entity, query)

    # Store in cache (5 min TTL)
    cache.setex(key, 300, json.dumps(results))

    return results

```text
### Database Optimization

```sql
-- Read-only replica for search
SELECT * FROM students@read_replica
WHERE deleted_at IS NULL AND first_name ILIKE 'Alice%';

-- Benefits:
-- - Offload read queries from primary
-- - Faster searches
-- - No locking on searches

```text
---

## Security Architecture

### RBAC Permission Checks

```python
@require_permission("students:view")
def search_students(...):
    # Only users with "students:view" can reach this
    # Enforced at API layer, before business logic
    pass

# Roles and default permissions:

# Admin:   students:*, courses:*, grades:*
# Teacher: students:view, courses:view, grades:*

# Student: students:self (read only own data)

```text
### Input Sanitization

```python
# Prevent SQL injection

def sanitize_query(query: str) -> str:
    # Remove SQL keywords
    forbidden = ['DROP', 'DELETE', 'INSERT', 'UPDATE', ';', '--']
    for keyword in forbidden:
        if keyword in query.upper():
            raise ValueError('Invalid characters in query')

    # Escape special characters
    return query.replace("'", "''").replace('"', '""')

# Use parameterized queries (SQLAlchemy ORM handles this)

q = db.query(Student).filter(
    Student.name.ilike(f'%{sanitized_query}%')
)  # Automatic escaping by ORM

```text
---

## Monitoring & Observability

### Key Metrics

```python
# Track in Prometheus/Grafana

search_requests_total          # Total search requests
search_latency_seconds         # Search response time
suggestion_cache_hit_ratio     # Cache effectiveness
database_index_scan_ratio      # Index usage percentage
api_error_rate                 # Error rate

```text
### Logging Strategy

```python
import logging

logger = logging.getLogger(__name__)

def search_students(query, filters):
    logger.info(f"Search request: query={query}, filters={filters}")

    try:
        results = service.search_students(query, filters)
        logger.info(f"Search returned {len(results)} results")
        return results
    except Exception as e:
        logger.error(f"Search failed: {e}", exc_info=True)
        raise

```text
---

## Deployment Architecture

### Docker Deployment

```dockerfile
# Backend

FROM python:3.11-slim
RUN pip install -r requirements.txt
EXPOSE 8000
CMD ["uvicorn", "backend.main:app"]

# Frontend

FROM node:20-alpine
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "serve"]

```text
### CI/CD Pipeline

```text
Code Push
  ↓
Run Tests (Backend + Frontend)
  ↓
Build Docker Images
  ↓
Push to Registry
  ↓
Deploy to Staging
  ↓
Run E2E Tests
  ↓
Approve for Production
  ↓
Deploy to Production
  ↓
Monitor (24 hours)

```text
---

## Changelog

### Version 1.0.0 (January 17, 2026)

- Complete system architecture documentation
- Data flow diagrams
- Database schema and indexes
- API layer architecture
- Service layer implementation
- Frontend component architecture
- Performance optimization strategies
- Security and RBAC implementation
- Scalability architecture
- Monitoring and observability
- Deployment architecture

