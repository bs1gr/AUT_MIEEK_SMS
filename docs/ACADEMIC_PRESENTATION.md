# Student Management System — Technical Monograph
## A Bilingual, Production-Grade Academic Administration Platform

**Target Users**: Educators working at ΜΙΕΕΚ (Μεταλυκειακά Ινστιτούτα Επαγγελματικής Εκπαίδευσης και Κατάρτισης), Limassol, Cyprus — an independent tool, not an official institutional product
**Current Version**: v1.18.32 (June 2026)
**Repository**: [github.com/bs1gr/AUT_MIEEK_SMS](https://github.com/bs1gr/AUT_MIEEK_SMS)
**Build Status**: [![CI/CD](https://github.com/bs1gr/AUT_MIEEK_SMS/actions/workflows/ci-cd-pipeline.yml/badge.svg)](https://github.com/bs1gr/AUT_MIEEK_SMS/actions/workflows/ci-cd-pipeline.yml)
**Test Evidence**: 914 backend | 1,939 frontend | 82 E2E — all passing on `main`

---

## Abstract

This document presents a comprehensive technical overview of the Student Management System (SMS), a fully operational, bilingual (English/Greek) academic administration platform built for the post-secondary technical education sector (EQF 5). The system integrates a FastAPI Python backend with a React/TypeScript frontend, ships as a self-contained Windows installer, and supports four distinct deployment profiles. It features a weighted multi-component grading engine, predictive analytics with linear regression trend modelling, customisable dashboard reporting, fine-grained role-based access control, and a CI/CD pipeline spanning 38 GitHub Actions workflows. This document is intended for an audience of computer science academics and practitioners and provides architectural diagrams, algorithmic descriptions, and reproducible test evidence for all major subsystems.

---

## Table of Contents

1. [Project Context and Motivation](#1-project-context-and-motivation)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Data Model](#4-data-model)
5. [Core Feature: Grading Engine](#5-core-feature-grading-engine)
6. [Core Feature: Analytics and Predictive Modelling](#6-core-feature-analytics-and-predictive-modelling)
7. [Core Feature: Role-Based Access Control](#7-core-feature-role-based-access-control)
8. [Core Feature: Attendance and Daily Performance Tracking](#8-core-feature-attendance-and-daily-performance-tracking)
9. [Core Feature: Reporting and Export Pipeline](#9-core-feature-reporting-and-export-pipeline)
10. [Deployment Architecture](#10-deployment-architecture)
11. [Internationalisation (EN/EL)](#11-internationalisation-enel)
12. [Quality Assurance and Test Evidence](#12-quality-assurance-and-test-evidence)
13. [CI/CD Pipeline](#13-cicd-pipeline)
14. [Security Posture](#14-security-posture)
15. [Distinguishing Characteristics Summary](#15-distinguishing-characteristics-summary)

---

## 1. Project Context and Motivation

Educators at ΜΙΕΕΚ (Post-secondary Institutes of Vocational Education and Training) in Cyprus operate under a legislative framework that mandates structured grading, regular attendance monitoring, and transparent academic reporting. Before SMS, these educators managed student records across isolated spreadsheets and paper-based registers. This created audit-trail gaps, prevented cross-course aggregate analysis, and produced inconsistent grade transcripts.

SMS is an independent software project built by a developer to assist educators who work at ΜΙΕΕΚ. It is not affiliated with, owned by, or endorsed by any institution. Three design constraints shaped all architectural decisions:

1. **No shared infrastructure dependency** — Target users typically lack access to an always-on server. The system must run on a teacher's Windows laptop without Docker if needed.
2. **Full bilingualism** — All text, error messages, PDF exports, and UI labels must be available in both English and Modern Greek simultaneously.
3. **Cyprus grading alignment** — The system must implement Cyprus's standard vocational grading scale (0–20 points, passing threshold 10, with GPA mapping) faithfully and traceably.

---

## 2. Technology Stack

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| Backend API | FastAPI | 0.115.x | Async-first, automatic OpenAPI, Pydantic v2 validation |
| ORM | SQLAlchemy | 2.x | Declarative models, relationship graph, Alembic migrations |
| Migrations | Alembic | 1.x | Version-controlled schema evolution |
| Runtime | Python | 3.13 | `asynccontextmanager` lifespan, `typing` improvements |
| Database (dev) | SQLite | 3.x | Zero-config, file-backed |
| Database (prod) | PostgreSQL | 16 | Connection pooling (pool_size=20), concurrent access |
| Frontend framework | React + Vite | 18 + 7.3.5 | SPA, code-splitting, HMR in development |
| Language | TypeScript | 5.x | Strict mode; `noImplicitAny`, full type coverage |
| i18n | react-i18next | 14.x | Runtime language switching, namespace-scoped keys |
| Charts | Recharts | 2.x | Declarative SVG charts with responsive containers |
| Styling | TailwindCSS | 3.x | Utility-first; theme-aware dark/light modes |
| Test runner (BE) | pytest | 8.x | Async fixtures, SQLite in-memory DB |
| Test runner (FE) | Vitest | 4.x | Vite-native, ESM-compatible |
| E2E | Playwright | 1.48 | Cross-browser; Chromium in CI |
| Container | Docker Compose | v2 | Multi-service orchestration |
| Packaging | Inno Setup | 6.x | Authenticode-signed Windows installer |
| Mobile | Capacitor | 6.x | Android APK wrapping the existing React frontend |
| Monitoring | Prometheus + Grafana + Loki | — | Optional Docker-only observability stack |
| CI/CD | GitHub Actions | — | 38 workflows; CodeQL, Trivy, Dependabot |

---

## 3. System Architecture

### 3.1 High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Tier                             │
│                                                                 │
│   Browser (React SPA)          Android APK (Capacitor)         │
│   ┌──────────────────┐         ┌───────────────────────┐       │
│   │  React 18 + Vite │         │   Capacitor WebView   │       │
│   │  TypeScript SPA  │         │   same React bundle   │       │
│   │  react-i18next   │         │   + native plugins    │       │
│   └────────┬─────────┘         └───────────┬───────────┘       │
└────────────┼─────────────────────────────  ┼ ──────────────────┘
             │ HTTPS / REST / WebSocket       │
┌────────────▼────────────────────────────── ▼ ──────────────────┐
│                       API Tier (FastAPI)                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │               FastAPI Application                        │   │
│  │  ┌───────────┐  ┌──────────┐  ┌────────────────────┐   │   │
│  │  │  Routers  │  │ Schemas  │  │    Middleware       │   │   │
│  │  │  (42 mod) │  │(Pydantic)│  │  RBAC / RateLimit  │   │   │
│  │  └─────┬─────┘  └──────────┘  │  CORs / JWT        │   │   │
│  │        │                      │  Audit Logging     │   │   │
│  │  ┌─────▼──────────────────┐   └────────────────────┘   │   │
│  │  │      Services Layer    │                             │   │
│  │  │  GradeService          │                             │   │
│  │  │  AnalyticsService      │                             │   │
│  │  │  PredictiveAnalytics   │                             │   │
│  │  │  AttendanceService     │                             │   │
│  │  │  ExportService         │                             │   │
│  │  │  (38 service classes)  │                             │   │
│  │  └─────┬──────────────────┘                             │   │
│  └────────┼────────────────────────────────────────────────┘   │
└───────────┼─────────────────────────────────────────────────── ┘
            │ SQLAlchemy ORM
┌───────────▼─────────────────────────────────────────────────── ┐
│                     Persistence Tier                            │
│                                                                 │
│          SQLite (dev / Lite)     PostgreSQL (Docker / QNAP)    │
│          NullPool                pool_size=20, max_overflow=10  │
└─────────────────────────────────────────────────────────────── ┘
```

### 3.2 Directory Structure

```
student-management-system/
├── src/
│   ├── backend/                 # FastAPI, SQLAlchemy, Alembic
│   │   ├── main.py              # Application factory, router registration
│   │   ├── models.py            # 15 SQLAlchemy ORM models
│   │   ├── lifespan.py          # Async startup / shutdown context manager
│   │   ├── routers/             # 42 route modules
│   │   ├── services/            # 38 service classes
│   │   ├── schemas/             # Pydantic v2 request/response schemas
│   │   ├── alembic/             # Database migrations (version-controlled)
│   │   └── tests/               # 914 pytest tests
│   └── frontend/                # React + Vite + TypeScript
│       └── src/
│           ├── features/        # Feature-sliced architecture (13 feature domains)
│           ├── components/      # Shared atomic components
│           └── i18n/locales/    # en/ and el/ translation namespaces
├── infra/
│   ├── docker/                  # Docker Compose (standard, prod, monitoring, QNAP)
│   ├── installer/               # Inno Setup script, RTF docs, Authenticode signing
│   └── scripts/                 # PowerShell automation (dev, ops, testing, release)
├── .github/workflows/           # 38 GitHub Actions workflow files
├── monitoring/                  # Grafana dashboards, Prometheus rules, Loki config
└── docs/                        # 100+ documentation files
```

### 3.3 Layered Request Flow

A typical authenticated API call passes through the following layers:

```
HTTP Request
    │
    ▼
CORS Middleware (origin whitelist)
    │
    ▼
Rate Limiter  (slowapi, per-IP, configurable limits per endpoint class)
    │
    ▼
JWT Verification  (PyJWT; RS256 in prod, HS256 for dev)
    │
    ▼
RBAC Decorator  (@require_permission("grades:edit"))
    │
    ▼
Pydantic Schema Validation  (request body / query params)
    │
    ▼
Service Layer  (business logic, DB access via SQLAlchemy)
    │
    ▼
Audit Logger  (every mutating operation writes an AuditLog row)
    │
    ▼
Pydantic Response Schema  (output serialisation, field exclusion)
    │
    ▼
HTTP Response
```

---

## 4. Data Model

The persistence layer uses 15 SQLAlchemy ORM models. All mutable entities extend `SoftDeleteMixin`, implementing logical deletion via a nullable `deleted_at` timestamp. This preserves historical data integrity for audit purposes while hiding deleted records from all application queries.

### 4.1 Core Entity Relationships

```
User ─────────────────── UserPermission ──────── Permission
 │                              │
 │                         RolePermission ──────── Role
 │
Student ──────────────── CourseEnrollment ──────── Course
 │                                                   │
 ├── Grade (assignment_name, category, grade, max,   │
 │          weight, date_assigned, date_submitted)    │
 ├── Attendance (date, status, period_number)         │
 ├── DailyPerformance (date, category, score)         │
 ├── Highlight (semester, rating, category, text)     │
 └── AuditLog (action, resource, old_values, new)
```

### 4.2 Performance Indexes

The models implement a deliberate indexing strategy to support the analytics query patterns:

| Table | Index | Justification |
|---|---|---|
| `students` | `(is_active, email)` composite | Dashboard active-student counts |
| `attendances` | `(student_id, date)`, `(course_id, date)`, `(student_id, course_id, date)` | Date-range attendance queries |
| `grades` | `(student_id, course_id)`, `(student_id, category)`, `date_assigned` | Grade filtering by category and date |
| `daily_performances` | `(student_id, course_id)`, `(student_id, date)` | Weighted average calculation |
| `course_enrollments` | `(student_id, course_id)` unique | Prevents duplicate enrollments |

### 4.3 Grade Model Detail

```python
class Grade(SoftDeleteMixin, Base):
    __tablename__ = "grades"

    id              = Column(Integer, primary_key=True)
    student_id      = Column(Integer, ForeignKey("students.id"), index=True)
    course_id       = Column(Integer, ForeignKey("courses.id"), index=True)
    assignment_name = Column(String(200), nullable=False)
    category        = Column(String(100), index=True)   # maps to evaluation rule
    grade           = Column(Float, nullable=False)
    max_grade       = Column(Float, default=100.0)
    weight          = Column(Float, default=1.0)        # intra-category weight
    date_assigned   = Column(Date, index=True)
    date_submitted  = Column(Date, index=True)
    notes           = Column(Text)
    # SoftDeleteMixin adds: deleted_at = Column(DateTime(timezone=True))

    @property
    def percentage(self) -> float:
        return (grade / max_grade) * 100 if max_grade > 0 else 0.0
```

---

## 5. Core Feature: Grading Engine

### 5.1 Conceptual Design

The grading system implements a three-tier hierarchical model:

```
Course
 └── Evaluation Rules  (JSON column on Course)
      └── Category  (e.g., "Midterm Exams", "Homework", "Participation")
           ├── category_weight  (percentage of final grade, 0–100)
           ├── multiplier       (float — how much daily performance scores count)
           └── is_attendance    (bool — drives attendance-based calculation)

Grade record ──────────► belongs to a Category
DailyPerformance record ─► belongs to a Category (via category field)
Attendance record ────────► used when is_attendance = True
```

### 5.2 Final Grade Algorithm

The `AnalyticsService.calculate_final_grade()` method (`src/backend/services/analytics_service.py`) computes the final grade as follows:

**Step 1 — Group inputs by category**

For each evaluation rule category defined on the course:

```python
for rule in evaluation_rules:
    category_name  = rule["name"]
    category_weight = rule["weight"]  # e.g., 0.40 for 40%
    is_attendance  = rule.get("is_attendance", False)
    multiplier     = rule.get("multiplier", 1.0)
```

**Step 2 — Calculate the per-category score**

*For grade-based categories:*
```
weighted_sum   = Σ (grade_i / max_grade_i) × intra_weight_i
                 + Σ (daily_perf_j / max_score_j) × multiplier_j
total_weight   = Σ intra_weight_i + Σ multiplier_j
category_score = (weighted_sum / total_weight) × 100
```

This avoids the naive "add the multiplier as a duplicate score" error. Daily performance scores receive a multiplier-scaled weight within the weighted average, never exceeding a 100% ceiling within the category.

*For attendance-based categories:*
```
category_score = (present_count / total_sessions) × 100
```

**Step 3 — Apply absence penalty**

```
raw_final  = Σ (category_score_k × category_weight_k)
penalty    = course.absence_penalty × unexcused_absence_count
final_grade = max(0.0, raw_final - penalty)
```

**Step 4 — Multi-scale conversion**

```python
gpa_4   = (final_grade / 100) × 4.0        # US GPA scale
greek_20 = (final_grade / 100) × 20.0      # Cyprus/Greek scale
letter  = _grade_to_letter(final_grade)     # A+/A/B+/B/C/D/F
```

**Step 5 — Response payload**

The endpoint returns a structured breakdown:

```json
{
  "student_id": 42,
  "course_id": 7,
  "final_grade": 78.4,
  "gpa": 3.14,
  "greek_grade": 15.68,
  "letter_grade": "C+",
  "category_breakdown": [
    {
      "category": "Midterm Exam",
      "weight": 0.40,
      "category_score": 82.0,
      "contribution": 32.8,
      "grade_count": 1
    },
    {
      "category": "Homework",
      "weight": 0.35,
      "category_score": 74.3,
      "contribution": 26.0,
      "grade_count": 5
    },
    {
      "category": "Attendance",
      "weight": 0.25,
      "category_score": 79.2,
      "contribution": 19.8,
      "grade_count": 0,
      "is_attendance": true
    }
  ],
  "absence_penalty_applied": 0.2,
  "unexcused_absences": 1
}
```

### 5.3 Validation Constraints

The system enforces these at the schema and service level:

| Constraint | Enforcement |
|---|---|
| `grade ≤ max_grade` | Pydantic validator on `GradeCreate` |
| `max_grade > 0` | Division-by-zero guard in `percentage` property |
| `Σ category_weights = 100%` | HTTP 400 returned if weights do not sum to 100 |
| `final_grade ≥ 0` | `max(0.0, ...)` clamp in penalty step |
| Absent category (no grades) | Silently skipped; weight redistributed implicitly |
| `date_submitted ≥ date_assigned` | Pydantic date-range validator |

### 5.4 Auto-Excellence Highlight

When a grade is created, `GradeService._maybe_create_excellence_highlight()` automatically logs a `Highlight` record for any grade mapping to an A or A+ letter grade. This surfaces in the student profile view without requiring manual teacher input.

### 5.5 Test Evidence — Grading

```
src/backend/tests/test_grades_router.py          — CRUD, permissions, pagination
src/backend/tests/test_grade_calculation.py      — Algorithm correctness (6 scenarios)
src/backend/tests/test_grade_calculation_fix.py  — Multiplier regression tests
src/backend/tests/test_grade_calculation_integration.py — DB-backed integration
```

From the active CI run (commit `d7f4ab762`, June 19, 2026):
- Backend batch runner: **914 / 914 tests passing** (21 batches, 0 failures)
- Grade-specific targeted run: `python -m pytest src/backend/tests/test_grades_router.py -q` → **all PASSED**

---

## 6. Core Feature: Analytics and Predictive Modelling

### 6.1 Analytics Service Overview

`AnalyticsService` (`src/backend/services/analytics_service.py`) exposes three principal methods consumed by the analytics router:

| Method | Output |
|---|---|
| `calculate_final_grade(student_id, course_id)` | Per-course final grade with category breakdown |
| `get_student_all_courses_summary(student_id)` | Transcript: all enrolled courses, GPA, credit total |
| `get_dashboard_summary()` | Institution-wide aggregates: student count, pass rate, attendance rate, top courses |

All queries use SQLAlchemy's `func.avg()`, `func.count()`, and `case()` aggregations at the database layer rather than loading all records into Python memory, avoiding N+1 patterns that degrade at scale.

### 6.2 Predictive Analytics Service

`PredictiveAnalyticsService` (`src/backend/services/predictive_analytics_service.py`) implements a pure-Python statistical modelling layer with no external ML framework dependency.

#### 6.2.1 Grade Trend Prediction — Linear Regression

```python
def predict_grade_trend(
    historical_grades: List[Tuple[datetime, float]],
    weeks_ahead: int = 4
) -> Dict[str, Any]:
```

The algorithm applies ordinary least squares (OLS) linear regression over the time series of historical grades:

```
Given:
  (t₁, g₁), (t₂, g₂), ..., (tₙ, gₙ)  where tᵢ = POSIX timestamp, gᵢ ∈ [0, 100]

OLS slope:    β = Σ(tᵢ − t̄)(gᵢ − ḡ) / Σ(tᵢ − t̄)²
OLS intercept: α = ḡ − β × t̄

Forecast:     ĝ(t) = α + β × t   clamped to [0, 100]
```

For each of `weeks_ahead` future weeks the method returns:
- `predicted_grade` — OLS forecast, clamped to [0, 100]
- `confidence` — inverse normalised standard deviation of historical grades
- `current_trend` — classified as `"improving"` (β > 1/week), `"declining"` (β < −1/week), or `"stable"`
- `r_squared` — coefficient of determination

A minimum of three data points is enforced; calls with insufficient history return an `"insufficient_data"` marker without raising an error.

#### 6.2.2 Attendance Pattern Prediction

```python
def predict_attendance_pattern(
    attendance_records: List[Tuple[datetime, bool]]
) -> Dict[str, Any]:
```

The method:
1. Segments attendance by weekday (Monday–Sunday buckets)
2. Computes per-weekday attendance rates as `present_count / total_sessions`
3. Identifies the highest-risk day (lowest rate)
4. Classifies the student as `at_risk` when the overall rate falls below a configurable threshold (default: 0.75)
5. Estimates a projected absence count from the remaining semester sessions

#### 6.2.3 Student Risk Scoring

```python
def calculate_risk_score(
    grade_trend: Dict,
    attendance_pattern: Dict,
    engagement_metrics: Dict
) -> Dict[str, Any]:
```

Risk score ∈ [0, 100]:
```
base_score = 50 (neutral)

grade_component:
  declining → +20
  stable    → 0
  improving → −10

attendance_component:
  at_risk    → +20
  rate < 0.9 → +10

engagement_component:
  low_submission_rate → +10
```

Final classification:
- 0–25: `low_risk` (green)
- 26–60: `medium_risk` (amber)
- 61–100: `high_risk` (red)

With a recommended intervention strategy returned in the payload.

### 6.3 Custom Dashboard Builder

The Custom Dashboard feature (`src/frontend/src/features/dashboard/`) provides a 5-step interactive wizard:

| Step | Component | Description |
|---|---|---|
| 1 | `ChartTypeSelector` | 8 chart types: Bar, Line, Pie, Area, Scatter, Heatmap, Treemap, Boxplot |
| 2 | `DataSeriesPicker` | Select data dimensions: grades, attendance, GPA, performance |
| 3 | `FilterConfiguration` | Date ranges, course filters, academic year |
| 4 | `ReportPreview` | Live preview with Recharts components |
| 5 | `ReportTemplate` | Save with title, description, favourite flag |

Saved dashboards are persisted via `DashboardService` and loaded via `useDashboards` hook. The `ChartDrillDown` component supports click-through to a detail view for any data point.

### 6.4 Analytics Export Service

`AnalyticsExportService` (`src/backend/services/analytics_export_service.py`) generates documents in three formats:

| Format | Library | Bilingual Support |
|---|---|---|
| PDF | reportlab 4.x | DejaVuSans TTF font registered for Unicode Greek rendering |
| Excel | openpyxl 3.x | Styled headers, table formatting, chart sheets |
| CSV | stdlib `csv` | UTF-8 BOM for Windows Excel compatibility |

The PDF path registers DejaVuSans TTF at startup; if the font file is absent it falls back to Helvetica with a logged warning. This was the root cause of the known "black squares" issue in early Greek PDF exports (now resolved in v1.18.25+).

### 6.5 Test Evidence — Analytics

```
src/backend/tests/test_analytics_service.py
src/backend/tests/test_routers_analytics.py
src/backend/tests/test_analytics_export_service.py
src/backend/tests/test_predictive_analytics_service.py
```

From the targeted analytics test run (commit `d7f4ab762`):
```
test_analytics_export_service.py   ....  PASSED  (PDF, Excel, CSV generation)
test_predictive_analytics_service.py ....  PASSED  (trend, attendance, risk)
test_routers_analytics.py   ....  PASSED  (final-grade, dashboard, lookups)
```

Frontend:
```
src/frontend/src/features/dashboard/components/__tests__/AnalyticsDashboard.test.tsx
src/frontend/src/features/dashboard/components/__tests__/PredictiveAnalyticsPanel.test.tsx
src/frontend/src/features/dashboard/hooks/__tests__/useDashboards.test.tsx
```

All 1,939 frontend tests pass on the same commit.

---

## 7. Core Feature: Role-Based Access Control

### 7.1 Three-Tier Permission Architecture

```
Role ────────── RolePermission ─────────── Permission
                                           (resource:action)

User ────────── UserPermission ─────────── Permission
                (direct grant, optional expiry)
```

Permission strings follow the `resource:action` convention:

| Permission | Scope |
|---|---|
| `students:view` | Read student profiles |
| `students:edit` | Create/update student records |
| `grades:view` | Read grade records |
| `grades:edit` | Create/update grades |
| `reports:generate` | Access analytics endpoints |
| `attendance:edit` | Mark attendance |
| `admin:users` | User management |
| `admin:system` | System configuration |
| `permissions:manage` | Grant/revoke permissions |

Built-in roles ship with sensible defaults:

| Role | Permissions |
|---|---|
| `admin` | All 13 permissions |
| `teacher` | students:view, grades:edit, attendance:edit, reports:generate |
| `viewer` | students:view, grades:view |
| `student` (self-access) | Own record only via self-access guards |

### 7.2 Enforcement at Route Level

Every protected route uses either:

```python
@require_permission("grades:edit")      # hard-requires the permission
# or
@optional_require_role("admin")         # respects AUTH_MODE env var
```

The `optional_require_role()` decorator reads `AUTH_MODE` at request time. When `AUTH_MODE=open`, all admin routes pass without authentication (emergency maintenance mode). When `AUTH_MODE=jwt`, full RBAC is enforced. This prevents the system from being irrecoverably locked out in single-operator deployments.

### 7.3 Test Coverage

```
src/backend/tests/test_rbac.py
src/backend/tests/test_permissions.py
src/frontend/src/features/admin/__tests__/PermissionsPage.test.tsx
```

Documentation:
- `docs/admin/PERMISSION_MATRIX.md` — 25 permissions, 148 endpoints mapped
- `docs/admin/RBAC_OPERATIONS_GUIDE.md` — 1,050 lines covering daily ops, monitoring, incident runbooks

---

## 8. Core Feature: Attendance and Daily Performance Tracking

### 8.1 Attendance Data Model

Attendance records carry four status values: `Present`, `Absent`, `Late`, `Excused`. The `Attendance` model includes a `period_number` field for institutions that track multiple periods per day.

Three composite database indexes ensure sub-millisecond lookups for the attendance calendar view:
```sql
INDEX idx_attendance_student_date       (student_id, date)
INDEX idx_attendance_course_date        (course_id, date)
INDEX idx_attendance_student_course_date (student_id, course_id, date)
```

### 8.2 Offline Attendance Queue

A critical usability feature: the system supports marking attendance without network connectivity. `offlineAttendanceQueue.ts` (`src/frontend/src/features/attendance/utils/`) implements a browser `IndexedDB`-backed queue:

1. Teacher marks attendance offline → record queued locally
2. On network reconnect → queue is drained synchronously to the API
3. If server returns a conflict → the queue item is discarded with a warning notification

The same offline pattern is implemented for grade submission (`offlineGradesQueue.ts`) and student updates.

### 8.3 Special Participation Categories

Beyond the boolean attendance model, `DailyPerformance` tracks arbitrary scored categories:

```python
class DailyPerformance(SoftDeleteMixin, Base):
    category    = Column(String(100))  # e.g., "Oral Participation", "Lab Work"
    score       = Column(Float)        # 0–max_score
    max_score   = Column(Float, default=10.0)
```

When a course evaluation rule specifies `multiplier > 1.0` for a category, `DailyPerformance` records in that category are weighted more heavily in the final grade calculation (see Section 5.2).

### 8.4 Enhanced Attendance Calendar

`EnhancedAttendanceCalendar.tsx` renders a monthly calendar view with colour-coded attendance cells. Clicking any day opens an inline editor. The component supports:
- Bulk mark-present for the entire class
- Per-student status override
- Export to CSV for the displayed month

---

## 9. Core Feature: Reporting and Export Pipeline

### 9.1 Custom Report Builder

The report builder (`src/backend/routers/routers_custom_reports.py`, `src/backend/services/custom_report_service.py`) allows users to define ad-hoc reports at runtime:

1. **Field selection** — any column from students, grades, attendance, courses
2. **Filter builder** — n-level boolean conditions (AND/OR) with operators: eq, neq, gt, gte, lt, lte, contains, in
3. **Sort builder** — multi-column sort with direction
4. **Report templates** — save and re-run any configuration

The generation pipeline (`custom_report_generation_service.py`) translates the saved filter tree into SQLAlchemy query clauses, executes them, and streams the result to the requested format.

### 9.2 Export Scheduler

`ExportScheduler` (`src/backend/services/export_scheduler.py`) supports scheduled recurring reports:
- Cron expression scheduling (daily, weekly, monthly)
- Email delivery via SMTP with SSL/TLS support
- `SmtpOverrideService` persists SMTP settings across restarts in a JSON sidecar file

### 9.3 Async Export for Large Datasets

`AsyncExportService` (`src/backend/services/async_export_service.py`) handles large export jobs:
1. Client submits an export job → receives a `job_id` immediately (HTTP 202)
2. Job runs in a background `asyncio.Task`
3. Client polls `GET /jobs/{job_id}/status`
4. When complete, result is available at `GET /jobs/{job_id}/download`

`ExportPerformanceMonitor` tracks job duration, row count, and peak memory per job for capacity planning.

### 9.4 Supported Export Formats

| Format | Endpoint | Notes |
|---|---|---|
| PDF | `/analytics/export/pdf` | DejaVuSans Unicode fonts; styled tables |
| Excel | `/analytics/export/excel` | Multi-sheet; header formatting; data validation |
| CSV | `/analytics/export/csv` | UTF-8 BOM; timestamp in filename |
| PDF (reports) | `/reports/{id}/export/pdf` | Report templates including course notes |
| CSV (reports) | `/reports/{id}/export/csv` | Headers always present (regression fixed v1.18.26) |

---

## 10. Deployment Architecture

SMS supports four deployment profiles designed to cover the full spectrum from a teacher's laptop to a campus NAS device:

### 10.1 Deployment Profiles Comparison

| Profile | Entry Point | Database | Port | Target User |
|---|---|---|---|---|
| **Native Development** | `NATIVE.ps1 -Start` | SQLite | 8000 + 5173 | Developer / tester |
| **Docker Production** | `DOCKER.ps1 -Start` | PostgreSQL | 8080 | Campus server |
| **Lite Edition** | `SMS_Lite.exe` | SQLite | 8000 (auto) | Individual teacher (standalone) |
| **QNAP NAS** | `DOCKER.ps1` on ARM | PostgreSQL | 8080 | Network-shared campus deployment |

### 10.2 Lite Edition (Standalone)

The Lite edition (`src/backend/lite_simple_entrypoint.py`) embeds the full FastAPI application, uvicorn ASGI server, and the React production bundle into a single Windows executable built with PyInstaller. At launch it:

1. Claims TCP port 8000 (auto-heals if the port is busy from a previous session)
2. Runs `Base.metadata.create_all()` as a fallback for the frozen EXE context where Alembic cannot be invoked
3. Opens the default browser to `http://localhost:8000`
4. Registers a logout webhook that triggers a 30-second graceful shutdown

Installer size: **97 MB** (v1.18.31, includes Python runtime, Node.js build artefacts).

### 10.3 Windows Installer Pipeline

```
INSTALLER_BUILDER.ps1
    │
    ├── Runs PyInstaller → SMS_Lite.exe
    ├── Runs npm build  → dist/
    ├── Invokes Inno Setup compiler → SMS_Installer_<version>.exe
    ├── Signs with Authenticode (AUT MIEEK certificate, CN=AUT MIEEK, L=Limassol, C=CY)
    └── Runs smoke test: launch + HTTP 200 probe

GitHub Actions (on tag push v1.x.x):
    release-on-tag.yml        → Create GitHub Release page
    release-installer-with-sha.yml → Build, sign, upload EXE + SHA256 sidecar
    release-asset-sanitizer.yml    → Enforce installer-only asset policy
```

The published installer is reproducibly signed and its SHA256 is published as a sidecar file. Installer integrity can be verified offline:

```powershell
Get-AuthenticodeSignature .\SMS_Installer_1.18.31.exe
# Status: Valid  SignerCertificate: CN=AUT MIEEK, O=AUT MIEEK, L=Limassol, C=CY
```

### 10.4 Docker Production Stack

```yaml
services:
  backend:
    build: { context: ../../.., dockerfile: infra/docker/Dockerfile.backend }
    environment: [DATABASE_URL=postgresql://..., SECRET_KEY=..., AUTH_MODE=jwt]
    healthcheck: { test: ["CMD", "curl", "-f", "http://localhost:8000/health"] }

  frontend:
    build: { context: ../../.., dockerfile: infra/docker/Dockerfile.frontend }
    # Serves nginx-compiled React SPA on port 80 inside container

  nginx:
    image: nginx:alpine
    ports: ["8080:80"]   # Single external port
```

Health probe evidence (Docker smoke test, commit `1bf9c5e61`):
```
GET http://localhost:8080/health → 200 OK
{"status": "healthy", "database": "connected", "version": "1.18.31"}
```

### 10.5 Android Mobile Client

The Android APK wraps the existing React SPA via Capacitor 6:
- `androidScheme: 'https'` for secure WebView context
- `VITE_API_URL` configured at build time (Tailscale IP for remote access)
- HashRouter used for client-side navigation within the WebView
- Login fix: DOM refs + `onInput` handlers bypass Capacitor WebView autofill quirks
- APK: `app-release.apk` — 5.13 MB, signed (`CN=SMS App, OU=MIEEK, O=AUT, L=Nicosia`)

---

## 11. Internationalisation (EN/EL)

Bilingualism is not an afterthought — it is enforced at the pre-commit and CI level.

### 11.1 Translation Architecture

All UI text passes through `react-i18next`. Translation files are split into namespaces:

```
src/frontend/src/i18n/locales/
├── en/
│   ├── common.json
│   ├── students.json
│   ├── grades.json
│   ├── attendance.json
│   ├── analytics.json
│   └── ... (18 namespace files)
└── el/
    └── ... (exact mirror — 18 files)
```

### 11.2 Policy Enforcement

A pre-commit hook and Vitest suite verify EN/EL parity. Any key present in the English namespace but absent in the Greek namespace (or vice versa) fails the build:

```typescript
// Translation integrity test (Vitest)
it('EN and EL namespaces have identical key sets', () => {
  const enKeys = flattenKeys(enTranslations);
  const elKeys = flattenKeys(elTranslations);
  expect(elKeys).toEqual(enKeys);
});
```

This prevented a regression in v1.18.32 where 43 analytics keys were missing from the Greek namespace and caused E2E failures.

### 11.3 Backend Bilingualism

The export services carry inline translation dictionaries:

```python
TRANSLATIONS = {
    "en": {"title": "Analytics Dashboard Report", "total_students": "Total Students", ...},
    "el": {"title": "Αναφορά Αναλυτικών Δεδομένων", "total_students": "Σύνολο Φοιτητών", ...}
}
```

The caller passes a `lang` parameter (`"en"` | `"el"`) and the export service selects the appropriate strings for PDF/Excel headers. This allows Greek teachers to generate Greek-language reports directly.

---

## 12. Quality Assurance and Test Evidence

### 12.1 Test Suite Overview

| Test type | Runner | Count | Pass rate |
|---|---|---|---|
| Backend unit + integration | pytest 8 | **914** | **100%** |
| Frontend unit + integration | Vitest 4 | **1,939** | **100%** |
| End-to-end (browser) | Playwright 1.48 | **82** | **100%** |
| **Total** | | **2,935** | **100%** |

Evidence: commit `d7f4ab762`, June 19, 2026. All three suites pass in GitHub Actions CI (workflow run IDs recorded in `docs/plans/UNIFIED_WORK_PLAN.md`).

### 12.2 Backend Test Categories

```
tests/
├── test_analytics_service.py          # Final grade calculation, dashboard aggregates
├── test_analytics_export_service.py   # PDF, Excel, CSV generation
├── test_predictive_analytics_service.py # OLS trend, attendance, risk scoring
├── test_routers_analytics.py          # REST endpoint contracts
├── test_grades_router.py              # Grade CRUD, pagination, permissions
├── test_grade_calculation.py          # Algorithm correctness (6 scenarios)
├── test_grade_calculation_fix.py      # Multiplier regression tests
├── test_grade_calculation_integration.py # DB-backed integration test
├── test_rbac.py                       # Permission enforcement
├── test_permissions.py                # Role assignment, direct grants
├── test_attendance_router.py          # Attendance CRUD
├── test_students_router.py            # Student CRUD, search, pagination
├── test_courses_router.py             # Course management, evaluation rules
├── test_database_manager_security.py  # Path traversal, backup injection
├── test_control_database_credentials.py # Download traversal rejection
├── test_control_maintenance.py        # Admin maintenance ops
├── test_smtp_override_service.py      # SMTP persistence, SSL/STARTTLS
└── ... (total: 914 tests in 60+ files)
```

### 12.3 Frontend Test Coverage

The frontend follows a feature-sliced architecture where each feature domain owns its tests:

```
features/dashboard/__tests__/
├── AnalyticsDashboard.test.tsx      # Chart rendering, data loading
├── ChartDrillDown.test.tsx          # Drill-down navigation
├── CustomReportBuilder.test.tsx     # 5-step wizard interaction
├── PredictiveAnalyticsPanel.test.tsx # Risk display, trend charts
└── CreateEditDashboardDialog.test.tsx

features/grading/__tests__/
├── GradingView.decimal.test.tsx     # European decimal separator handling
└── GradeDisplay.test.tsx

features/advanced-search/__tests__/
├── AdvancedFilters.test.tsx
├── AdvancedQueryBuilder.test.tsx
└── AdvancedSearchPage.integration.test.tsx
```

### 12.4 End-to-End Test Coverage

Playwright tests cover the critical user journeys:

```
e2e/
├── auth.spec.ts              # Login, logout, JWT expiry
├── students.spec.ts          # CRUD, search, bulk import
├── grades.spec.ts            # Grade entry, category filtering
├── attendance.spec.ts        # Calendar marking, CSV export
├── analytics.spec.ts         # Dashboard, drill-down, export
├── report-workflows.spec.ts  # Custom report creation, scheduling
├── advanced_search.spec.ts   # Query builder, faceted navigation
└── ... (82 tests total)
```

All E2E tests use the `loginViaAPI()` helper pattern (injects JWT directly, avoids form-submission timeouts) and navigate using HashRouter-compatible `/#/` paths.

### 12.5 Batch Test Runner

Because loading 914 backend tests simultaneously exhausts VS Code memory, a purpose-built batch runner splits the suite:

```powershell
# RUN_TESTS_BATCH.ps1 — splits test files into safe chunks
.\infra\scripts\testing\RUN_TESTS_BATCH.ps1 -BatchSize 3 -Verbose
# Output: Batch 1/21 PASSED | Batch 2/21 PASSED | ... | All 21 batches PASSED
```

The `conftest.py` guard prevents accidental direct `pytest` invocation:
```python
# src/backend/tests/conftest.py
if not os.getenv("SMS_ALLOW_DIRECT_PYTEST") and len(collect_items) > BATCH_THRESHOLD:
    pytest.exit("Use RUN_TESTS_BATCH.ps1 for full suite runs")
```

---

## 13. CI/CD Pipeline

### 13.1 Workflow Inventory (38 files)

| Category | Workflows | Purpose |
|---|---|---|
| Core CI | `ci-cd-pipeline.yml` | Full build, lint, test, type-check on every push/PR |
| Release | `release-on-tag.yml`, `release-installer-with-sha.yml`, `release-asset-sanitizer.yml` | Tag-triggered installer build, signing, and publish |
| Security | `codeql.yml`, `trivy-scan.yml`, `dependency-review.yml`, `upload-sarif.yml` | SAST, container CVE scanning, dependency audit |
| E2E | `e2e-tests.yml` | Playwright tests against live API |
| Load testing | `load-testing.yml` | k6 load scenarios (manual trigger) |
| Maintenance | `maintenance-consolidated.yml`, `orchestrated-maintenance.yml` | Scheduled cleanup, stale PR management |
| Docker | `docker-publish.yml` | Build and push to GHCR |
| Deployment | `deploy.yml` | Reusable deployment workflow |
| Installer | `installer.yml` | Standalone installer build verification |

### 13.2 Pre-commit Gate (`COMMIT_READY.ps1`)

Every local commit must pass the `COMMIT_READY.ps1` gate before being allowed:

```
Quick (2–3 min):
  ✅ ruff check --fix (Python linting)
  ✅ mypy (type checking, 0 errors in 191 source files)
  ✅ eslint --fix (TypeScript linting)
  ✅ tsc --noEmit (TypeScript compilation)
  ✅ Translation integrity check (EN/EL key parity)
  ✅ Version consistency (VERSION matches package.json and main.py)
  ✅ Installer input validation (no ignored or local-only files)

Standard adds:
  ✅ RUN_TESTS_BATCH.ps1 (full backend suite)

Full adds:
  ✅ npm run test -- --run (full frontend suite)
  ✅ Playwright E2E (smoke subset)
```

Bypass with `--no-verify` is blocked by CI. The gate has prevented dozens of regressions from reaching `main`.

---

## 14. Security Posture

### 14.1 Authentication

- JWT tokens (PyJWT 2.13.0); configurable algorithm
- Password hashing: `passlib[bcrypt]`
- Login rate limiting: configurable per-IP via slowapi
- Session expiry: configurable `ACCESS_TOKEN_EXPIRE_MINUTES`
- CSRF protection via SameSite cookie policy

### 14.2 Input Validation

- All API inputs validated by Pydantic v2 with strict types
- Path traversal protection in `database_manager.py` and `routers/control/database.py`: filename containment checks before any file operation
- ReDoS-safe regex patterns enforced via CodeQL SAST (fixed in v1.18.26, 50 alerts resolved)
- Stack-trace exposure prevention: production error responses never include Python tracebacks

### 14.3 Dependency Security

Active Dependabot scanning on all three manifest files:
- `src/backend/requirements.txt`
- `src/backend/pyproject.toml`
- `src/frontend/package.json`

v1.18.30 resolved 25 Dependabot alerts including starlette (CVEs), cryptography (OpenSSL wheels), python-multipart, and PyJWT. Current state: **0 open alerts**.

### 14.4 Container Security

Trivy scans the Docker image on every push. The `.trivyignore` file documents intentional suppressions. The scan is non-blocking on `main` (pipeline does not fail on informational findings) but SARIF results are uploaded to GitHub Security.

### 14.5 Backup Security

`BackupServiceEncrypted` (`src/backend/services/backup_service_encrypted.py`) supports:
- Encrypted backup mode (AES via Fernet)
- `.sha256` checksum sidecar for every backup file
- Gzip validation before storing
- Retention pruning via `BACKUP_KEEP_COUNT`

---

## 15. Distinguishing Characteristics Summary

The following properties collectively set this system apart from generic student-record applications:

### 15.1 Institutional-Grade Grading Engine

Unlike systems that store a single numeric grade per assignment, SMS implements the full Cyprus vocational grading contract:
- Configurable per-course multi-component evaluation rules (JSON, stored in the Course model)
- Weighted category averages with daily-performance multipliers
- Absence penalty deduction with a floor at 0
- Simultaneous output in percentage, GPA (4.0), Greek (20-point), and letter grade scales
- Full category breakdown in every grade response, providing audit-traceable transparency

### 15.2 Bilingual-by-Design

English/Greek support is not a translation layer applied after the fact — it is enforced at every tier: schema validation, PDF/Excel export, all UI text, and even error messages. The pre-commit and CI translation parity tests prevent any regression, reflecting the bilingual reality of professional education in Cyprus.

### 15.3 Zero-Infrastructure Deployment (Lite Edition)

The Lite Edition collapses the entire production stack (FastAPI + uvicorn + SQLite + React SPA) into a single 97 MB self-contained Windows executable with no runtime prerequisites. This is technically non-trivial: PyInstaller must embed CPython, all native wheels, the pre-built frontend bundle, and font files. A custom lifespan hook handles port conflicts and temp-file cleanup.

### 15.4 Predictive Analytics Without External ML Dependencies

The grade trend and attendance pattern predictions are implemented in pure Python using standard library statistics, making the system deployable on air-gapped machines without PyTorch, scikit-learn, or any ML runtime. The OLS implementation is transparent, auditable, and yields interpretable outputs (slope, R², confidence intervals) that teachers can reason about.

### 15.5 Audit-Complete Operations

Every write operation (grade creation, attendance marking, student update, role change) generates an `AuditLog` record with `old_values` and `new_values` JSON snapshots. This satisfies Cyprus's educational audit requirements and supports grade dispute resolution.

### 15.6 Offline-First for Classrooms

The offline queue architecture (IndexedDB + WebSocket reconciliation) acknowledges the reality of classroom connectivity. Attendance marking and grade submission survive network outages and synchronise automatically on reconnect. This is implemented cleanly with a typed TypeScript queue abstraction, not a fragile setTimeout polling loop.

### 15.7 Four-Platform Delivery from One Codebase

The same FastAPI backend and React frontend runs as:
1. A developer's native Python + Node.js process pair
2. A Docker Compose production stack
3. A standalone Windows EXE (Lite)
4. An Android APK (Capacitor)

All four share the identical authentication, RBAC, grading, and analytics logic — divergence between platforms is zero at the business logic layer.

### 15.8 Evidence-Driven Development Culture

The project enforces a strict "evidence required before claiming completion" policy:
- Every release requires COMMIT_READY gate passage with documented output
- Installer releases require Authenticode signature verification and SHA256 sidecar
- CI passes are linked by workflow run ID in the work plan
- 2,935 automated tests provide continuous regression coverage
- Release changelog entries carry commit hashes, not just summaries

---

## Appendix A — Version History Milestones

| Version | Date | Key Milestone |
|---|---|---|
| v1.18.0 | Jan 2026 | Initial production release; RBAC Phase 1 |
| v1.18.3 | Jan 2026 | Phase 1 complete: 8 improvements, 316 tests |
| v1.18.25 | Mar 2026 | Analytics revival (5,587 lines), 20+ endpoints |
| v1.18.25 | Mar 2026 | Control Panel, auto-updater, offline queues |
| v1.18.25 | Mar 2026 | First official public release; 0 Dependabot alerts |
| v1.18.29 | Jun 2026 | 8 chart types; email delivery; SMTP SSL/TLS |
| v1.18.30 | Jun 2026 | Checkpoint: 31 releases archived; 25 CVEs resolved |
| v1.18.31 | Jun 2026 | Docker stack restored; Android signed APK |
| v1.18.32 | Jun 2026 | CI/CD audit; 8 workflow bugs fixed; E2E HashRouter |

---

## Appendix B — Key Metrics at v1.18.32

| Metric | Value |
|---|---|
| Backend test count | 914 |
| Frontend test count | 1,939 |
| E2E test count | 82 |
| Total automated tests | 2,935 |
| Backend source files type-checked | 191 (0 mypy errors) |
| GitHub Actions workflows | 38 |
| ORM models | 15 |
| API route modules | 42 |
| Backend service classes | 38 |
| Frontend feature domains | 13 |
| Translation namespaces (per language) | 18 |
| Open security alerts (Dependabot) | 0 |
| Open CodeQL alerts | 0 |
| Installer size (v1.18.31) | 97 MB |
| Android APK size | 5.13 MB |
| Release tags published | 32 |
| Lines of production code (approx.) | 50,000+ |
| Documentation files | 100+ |

---

## Appendix C — Selected API Endpoints

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/analytics/student/{id}/course/{cid}/final-grade` | `reports:generate` | Full weighted final grade with breakdown |
| `GET` | `/analytics/student/{id}/all-courses-summary` | `reports:generate` | Transcript with GPA and credits |
| `GET` | `/analytics/dashboard` | `reports:generate` | Institution-wide dashboard aggregates |
| `GET` | `/analytics/export/pdf` | `reports:generate` | Bilingual PDF export |
| `GET` | `/analytics/export/excel` | `reports:generate` | Styled Excel workbook |
| `POST` | `/grades/` | `grades:edit` | Create grade (audit logged) |
| `GET` | `/grades/` | `grades:view` | Paginated grade list with filters |
| `POST` | `/attendance/` | `attendance:edit` | Mark attendance (audit logged) |
| `GET` | `/reports/` | `reports:generate` | List saved custom reports |
| `POST` | `/reports/` | `reports:generate` | Create/save custom report |
| `GET` | `/reports/{id}/export/pdf` | `reports:generate` | Export custom report as PDF |
| `GET` | `/students/` | `students:view` | Paginated student list with search |
| `POST` | `/students/import` | `students:edit` | Bulk CSV import |
| `POST` | `/auth/login` | — | JWT authentication |
| `GET` | `/health` | — | Service health probe (no auth) |
| `GET` | `/metrics` | `admin:system` | Prometheus-compatible metrics |
| `WebSocket` | `/ws` | JWT | Real-time notifications |

---

*This document was compiled from the live codebase at commit `d7f4ab762` (June 19, 2026) and supplemented with work plan evidence through `f4be40ba3` (June 21, 2026). All test counts and CI evidence are traceable to specific GitHub Actions workflow run IDs recorded in `docs/plans/UNIFIED_WORK_PLAN.md`.*
