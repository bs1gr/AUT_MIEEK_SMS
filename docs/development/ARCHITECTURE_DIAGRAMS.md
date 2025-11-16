# Architecture Diagrams

**Status**: Draft
**Last Updated**: 2025-11-16
**Applies To**: v1.6.3+

Mermaid diagrams illustrating key system flows.

---

## 1. High-Level Deployment Modes

```mermaid
graph LR
  A[User Browser] --> B{Mode}
  B -->|Fullstack Docker| C[Single Container (FastAPI + React build)]
  B -->|Native Dev| D[FastAPI Backend]
  D --> E[Vite Dev Server]
  C --> F[SQLite DB Volume]
  D --> G[SQLite DB File]
```

---

## 2. Startup Lifespan Sequence

```mermaid
sequenceDiagram
  participant U as Uvicorn
  participant L as Lifespan Manager
  participant M as Migrations
  participant C as Cache
  participant H as Health Checks

  U->>L: start lifespan
  L->>M: run Alembic upgrade head
  M-->>L: migrations complete
  L->>C: prime caches (optional)
  L->>H: initial health snapshot
  L-->>U: app ready
```

---

## 3. Authentication Flow

```mermaid
sequenceDiagram
  participant Client
  participant API as FastAPI Auth Router
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
```

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
```

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
```

---

## 6. Future Diagrams (TODO)

- Daily performance aggregation
- Attendance range query normalization
- Deployment rollback decision tree

---
**Reference**: See `docs/DOCUMENTATION_INDEX.md` for full documentation set.
