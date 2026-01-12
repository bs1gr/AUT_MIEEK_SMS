# Phase 3 Feature #125: Analytics Dashboard - Architecture Design

**Version**: 1.0
**Date**: January 12, 2026
**Status**: Design Phase
**Effort Estimate**: 40-50 hours (2-3 weeks)
**Issue**: #134

---

## 📋 Overview

The Analytics Dashboard provides administrators and instructors with comprehensive insights into student performance, attendance patterns, grade distributions, and course effectiveness. This document outlines the technical architecture and implementation strategy.

---

## 🎯 Goals

1. **Performance**: Query response times < 2 seconds (p95)
2. **Usability**: Intuitive dashboard with 5+ analytics views
3. **Accuracy**: Statistical calculations verified with unit tests
4. **Scalability**: Support 1000+ concurrent users
5. **Export**: Multiple formats (PDF, Excel, CSV)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Dashboard   │  │   Analytics  │  │   Export     │  │
│  │  Components  │  │   Components │  │  Components  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼────────────────┼──────────────────┼──────────┘
          │                │                  │
          └────────────────┼──────────────────┘
                           │
                ┌──────────▼──────────┐
                │   API Client        │
                │  (axios + hooks)    │
                └──────────┬──────────┘
                           │
┌─────────────────────────────┼─────────────────────────────┐
│                    Backend Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Analytics  │  │   Caching    │  │   Export     │   │
│  │   Service    │  │   Layer      │  │   Service    │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                 │                  │           │
│  ┌──────▼──────────────────▼──────────────────▼──────┐   │
│  │        Router: /api/v1/analytics/*               │   │
│  └────────────────┬────────────────────────────────┘   │
└───────────────────┼──────────────────────────────────────┘
                    │
         ┌──────────▼──────────┐
         │   SQLAlchemy ORM    │
         │   + Query Builders  │
         └──────────┬──────────┘
                    │
         ┌──────────▼──────────┐
         │   Database Layer    │
         │  (SQLite / Postgres)│
         └─────────────────────┘
```

---

## 📊 Backend Architecture

### 1. Analytics Service (`backend/services/analytics_service.py`)

**Responsibilities**:
- Execute aggregation queries
- Calculate statistics (mean, median, stddev, etc.)
- Format data for frontend consumption
- Cache results for performance

**Key Methods**:
```python
class AnalyticsService:
    # Student performance
    get_student_performance(student_id, start_date, end_date)
    get_student_trends(student_id, days=30)
    get_students_comparison(course_id)

    # Attendance analysis
    get_attendance_summary(course_id, start_date, end_date)
    get_attendance_patterns()
    get_attendance_alerts()

    # Grade analysis
    get_grade_distribution(course_id)
    get_grade_statistics(course_id, assignment_id)
    get_grade_trends()

    # Course effectiveness
    get_course_metrics(course_id)
    get_course_comparison()

    # Dashboard aggregation
    get_dashboard_summary()
```

### 2. Caching Strategy

**Layer 1: In-Memory Cache (FastAPI)**
- TTL: 5 minutes for frequently accessed data
- Keys: `analytics:student:{id}`, `analytics:course:{id}`, etc.
- Use: `fastapi_cache2` or built-in decorator

**Layer 2: Redis (Optional)**
- TTL: 15 minutes for aggregated data
- Distributed caching for multi-server deployments
- Fallback if Redis unavailable

**Cache Invalidation**:
- When grade is updated/created
- When attendance is logged
- When course settings change
- Manual cache clear endpoint (admin only)

### 3. Database Optimization

**Indexes to Create**:
```sql
-- Grade queries
CREATE INDEX idx_grade_student_id ON grade(student_id);
CREATE INDEX idx_grade_course_id ON grade(course_id);
CREATE INDEX idx_grade_created_at ON grade(created_at);
CREATE INDEX idx_grade_student_course ON grade(student_id, course_id);

-- Attendance queries
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_attendance_course_id ON attendance(course_id);
CREATE INDEX idx_attendance_logged_at ON attendance(logged_at);

-- Student queries
CREATE INDEX idx_student_id ON student(id);
CREATE INDEX idx_student_status ON student(status);

-- Course queries
CREATE INDEX idx_course_id ON course(id);
```

**Query Optimization**:
- Use `selectinload()` for related data
- Batch operations for bulk calculations
- Aggregation functions at database level
- Avoid N+1 queries

### 4. API Endpoints

**Base**: `/api/v1/analytics/`

**Endpoints**:

1. **GET /students**
   - Query params: `student_id`, `course_id`, `start_date`, `end_date`
   - Returns: Student performance metrics (grades, GPA, trends)

2. **GET /attendance**
   - Query params: `course_id`, `start_date`, `end_date`, `group_id`
   - Returns: Attendance rates, patterns, alerts

3. **GET /grades**
   - Query params: `course_id`, `assignment_id`, `start_date`, `end_date`
   - Returns: Grade distribution, statistics, trends

4. **GET /courses**
   - Query params: `course_id`, `start_date`, `end_date`
   - Returns: Course effectiveness metrics

5. **GET /dashboard**
   - Query params: None (returns aggregated summary)
   - Returns: Summary stats for all modules

6. **POST /export** (Future)
   - Body: `format` (pdf/excel/csv), `filters`, `columns`
   - Returns: File download or job ID

### 5. Response Schema

```python
# Response wrapper
class AnalyticsResponse(BaseModel):
    success: bool
    data: dict  # Varies by endpoint
    meta: dict  # request_id, timestamp, etc.

# Student Performance
class StudentPerformance(BaseModel):
    student_id: int
    name: str
    gpa: float
    grades_count: int
    average_grade: float
    grade_trend: List[float]  # Last 10 grades
    attendance_rate: float

# Attendance Summary
class AttendanceSummary(BaseModel):
    total_sessions: int
    attended: int
    absent: int
    rate: float
    pattern: str  # "consistent", "declining", etc.

# Grade Distribution
class GradeDistribution(BaseModel):
    bins: List[str]  # ['A', 'B', 'C', 'D', 'F']
    counts: List[int]
    mean: float
    median: float
    stddev: float

# Course Metrics
class CourseMetrics(BaseModel):
    course_id: int
    name: str
    students_count: int
    average_grade: float
    attendance_rate: float
    effectiveness_score: float
```

---

## 💻 Frontend Architecture

### 1. Components Structure

```
src/features/admin/analytics/
├── index.tsx                    # Barrel export
├── pages/
│   ├── AnalyticsDashboard.tsx  # Main dashboard page
│   ├── StudentAnalytics.tsx    # Student performance view
│   ├── AttendanceAnalytics.tsx # Attendance analysis
│   ├── GradeAnalytics.tsx      # Grade distribution
│   └── CourseAnalytics.tsx     # Course metrics
├── components/
│   ├── AnalyticsHeader.tsx     # Title, filters, controls
│   ├── DateRangeFilter.tsx     # Date range picker
│   ├── ChartCard.tsx           # Reusable chart wrapper
│   ├── StatCard.tsx            # Key metrics display
│   ├── TrendChart.tsx          # Line chart for trends
│   ├── DistributionChart.tsx   # Bar/histogram for grades
│   └── ExportButton.tsx        # PDF/Excel export
├── hooks/
│   ├── useAnalytics.ts         # Main analytics hook
│   ├── useStudentPerformance.ts
│   ├── useAttendance.ts
│   └── useGrades.ts
└── __tests__/
    ├── AnalyticsDashboard.test.tsx
    ├── StudentAnalytics.test.tsx
    └── ...other tests
```

### 2. Key Hooks

**useAnalytics** (Custom React Hook):
```typescript
function useAnalytics(filters: AnalyticsFilters) {
  const { data, isLoading, error } = useQuery(
    ['analytics', filters],
    () => apiClient.get('/analytics/dashboard', { params: filters }),
    { staleTime: 5 * 60 * 1000 } // 5 min cache
  );

  return { data, isLoading, error };
}
```

**useStudentPerformance** (Specific Hook):
```typescript
function useStudentPerformance(studentId: number, filters: TimeFilters) {
  const { data, isLoading, error } = useQuery(
    ['analytics', 'student', studentId, filters],
    () => apiClient.get(`/analytics/students/${studentId}`, { params: filters })
  );

  return { performance: data, isLoading, error };
}
```

### 3. Chart Libraries

**Primary**: React with Recharts
- Lightweight, responsive, TypeScript-native
- Built-in accessibility features
- No external dependencies

**Alternative**: Chart.js with react-chartjs-2
- More features, slightly heavier
- Good for complex visualizations

**Recommendation**: Recharts for MVP, can migrate to Chart.js if needed

### 4. State Management

**React Query** for server state:
- Query caching with `staleTime: 5 * 60 * 1000`
- Background refetch on focus
- Error boundary integration
- Automatic retry logic

**Local State** (useState):
- Filter selections (date range, course, group)
- View mode (table/chart)
- Export status

---

## 🔄 Data Flow

### 1. Dashboard Load Flow

```
User visits /admin/analytics
  ↓
AnalyticsDashboard component mounts
  ↓
useAnalytics hook triggered
  ↓
API: GET /api/v1/analytics/dashboard
  ↓
Backend checks cache (Redis/Memory)
  ↓
If cache hit: Return cached data (< 100ms)
If cache miss: Execute queries (< 2s)
  ↓
AnalyticsService aggregates data
  ↓
Results cached for 5-15 minutes
  ↓
Frontend receives response
  ↓
Components render charts/tables
```

### 2. Filter Application Flow

```
User selects date range / course / student
  ↓
Filter state updated in component
  ↓
useAnalytics dependency array changes
  ↓
New query request triggered
  ↓
Cache key changes: analytics:filters:{hash}
  ↓
API request with filters
  ↓
Backend executes scoped queries
  ↓
Results cached with same key
  ↓
Frontend updates visualizations
```

### 3. Export Flow

```
User clicks Export button
  ↓
Select format (PDF/Excel/CSV)
  ↓
POST /api/v1/analytics/export
  ↓
Body: { format, filters, columns }
  ↓
Backend queues Celery job (if large)
  ↓
Or generates synchronously (if small < 1000 records)
  ↓
Frontend shows progress / download link
  ↓
File downloaded to user's machine
```

---

## 🧪 Testing Strategy

### Backend Tests (20+ tests, 95%+ coverage)

**Test Categories**:
1. **Query Tests** (8 tests)
   - Student performance queries
   - Attendance calculations
   - Grade statistics
   - Course metrics

2. **Service Tests** (6 tests)
   - Analytics service methods
   - Cache hit/miss scenarios
   - Error handling

3. **API Tests** (6 tests)
   - Endpoint functionality
   - Filter validation
   - Permission checks
   - Response format

### Frontend Tests (25+ tests)

**Test Categories**:
1. **Component Tests** (12 tests)
   - Render with data
   - Filter interactions
   - Chart rendering
   - Export button behavior

2. **Hook Tests** (8 tests)
   - useAnalytics functionality
   - Cache behavior
   - Error states

3. **Integration Tests** (5 tests)
   - Filter + chart sync
   - Export workflow
   - Data loading states

### E2E Tests (3+ critical workflows)

1. **Dashboard Load**
   - Navigate to /admin/analytics
   - Verify all charts load
   - Check data accuracy

2. **Filter Application**
   - Select date range
   - Filter by course
   - Verify results update

3. **Export Workflow**
   - Select export format
   - Download file
   - Verify file integrity

---

## 📦 Dependencies

**Backend**:
- `sqlalchemy` - Already installed
- `pandas` - Data manipulation (if needed)
- `reportlab` or `pypdf` - PDF export
- `openpyxl` - Excel export
- `celery` (optional) - Background jobs

**Frontend**:
- `recharts` - Charting library
- `@tanstack/react-query` - Already installed
- `date-fns` - Date manipulation (already installed)
- `axios` - Already installed

---

## ✅ Implementation Checklist

### Phase 1: Backend (Days 1-3)
- [ ] Design database indexes
- [ ] Create AnalyticsService class
- [ ] Implement query methods (5 main queries)
- [ ] Add caching layer
- [ ] Create API endpoints (5 endpoints)
- [ ] Write backend tests (20+ tests)

### Phase 2: Frontend (Days 4-6)
- [ ] Create dashboard layout component
- [ ] Build individual analytics components
- [ ] Implement custom hooks
- [ ] Add chart visualizations
- [ ] Integrate API client
- [ ] Write frontend tests (25+ tests)

### Phase 3: Optimization & Testing (Days 7-8)
- [ ] Query performance testing
- [ ] Cache effectiveness validation
- [ ] E2E test creation (3+ workflows)
- [ ] Export functionality
- [ ] Documentation updates

### Phase 4: Polish & Release (Day 9)
- [ ] Bug fixes
- [ ] Performance tuning
- [ ] Final testing
- [ ] Documentation completion
- [ ] PR creation and review

---

## 🎯 Success Metrics

✅ **Performance**:
- Dashboard load time < 2 seconds (p95)
- API response time < 1 second
- Export time < 5 seconds (1000 records)

✅ **Code Quality**:
- 95%+ test coverage
- All linting checks passing
- No security vulnerabilities

✅ **Functionality**:
- 5+ analytics views working
- Export to 3 formats (PDF, Excel, CSV)
- Filters working correctly

✅ **User Experience**:
- Responsive on all screen sizes
- No jank or lag
- Clear error messages

---

## 📝 Next Steps

1. ✅ Architecture design (THIS DOCUMENT)
2. ⏳ Backend implementation (Days 1-3)
3. ⏳ Frontend implementation (Days 4-6)
4. ⏳ Testing and optimization (Days 7-8)
5. ⏳ Polish and release (Day 9)

---

**Status**: Ready for backend implementation
**Last Updated**: January 12, 2026
**Issue**: #134
