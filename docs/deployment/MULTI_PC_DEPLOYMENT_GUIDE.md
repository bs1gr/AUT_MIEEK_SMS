# Multi-PC Deployment & Offline Operation Guide

**Version**: 1.0
**Date**: March 6, 2026
**Applies To**: SMS vv1.18.21+
**Architecture**: Option B — Central QNAP PostgreSQL + Frontend Offline Queues

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [How It Works](#2-how-it-works)
3. [Setting Up a New PC](#3-setting-up-a-new-pc)
4. [User Accounts & RBAC](#4-user-accounts--rbac)
5. [Offline Operation](#5-offline-operation)
6. [Data Flow & Sync Mechanics](#6-data-flow--sync-mechanics)
7. [Avoiding Duplication & Conflicts](#7-avoiding-duplication--conflicts)
8. [Troubleshooting](#8-troubleshooting)
9. [Technical Reference](#9-technical-reference)
10. [Limitations & Future Enhancements](#10-limitations--future-enhancements)

---

## 1. Architecture Overview

### Design Principle

The SMS application follows a **Central Database + Offline-First Frontend** architecture:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   PC-A       │     │   PC-B       │     │   PC-C       │
│  (Office)    │     │  (Home)      │     │  (Laptop)    │
│              │     │              │     │              │
│ ┌──────────┐ │     │ ┌──────────┐ │     │ ┌──────────┐ │
│ │ Frontend │ │     │ │ Frontend │ │     │ │ Frontend │ │
│ │ (React)  │ │     │ │ (React)  │ │     │ │ (React)  │ │
│ │          │ │     │ │          │ │     │ │          │ │
│ │ localStorage │   │ │ localStorage │   │ │ localStorage │
│ │ - Query cache│   │ │ - Query cache│   │ │ - Query cache│
│ │ - Offline    │   │ │ - Offline    │   │ │ - Offline    │
│ │   queues     │   │ │   queues     │   │ │   queues     │
│ └──────┬───┘ │     │ └──────┬───┘ │     │ └──────┬───┘ │
│        │     │     │        │     │     │        │     │
│ ┌──────┴───┐ │     │ ┌──────┴───┐ │     │ ┌──────┴───┐ │
│ │ Backend  │ │     │ │ Backend  │ │     │ │ Backend  │ │
│ │ (FastAPI)│ │     │ │ (FastAPI)│ │     │ │ (FastAPI)│ │
│ └──────┬───┘ │     │ └──────┬───┘ │     │ └──────┬───┘ │
└────────┼─────┘     └────────┼─────┘     └────────┼─────┘
         │                    │                    │
         └────────────┬───────┘────────────────────┘
                      │
              Network (LAN / VPN)
                      │
           ┌──────────┴──────────┐
           │  QNAP NAS           │
           │  PostgreSQL 15       │
           │  Port 55433          │
           │                      │
           │  ┌────────────────┐  │
           │  │ student_       │  │
           │  │ management DB  │  │
           │  │                │  │
           │  │ • users        │  │
           │  │ • students     │  │
           │  │ • courses      │  │
           │  │ • grades       │  │
           │  │ • attendance   │  │
           │  │ • RBAC tables  │  │
           │  │ • audit_logs   │  │
           │  └────────────────┘  │
           └──────────────────────┘
```

### Key Principles

| Principle | Implementation |
|-----------|----------------|
| **Single source of truth** | QNAP PostgreSQL holds ALL authoritative data |
| **No per-user databases** | Every user shares one central database |
| **Offline tolerance** | Frontend queues writes locally when network unavailable |
| **Automatic sync** | Queued changes push to server when network returns |
| **No local backend DB** | Backend connects directly to QNAP — no local SQLite in production |
| **Stateless backend** | Each PC's backend is interchangeable; all state lives in QNAP |

---

## 2. How It Works

### Online Mode (Normal Operation)

```
User action → Frontend API call → Backend → QNAP PostgreSQL
                                           ↓
                                     Data persisted
                                           ↓
                              Response → Frontend → UI updated
```

1. User performs an action (e.g., saves attendance)
2. Frontend sends HTTP request to the local backend
3. Backend writes to QNAP PostgreSQL
4. Response returns to frontend
5. React Query cache updates with fresh data

### Offline Mode (No Network)

```
User action → Frontend detects offline
                     ↓
           Change queued to localStorage
                     ↓
           UI shows optimistic update
                     ↓
           (User continues working)
                     ↓
           Network returns (`online` event)
                     ↓
           Queued changes flushed to server
                     ↓
           Cache invalidated → fresh data loaded
```

1. Network goes down (detected via `navigator.onLine`)
2. Frontend catches the failed API call
3. Change is stored in a localStorage queue (per feature)
4. UI shows the change immediately (optimistic update)
5. When network returns, `online` event triggers flush
6. Each queued item is sent to the backend one by one
7. On success: removed from queue, cache refreshed
8. On failure: stays in queue for next attempt

### Read-Only Offline (Cached Data)

React Query maintains a **7-day localStorage cache** of all previously fetched data:

- Student lists, course lists, grade records
- Served immediately from cache when offline
- Configurable staleness: data considered "fresh" for 5 minutes
- After 5 minutes: background refetch attempted (silent fail if offline)
- After 24 hours: data eligible for garbage collection
- After 7 days: data expired from localStorage persistence

---

## 3. Setting Up a New PC

### Prerequisites

- Windows 10/11 with PowerShell 7+
- Python 3.11+ installed
- Node.js 20+ installed
- Network access to QNAP NAS (during setup)

### Step-by-Step

#### Step 1: Install the Application

```powershell
# Clone or run the installer
# If using installer: Run SMS_Installer_1.18.6.exe
# If using source: git clone https://github.com/bs1gr/AUT_MIEEK_SMS.git
```

#### Step 2: Configure the Database Connection

Edit `backend/.env` to point to QNAP PostgreSQL:

```ini
# === Database Configuration ===
# CRITICAL: All PCs must use these EXACT same values
DATABASE_ENGINE=postgresql
POSTGRES_HOST=172.16.0.2
POSTGRES_PORT=55433
POSTGRES_USER=sms_user
POSTGRES_PASSWORD=<your_db_password>
POSTGRES_DB=student_management
POSTGRES_SSLMODE=prefer

# === Admin Bootstrap ===
# First admin account created on startup
DEFAULT_ADMIN_EMAIL=your.email@example.com
DEFAULT_ADMIN_PASSWORD=<your_admin_password>
DEFAULT_ADMIN_FULL_NAME=Your Name
DEFAULT_ADMIN_AUTO_RESET=true

# === Authentication ===
AUTH_ENABLED=true
AUTH_MODE=permissive
SECRET_KEY=<shared_secret_key_across_trusted_pcs>
```

**Important**: The `SECRET_KEY` should be the **same across PCs** if you want JWT tokens to be valid across installations. Generate one with:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

#### Step 3: Start the Application

```powershell
.\NATIVE.ps1 -Start   # For development/testing
# OR
.\DOCKER.ps1 -Start   # For production
```

On first startup, the backend will:
1. Connect to QNAP PostgreSQL
2. Run Alembic migrations (creates/updates tables)
3. Seed RBAC defaults (roles, permissions)
4. Create/update the admin account from `DEFAULT_ADMIN_*` vars

#### Step 4: Verify Connection

```powershell
# Check backend health
Invoke-RestMethod http://localhost:8000/health
# Should return: {"status": "healthy", ...}
```

### What NOT to Do

| Mistake | Consequence |
|---------|-------------|
| Leave `DATABASE_ENGINE=sqlite` | Creates a separate local DB — data not shared |
| Use different `POSTGRES_DB` values | Each PC talks to a different database |
| Forget to configure `.env` before first start | SQLite created by default, migrations run against wrong DB |
| Use different `SECRET_KEY` on each PC | JWT tokens from PC-A rejected on PC-B |

---

## 4. User Accounts & RBAC

### Single User Table

ALL user accounts live in the central QNAP database. When you create a user on PC-A, it's immediately visible from PC-B.

```
QNAP: student_management.users table
┌────┬─────────────────────┬─────────┬───────────┐
│ id │ email               │ role    │ is_active │
├────┼─────────────────────┼─────────┼───────────┤
│  1 │ admin@example.com   │ admin   │ true      │
│  2 │ teacher@school.edu  │ teacher │ true      │
│  3 │ student@school.edu  │ student │ true      │
└────┴─────────────────────┴─────────┴───────────┘
```

### Admin Bootstrap

The `DEFAULT_ADMIN_*` environment variables control automatic admin account creation:

- **New installation**: If the email doesn't exist → creates user with admin role
- **Existing user**: If email exists → updates role to admin, activates account
- **Password sync**: If `DEFAULT_ADMIN_AUTO_RESET=true`, password is synced on each startup

**Recommendation**: Use the SAME admin email/password in `.env` across all PCs. This ensures the admin account is consistent everywhere.

### RBAC (Role-Based Access Control)

Permissions are managed centrally in the QNAP database:

| Table | Purpose |
|-------|---------|
| `roles` | Named roles (admin, teacher, student, viewer) |
| `permissions` | Individual permissions (students:view, grades:edit, etc.) |
| `role_permissions` | Which permissions belong to which roles |
| `user_roles` | Which roles are assigned to which users |
| `user_permissions` | Direct per-user permission grants (with optional expiration) |

Since these tables live in QNAP, RBAC changes made on any PC apply everywhere:

```
PC-A: Admin grants "teacher" role to user 5
  → INSERT INTO user_roles (user_id=5, role_id=2)
  → Stored in QNAP PostgreSQL

PC-B: User 5 logs in
  → Backend checks QNAP user_roles table
  → User 5 has teacher permissions
  → Access granted
```

### Creating New Users

1. Log in as admin on any PC
2. Go to **Admin → User Management**
3. Click **Add User**
4. Enter email, password, role, full name
5. User is created in QNAP → available on ALL PCs immediately

### Key Rules

- **One email = One user** (email is unique across the entire system)
- **Roles are global** — an admin on PC-A is admin on PC-B
- **No per-PC users** — there is no concept of "local" vs "remote" users
- The admin bootstrap (`DEFAULT_ADMIN_*`) is a convenience for first setup only

---

## 5. Offline Operation

### What Works Offline

| Feature | Offline Behavior | Sync Mechanism |
|---------|-------------------|----------------|
| **View students** | Cached data served (up to 7 days) | React Query localStorage cache |
| **View courses** | Cached data served | React Query localStorage cache |
| **View grades** | Cached data served | React Query localStorage cache |
| **View attendance** | Cached data served | React Query localStorage cache |
| **Edit student** | Queued locally, synced on reconnect | `offlineStudentUpdateQueue` |
| **Record attendance** | Queued locally, synced on reconnect | `offlineAttendanceQueue` |
| **Save grades** | Queued locally, synced on reconnect | `offlineGradesQueue` |
| **Login** | Works if token cached in localStorage | JWT stored locally |

### What Does NOT Work Offline

| Feature | Why |
|---------|-----|
| **Create new student** | Requires server-generated ID |
| **Create new course** | Requires server-generated ID |
| **Delete records** | Destructive operations require server confirmation |
| **User management** | Admin operations require live database |
| **Reports/Analytics** | Require server-side computation |
| **First login** | No cached token available |
| **Password changes** | Requires server verification |
| **Backups** | Requires database access |

### Recognizing Offline State

The frontend detects offline state via:

```typescript
// Browser API — fires when network connectivity changes
window.addEventListener('online', handleOnline);
window.addEventListener('offline', handleOffline);

// Direct check
if (navigator.onLine) {
  // Network available — attempt sync
} else {
  // Offline — queue changes locally
}
```

### Offline Queue Indicators

When changes are queued, the UI reflects pending state:

- **Attendance**: Pending sync count displayed in view
- **Students**: Queued updates applied optimistically (UI shows updated data)
- **Grades**: Mutations queued with operation type (create/update)

---

## 6. Data Flow & Sync Mechanics

### Attendance Sync (Most Detailed)

The attendance queue is the most sophisticated sync mechanism:

```
ENQUEUE (offline):
1. User marks attendance for Course 101 on 2026-03-06
2. Frontend detects API call would fail (offline)
3. Snapshot created:
   {
     courseId: 101,
     date: "2026-03-06",
     attendanceRecords: {
       "42|1|2026-03-06": "Present",
       "42|2|2026-03-06": "Late",
       "43|1|2026-03-06": "Absent"
     },
     dailyPerformance: {
       "42-participation": 8,
       "43-participation": 5
     }
   }
4. Stored in localStorage key: sms_attendance_offline_queue_v1
5. Deduplication: If same courseId+date already queued, REPLACE it

FLUSH (back online):
1. `online` event fires → flushQueuedSnapshots() called
2. For each snapshot in queue:
   a. Fetch existing DB records for that course+date
   b. Build ID map (which records already exist)
   c. For each attendance entry:
      - If record exists in DB → PUT /attendance/{id} (update)
      - If record doesn't exist → POST /attendance/ (create)
      - If PUT returns 404 → fallback to POST (create)
   d. Process in 30-item chunks with 200ms delay between
   e. On success: remove snapshot from queue
   f. On error: stop, keep remaining snapshots for retry
3. After flush: refresh attendance data from server
```

### Student Update Sync

```
ENQUEUE:
1. User edits student profile while offline
2. Update queued: { studentId: 42, data: { first_name: "Updated" } }
3. Deduplication: If student 42 already queued, REPLACE with latest
4. UI shows optimistic update immediately

FLUSH:
1. `online` event → flushQueuedStudentUpdates()
2. For each queued update:
   a. Call PUT /students/{studentId} with data
   b. On success: remove from queue + invalidate cache
   c. On error: stop flush, retry on next online event
```

### Grade Mutation Sync

```
ENQUEUE:
1. User creates or updates a grade while offline
2. Mutation queued: { op: "create"|"update", gradeId?: number, payload: {...} }
3. Deduplication: For 'update' ops, same gradeId → REPLACE
4. 'create' ops always appended (no dedup)

FLUSH:
1. `online` event → flushQueuedGradeMutations()
2. For each queued mutation:
   a. If op="update" → PUT /grades/{gradeId}
      - If 404 → fallback to POST /grades/ (create)
   b. If op="create" → POST /grades/
   c. On success: remove from queue
   d. On error: stop, retry next time
```

### React Query Cache

Independent of the offline queues, React Query maintains a read cache:

```
Configuration:
- networkMode: 'offlineFirst'     → Return cached data immediately
- staleTime: 5 minutes            → Data "fresh" for 5 min
- gcTime: 24 hours                → Garbage collected after 24h
- Persistence: localStorage       → Survives browser refresh
- maxAge: 7 days                  → Cache drops after 7 days
- buster: 'vv1.18.21'               → Manual invalidation on version bump
```

---

## 7. Avoiding Duplication & Conflicts

### Problem: Two PCs, Same Database

Since all PCs connect to the same QNAP database, there is **no data duplication by design**. Each record has a unique server-generated ID.

### Problem: Conflicting Edits

If PC-A and PC-B edit the same student record simultaneously:

| Time | PC-A | PC-B | Database |
|------|------|------|----------|
| T1 | Edit name → "Nikos" | — | name = "Nikos" |
| T2 | — | Edit name → "Nikolaos" | name = "Nikolaos" |

**Resolution**: Last write wins. No conflict detection exists. The second save overwrites the first.

### Problem: Offline Edits on Multiple PCs

If PC-A edits student 42 offline and PC-B edits student 42 offline:

| Time | PC-A (offline) | PC-B (offline) | QNAP DB |
|------|----------------|----------------|---------|
| T1 | Queue: name → "Nikos" | Queue: email → "n@s.com" | Unchanged |
| T2 | Comes online → flush | — | name = "Nikos" |
| T3 | — | Comes online → flush | email = "n@s.com" |

**Result**: Both changes applied (different fields). No conflict.

**Worst case** (same field edited):

| Time | PC-A (offline) | PC-B (offline) | QNAP DB |
|------|----------------|----------------|---------|
| T1 | Queue: name → "Nikos" | Queue: name → "Nick" | Unchanged |
| T2 | Comes online first → flush | — | name = "Nikos" |
| T3 | — | Comes online → flush | name = "Nick" |

**Result**: PC-B's value wins (last write wins). No merge, no warning.

### How to Avoid Conflicts

1. **Assign data ownership**: Each teacher handles their own courses/students
2. **Minimize concurrent offline edits**: Sync before switching PCs
3. **Check sync status**: Ensure all offline queues are flushed before shutting down
4. **Audit trail**: The `audit_logs` table records who changed what and when

### Problem: SQLite vs PostgreSQL Mismatch

**Critical**: If one PC accidentally runs SQLite while others use PostgreSQL, that PC's data is completely isolated. Changes made there will NOT appear on other PCs.

**How to detect**: Check the backend startup log:

```
# PostgreSQL (correct for multi-PC):
INFO: Using database: postgresql+psycopg://sms_user:***@172.16.0.2:55433/student_management

# SQLite (WRONG for multi-PC):
INFO: Using database: sqlite:///data/student_management.db
```

**How to fix**: Edit `backend/.env` → set `DATABASE_ENGINE=postgresql` + POSTGRES_* vars → restart backend.

---

## 8. Troubleshooting

### "Backend won't start — cannot connect to QNAP"

```
sqlalchemy.exc.OperationalError: connection to server at "172.16.0.2", port 55433 failed
```

**Causes**:
- QNAP NAS is powered off or unreachable
- VPN not connected (if accessing from outside LAN)
- PostgreSQL service stopped on QNAP
- Firewall blocking port 55433

**Solutions**:
1. Ping the QNAP: `ping 172.16.0.2`
2. Test port: `Test-NetConnection -ComputerName 172.16.0.2 -Port 55433`
3. Check QNAP Container Station → PostgreSQL container running
4. Verify credentials: `psql -h 172.16.0.2 -p 55433 -U sms_user -d student_management`

### "My changes didn't appear on the other PC"

1. Check if both PCs point to QNAP PostgreSQL (not SQLite)
2. Check if the change is still in the offline queue (not synced yet)
3. Hard refresh the browser on the other PC (Ctrl+F5)
4. Check the `audit_logs` table for the specific change

### "Offline queue won't flush"

1. Verify network is back: `ping 172.16.0.2`
2. Check browser console for sync errors (F12 → Console)
3. Verify backend is running: `Invoke-RestMethod http://localhost:8000/health`
4. Manual flush: Refresh the page — sync runs on component mount when online

### "User created on PC-A not visible on PC-B"

1. Both PCs must point to same `POSTGRES_DB` in `.env`
2. Restart backend on PC-B if configuration was changed recently
3. Check user exists: `SELECT * FROM users WHERE email = '...'` on QNAP

### "JWT token rejected on different PC"

- Ensure `SECRET_KEY` in `.env` is identical across all PCs
- Or: Simply log in again on the new PC (new token issued)

---

## 9. Technical Reference

### localStorage Keys (Frontend)

| Key | Purpose | Max Age |
|-----|---------|---------|
| `sms_students_offline_update_queue_v1` | Queued student edits | Until flushed |
| `sms_attendance_offline_queue_v1` | Queued attendance snapshots | Until flushed |
| `sms_grades_offline_queue_v1` | Queued grade mutations | Until flushed |
| `REACT_QUERY_OFFLINE_CACHE` | All query result cache | 7 days |
| `sms_access_token` | JWT authentication token | Until expiry |
| `sms_user_v1` | Cached user profile | Until logout |

### Environment Variables (Backend)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_ENGINE` | Yes | `sqlite` | `postgresql` for multi-PC |
| `POSTGRES_HOST` | If PostgreSQL | `localhost` | QNAP IP address |
| `POSTGRES_PORT` | If PostgreSQL | `5432` | QNAP PostgreSQL port |
| `POSTGRES_USER` | If PostgreSQL | — | Database username |
| `POSTGRES_PASSWORD` | If PostgreSQL | — | Database password |
| `POSTGRES_DB` | If PostgreSQL | — | Database name |
| `POSTGRES_SSLMODE` | No | `prefer` | SSL mode (prefer/require/disable) |
| `SECRET_KEY` | Yes | Random | JWT signing key (share across PCs) |
| `DEFAULT_ADMIN_EMAIL` | No | — | Bootstrap admin email |
| `DEFAULT_ADMIN_PASSWORD` | No | — | Bootstrap admin password |
| `DEFAULT_ADMIN_FULL_NAME` | No | — | Bootstrap admin display name |
| `DEFAULT_ADMIN_AUTO_RESET` | No | `false` | Sync password on startup |
| `AUTH_MODE` | No | `permissive` | Auth enforcement level |

### API Endpoints Used by Sync

| Endpoint | Method | Offline Queue |
|----------|--------|---------------|
| `/api/v1/students/{id}` | PUT | Student update queue |
| `/api/v1/attendance/` | POST | Attendance queue (create) |
| `/api/v1/attendance/{id}` | PUT | Attendance queue (update) |
| `/api/v1/daily-performance/` | POST | Attendance queue (create) |
| `/api/v1/daily-performance/{id}` | PUT | Attendance queue (update) |
| `/api/v1/grades/` | POST | Grades queue (create) |
| `/api/v1/grades/{id}` | PUT | Grades queue (update) |

### PWA Service Worker

The SMS application is a Progressive Web App (PWA):

- **Static assets**: Cached by Workbox service worker (JS, CSS, HTML, images, fonts)
- **API responses**: NOT cached by service worker (handled by React Query instead)
- **Font caching**: Google Fonts cached for 1 year (StaleWhileRevalidate strategy)
- **Auto-update**: Service worker updates automatically on new deployment
- **Max file size**: 5MB per cached file

---

## 10. Limitations & Future Enhancements

### Current Limitations (Option B)

| Limitation | Impact | Workaround |
|------------|--------|------------|
| No offline CREATE for students/courses | Must be online to add new records | Plan data entry for online periods |
| No offline DELETE | Must be online to remove records | Queue deletes mentally and execute when online |
| Last-write-wins conflicts | Concurrent edits may overwrite each other | Coordinate who edits what |
| Backend requires network at startup | Cannot start backend without QNAP access | Start backend while on network, keep running |
| No automatic SQLite fallback | If QNAP unreachable, backend fails | Frontend offline queues still work for cached data |
| JWT validity tied to SECRET_KEY | Different keys = different token realms | Use same SECRET_KEY across PCs |

### Potential Future Enhancements (Option C — Not Implemented)

These features would require significant development (2-4 weeks) and are NOT currently part of the system:

1. **Local SQLite shadow database** — Backend maintains a local SQLite copy that syncs bidirectionally with QNAP PostgreSQL
2. **UUID-based primary keys** — Replace auto-increment IDs with UUIDs to prevent ID collisions between local and remote databases
3. **Change tracking (CDC)** — Log-based change capture for reliable bidirectional sync
4. **Conflict resolution UI** — Show users when conflicts occur and let them choose which version to keep
5. **Automatic QNAP discovery** — mDNS/Bonjour-based discovery so PCs find the QNAP without manual configuration
6. **Offline backend startup** — Allow backend to start against local SQLite and switch to PostgreSQL when network becomes available

---

## Quick Reference Card

### New PC Setup (5 Minutes)

```powershell
# 1. Install the application
# 2. Edit backend/.env:
DATABASE_ENGINE=postgresql
POSTGRES_HOST=172.16.0.2
POSTGRES_PORT=55433
POSTGRES_USER=sms_user
POSTGRES_PASSWORD=<password>
POSTGRES_DB=student_management
SECRET_KEY=<same_key_as_other_pcs>

# 3. Start
.\NATIVE.ps1 -Start

# 4. Verify
Invoke-RestMethod http://localhost:8000/health
```

### Daily Workflow

```
Morning:
  1. Ensure network connectivity to QNAP
  2. Start backend: .\NATIVE.ps1 -Start
  3. Open browser: http://localhost:5173
  4. Any queued offline changes sync automatically

During the day:
  - Work normally (read/write data)
  - If network drops: continue working (offline queues active)
  - Attendance, grades, student edits → queued automatically
  - Read-only data → served from cache (up to 7 days)

End of day:
  - Check for pending sync (attendance view shows count)
  - Ensure all queues flushed before shutdown
  - Safe to close browser and stop backend
```

### Emergency: Lost All Network Access

```
If QNAP is completely unreachable:
  1. Backend will NOT start (cannot connect to PostgreSQL)
  2. If backend was ALREADY running, frontend can still:
     - View cached data (read-only)
     - Queue attendance/grades/student edits
  3. Changes will sync when network returns
  4. DO NOT switch to SQLite — this creates a split-brain scenario
```

---

**Document maintained by**: Development Team
**Last updated**: March 6, 2026
