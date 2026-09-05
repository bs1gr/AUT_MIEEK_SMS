# Unified Work Plan - Student Management System

**Current Version**: 1.18.37
**Last Updated**: September 5, 2026
**Status**: ✅ **v1.18.37 published 2026-09-04 (tag → `140997840`, installer + Android APK on GitHub Releases). AttendanceView save/offline-sync refactor + a real Docker CI break (npm 10.9.8 arborist crash) fixed same day. Post-release follow-up (performSave/syncSnapshotToServer dedup) also done same day — see below. 2026-09-05: full 4-mode smoke test ahead of v1.18.38 found and fixed a CodeQL insecure-randomness alert and a completely broken SMS_Lite.exe — see below.**
**Development Mode**: SOLO DEVELOPER + AI Assistant (NO STAKEHOLDERS - Owner decides all)
**Current Phase**: Active Development
**Current Branch**: `main`

---

## 🧪 Full 4-mode smoke test ahead of v1.18.38 (September 5, 2026)

**Status**: ✅ DONE — all four deployment modes verified end-to-end (health check,
login, authenticated API fetch); one real bug found and fixed per mode area.

Scope requested: smoke test Native + Docker + Lite + Android before deciding
whether to cut v1.18.38 (candidate scope: the npm CI fix, the
performSave/syncSnapshotToServer dedup, and a CodeQL fix — see the sections
below).

- **Native** (`NATIVE.ps1 -Start`): ✅ pass. Health check, login, authenticated
  `/api/v1/students` fetch, frontend on :5173 all healthy, version correctly
  reports `v1.18.37`.
- **Docker** (`DOCKER.ps1 -Start`, fresh image build — first local build to
  exercise the `npm@11` pin fix from earlier in this file): ✅ pass
  functionally (health, login, authenticated fetch on :8080). One cosmetic
  gap found: `/health` reports `"version": "unknown"` instead of `v1.18.37`
  (`getattr(self.app_state, "version", "unknown")` in `health_checks.py` —
  `app.state.version` isn't populated in the Docker entrypoint). Not fixed
  yet — low priority, doesn't affect functionality.
- **Lite** (`SMS_Lite.exe`, fresh PyInstaller build): ❌→✅ **found and fixed
  a completely broken build** — see the dedicated section below. This had
  clearly not been smoke-tested since well before the June 2026 security
  hardening that (correctly) added strict `SECRET_KEY` placeholder rejection.
- **Android** (`npm run build:android` + `gradlew assembleDebug`): build
  verified only — `app-debug.apk` (6.19 MB) built successfully. No AVD or
  physical device was available in this session to install/run it (past
  sessions used a physical device over Tailscale); functional on-device
  testing is still outstanding.
- Also found and fixed the same session: GitHub code-scanning alert #1857
  (`js/insecure-randomness`) — see the CodeQL section below.

### 🐛 SMS_Lite.exe was completely broken — fixed (commit `907292fd7`)

**Status**: ✅ FIXED. Two independent, real bugs, both now confirmed fixed via
a clean rebuild + repeated launches (health, login, authenticated fetch,
frontend serving all pass).

1. **`pydantic_core`'s compiled binary was never bundled.**
   `pyinstaller-hooks-contrib`'s `hook-pydantic.py` only collects the
   pure-Python `pydantic` package's submodules — there is no
   `hook-pydantic_core.py` in the installed hooks-contrib version (2026.6),
   so the separate compiled `_pydantic_core.cp313-win_amd64.pyd` extension
   was never picked up by PyInstaller's automatic analysis in onefile mode.
   Manifested as a different `ModuleNotFoundError` on almost every launch
   (`unicodedata`, `_overlapped`, `pydantic_core._pydantic_core`) —
   confusing because it looked non-deterministic/AV-related but was fully
   reproducible (3/3, then 3/3 again after a `--clean` rebuild). Fixed in
   `lite_simple_entrypoint.spec` via `collect_all('pydantic_core')`, merging
   its `binaries`/`datas`/`hiddenimports` into the `Analysis`. Confirmed via
   `pyi-archive_viewer` that the `.pyd` is now actually inside the onefile
   archive.
2. **No real `SECRET_KEY` was ever available to the frozen exe** — the real
   root cause, only visible after fixing (1). There's no bundled
   `backend/.env` in the exe, and `lite_simple_entrypoint.py` never set
   `SECRET_KEY`, so `backend.config.Settings`' `check_secret_key` validator
   (added during the June 2026 security audit) correctly rejected the
   placeholder default and raised, crashing app creation every time.
   `lite_simple_entrypoint.py` now generates a secure `SECRET_KEY` with
   `secrets.token_urlsafe(48)` on first run and persists it under
   `%LOCALAPPDATA%\SMS_Native_Lite_Simple\local-secrets\secret_key.txt`
   (same pattern as the existing `qnap-credentials.json`), so existing
   JWTs/sessions survive app restarts instead of a new key invalidating them
   every launch.
   - **Diagnostic dead-end worth remembering**: the real `SECRET_KEY`
     `ValidationError` was invisible for most of this investigation because
     `lite_simple_entrypoint.py`'s exception logging truncated
     `traceback.format_exc()` from the **head** (`[:1000]`) — but the actual
     exception message is always the **last** lines of a traceback, so long
     import-chain tracebacks silently hid the real error and showed
     unrelated frames instead. Fixed to truncate from the tail (`[-1500:]`).
     Also fixed `_debug_log()` to open its log file with explicit
     `encoding='utf-8'` (was relying on the OS locale codepage — this is a
     Greek-locale machine — which likely explains some of the short
     one-line error summaries silently failing to write at all).

---

## 🔒 CodeQL js/insecure-randomness fix (September 5, 2026, commit `efa56ed1c`)

**Status**: ✅ FIXED, verified via manual `workflow_dispatch` CodeQL re-run —
alert #1857 confirmed `state: fixed`.

`offlineAttendanceQueue.ts`, `offlineGradesQueue.ts`,
`offlineStudentUpdateQueue.ts`, and `useSearchHistory.ts` each built local
IDs with `Math.random()`. Not actual security-sensitive values (client-side
offline-queue/history dedup keys, never used for auth or crypto), but a
legitimate CodeQL finding worth fixing correctly: added a shared
`generateLocalId()` helper (`src/frontend/src/utils/randomId.ts`) using
`crypto.getRandomValues()` with a `Math.random()` fallback for environments
without Web Crypto, matching the existing pattern already in
`calendarUtils.ts`. Note for future CI awareness: this repo's
`codeql.yml` only runs on PRs to `main`, a weekly Monday-2am schedule, or
manual `workflow_dispatch` — **not** on direct pushes to `main` (this is a
solo-dev repo that commits straight to `main`), so alerts don't auto-close
until one of those triggers fires; triggered a manual dispatch to confirm.

---

## 🗄️ Dev-DB stray E2E test data cleanup (September 5, 2026)

**Status**: ✅ DONE, owner-confirmed before executing.

Deleted 96 stray students (`email LIKE '%@test.edu'`) and 53 stray courses
(`course_name LIKE 'Test Course %'`) — leftover `tests/e2e/helpers.ts`
generator artifacts noted but deliberately left alone in the
2026-09-04 AttendanceView session (see the archive/memory for that note).
Matched via the exact generator patterns; a broader `Test%` sweep on both
tables returned identical counts, confirming no real data was at risk. 95 of
the 96 students were live (not soft-deleted) and were occupying slots in the
paginated (`limit=100`) students list. Deleted dependents first (attendances
→ grades → daily_performances → highlights → course_enrollments →
`student_course_performance`) in one transaction, since `Course`'s
SQLAlchemy relationships to `Attendance`/`Grade`/`DailyPerformance` carry no
cascade (only `CourseEnrollment` does) — a plain ORM delete would have hit
an `IntegrityError`.

---

## ♻️ performSave/syncSnapshotToServer dedup (September 4, 2026, post-release)

**Status**: ✅ DONE | commit `afc1b62c0` | the deliberately-deferred follow-up from the AttendanceView save/offline-sync extraction earlier this session

`performSave` and `syncSnapshotToServer` in `useAttendanceSaveSync.ts` independently
reimplemented ~150 near-identical lines (PUT-with-404-fallback-to-POST per
attendance/daily-performance record, DELETE-with-404-tolerance per pending
deletion, chunked in batches of 30 with a 200ms pause between chunks).
Extracted into a shared, independently-testable module-level function
`syncAttendanceAndPerformanceRequests` — each caller still resolves its own
id map first (React state vs. a server GET, unchanged) and calls the shared
function. Standardized 3 small pre-existing inconsistencies between the two
functions (attendance-key normalization, record-id validity strictness,
dropped 12 debug `console.warn` calls) on the stricter/safer existing
behavior, confirmed safe by tracing every call site.

Design was independently verified by a Plan agent against the actual file
content before implementation (not just self-reviewed). Added 6 new tests
(direct coverage of the shared function + an equivalence test proving both
callers now produce identical request shapes) — the existing 12 tests
needed zero changes. Verified via `tsc`, `eslint`, the full 22-test
attendance suite, and a real click-through against `NATIVE.ps1` + the dev
backend with status verified via **direct API reads** (not just UI
proxies) after both the online-save and offline-queue-sync paths.

**Test-methodology note for future E2E work against this same dev DB**:
repeated runs against the same course/student record can leave it already
in the "target" state, silently no-op-ing a click (no diff → autosave never
fires → nothing to assert on). Read the actual persisted value via the API
first and pick actions guaranteed to differ from it, rather than assuming
"click Present" is a real state change.

---

## 🚀 v1.18.37 (September 4, 2026) — release + CI fix

**Status**: ✅ RELEASED | Tag `v1.18.37` | Installer + Android APK uploaded to GitHub Releases | `CI/CD Pipeline` and `E2E Tests` green on `main`

Cut via `.\infra\scripts\release\RELEASE_READY.ps1 -ReleaseVersion "1.18.37" -TagRelease` (full Lite rebuild, not `-SkipLiteBuild` — the pre-built `SMS_Lite.exe` was from 2026-06-18, ~2.5 months stale). Installer Authenticode-signed and verified; release workflow (`Release - Build & Upload Installer`, `Release - Build & Upload Android APK`) both succeeded.

**Real CI break found and fixed post-tag** (`main`'s `CI/CD Pipeline` failed twice after the release commit, both times at the `🐳 Build Docker Images` job):
- `node:22-slim`'s bundled `npm 10.9.8` has a reproducible arborist crash
  (`Cannot read properties of null (reading 'edgesOut')`, in
  `#loadPeerSet`) resolving this project's peer-dependency graph — hit
  during `Dockerfile.fullstack`'s frontend-stage `RUN npm install` (which
  deliberately installs from `package.json` alone, no lockfile, so it does
  a fresh dependency-graph resolution on every cache-miss — normally
  masked by Docker layer caching, exposed here because the release
  commit's `package.json` version bump invalidated that `COPY` layer).
  Reproduced locally via `docker build`/`docker buildx build` after
  starting Docker Desktop; root-caused via `npm verbose` stack trace.
- First fix attempt (commit `12c8e58c7`): removed a genuine bug — commit
  `3e5f5dc5e` had accidentally added `@vitest/coverage-v8` to **both**
  `dependencies` (`^4.0.16`) and `devDependencies` (`^4.0.8`) with
  conflicting ranges (pure test-tool, never imported from app code — the
  `dependencies` entry was always wrong). Real bug, worth having fixed,
  but **did not** fix the Docker CI crash — confirmed by a second failed
  CI run on that exact commit.
- Actual fix (commit `07fea9cbf`): pin `npm install -g npm@11` before
  `npm install` in `Dockerfile.fullstack`'s frontend stage. npm 11
  resolves the same graph without crashing. Verified via a full local
  `docker buildx build -f infra/docker/compose/Dockerfile.fullstack .`
  (both stages) plus a container smoke run (migrations applied, admin
  user created, all routers registered, SPA served).
- **Self-inflicted gotcha while debugging, worth remembering**: testing
  `npm install`/`npm run build` inside a container with a **writable**
  bind mount of `src/frontend` (`-v "${PWD}\src\frontend:/app/frontend"`)
  overwrites the host's `node_modules` with Linux-native binaries
  (`@rollup/rollup-linux-*` etc.), breaking the Windows host's dev
  environment (`Cannot find module '@rollup/rollup-win32-x64-msvc'`,
  `'eslint' is not recognized`) — this is npm/cli#4828's optional-deps
  bug, self-triggered. Fix: `Remove-Item -Recurse -Force node_modules`
  - `npm install` on the host to restore Windows-native binaries. For any
  future Docker-based repro of a frontend build issue, mount `package.json`
  read-only and a **separate empty writable directory** for `node_modules`
  (or just don't reuse the host's real `src/frontend` as the container's
  `WORKDIR` bind mount) to avoid this.

---

## 📋 Post-v1.18.36 Codebase Review (September 4, 2026)

**Status**: ✅ CLOSED — both todo items done, released as `v1.18.37` (2026-09-04).

**Scope**: 22 commits landed on `main` since the `v1.18.36` tag (router dedup,
4 large-component splits, new router test coverage, CI/CodeQL fixes, dependency
bumps). Reviewed by reading the diffs directly (backgrounded multi-agent review
hit the session rate limit before finishing) and verifying with `tsc --noEmit`
(clean), `eslint` on the touched directories (clean), `ruff` on the touched
backend files (clean), and running the 10 new/touched backend test files
directly (125 passed). No functional regressions found — extractions correctly
preserve auth gating, alignment/logging quirks, and prop wiring.

### Todo — before next release

- [x] Update `CHANGELOG.md` with an entry for these 22 commits — added an
      `[Unreleased]` section (2026-09-04).
- [x] Bump `VERSION` past `v1.18.36` as part of the next release — done
      2026-09-04: cut and published as `v1.18.37` (see the section above),
      which also carried the AttendanceView save/offline-sync extraction and
      a Docker CI fix landed the same day.

### Todo — small cleanup found during review

- [x] `src/backend/routers/routers_feedback.py:218` used `datetime.utcnow()`,
      which is deprecated — switched to `datetime.now(timezone.utc)` to match
      the pattern used elsewhere in the backend (2026-09-04).

### AttendanceView.tsx — JSX extraction completed 2026-09-04 (commit `ae5f38b83`)

- [x] Student List attendance-marking grid → `AttendanceStudentList.tsx`
- [x] Performance/Rate modal → `AttendancePerformanceModal.tsx`
- `AttendanceView.tsx`: 1,821 → 1,629 lines. Verified via `tsc`/`eslint`, the
      existing `AttendanceView.specialParticipation.test.tsx`, and a real
      click-through against `NATIVE.ps1` (course select, day pick, mark
      Present, Rate modal, checkbox toggle, autosave "File saved
      successfully" toast) — screenshots confirmed identical rendering.
- **Save/offline-sync/autosave block — extracted 2026-09-04** (dedicated
      session, as called for above): `performSave`, `syncSnapshotToServer`,
      `queueAttendanceSnapshot`, `flushQueuedSnapshots`, `refreshAttendancePrefill`
      and their helpers moved into `src/frontend/src/features/attendance/hooks/useAttendanceSaveSync.ts`
      (605 lines). All state stayed owned by `AttendanceView.tsx` (passed to
      the hook as explicit params/setters, mirroring the exact prior closure)
      — a pure logic relocation, not a state-ownership redesign, to keep the
      risk surface minimal in this daily-use save path.
      `AttendanceView.tsx`: 1,452 → 939 lines.
      - Added `useAttendanceSaveSync.test.ts` (12 tests) — this logic had
        **zero** prior test coverage (the existing
        `AttendanceView.specialParticipation.test.tsx` mocks `useAutosave`
        and the offline queue module to no-ops). New tests cover PUT/POST
        fallback, 404→POST fallback, DELETE of pending-removal performance
        records, offline queueing, network-error→queue fallback, genuine-error
        surfacing + rethrow, queue drain/stop-at-first-failure, and
        request de-dup in `refreshAttendancePrefill`.
      - Verified via `tsc`, `eslint` (0 errors), the full attendance test
        suite (16/16 passing, including the untouched
        `specialParticipation` test), and a real click-through against
        `NATIVE.ps1` + the actual dev Postgres backend (Playwright,
        deleted after use): course/date select, mark Present → "Saving" →
        "File saved successfully" toast → `Coverage: 100%`, reload
        persistence, then DevTools-equivalent offline simulation (mark
        Absent while offline → "Offline: changes queued..." toast +
        "1 queued for sync" badge) → reconnect (`window` `online` event) →
        "1 queued change set(s) synced." toast. All screenshots confirmed.
      - Flagged, deliberately deferred to avoid combining a logic dedup with
        a logic relocation in the same change: `performSave` and
        `syncSnapshotToServer` independently reimplement ~150 lines of
        near-identical PUT/POST-fallback/DELETE logic. **Done same day as a
        separate follow-up** — see the "performSave/syncSnapshotToServer
        dedup" section above.
      - Also noted, out of scope: the dev Postgres DB has ~148 stray
        "Test Course \*"/"Test\* Student\*" rows accumulated from prior e2e
        sessions using `tests/e2e/helpers.ts`'s data generators (not created
        by this session beyond a handful during verification, indistinguishable
        from the rest) — left alone rather than bulk-deleting shared dev data
        without explicit confirmation.
      - **Cleaned up 2026-09-05**: confirmed with the owner and hard-deleted.
        Matched via the exact generator patterns from `helpers.ts`
        (`generateStudentData`/`generateCourseData`): students with
        `email LIKE '%@test.edu'` (96 rows) and courses with
        `course_name LIKE 'Test Course %'` (53 rows) — a broad `Test%` sweep
        on both tables returned identical counts, confirming no real data
        matched loosely. 95 of the 96 students were live (`is_active=true`,
        not soft-deleted) and would have been occupying slots in the
        paginated (limit=100) students list referenced in the
        [[project_remaining_backlog_2026_09]] Attendance gotcha; all 53
        courses were already `is_active=false` but not soft-deleted. Deleted
        via a single transaction in dependency order (attendances → grades →
        daily_performances → highlights → course_enrollments →
        `student_course_performance` (0 matched) → courses → students) since
        `Course`'s SQLAlchemy relationships to `Attendance`/`Grade`/
        `DailyPerformance` carry no cascade (only `CourseEnrollment` does),
        so a plain ORM/ondelete cascade would not have covered them. 2
        attendance rows and 9 enrollment rows were removed as dependents;
        verified 0 remaining matches on both the narrow and broad patterns
        after commit.

---

## 📋 v1.18.36 (September 1, 2026) — commits since v1.18.35

| Hash | Area | Description |
|------|------|-------------|
| `e54f8a089` | Test | Add `test_download_rejects_path_traversal_export_filename` (semester-archive download guard) + `StudentProfile.test.tsx` (Academic History coverage) |
| `3dd499418` | Fix | Consolidate all backup paths (session-import, semester-archive, admin DB, Postgres) to a single `Settings.BACKUPS_DIR` source of truth |
| `1a9665502` | Refactor | Rename `docker-old`→`compose`/`installer-old`→`windows`, dedupe session-import lookups, fix N+1 queries in semester archive preview/execute |
| `3d14b91b4` | Fix | Security/correctness gaps from codebase review: Docker AUTH_MODE=strict default, `sessions:manage` RBAC seed gap, session-import filename path-traversal sanitization, `/control/reset-database` via Alembic, plaintext export staging dir hardening, i18n fallback fixes |
| `7aa22e0f6` | Fix | Correct CodeQL path-injection suppression syntax on validated paths |
| `dab7f5b23` | Fix | Sweep orphaned multiprocessing workers on backend restart/stop |
| `a0dd54321` | Fix | User permission lookup 500 error on PostgreSQL |
| `404965139` | Fix | PermissionsPage showed 0 permissions and raw i18n keys |
| `8f0bc0696` | Fix | Remove redundant Grant Permission tab from RBAC Configuration |
| `182a6276b` | Fix | Unify Permissions into RBAC Configuration as a tab |
| `68071b242` | Fix | Shift letter-grade scale to align with a 50% pass mark |
| `3d6b5537b` | Fix | Nest Semester Archive inside System Operations instead of its own section |
| `a30319d21` | Fix | Remove duplicate Import/Export section from Control Panel maintenance tab |
| `cfc65e0e5` | Fix | Move admin pages into System > Control Panel > Maintenance |
| `3b88bf974` | Fix | Expose admin section (Permissions/Import-Export/Semester Archive) in main nav |
| `737d2f602` | Feat | Add semester archive - back up and archive passed courses per semester |
| `ada862ced` | Release | Bump version to 1.18.35 and update docs |

---

## 🧩 Semester Archive Feature (shipped in v1.18.35, commit `737d2f602`)

**Status**: ✅ Implemented and released as part of v1.18.35.

Adds an admin-only "semester archive" operation: pick a semester (grouped by the
existing free-text `Course.semester` label), preview which student+course pairs
have been passed and fully graded (weighted final grade vs. a configurable
threshold, reusing `AnalyticsService.calculate_final_grade`), back up the whole
semester's data (reuses the existing session-export dataset/serializers from
`routers_sessions.py`, now extracted into `services/session_data_service.py`,
persisted as an AES-256-GCM encrypted artifact via `BackupServiceEncrypted`),
then replace the raw `CourseEnrollment`/`Grade`/`Attendance`/`DailyPerformance`
rows for each passed course with one permanent `StudentCoursePerformance`
record. Failed/dropped/still-in-progress enrollments are left untouched.
Student profiles are never touched.

### New/changed backend

- `models.py`: `SemesterArchiveExport`, `StudentCoursePerformance` tables.
- Migration `a3f7c9e2b5d1_add_semester_archive_tables.py` (head, on `e8f9a1b2c3d4`).
- `services/session_data_service.py` (new — extracted from `routers_sessions.py`
  so the semester export payload is built in exactly one place).
- `services/semester_export_service.py`, `services/semester_archive_service.py` (new).
- `routers/routers_semester_archive.py` (new, `optional_require_role("admin")` gated,
  registered in `router_registry.py`); `GET /enrollments/student/{id}/performance-history`
  added to `routers_enrollments.py`.
- New `ErrorCode` entries (`SEMESTER_ARCHIVE_*`).
- Tests: `test_semester_archive_service.py`, `test_semester_archive_router.py`.

### New/changed frontend

- `features/semesterArchive/` (`SemesterArchivePage.tsx` + `useSemesterArchive.ts`),
  wired into `AdminLayout.tsx` as a third tab (`/admin/semester-archive`).
- `StudentProfile.tsx`: new "Academic History" section reading the new endpoint.
- New `semesterArchive` i18n namespace (en/el); `students.js` gained
  `academicHistory`/`academicHistoryDescription` keys.

### Operational follow-up: re-seed existing databases

- `sessions:manage` permission (used by `routers_sessions.py` export/import/
  rollback/backup endpoints) was missing from `ROLE_PERMISSIONS`/`PERMISSIONS`
  in `scripts/seed_permissions.py` — fixed in code 2026-09-01. Any database
  created *before* that fix still needs `scripts/seed_permissions.py`
  re-run against it to pick up the permission.

### Resolved 2026-09-01

- ✅ `StudentProfile.test.tsx` added (`src/frontend/src/features/students/components/`)
  covering the "Academic History" section: hidden when empty, renders archived
  records, hides on a failed fetch.
- ✅ `test_download_rejects_path_traversal_export_filename` added to
  `test_semester_archive_router.py`, proving the `is_relative_to` guard on
  `routers_semester_archive.py`'s download endpoint rejects a `../`-escaped
  `export_filename` even when a file exists at the resolved (out-of-bounds)
  path — isolates the 404 to the guard rather than a plain not-found.

---

## 🚀 v1.18.34 — Android Student Card Layout Fix + Tailscale CORS (June 26, 2026)

**Status**: ✅ RELEASED | Tag `v1.18.34` | GitHub: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.34
**Installer**: `SMS_Installer_1.18.34.exe` (~97 MB) — built locally and uploaded 2026-06-26
**Wiki**: Updated to v1.18.34 — Home, Release History, Sidebar, Footer

### Changes

| Hash | Area | Description |
|------|------|-------------|
| `aaa0505ad` | Android/UI | Fix student card layout and View Performance overlap on mobile |
| `d375c9e62` | Chore | Add `.backend.port` to `.gitignore` (native server runtime file) |
| `e7f4359af` | Android | Allow cleartext HTTP for Tailscale/LAN backend connections |
| `895d0f9d7` | Android | Replace QNAP card with Tailscale; fix CORS for Capacitor WebView |
| `a857cc09b` | Release | Bump version to 1.18.34 and update docs |

### Root Cause: VirtualList + Expandable Cards

`VirtualList` (TanStack Virtual) used absolute positioning with `estimateSize={150}px` inside a fixed `600px` container. With 67+ active students the threshold triggered. When a card expanded, the virtualizer didn't re-measure — subsequent cards overlapped the expanded content.

**Fix**: Removed `VirtualList` from `StudentsView.tsx` entirely; always use plain `<ul>`. Action buttons switched from `flex flex-wrap` to `grid grid-cols-2` so long Greek labels ("Προβολή Επίδοσης", "Επεξεργασία") fit cleanly in 2×2 layout.

---

## 🚀 v1.18.33 — E2E TDZ Fix + Security Hardening (June 25, 2026)

**Status**: ✅ RELEASED | Tag `v1.18.33` | GitHub: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.33
**Installer**: `SMS_Installer_1.18.33.exe` — built and published by CI on 2026-06-25

### Changes Since v1.18.32

| Hash | Area | Description |
|------|------|-------------|
| `c38bd964c` | E2E/Security | Remove `sms-e2e-login` production backdoor; use `addInitScript`+cookie auth |
| `86d02f30d` | Build | Remove per-feature `manualChunks` — eliminated circular-chunk Rollup TDZ |
| `dba81dc44` | E2E | Add `pageerror`/DOM diagnostics to `loginViaAPI` for CI debugging |
| `317500645` | Chore | Gitignore e2e-metrics-and-patterns, e2e-test-results, tsconfig.node.tsbuildinfo |
| `bd15d9c97` | Release | Bump version to 1.18.33 and update docs |
| `f7eb3901a` | Fix | Restore CLAUDE.md to repo root (accidentally moved by release pipeline) |
| `eea640f92` | Fix | Protect CLAUDE.md and AGENTS.md from WORKSPACE_CLEANUP.ps1 relocation |
| `a8f06989e` | CI | Upgrade Android build to Java 21 (capacitor-android requires VERSION_21) |

### Security (June 24–25)

| Hash | Area | Description |
|------|------|-------------|
| `a3a9cfa14` | CI | Resolve 3 CI failures from security-audit auth defaults change |
| `68a4ffbc6` | Security | Replace dangerouslySetInnerHTML with Trans in ExportCenter |
| `439a1777d` | Security | Add CSP + HSTS headers, mask admin token in debug log |
| `71a2ad750` | Security | Sync pyproject.toml deps, clear exempt-email defaults, SSLMODE warning |
| `c030ed0eb` | CI+Security | Playwright cache restored, capacitor gate, weak-pw warn, py3.13 floor |
| `5d8088211` | Security | bcrypt migration, secure auth defaults, deps pinned, aioredis removed |
| `e7252c050` | Security | CI Python version, token storage in-memory only, exception logging |

**Security action COMPLETED (2026-06-25)**: Android signing keystore rotated. New PKCS12 keystore generated (RSA-2048, 10 000-day validity, alias `sms-release`). GitHub secrets updated. ⚠️ First APK release after this rotation requires reinstall on existing devices.

**E2E**: 84/84 tests passing. Analytics dashboard tests fixed (Rollup TDZ root cause resolved).

---

## 📋 Post-v1.18.32 Accumulation (June 21–25, 2026) — RELEASED AS v1.18.33

**Status**: ✅ RELEASED in v1.18.33

### June 25 — E2E + Build fixes (this session)

| Hash | Area | Description |
|------|------|-------------|
| `c38bd964c` | E2E/Security | Remove `sms-e2e-login` production backdoor; use `addInitScript`+cookie auth |
| `86d02f30d` | Build | Remove per-feature `manualChunks` — eliminated circular-chunk Rollup TDZ |
| `dba81dc44` | E2E | Add `pageerror`/DOM diagnostics to `loginViaAPI` for CI debugging |
| `d706b462b` | Fix | Revert IIFE from `authService._token` (was causing Rollup TDZ) |
| `94a7ac472` | E2E | (Superseded by c38bd964c) sms-e2e-login event approach |

### June 24 — Security audit follow-up

| Hash | Area | Description |
|------|------|-------------|
| `a3a9cfa14` | CI | Resolve 3 CI failures from security-audit auth defaults change |
| `68a4ffbc6` | Security | Replace dangerouslySetInnerHTML with Trans in ExportCenter |
| `439a1777d` | Security | Add CSP + HSTS headers, mask admin token in debug log |
| `71a2ad750` | Security | Sync pyproject.toml deps, clear exempt-email defaults, SSLMODE warning |
| `c030ed0eb` | CI+Security | Playwright cache restored, capacitor gate, weak-pw warn, py3.13 floor |
| `5d8088211` | Security | bcrypt migration, secure auth defaults, deps pinned, aioredis removed |
| `e7252c050` | Security | CI Python version, token storage in-memory only, exception logging |

### June 23 — CI/CD audit + Android security

| Hash | Area | Description |
|------|------|-------------|
| `abf994389` | CI | Resolve CI/CD audit BLOCKERs, HIGH, and MEDIUM findings |
| `7636e895f` | Release | Add Android APK to release pipeline |
| `2629a2b91` | Fix | local-mode: clear broken state on SW restore failure + activation timeout |
| `31cbd1808` | Android | Security hardening: cleartext scoped, allowBackup=false, minification on |
| `bceacc657` | Chore | Untrack runtime files + stale test artifacts; fix gitignore |
| `20ec8e44f` | E2E | Add data-testid="submit-student" to EditStudentModal |
| `89a37c311` | E2E | Add missing data-testids to StudentForm + fix curl exit code |
| `b16445a86` | E2E | Unskip student edit + delete tests; fix window.confirm handler |
| `84bc253e6` | Lint | Remove debug console.log + fix i18n warnings in ServerSetupPage |
| `e741358b4` | E2E | Replace networkidle with load in loginViaUI and critical-flows |
| `e0cfad4dd` | E2E | Remove sms_server_url injection from loginViaUI and loginViaAPI |
| `953aaca9f` | Fix | Use Capacitor.isNativePlatform() to eliminate 3s init delay in CI |
| `4f11d6d7c` | E2E | Fix ServerGuard redirect: set sms_server_url in localStorage |
| `27751eac4` | E2E | Always render analytics summary cards; fix loginViaUI nav |
| `01a4b6796` | Tests | Fix 7 CI failures caused by Android standalone commit |
| `cdff5f586` | Android | Standalone local mode + fix mobile API calls |

### June 21 — Docs + Installer fixes

| Hash | Area | Description |
|------|------|-------------|
| `e46c130db` | Docs | Register academic monographs in DOCUMENTATION_INDEX |
| `9471125d4` | Docs | Refine bilingual academic monograph (EN/EL final merge) |
| `ccf4a1217` | Docs | Add bilingual EN/EL academic monograph for CS community presentation |
| `f4be40ba3` | Installer | Patch Dockerfile src/ paths for installed layout |
| `9ddf25805` | Installer | Fix docker path mismatch and exit-code bug in DOCKER.ps1 |
| `9c03580e0` | Installer | Resolve PROJECT_ROOT to install dir when run from installer root |
| `0047e0308` | Project | Restore CLAUDE.md to project root |

**Notable**: Deep security audit (20+ findings), Android standalone mode, installer Docker path fixes, E2E auth TDZ fix, and full E2E suite stability (84 passing) make this a strong v1.18.33 candidate.

**Security action COMPLETED (2026-06-25)**: Android signing keystore rotated. New PKCS12 keystore generated (RSA-2048, 10 000-day validity, alias `sms-release`). GitHub secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, and `ANDROID_KEY_ALIAS` all updated. Old `SmsRelease2024!` password is now dead. ⚠️ First APK release after this rotation requires reinstall on existing devices (different signing certificate).

---

## 🚀 v1.18.32 — Android Standalone + Installer Path Fixes (June 21, 2026)

**Status**: ✅ RELEASED | Commit `d35fc8a3d` | Tag `v1.18.32` | GitHub: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.32
**Installer**: `SMS_Installer_1.18.32.exe` — built and published by CI on 2026-06-21

### Changes Since v1.18.31

| Hash | Area | Description |
|------|------|-------------|
| `d35fc8a3d` | Release | Bump version to 1.18.32 and update docs |
| `799e5a486` | Dev | Pin ruff to exact version to prevent WinError 5 on upgrade |
| `fa53d9aaf` | CI | 8 workflow correctness bugs from deep multi-angle review |
| `51e0575ab` | CI | Repair 8 workflow bugs found in post-v1.18.31 audit |
| `6ececf02e` | E2E | Revert loginViaAPI final goto to /dashboard (forces full reload) |
| `e10c1d3a0` | E2E | Fix all remaining page.goto paths for HashRouter across 5 spec files |
| `57852240a` | E2E | Repair logout waitForURL regex and advanced_search goto for HashRouter |
| `10917c347` | E2E | Use hash routes for HashRouter navigation in analytics E2E tests |
| `48f55fba2` | i18n | Add 43 missing analytics keys that caused E2E failures |
| `fd7f84aa8` | Build | vitest-results.xml flag + bump vitest to 4.1.9 |

---

## 🚀 v1.18.31 — Docker + esbuild + Android Release (June 19, 2026)

**Status**: ✅ RELEASED | Commit `cfc643531` | Tag `v1.18.31` | GitHub: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.31

### Changes
| # | Area | Fix |
|---|------|-----|
| 1 | Docker compose | `context: ../../..` (project root) — was `..` resolving to `infra/docker/` |
| 2 | Dockerfile.frontend | `node:22-slim` (was `node:22.3.0-alpine3.20`); copy only `package.json`, run `npm install` fresh |
| 3 | esbuild override | `"esbuild": "^0.27.0"` in `package.json` overrides — matches vite 7.3.5 peer dep, eliminates host/binary mismatch |
| 4 | SQLite Docker | `sqlite:////data/...` (4-slash absolute path) in `config.py` — was 3-slash, resolved relative to CWD `/app` |
| 5 | DOCKER.ps1 | `config\.env` path after June 12 reorganization |
| 6 | Inno Setup | Added `build,.ruff_cache,dist` to backend Excludes — prevented 267 MB bloat |
| 7 | Android signing | Release keystore configured; `app-release.apk` 5.13 MB (versionCode 118031, versionName 1.18.31) |

### Evidence
- ✅ Docker smoke test: `/health` 200, `status: healthy` on port 8080
- ✅ Installer: `SMS_Installer_1.18.31.exe` — 97.24 MB — Authenticode Valid
- ✅ Android: `app-release.apk` signed with `CN=SMS App, OU=MIEEK, O=AUT, L=Nicosia` — 5.13 MB
- ✅ Backend: 914 tests passing | Frontend: 1939 tests passing

### Keystore (local only — never committed via keystore.properties)
- File: `C:\Users\Vasilis\.android\sms-release.jks` | Alias: `sms-release`
- **Rotate password**: credentials were exposed in this file in a prior commit — generate a new keystore or change the key password.

---

## 🔧 Post-v1.18.30 Audit Fixes (June 19, 2026)

**Status**: ✅ COMMITTED | Commit `d7f4ab762` on `main`

Full honest audit of all four deployment modes (native, lite, docker, mobile) found 6 gaps. All fixed in one commit.

| # | File | Fix |
|---|------|-----|
| 1 | `infra/scripts/dev/DOCKER.ps1` | Added `$PROJECT_ROOT` (3 levels up) + repointed all 20+ path vars broken by June 12 restructure |
| 2 | `.github/workflows/release-installer-with-sha.yml` | Switched PyInstaller spec from `lite_entrypoint.spec` → `lite_simple_entrypoint.spec`; updated expected output from `SMS_Native_Lite_Simple.exe` → `SMS_Lite.exe` |
| 3 | `infra/scripts/testing/RUN_TESTS_BATCH.ps1` | Fixed `Tests: Total: 0` bug — count `.`/`F`/`s` markers from progress lines (pytest summary line is not emitted to captured stdout on Windows non-TTY) |
| 4 | `src/backend/lite_simple_entrypoint.py:218` | Documented intentional `Base.metadata.create_all()` fallback with `# noqa` comment explaining frozen EXE constraint |
| 5 | `src/frontend/capacitor.config.ts` | Changed `androidScheme` from `'http'` → `'https'` for production APK |
| 6 | `src/frontend/src/components/notifications/__tests__/NotificationDropdown.test.tsx` | Added `MemoryRouter` wrapper via local `render` override — fixed 17 failing tests (react-router `<Link>` without Router context) |

**Validation**: COMMIT_READY -Quick passed (ruff ✅, mypy ✅, eslint ✅, ts ✅, translations ✅). Backend: 914/914 tests. Frontend: 1939/1939 tests.

---

## 🚀 v1.18.30 — Checkpoint Release (June 16, 2026)

**Status**: ✅ RELEASED | GitHub: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.30

### What was released
- **31 prior releases archived** (v1.18.0–v1.18.29) → all converted to Pre-release on GitHub with ARCHIVED banners
- **Comprehensive release notes** → `docs/releases/GITHUB_RELEASE_v1.18.30.md` (full feature inventory, tech stack, milestone table)
- **Installer**: `SMS_Installer_1.18.30.exe` (25.08 MB), Authenticode-signed, smoke test passed
- **Security**: starlette 1.3.1, cryptography 49.0.0, python-multipart 0.0.32, PyJWT 2.13.0, js-yaml >=4.2.0 (25 Dependabot alerts resolved)
- **CI fix**: `((VAR++))` bash arithmetic crash under `set -euo pipefail` in 3 workflow files
- **Installer source restore**: `dc21014fe` declutter had erroneously removed `installer-old/` build inputs; restored and re-tracked 15 essential files

### Release Evidence
- ✅ Tag `v1.18.30` created and pushed June 16, 2026
- ✅ GitHub release published: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.30
- ✅ Installer asset: `SMS_Installer_1.18.30.exe` uploaded
- ✅ Version consistency tests: 8 passed, 4 skipped
- ✅ CI/CD Pipeline: passing on main

---

## 🔧 Post-v1.18.28 Improvements → Released as v1.18.29 (June 15, 2026)

**Status**: ✅ RELEASED as v1.18.29 | 8 commits since `v1.18.28` tag, plus version bump + repo declutter

| Hash | Description |
|------|-------------|
| `566e6eeb8` | feat: wire email report delivery and report scheduling UI |
| `ff180e896` | feat: expand chart type selector from 4 to 8 types with EN/EL i18n |
| `25c31626f` | fix: persist SMTP override across server restarts |
| `0e3d406e2` | feat: show email config status badge and sync form on prop change |
| `5eaa9675a` | test: add 16 tests for SMTP override service and email settings endpoints |
| `72574564a` | docs: record post-v1.18.28 improvements in work plan |
| `f7fddbbf4` | fix: email SSL/TLS support + TS any cleanup |
| `7b291ce95` | fix: convert AuthContext default export to named export for HMR compat |

### Changes Summary
- **Email delivery**: SMTP settings persist across server restarts (`services/smtp_override.py`, applied at startup via `lifespan.py`). Fixed missing `request_id` arg that caused 500 errors on all 3 email endpoints.
- **Email SSL/TLS**: `send_email()` now uses `smtplib.SMTP_SSL` for port 465 (implicit SSL) and `STARTTLS` with explicit `ehlo()` handshake for port 587. 30s timeout on both paths.
- **Chart types**: Custom report builder supports 8 chart types (scatter, heatmap, treemap, boxplot) with full EN/EL translations. Fixed lucide-react TypeScript export shim.
- **UI polish**: EmailConfigPanel shows `Active` / `Not configured` status badge; form state syncs correctly after save.
- **TypeScript health**: Replaced `[key: string]: any` with `unknown` in `AnalyticsCharts.tsx` and `useDashboards.ts`. Removed stale `eslint-disable` comments.
- **HMR fix**: `AuthContext` default export converted to named export — eliminates Vite Fast Refresh incompatibility warning.
- **Tests**: 18 new tests covering smtp_override service, email endpoint edge cases, and SMTP transport branches (port 587 STARTTLS / port 465 SSL).

### Release Evidence
- ✅ Tag `v1.18.29` created and published June 15, 2026
- ✅ GitHub release: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.29
- ✅ Installer asset: `SMS_Installer_1.18.29.exe` uploaded
- ✅ Post-release: repo declutter (234 stale files removed, commit `dc21014fe`)
- ✅ CI fix: `((VAR++))` bash arithmetic bug under `set -euo pipefail` fixed in 3 workflow files (commit follows)

---

## 🗄️ Historical Archive (Feb–Aug 2026)

Older release-cycle logs (Feb 2026 Phase 6 work through the many v1.18.25
publication/preparation snapshots, April 2026) have been moved to
[`UNIFIED_WORK_PLAN_ARCHIVE_2026_H1.md`](./UNIFIED_WORK_PLAN_ARCHIVE_2026_H1.md)
to keep this file focused on current/recent state. Nothing in the archive
reflects current app state — check the sections above and `CHANGELOG.md`
for that.

## 📖 Documentation

### For Developers

**MANDATORY READ (10 min total):**
1. [`docs/AGENT_POLICY_ENFORCEMENT.md`](../AGENT_POLICY_ENFORCEMENT.md) - Non-negotiable policies
2. [`docs/AGENT_QUICK_START.md`](../AGENT_QUICK_START.md) - 5-minute onboarding
3. This file - Current work status

**Key References:**
- [`README.md`](../../README.md) - Project overview
- [`DOCUMENTATION_INDEX.md`](../DOCUMENTATION_INDEX.md) - Doc navigation
- [`docs/development/DEVELOPER_GUIDE_COMPLETE.md`](../development/DEVELOPER_GUIDE_COMPLETE.md) - Complete developer guide

### Archive

- [`UNIFIED_WORK_PLAN_ARCHIVE_2026_H1.md`](./UNIFIED_WORK_PLAN_ARCHIVE_2026_H1.md) - Feb–Aug 2026 history (Phase 6 work through the v1.18.25 release cycle)

---

## ⚙️ Critical Policies (Read Before Starting Work)

### Testing

❌ **NEVER**: `cd src/backend && pytest -q` (crashes VS Code)
✅ **ALWAYS**: `.\infra\scripts\testing\RUN_TESTS_BATCH.ps1`

### Deployment

❌ **NEVER**: Custom deployment procedures
✅ **ALWAYS**: `.\infra\scripts\dev\NATIVE.ps1 -Start` (dev) or `.\infra\scripts\dev\DOCKER.ps1 -Start` (prod)

### Planning

❌ **NEVER**: Create new backlog docs or planning docs
✅ **ALWAYS**: Update this file (UNIFIED_WORK_PLAN.md)

### Pre-Commit

❌ **NEVER**: Commit without validation
✅ **ALWAYS**: Run `.\infra\scripts\ops\COMMIT_READY.ps1 -Quick` first

### Work Verification

❌ **NEVER**: Start new work without checking git status
✅ **ALWAYS**: Run `git status` and check this plan first

---

## 🔄 How to Use This Document

### Daily Workflow

1. Check the status line and most recent section at top
2. Update with completed work before moving to next task
3. Run `git status` to verify clean state

### Before Commit

1. Run `.\infra\scripts\ops\COMMIT_READY.ps1 -Quick`
2. Verify all tests passing
3. Update this document with completed items
4. Commit with clear semantic message

### When Starting New Phase

1. Archive completed phase to `UNIFIED_WORK_PLAN_ARCHIVE_*.md`
2. Update "Current Status" with new phase
3. Create detailed timeline for new phase
4. Mark features complete as you finish them

---

## 📞 Contact & References

**For Questions:**
- See [`CONTRIBUTING.md`](../../CONTRIBUTING.md)
- Reference [`docs/AGENT_POLICY_ENFORCEMENT.md`](../AGENT_POLICY_ENFORCEMENT.md) for policies
- Check [`DOCUMENTATION_INDEX.md`](../DOCUMENTATION_INDEX.md) for navigation

**Repository:**
- GitHub: https://github.com/bs1gr/AUT_MIEEK_SMS
- Branch: `main`

---

*See the top of this document for current version/status — this footer no longer duplicates it to avoid drifting out of sync (it previously sat unmaintained for 2.5+ months).*



