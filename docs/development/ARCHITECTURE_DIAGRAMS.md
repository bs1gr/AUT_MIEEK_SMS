# Architecture Diagrams

**Version**: 1.11.1
**Last Updated**: 2025-12-11
**Status**: Production Reference
**Applies To**: $11.11.1+

Comprehensive Mermaid diagrams illustrating key system flows, deployment modes, and component relationships.

---

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph Client["🖥️ Client Layer"]
        Browser["Browser (React SPA)"]
        Mobile["Mobile Client (API only)"]
    end

    subgraph API["🔌 API Gateway"]
        FastAPI["FastAPI Server<br/>(8000 or 8080)"]
    end

    subgraph Services["🔧 Service Layer"]
        Auth["Authentication<br/>(JWT, Sessions)"]
        Student["Student Service"]
        Course["Course Service"]
        Grade["Grade Service"]
        Attendance["Attendance Service"]
        Analytics["Analytics Service"]
    end

    subgraph Data["💾 Data Layer"]
        SQLite["SQLite DB<br/>(Development)"]
        PostgreSQL["PostgreSQL<br/>(Production)"]
    end

    Browser -->|HTTP| FastAPI
    Mobile -->|API| FastAPI
    FastAPI --> Auth
    FastAPI --> Student
    FastAPI --> Course
    FastAPI --> Grade
    FastAPI --> Attendance
    FastAPI --> Analytics

    Auth --> SQLite
    Auth --> PostgreSQL
    Student --> SQLite
    Student --> PostgreSQL
    Grade --> SQLite
    Grade --> PostgreSQL

```text
---

## 2. Deployment Modes

```mermaid
graph LR
  subgraph Docker["🐳 Docker (Production)"]
    DApp["FastAPI App<br/>+ React Build<br/>Port: 8080"]
    DDB["SQLite/PostgreSQL<br/>Volume: sms_data"]
    DApp -->|Query| DDB
  end

  subgraph Native["💻 Native (Development)"]
    Backend["Uvicorn Backend<br/>Port: 8000<br/>--reload"]
    Frontend["Vite Frontend<br/>Port: 5173<br/>HMR"]
    NDB["SQLite<br/>data/"]
    Backend -->|Query| NDB
    Frontend -->|API| Backend
  end

  Browser["Browser"]
  Browser -->|8080| Docker
  Browser -->|5173| Native

```text
---

## 3. Startup Lifespan Sequence

```mermaid
sequenceDiagram
  participant Process as Process
  participant App as FastAPI App
  participant Lifespan as Lifespan Manager
  participant Migrations as Alembic
  participant DB as Database
  participant Health as Health Checks

  Process->>App: Start (main.py)
  App->>Lifespan: __aenter__
  Lifespan->>Migrations: Run upgrade head
  Migrations->>DB: CREATE/UPDATE tables
  DB-->>Migrations: Schema ready
  Migrations-->>Lifespan: Complete
  Lifespan->>Health: Initial check
  Health-->>Lifespan: OK
  Lifespan-->>App: Ready
  App-->>Process: Listening on port

```text
---

## 4. Authentication Flow (JWT)

```mermaid
sequenceDiagram
  participant Client
  participant API as FastAPI Auth Router
  participant DB as Database
  participant Auth as Auth Service

  Client->>API: POST /auth/login<br/>(username, password)
  API->>Auth: verify_credentials()
  Auth->>DB: SELECT user WHERE email
  DB-->>Auth: User record
  Auth->>Auth: verify_password()

  alt Valid Credentials
    Auth->>Auth: Generate JWT<br/>(exp, role, sub)
    Auth-->>API: {access_token, refresh_token}
    API-->>Client: Set-Cookie + JSON
    Client->>Client: Store in localStorage
  else Invalid Credentials
    Auth-->>API: HTTPException(401)
    API-->>Client: {detail: "Invalid"}
  end

  Client->>API: GET /students<br/>Header: Bearer {token}
  API->>API: JWTBearer.verify()

  alt Token Valid & Not Expired
    API->>DB: Query students
    DB-->>API: [students]
    API-->>Client: {data: [students]}
  else Token Expired
    API-->>Client: 401 Unauthorized
    Client->>API: POST /auth/refresh
    API->>Auth: Refresh JWT
    Auth-->>API: New access_token
    API-->>Client: {access_token}
  end

```text
---

## 5. Database Schema Relationships

```mermaid
erDiagram
    STUDENTS ||--o{ COURSE_ENROLLMENTS : enrolls
    STUDENTS ||--o{ GRADES : receives
    STUDENTS ||--o{ ATTENDANCE : has
    STUDENTS ||--o{ DAILY_PERFORMANCE : records

    COURSES ||--o{ COURSE_ENROLLMENTS : offered
    COURSES ||--o{ GRADES : contains
    COURSES ||--o{ ATTENDANCE : tracks

    STUDENTS {
        int id PK
        string student_id UK
        string first_name
        string last_name
        string email UK
        boolean is_active
        datetime created_at
        datetime deleted_at "soft_delete"
    }

    COURSES {
        int id PK
        string course_code UK
        string course_name
        int semester
        float absence_penalty
        datetime created_at
    }

    COURSE_ENROLLMENTS {
        int id PK
        int student_id FK
        int course_id FK
        datetime enrollment_date
        string status
    }

    GRADES {
        int id PK
        int student_id FK
        int course_id FK
        float grade
        float max_grade
        float weight
        datetime date_submitted
    }

    ATTENDANCE {
        int id PK
        int student_id FK
        int course_id FK
        datetime session_date
        string status "present/absent/late"
    }

```text
---

## 6. Request Lifecycle

```mermaid
graph TB
    Request["📨 Incoming Request<br/>HTTP/HTTPS"]

    CorsCheck["✅ CORS Middleware"]
    RateLimit["⏱️ Rate Limiting"]
    RequestID["🔖 Request ID<br/>(Tracking)"]
    Auth["🔐 JWT Validation"]

    Router["🚦 Router Selection"]
    Validation["✔️ Pydantic Schema"]
    Business["💼 Service Logic"]
    Database["💾 SQL Query"]

    ErrorCheck{Error?}
    ErrorHandler["🚨 Error Handler"]

    Response["📤 Response Builder<br/>(JSON + Status)"]
    Logging["📝 Structured Logging"]

    Return["✨ Return"]

    Request --> CorsCheck
    CorsCheck --> RateLimit
    RateLimit --> RequestID
    RequestID --> Auth
    Auth --> Router
    Router --> Validation
    Validation --> Business
    Business --> Database
    Database --> ErrorCheck
    ErrorCheck -->|No Error| Response
    ErrorCheck -->|Error| ErrorHandler
    ErrorHandler --> Response
    Response --> Logging
    Logging --> Return

```text
---

## 7. Analytics Pipeline

```mermaid
graph LR
    Request["📊 Analytics Request<br/>(student performance)"]

    Enroll["📋 Get Enrollments<br/>(eager load)"]
    Grades["📈 Load Grades<br/>(joinedload)"]
    Attend["📅 Load Attendance<br/>(joinedload)"]
    Perf["💪 Load Daily Performance<br/>(joinedload)"]

    Compute["🔢 Compute Metrics<br/>(weighted avg, rate)"]
    Cache["💾 Cache 5 min"]
    Format["📦 Format JSON"]
    Return["✨ Return Response"]

    Request --> Enroll
    Enroll --> Grades
    Enroll --> Attend
    Enroll --> Perf

    Grades --> Compute
    Attend --> Compute
    Perf --> Compute

    Compute --> Cache
    Cache --> Format
    Format --> Return

```text
---

## 8. Backend Modular Architecture

```mermaid
graph TB
    Main["main.py<br/>(Entry Point)"]

    Factory["app_factory.py<br/>(Create FastAPI)"]
    Lifespan["lifespan.py<br/>(Startup/Shutdown)"]
    Middleware["middleware_config.py<br/>(Register MW)"]
    ErrorHandlers["error_handlers.py<br/>(Exception Handlers)"]
    RouterRegistry["router_registry.py<br/>(Register Routes)"]

    Routers["routers/<br/>(API Endpoints)"]
    Schemas["schemas/<br/>(Pydantic)"]
    Models["models.py<br/>(SQLAlchemy ORM)"]
    Services["services/<br/>(Business Logic)"]

    DB["Database<br/>(SQLAlchemy)"]

    Main --> Factory
    Main --> Lifespan

    Factory --> Middleware
    Factory --> ErrorHandlers
    Factory --> RouterRegistry

    RouterRegistry --> Routers
    Routers --> Schemas
    Routers --> Services
    Services --> Models
    Models --> DB

```text
---

## 9. CI/CD Pipeline

```mermaid
graph LR
    Push["📤 Push to main"]

    Trigger["🔔 GitHub Actions"]

    subgraph Tests["🧪 Tests"]
        Backend["pytest<br/>(379 tests)"]
        Frontend["vitest<br/>(1189 tests)"]
        E2E["Playwright<br/>(12+ tests)"]
    end

    subgraph Quality["📊 Quality"]
        Ruff["Ruff"]
        ESLint["ESLint"]
        TypeScript["TypeScript"]
        Markdown["Markdown Lint"]
    end

    subgraph Cache["⚡ Cache"]
        NPMCache["npm Deps<br/>(30-45s)"]
        PlaywrightCache["Playwright<br/>(45-60s)"]
        PipCache["pip<br/>(20-30s)"]
    end

    AllPass{"All Pass?"}

    Deploy["🚀 Deploy"]
    Success["✅ Success"]
    Fail["❌ Failed"]

    Push --> Trigger
    Trigger --> Tests
    Trigger --> Quality
    Trigger --> Cache

    Tests --> AllPass
    Quality --> AllPass

    AllPass -->|Yes| Success
    AllPass -->|No| Fail
    Success --> Deploy

```text
---

## 10. Frontend Component Hierarchy

```mermaid
graph TB
    App["App.tsx<br/>(Root)"]

    Providers["Providers<br/>(Auth, i18n, Theme)"]
    Router["React Router<br/>(v6)"]

    Pages["Pages"]
    Login["LoginPage"]
    Students["StudentListPage"]
    Profile["StudentProfilePage"]
    Dashboard["DashboardPage"]

    Components["UI Components"]
    Card["StudentCard"]
    Table["GradeTable"]
    Modal["Modals"]

    Hooks["Custom Hooks"]
    UseAuth["useAuth()"]
    UseStudents["useStudents()"]
    UseGrades["useGrades()"]

    API["API Client<br/>(axios)"]

    App --> Providers
    Providers --> Router
    Router --> Pages

    Pages --> Login
    Pages --> Students
    Pages --> Profile
    Pages --> Dashboard

    Students --> Card
    Profile --> Table
    Profile --> Modal

    Card --> UseAuth
    Card --> UseStudents
    Table --> API

```text
---

## 11. Backup & Recovery

```mermaid
graph TB
    Running["🏃 Application Running"]

    AutoBackup["⏲️ Every 15 min"]
    Snapshot["📸 Database Snapshot"]
    Store["💾 Store Backup"]
    Verify["✅ Verify Checksum"]

    Incident["🚨 Incident Detected"]

    Recovery["🔄 Initiate Recovery"]
    List["📋 List Backups"]
    Select["👆 Select Backup"]
    Restore["⚙️ Restore Database"]
    Verify2["✅ Verify Data"]
    Restart["🔄 Restart App"]
    Online["✨ Back Online"]

    Running --> AutoBackup
    AutoBackup --> Snapshot
    Snapshot --> Store
    Store --> Verify

    Incident --> Recovery
    Recovery --> List
    List --> Select
    Select --> Restore
    Restore --> Verify2
    Verify2 --> Restart
    Restart --> Online

```text
---

## 12. Rate Limiting

```mermaid
graph LR
    Request["📨 Incoming Request"]

    Check["Check Quota<br/>(Redis/Memory)"]

    Within{Within Limit?}

    Allow["✅ Allow<br/>(Proceed)"]
    Reject["❌ Reject<br/>(429)"]

    Response["📤 Response<br/>+ RateLimit Headers"]

    Request --> Check
    Check --> Within
    Within -->|Yes| Allow
    Within -->|No| Reject

    Allow --> Response
    Reject --> Response

```text
---

## Migration Path: SQLite → PostgreSQL

```mermaid
graph LR
    Start["Running on SQLite"]

    Plan["📋 Plan Migration<br/>(See DATABASE_MIGRATION_GUIDE.md)"]
    Backup["📸 Backup SQLite"]

    Setup["⚙️ Setup PostgreSQL<br/>(Docker/native)"]
    Schema["📐 Create Schema<br/>(Alembic)"]

    Migrate["🔄 Migrate Data<br/>(pgloader or manual)"]
    Verify["✅ Verify Data<br/>(Count, samples)"]

    Switch["🔀 Switch Connection<br/>(Update DATABASE_URL)"]
    Test["🧪 Run Tests"]

    Live["🚀 Live on PostgreSQL"]

    Start --> Plan
    Plan --> Backup
    Backup --> Setup
    Setup --> Schema
    Schema --> Migrate
    Migrate --> Verify
    Verify --> Switch
    Switch --> Test
    Test --> Live

```text
---

## Architecture Decision Records

### ADR-1: Single FastAPI Container

- **Decision**: One container (FastAPI + React build)
- **Rationale**: Simpler deployment, single port, easier scaling
- **Status**: ✅ Implemented

### ADR-2: SQLite → PostgreSQL Path

- **Decision**: SQLite for dev, PostgreSQL for production
- **Rationale**: ~500 concurrent users (SQLite), 10,000+ (PostgreSQL)
- **Migration**: Documented procedure available
- **Status**: ✅ Guide provided

### ADR-3: Modular Backend Architecture

- **Decision**: 5 focused modules vs. monolithic main.py
- **Rationale**: Maintainability, testability, code reuse
- **Impact**: main.py: 1555 → 100 lines
- **Status**: ✅ Implemented ($11.11.1)

### ADR-4: React SPA with REST API

- **Decision**: Direct axios calls to FastAPI
- **Rationale**: Standard REST, simple auth, no GraphQL overhead
- **Status**: ✅ Implemented

### ADR-5: Soft Deletes via Mixin

- **Decision**: Mark deleted, don't physically remove
- **Rationale**: Audit trail, recovery, compliance
- **Status**: ✅ All models use SoftDeleteMixin

---

## Performance Metrics

| Aspect | Current | Target | Status |
|---|---|---|---|
| Page Load | <2s | <1s | ⏳ |
| API Response | <100ms | <50ms | ✅ Met |
| Analytics Query | <100ms | <50ms | ✅ 160x improved |
| Cache Hit Rate | 85-90% | >95% | ⏳ |
| RTO (Recovery) | <20 min | <15 min | ⏳ Target |

---

**Last Updated**: 2025-12-11
**Status**: Production-Ready
  participant DB as Database
  participant JWT as Token Signer

  Client->>API: POST /auth/login (credentials)
  API->>DB: verify user + throttle state
  DB-->>API: user ok
  API->>JWT: sign access token
  JWT-->>API: token
  API-->>Client: 200 {access_token}
  Client->>API: GET /students (Authorization: Bearer)
  API->>JWT: validate & decode
  API->>DB: fetch authorized data
  DB-->>API: data
  API-->>Client: 200 data

```text
---

## 4. Grade Submission & Cache Invalidation

```mermaid
sequenceDiagram
  participant Client
  participant Grades as /grades Router
  participant DB as Database
  participant Cache as Response Cache

  Client->>Grades: POST /grades {grade}
  Grades->>DB: insert grade
  DB-->>Grades: success
  Grades->>Cache: invalidate keys (student, course summary)
  Cache-->>Grades: ack
  Grades-->>Client: 201 created
  Client->>Grades: GET /grades/student/{id}
  Grades->>Cache: lookup
  Cache-->>Grades: miss
  Grades->>DB: fetch
  DB-->>Grades: rows
  Grades->>Cache: store cached response
  Grades-->>Client: 200 list

```text
---

## 5. Rate Limiting Decision

```mermaid
flowchart LR
  A[Incoming Request] --> B{Method}
  B -->|GET| C{Cached?}
  C -->|Yes| D[Serve cached response]
  C -->|No| E[Proceed to handler]
  B -->|POST/PUT/DELETE| F[Check limiter bucket]
  F -->|Exceeds| G[429]
  F -->|Allowed| E[Proceed to handler]

```text
---

## 6. Future Diagrams (TODO)

- Daily performance aggregation
- Attendance range query normalization
- Deployment rollback decision tree

---
**Reference**: See `docs/DOCUMENTATION_INDEX.md` for full documentation set.
