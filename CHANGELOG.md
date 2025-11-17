# Changelog

All notable changes to this project will be documented in this file.

This project adheres to Keep a Changelog principles and uses semantic versioning.

## [Unreleased]

### Added

- **Control API restart diagnostics**: introduced `GET /control/api/restart`, returning structured guidance about `ENABLE_CONTROL_API`, Docker restrictions, and the expected POST contract. The auth guard now sends actionable hints (including current env state) whenever the Control API is disabled so operators immediately know how to enable it.
- **System Health UI resilience**: the `ServerControl` card now parses backend `detail` payloads, displays the translated hints, and performs a follow-up helper request when a 404 lacks context. New locale strings (`restartEndpointDisabled`, `restartTokenRequired`) keep English and Greek copy in sync.
- **Course fallback data loader**: `CourseGradeBreakdown` automatically fetches missing course metadata when only grades are cached, restoring course labels/codes without requiring a full page refresh. Tests cover the richer rendering behavior.

### Changed

- **Canonical Control API mounting**: the control router is now attached outside the `/api/v1` prefix so all operations live under `/control/api/*`. Documentation (README + `backend/CONTROL_API.md`), Vitest suites, and pytest cases were updated to reference the new canonical endpoints and to reiterate how to enable the restart button.
- **Shared Control API base URL**: frontend utilities export `CONTROL_API_BASE`, replacing ad-hoc string concatenation throughout `ServerControl`, `ControlPanel`, `DevToolsPanel`, and API clients. Bulk backup/download/upload flows now consistently hit the same origin, and tests mock the shared constant.
- **Restart UX polish**: restart buttons surface backend hints, fall back to translated defaults, and clearly explain when Docker mode blocks restarts or when the shutdown token is required. README now walks through enabling the feature, including environment variables and host-script alternatives inside containers.

## [1.6.4] - 2025-11-17

### Changed

- **Comprehensive Codebase Cleanup & Organization**: Systematic cleanup improving codebase health from 7.5/10 to 8.5/10
  - Deleted empty artifact file (`runs_workflow_run.json`)
  - Archived historical documentation (`PERFORMANCE_OPTIMIZATIONS_2025-01-10.md`, `fix_tests.ps1`)
  - Moved misplaced files to proper locations (`SMART_BACKEND_TEST.ps1` → `scripts/dev/`, `backend/test_request_id.py` → `backend/tests/`)
  - Consolidated duplicate cleanup scripts (removed `scripts/dev/internal/CLEANUP_COMPREHENSIVE.ps1`, kept `scripts/internal/` as canonical)
  - Updated documentation references in `docs/SCRIPTS_GUIDE.md`, `scripts/dev/README.md`, and `docs/DOCUMENTATION_INDEX.md`

### Added

- **Cleanup Automation & Documentation**:
  - `CODEBASE_ANALYSIS_REPORT.md`: Comprehensive 474-line analysis with health metrics, findings, duplication analysis, and recommendations
  - `CLEANUP_PLAN.ps1`: Automated cleanup script with dry-run support for Phase 1 (high priority) and Phase 2 (consolidation) tasks
  - `TODO_CLEANUP_ADDITIONS.md`: Implementation plan with time estimates, ROI analysis, and integration guide
  - `CLEANUP_SUMMARY.md`: Completion report documenting all changes, impact, and verification results

### Technical Details

- **Files Modified**: 14 files (5 updated, 4 moved/archived, 1 deleted, 4 created)
- **Impact**: Cleaner root directory, eliminated script duplication, proper file organization, updated documentation
- **Testing**: All 246 backend + 929 frontend tests passing, application status verified (healthy)
- **Time Investment**: 75 minutes actual vs 5 hours estimated (94% efficiency improvement)

### Added (Frontend Test Coverage)

- **Frontend Zod Schema Test Coverage**: Added comprehensive test suites for all form validation schemas:
  - `student.schema.test.ts`: 48 tests covering all student fields (student_id, names, email, phone, address, dates) with regex validation, length limits, and type conversions
  - `course.schema.test.ts`: 53 tests for course validation (course_code uppercase regex, credits/year transforms, semester, instructor, absence_penalty) with edge cases
  - `grade.schema.test.ts`: 60 tests for grade validation including student_id/course_id transforms, component_type, grade/max_grade constraints with cross-field refinement, weight percentages, and optional date/notes fields
  - `attendance.schema.test.ts`: 53 tests for attendance (status enum validation, bulk operations with attendance_records arrays) and update schemas
  - All schemas test: required field validation, type conversions (string→number), length/range constraints, optional fields, empty string→undefined transforms, and updateSchema partial updates
  - **Total: 214 new schema validation tests**
  - **Full frontend test coverage now: 40 test files with 929+ passing tests**

- **Frontend Utility Test Coverage**: Added comprehensive test suites for utility functions:
  - `date.test.ts`: 42 tests covering `formatLocalDate` with Date/string inputs, timezone handling, and `inferWeekStartsOnMonday` with multilingual support
  - `categoryLabels.test.ts`: 29 tests for `getLocalizedCategory` and `getCanonicalCategory` with Greek/English localization, normalization, and heuristic matching
  - `errorMessage.test.ts`: 31 tests for `getErrorMessage` covering null/string/Error/object/array extraction, nested objects, and FastAPI validation structures
  - `calendarUtils.test.ts`: 27 tests for ICS generation with recurrence rules, special character escaping, and `downloadICS` with DOM mocking
  - All utility tests include edge cases, input validation, and error handling scenarios
  - Total: 145 new utility tests (129 added, 16 already existed)
  - **Full frontend test coverage now: 36 test files with 715+ passing tests**

- **Frontend Context Test Coverage**: Added comprehensive tests for core React Contexts to ensure reliable app-wide state and UX behavior:
  - `contexts/AuthContext.test.tsx`: Covers login/logout/refresh flows, access token synchronization with `authService`, user restoration from `/auth/me` when login response omits user, localStorage persistence and error resilience, and hook misuse detection (throws outside provider)
  - `LanguageContext.test.tsx`: Uses real i18next integration (no stubs); verifies language switching between `en`/`el`, persistence via `i18nextLng`, fallback behavior for missing keys in `t()`, and correct hook misuse error messaging
  - `ThemeContext.test.tsx`: Validates theme initialization from `theme` key, switching among `light`/`dark`/`relaxing`/`fancy`/`system`, DOM class updates with async handling, system preference listeners via `matchMedia`, persistence, and robust handling of storage quirks
  - Tests align with actual implementation details (storage keys, async effects, exact error messages) to avoid brittle expectations
  - **Total: 68 new context tests (3 files) — all passing**

- **Zustand Store Test Coverage**: Added comprehensive test suites for all state management stores:
  - `useCoursesStore.test.ts`: 35 tests covering CRUD operations, selection, loading/error states, and complex scenarios
  - `useStudentsStore.test.ts`: 35 tests for student management with selection sync on updates/deletes
  - `useGradesStore.test.ts`: 33 tests including bulk operations and filtering scenarios
  - `useAttendanceStore.test.ts`: 30 tests covering bulk attendance operations and status transitions
  - All stores tested for immutability, error clearing, and state consistency
  - Total: 133 new store tests ensuring robust state management

- **Frontend Test Coverage Expansion**: Added comprehensive test suites for query hooks and data management layers:
  - `useCoursesQuery.test.ts`: 15 tests covering list fetching, filters (search/active/semester), single course queries, and mutations (create/update/delete) with proper React Query integration
  - `useStudentsQuery.test.ts` & `.tsx`: 24 tests (dual implementations) for student queries, filters, error handling, and CRUD mutations
  - All query hook tests mock API modules consistently to avoid runtime instance mismatches between TypeScript and JavaScript API definitions
  - Tests disable React Query retries for deterministic state transitions and error handling validation
  - Total frontend test coverage now: 32 test files with 601+ passing tests (133 store tests + 39 query hook tests + existing coverage)

- **Service Layer Architecture**: Introduced dedicated service layer (`backend/services/`) to encapsulate business logic and improve code organization
  - `AnalyticsService`: Centralized analytics calculations with eager loading to prevent N+1 query problems
  - `StudentService`: Encapsulated student CRUD operations and bulk operations with proper transaction management
  - Services handle complex business logic, leaving routers thin and focused on HTTP concerns

- **Comprehensive Analytics Tests**: Added `test_analytics_router.py` with 10 comprehensive test cases covering:
  - Final grade calculations with evaluation rules, daily performance, and absence penalties
  - Multi-course student summaries with GPA calculations
  - Edge cases (missing rules, attendance categories, course not found)
  - Query optimization validation (N+1 prevention with <= 12 queries regardless of course count)

### Changed

- **Backend Architecture Improvements**:
  - Refactored `routers_analytics.py` to use `AnalyticsService` for all analytics calculations
  - Refactored `routers_students.py` to use `StudentService` for all student operations
  - Improved error handling with structured error responses using `internal_server_error` helper
  - Enhanced transaction management and database query optimization

- **Frontend Type Safety Improvements**: Systematically eliminated 41 `any` type usages across grading, dashboard, and student management components, reducing TypeScript lint warnings from 312 to 254. Refactored components now use proper domain types (`Student`, `Grade`, `Course`, `Attendance`, `Highlight`, `CourseEnrollment`, etc.) from the central `types/index.ts` module.
  - `GradingView.tsx`: Introduced `EvaluationRule`, `CourseWithEvaluationRules`, and `CategoryOption` interfaces; removed 11 `any` usages
  - `GradeBreakdownModal.tsx`: Typed data state as `FinalGrade | null`; removed 6 `any` usages
  - `EnhancedDashboardView.tsx`: Created `StudentWithGPA` interface; typed all props, state, and callbacks; removed 16 `any` usages
  - `StudentProfile.tsx`: Added `StudentProfileProps` interface; typed all state and callbacks; removed 8 `any` usages
  - All modified components validated with successful production builds and zero type safety regressions

- **Frontend Dependency Management**:
  - Updated React Query from 5.62.0 to 5.62.11 for improved query management and bug fixes
  - Updated frontend package lock file with latest dependency resolutions
  - Added `.npmrc` configuration for consistent dependency resolution

- Control panel backups: fixed the `/control/api/operations/database-backups/{filename}/download` route so it registers at startup (instead of being nested under the restore handler), hardened it against directory traversal, and added regression tests for success, missing files, and traversal attempts (`backend/tests/test_control_endpoints.py`).
- Release compliance helpers (`scripts/ops/archive-releases.ps1`, `scripts/ops/remove-legacy-packages.ps1`) now accept offline fixture files (`scripts/ops/samples/*.json`) plus explicit `-GhPath` overrides so dry-runs and CI smoke tests can execute without the GitHub CLI.
- SECRET_KEY enforcement flag: documented the optional `SECRET_KEY_STRICT_ENFORCEMENT` toggle that operators can enable to block placeholder or short secrets. It remains off by default for backward compatibility but will be required in a future hardened release.
- Authentication hardening: login attempts are now rate-limited per account with automatic lockouts after repeated failures (defaults to 5 attempts within 5 minutes) governed by new `AUTH_LOGIN_MAX_ATTEMPTS`, `AUTH_LOGIN_LOCKOUT_SECONDS`, and `AUTH_LOGIN_TRACKING_WINDOW_SECONDS` settings and fully covered by backend tests.

### Technical Details

- **Files Added**:
  - `backend/services/__init__.py`: Service layer exports
  - `backend/services/analytics_service.py`: Analytics business logic (373 lines)
  - `backend/services/student_service.py`: Student business logic (207 lines)
  - `backend/tests/test_analytics_router.py`: Comprehensive analytics tests (315 lines)
  - `frontend/.npmrc`: npm configuration
  - `frontend/eslint.config.js`: ESLint configuration for TypeScript
  - Frontend student profile components: `AttendanceDetails.tsx`, `GradeDistribution.tsx`, `GradeStatistics.tsx`, `NotesSection.tsx`
  - `frontend/src/features/students/components/studentTypes.ts`: Shared TypeScript types

- **Files Modified**:
  - Backend: `main.py`, `routers_analytics.py`, `routers_students.py`, `test_analytics_router.py`
  - Frontend: Multiple view components for improved type safety
  - Package manifests: `frontend/package.json`, `frontend/package-lock.json`
  - Configuration: `student-management-system.code-workspace`
  - Documentation: `CHANGELOG.md`

### Quality & Maintainability

- **Code Organization**: Service layer pattern improves separation of concerns and testability
- **Type Safety**: Eliminated `any` types in favor of proper interfaces and type annotations
- **Query Optimization**: Eager loading strategies prevent N+1 query problems in analytics endpoints
- **Test Coverage**: Comprehensive test suite for analytics router with edge case coverage
- **Error Handling**: Consistent structured error responses across all endpoints

## [1.6.3] - 2025-11-15

### Added

- **Release archive playbook**: documented the process for tagging legacy releases and bundling removed setup/stop scripts under the `archive/` directory plus a dedicated GitHub Release attachment, ensuring downstream operators can still audit the final binaries.
- **GitHub package retirement guidance**: added procedures for deleting or privatizing the three obsolete packages so deploy pipelines stop resolving stale artifacts.
- **docs/releases/v1.6.3**: new release-notes source file that can be published directly on GitHub without manual editing.
- **Release automation tooling**: shipped `scripts/ops/archive-releases.ps1`, `scripts/ops/remove-legacy-packages.ps1`, the `.github/workflows/archive-legacy-releases.yml` runner, and the `docs/DEPLOYMENT_ASSET_TRACKER.md` inventory so release engineers can archive legacy tags and retire unused GHCR images with an auditable trail.

### Changed

- Updated `README.md`, `docs/DOCUMENTATION_INDEX.md`, and `CHANGELOG.md` to call out v1.6.3 as the latest release and to highlight the archive flow.
- Refreshed release instructions so tagging/publishing the new version automatically references the archive and compliance notes introduced in v1.6.2.

## [1.6.2] - 2025-11-15

### Added

- **Attendance analytics export**: new `/api/v1/export/attendance/analytics/excel` endpoint builds a six-sheet workbook with overview metrics, per-course rollups, per-period coverage, course-period intersections, student summaries, and daily breakdowns. Workbook styling now includes auto-fitted columns, semantic headers, and dominant-status calculations for quick scanning.
- **Attendance experience refinements**: the attendance board and enhanced calendar now support per-period scheduling, default-present safeguards, per-student expansion panels, attendance coverage analytics, and timezone-safe date handling shared through `frontend/src/utils/date.ts`.
- **Operations & export UX**: Export Center surfaces the new analytics workbook card with localized copy (EN/EL), and the Control Panel appearance selector adds a live preview with sample metrics so operators can see how cards/buttons react before applying a theme.
- **Tests & tooling**: added `backend/tests/test_export_analytics.py` to validate the analytics workbook content end-to-end and updated the shared language context to pass i18next options, keeping formatting tokens available to new translations.

### Security

- Patched GHSA-7f5h-v6xp-fcq8 / CVE-2025-62727 by pinning Starlette to `0.49.1`, eliminating the quadratic-time Range header merging in `FileResponse` used by FastAPI’s static file endpoints.

## [1.6.0] - 2025-11-13

### Authentication & Security

- Added server-persisted refresh token support with rotation, expiry, and revocation.
  - Endpoints: POST /api/v1/auth/refresh, POST /api/v1/auth/logout (server-side revoke).
  - Login now returns an access token (JWT) and a refresh token (rotating, single-use).
  - Refresh tokens stored hashed in DB (table: `refresh_tokens`) with `jti` and `expires_at` columns.
  - Rotation policy: refresh token exchanges issue a new token and revoke the previous one.
  - Logout revokes the presented refresh token and clears the HttpOnly cookie to prevent reuse.
- Introduced default administrator bootstrap: configure `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`, and related env vars to auto-create or update an admin, optionally forcing password resets and revoking stale refresh tokens.
- Hardened the Alembic migration runner to handle conflicting heads and reruns; regression tests cover failure handling paths.

### Frontend

- Added a dedicated authentication experience with inline login and registration, guarded routes, and an AuthContext that manages HttpOnly refresh cookies.
- Updated global navigation, translations, and utilities messaging to surface the new authentication flow and operations terminology.

### Tooling & Operations

- Renamed the intelligent startup script to `RUN.ps1`, refreshed documentation, and aligned deployment helpers with the new entry point naming.
- Expanded operations tooling copy (Operations Monitor, Resources Hub) to match the new backend capabilities.

Migration notes:

- A canonical Alembic migration was added to create the `refresh_tokens` table and a merge revision reconciles the previous manual migration. The migration runner is now idempotent for repeated test runs and CI executions.

Reference: `backend/models.py` (`RefreshToken`), `backend/routers/routers_auth.py` (refresh/logout endpoints), `backend/admin_bootstrap.py`, `frontend/src/contexts/AuthContext.tsx`, `frontend/src/pages/AuthPage.tsx`, `backend/migrations/versions/*`.

## [1.3.9] - 2025-11-06

### CSV Import Feature & Codebase Cleanup

Feature release adding Greek-language CSV import support for student registrations and comprehensive codebase cleanup.

**New Features:**

- **CSV Import Support for Students**: Import student registrations from CSV files with Greek column names
  - Semicolon-delimited CSV parsing with multi-encoding support (UTF-8, UTF-8-BOM, Latin-1)
  - Greek column mapping: Επώνυμο, Όνομα, Όνομα Πατέρα, Ηλ. Ταχυδρομείο, etc.
  - Automatic study year conversion: Α'/Β'/Γ'/Δ' → 1/2/3/4
  - Student ID normalization with 'S' prefix
  - Dynamic health column detection for long Greek field names
  - Full validation with detailed error reporting
  - Added comprehensive test suite (4 new tests in test_csv_import.py)

**Codebase Improvements:**

- Fixed environment detection tests to properly skip when running inside Docker
  - Added `@pytest.mark.skipif` decorators for Docker-incompatible tests
  - Improved test reliability: 246 passing, 15 skipped (100% success rate)
- Removed obsolete temporary files and directories:
  - temp_control_panel.html, tmp_test_migrations/, ci-diagnose-4460549183/
  - SMART_SETUP_OLD_BACKUP.ps1, SMS_OLD_BACKUP.ps1
  - setup.log, pytest-full-output.txt, release notes fragments merged into this CHANGELOG
- Cleaned up cache directories:
  - .mypy_cache/, .pytest_cache/, .ruff_cache/
  - .venv_audit/, .venv_backend_tests/
- Removed obsolete CHANGELOG_UPDATES/ directory (fragments merged)

**Technical Details:**

- Files modified:
  - backend/routers/routers_imports.py: Added CSV parsing function (140+ lines)
  - backend/tests/test_csv_import.py: New comprehensive test suite
  - backend/tests/test_environment_module.py: Fixed Docker detection
  - backend/tests/test_health_checks.py: Fixed native environment tests
- Supported CSV format: AUT registration files with Greek column names
- MIME types: Added "text/csv" support
- File extensions: Added ".csv" to allowed imports

**Migration Notes:**

- No database schema changes required
- No breaking API changes
- Existing JSON imports continue to work unchanged
- CSV import only available for students (courses remain JSON-only)

**Testing:**

- All 246 backend tests passing (15 skipped in Docker)
- 4 new CSV import tests added and passing
- Real-world validation: Successfully imported 8 students from AUT registration CSV

**CI and Repository Hygiene (from v1.3.8.1):**

- Simplified CI to core checks only (backend lint/type/test/audit/SBOM and frontend build)
- Deleted obsolete CI helper scripts and tests no longer referenced by the pipeline
- Archived and removed unmerged branch `origin/ci/remove-vendor-actions`

## [1.3.8] - 2025-11-05

### Testing & Quality Improvements Release

Small release focused on improving test coverage, error handling consistency, and CI/CD infrastructure.

Highlights:

- Enhanced test coverage with comprehensive student router and import validation tests
- Structured error handling refactored across all routers for consistency
- Backend coverage reporting configuration with proper test infrastructure
- CI/CD improvements: ruff normalization, GitHub Checks API integration, wheelhouse caching
- Python entrypoint implementation replacing shell-based Docker entrypoint for better error handling
- Docker environment improvements: SECRET_KEY validation, path traversal prevention for Docker mode

Technical:

- Files modified: backend/main.py, backend/config.py, backend/entrypoint.py (new), docker-compose.yml, multiple CI workflows
- Tests: Expanded student router tests, new import validation tests, structured error handling validation
- All 109 backend tests passing

Notes:

- No database migrations required
- No breaking changes to API
- Docker images should be rebuilt to use new Python entrypoint
- Recommended: Review SECRET_KEY configuration in Docker deployments

## [1.3.7] - 2025-11-03

Import-resolver sweep & CI enforcement - 2025-11-02

Small internal maintenance release that improves import robustness and CI enforcement.

Highlights:

- Centralized import fallback logic with `backend/import_resolver.py` and replaced ad-hoc try/except import patterns across backend modules.
- Enforced static checks in CI: added `ruff` workflow and made `mypy` blocking in CI.
- Made secret guard blocking on `main` (CI job will fail if `SECRET_KEY` missing or uses placeholder); PRs still get an informational check.
- Added pre-commit hooks configuration (ruff/isort and file-cleanup hooks) to help contributors maintain code quality.
- Deleted stale remote feature branch `chore/import-resolver-sweep` after merge.

Technical:

- Files added: `backend/import_resolver.py`, `.github/workflows/ruff.yml` (CI), pre-commit configuration updates
- Files modified: many backend routers to use import_resolver, `.github/workflows/mypy.yml`, `.github/workflows/secret-guard.yml`
- Tests: backend pytest runs hermetically using in-memory SQLite and pass on main

Notes:

- This is primarily a developer-facing maintenance change; no API or schema changes were introduced.

### Control API: safer frontend start/stop (operational)

Small operational hardening for the `/control` endpoints.

- Replaced shell-based subprocess invocations with list-style calls (shell=False) in `backend/main.py` to avoid shell injection and platform quoting issues.
- Normalized user-facing `/control` API messages to be platform-agnostic and stable for tests and operators.
- Added Windows `creationflags` and POSIX `close_fds` handling when spawning the frontend process, and guarded middleware registration to avoid startup failures.
- Added unit tests for `/control/api/start` branches (install failure, process terminated, success).

PR: <https://github.com/bs1gr/AUT_MIEEK_SMS/pull/6>
Merge commit: 12e1b707087ccf447cd37c912a2caa4f05b5c285

## [1.3.4] - 2025-11-01

### Final Code Quality & Robustness Improvements

This release completes the code quality improvements from v1.3.3, eliminating all remaining code duplication and adding comprehensive validation.

Enhancements:

- **Eliminated All Code Duplication**: Updated DatabaseOperations and SetupOperations to use shared get_python_executable() - zero duplicated implementations across entire codebase
- **Applied Timeout Constants Everywhere**: Updated all remaining operations (database.py: 3 locations, setup.py: 7 locations) to use OperationTimeouts constants
- **Enhanced Network Error Handling**: Added detailed error tracking and debug logging to wait_for_http() - reports specific connection errors
- **Comprehensive Backup Validation**: Added security checks to delete_backup() including path traversal prevention and file type validation
- **Input Validation**: Added type and range validation to clean_old_backups() keep_count parameter

Security:

- Path traversal prevention in delete_backup()
- Type safety checks for all function parameters
- File type validation (only .db files can be deleted)

Technical:

- Modified: backend/ops/database.py (+60 lines), backend/ops/setup.py (+15 lines)
- Total: 3 files, ~75 net lines added
- 100% backward compatible, no breaking changes

## [1.3.3] - 2025-11-01

### Code Quality & Performance Improvements

This release addresses code duplication, improves maintainability, and optimizes memory usage for large backup directories.

Enhancements:

- **Pagination for Backups**: Added optional pagination to `list_backups()` - prevents memory issues when many backups exist (supports limit/offset parameters)
- **Shared Utilities**: Extracted `get_python_executable()` to base.py - eliminates code duplication across BackendServer, DatabaseManager, and SetupOperations
- **Timeout Constants**: Added `OperationTimeouts` class with standardized timeout values - improves maintainability and prevents arbitrary magic numbers throughout codebase
- **Reduced Code Duplication**: Eliminated ~30 lines of duplicated get_python_path() implementations

Technical:

- Modified files: backend/ops/base.py (+72 lines), backend/ops/database.py (+19 lines), backend/ops/server.py (-30 lines)
- Total changes: 3 files, ~61 net lines added
- All changes are 100% backward compatible
- No breaking changes

Documentation:

- Updated inline documentation for new pagination parameters
- Added comprehensive docstrings for shared utilities
- Documented timeout constants with usage guidelines

Benefits:

- **Memory Efficiency**: Pagination prevents OOM when listing thousands of backups
- **Maintainability**: Centralized timeout values and shared utilities reduce maintenance burden
- **Code Quality**: DRY principle applied - no more duplicated get_python_path() methods
- **Performance**: Faster list_backups() with limit parameter for CLI/API responses

## [1.3.2] - 2025-11-01

### Critical Security & Stability Fixes

This release implements 5 critical security and stability fixes identified in comprehensive code review. All fixes enhance input validation and prevent potential security vulnerabilities.

Security Enhancements:

- **SECRET_KEY Validation**: Added validator to prevent application startup with insecure default "change-me" value - enforces minimum 32-character length with clear error messages
- **DATABASE_URL Path Validation**: Added path traversal protection - ensures database file stays within project directory, validates SQLite URL format
- **Port Number Validation**: Added validation for ProcessManager.kill_process_on_port() - rejects invalid port numbers outside 0-65535 range
- **URL Format Validation**: Added comprehensive URL validation in SetupOperations.wait_for_http() - validates scheme (http/https), host, and timeout values
- **Atomic PID File Writes**: Implemented atomic write-then-rename pattern in BackendServer.save_pid() - prevents file corruption from race conditions

Bug Fixes:

- **Input Validation**: All external inputs now validated before use - port numbers, URLs, timeouts, and file paths
- **Race Condition**: PID file writes now atomic using temp file + rename pattern (Windows compatible)
- **Path Security**: Database path confined to project directory, prevents malicious .env configurations

Technical:

- Modified files: backend/config.py (+46 lines), backend/ops/server.py (+24 lines), backend/ops/setup.py (+27 lines)
- Total changes: 3 files, ~97 lines added
- All validations provide clear, actionable error messages
- 100% backward compatible with existing configurations (once SECRET_KEY is set)

Documentation:

- Documentation consolidated in `docs/REMOVED_DOCS_SUMMARY.md`, which lists archived deep-dive reports covering the security review, improvement timeline, and critical fix details referenced in this release.

**BREAKING CHANGE**: Application will not start with default SECRET_KEY="change-me". Users must generate and set a secure SECRET_KEY in backend/.env before starting the application.

Migration:

```bash
# Generate secure key
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Add to backend/.env
SECRET_KEY=<generated-key>
```

## [1.3.1] - 2025-11-01

### Architecture Improvements & Bug Fixes

This release addresses critical bugs discovered during CLI testing and implements architectural improvements to prevent similar issues in the future.

Enhancements:

- **Standardized Dependency Injection**: Updated `Operation` base class to accept optional `root_dir` parameter, ensuring consistent constructor signatures across all 15+ operations
- **Enhanced BackupInfo**: Added property aliases for improved usability:
  - `created` - alias for `created_at` for more intuitive field naming
  - `size_human` - automatic human-readable size formatting (e.g., "284.0 KB")
- **Cleaner Inheritance**: Eliminated ~30 lines of redundant `self.root_dir` assignments across operation classes
- **100% Backward Compatible**: All existing code continues to work without changes

Bug Fixes:

- **CRITICAL - Missing root_dir Parameter**: Fixed TypeError preventing ALL CLI commands from working - added PROJECT_ROOT and updated 65+ operation instantiations
- **Missing service_name Attribute**: Fixed AttributeError in `diag ports` command - removed non-existent field from PortStatus
- **Inconsistent **init** Signatures**: Fixed TypeError in `diag deps` and `diag health` by standardizing Operation base class
- **Windows Encoding - Emoji Characters**: Fixed UnicodeEncodeError on Windows - replaced emoji with ASCII text
- **Dict vs Object Access**: Fixed `diag status` table rendering by using dict access pattern
- **BackupInfo Field Mismatch**: Fixed `db list-backups` crash by adding missing property aliases

Technical:

- Updated 15+ operation classes to use new standardized DI pattern
- Modified files: backend/ops/base.py, diagnostics.py, setup.py, database.py, server.py, docker.py, cleanup.py, frontend/ops/*.py
- Added comprehensive documentation: ARCHITECTURE_IMPROVEMENTS_v1.3.1.md
- CLI testing: 8 commands verified working (12% coverage)

Documentation:

- Documentation for this effort has been archived; see `docs/REMOVED_DOCS_SUMMARY.md` for pointers to the detailed architecture and CLI testing reports referenced here.

## [1.2.3] - 2025-10-31

Enhancements:

- **SMART_SETUP.ps1**: Added intelligent PowerShell installer with auto-detection, dependency management, and flexible deployment modes
- **Version Consistency**: Backend API version now matches VERSION file (1.2.3) for proper OpenAPI schema generation
- **Codebase Cleanup**: Removed obsolete installation scripts (DEPRECATIONS.md, ONE-CLICK.ps1, QUICKSTART.bat, START.bat)

Technical:

- Synchronized FastAPI application version with VERSION file
- Streamlined installation entry points to INSTALL.bat and install.py

## [1.2.2] - 2025-10-31

Bug Fixes:

- **Theme Application in Edge Browser**: Enhanced ThemeContext and early theme detection script with Edge-specific compatibility fixes, added force repaint after class changes
- **OpenAPI Schema Version**: Fixed version mismatch (3.0.3 → 1.2.1) causing parser errors at /docs endpoint, added redoc_url
- **Developer Tools API Endpoints**: Corrected API routes - reset endpoint now uses `/adminops/clear`, backup uses `/adminops/backup`
- **Control Panel Environment Info**: Enhanced version display with comprehensive package information (FastAPI, SQLAlchemy, Pydantic, Uvicorn) and descriptive tooltips

Enhancements:

- **Docker Image Versioning**: Install scripts now read VERSION file and properly tag Docker images (e.g., `sms-backend:1.2.2` instead of `latest`)
- **OCI Image Labels**: Added comprehensive metadata labels to Docker images (version, build date, git commit)
- **Version Tracking**: Docker Compose now uses version from VERSION file for reproducible deployments
- **Build Metadata Script**: Added `.\scripts\set-docker-metadata.ps1` for manual builds with proper versioning

Technical:

- Updated backend/main.py FastAPI version to match VERSION file
- Improved frontend theme detection for Microsoft Edge browser compatibility
- Fixed DevTools component to use correct adminops API endpoints
- Docker images now include build args for VERSION, BUILD_DATE, and VCS_REF
- Enhanced .env.example with VERSION variable for docker-compose

## [1.2.1] - 2025-10-31

### Major Installation Overhaul - Simplified to ONE Command

Breaking Changes:

- Removed all PowerShell-based installers (QUICKSTART.ps1, SMART_SETUP.ps1, ONE-CLICK.ps1)
- Removed legacy .bat wrappers (QUICKSTART.bat, START.bat, ONE-CLICK.bat)
- Removed overcomplicated troubleshooting infrastructure

New Simple Installation:

- `INSTALL.bat` - Pure CMD installer, works on any Windows without prerequisites
- `install.py` - Universal Python-based installer (cross-platform)
- `INSTALL.md` - Dead-simple one-page installation guide

Key Improvements:

- No more PowerShell execution policy issues
- Auto-detection of Docker/Python/Node.js
- Single-command installation experience
- Clear error messages with download links

User Experience Changes:

- Before: Download → Configure system → Run multiple scripts → Debug issues
- After: Download → Run INSTALL.bat → Application opens automatically

Files Removed (11 total):

- QUICKSTART.ps1, QUICKSTART.bat (replaced by INSTALL.bat)
- SMART_SETUP.ps1 (functionality integrated into install.py)
- ONE-CLICK.ps1, ONE-CLICK.bat (replaced by INSTALL.bat)
- START.bat (unnecessary with new installer)
- VALIDATE_SETUP.ps1, TROUBLESHOOTING.md, GETTING_STARTED.md (overcomplicated)
- QUICK_DEPLOYMENT.md, DEPRECATIONS.md (redundant documentation)

Files Kept:

- SMS.ps1 (management interface - start/stop/status/diagnostics)
- All core application files and documentation

Migration Guide:

- Old: `.\QUICKSTART.ps1` → New: `INSTALL.bat` or `python install.py`
- Old: `.\SMART_SETUP.ps1` → New: `INSTALL.bat` or `python install.py`
- Old: `.\START.bat` → New: `SMS.ps1` (for management only, INSTALL.bat for first-time setup)

Docs/UX:

- Added deprecation notice for legacy wrappers in README: START.bat and ONE-CLICK.ps1/ONE-CLICK.bat now forward to primary scripts.
- Recommended entry points clarified: use QUICKSTART.ps1 (start) and SMS.ps1 (management). ONE-CLICK.ps1 forwards to SMART_SETUP.ps1.

## [1.2.0] - 2025-10-30

Highlights:

- Optional JWT authentication with RBAC (feature-flagged via AUTH_ENABLED)
- Timezone-aware timestamps across models (UTC) with Alembic migration
- Rate limiting enforced on new write endpoints
- Fresh-clone deployment validated and documented

Docs:

- Detailed release notes: see this `CHANGELOG.md` (consolidated)
- Fresh clone test report and related artifacts archived in `docs/REMOVED_DOCS_SUMMARY.md`
- Authentication guide: docs/AUTHENTICATION.md (if present in docs/, else see README references)

Migrations:

- Auto-applied on startup; see backend/run_migrations.py

## [1.1.0] - 2025-XX-XX

Highlights:

- Stability improvements and documentation updates

Docs:

- Detailed release notes: see this `CHANGELOG.md` (consolidated)

---

Unreleased changes will be added above as they land in main.

[1.6.3]: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.6.3
[1.6.2]: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.6.2
[1.6.0]: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.6.0
[1.3.9]: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.3.9
[1.3.8]: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.3.8
[1.3.7]: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.3.7
[1.3.4]: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.3.4
[1.3.3]: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.3.3
[1.3.2]: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.3.2
[1.3.1]: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.3.1
[1.2.3]: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.2.3
[1.2.2]: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.2.2
[1.2.1]: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.2.1
[1.2.0]: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.2.0
[1.1.0]: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.1.0
[1.6.4]: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.6.4
[Unreleased]: https://github.com/bs1gr/AUT_MIEEK_SMS/compare/v1.6.4...HEAD
