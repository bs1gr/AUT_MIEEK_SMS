# Execute two-commit strategy for Feature #127
Set-Location "d:\SMS\student-management-system"

Write-Host "=== COMMIT 1: Terminal Encoding Fixes ===" -ForegroundColor Cyan

# Stage terminal encoding files
git add .vscode/powershell-profile.ps1
git add .vscode/settings.json
git add DOCUMENTATION_INDEX.md
git add TERMINAL_ENCODING_FIX_SUMMARY.md
git add docs/TERMINAL_ENCODING_FIX.md
git add commit_terminal_encoding_fix.ps1
git add quick_commit.ps1

# Commit with message
git commit -m @"
Fix terminal encoding corruption (ψ character) in VS Code PowerShell

Problem: PowerShell terminal displayed corrupted characters (ψ instead of proper text)
Root Cause: Terminal defaulting to system codepage instead of UTF-8

Changes:
- Enhanced PowerShell profile v2 with critical UTF-8 encoding setup
- Added PowerShell (SMS) terminal profile in VS Code settings
- Disabled GPU acceleration to prevent rendering issues
- Added environment variables for consistent encoding
- Created comprehensive documentation and commit scripts

Files Modified:
- .vscode/powershell-profile.ps1 (rewritten v2, 44 lines)
- .vscode/settings.json (terminal profile config, 24 lines)
- DOCUMENTATION_INDEX.md (added reference)

Files Created:
- docs/TERMINAL_ENCODING_FIX.md (170 lines - detailed guide)
- TERMINAL_ENCODING_FIX_SUMMARY.md (176 lines - quick reference)
- commit_terminal_encoding_fix.ps1 (88 lines - commit helper)
- quick_commit.ps1 (58 lines - quick commit utility)

Tested: Verified ψ character displays correctly in VS Code terminal
Impact: All PowerShell terminals now use UTF-8 by default
Reference: docs/TERMINAL_ENCODING_FIX.md
"@

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Commit 1 complete" -ForegroundColor Green
} else {
    Write-Host "✗ Commit 1 failed" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== COMMIT 2: Feature #127 Phase 3 ===" -ForegroundColor Cyan

# Stage Feature #127 files
git add backend/models.py
git add backend/schemas/__init__.py
git add backend/schemas/import_export.py
git add backend/services/import_export_service.py
git add backend/routers/routers_import_export.py
git add backend/migrations/versions/feature127_add_import_export_tables.py
git add backend/router_registry.py
git add docs/plans/UNIFIED_WORK_PLAN.md
git add FEATURE127_PHASE1_COMPLETE.md
git add FEATURE127_PHASE3_API_COMPLETE.md
git add FEATURE127_PHASE3_PRECOMMIT_VERIFICATION.md
git add FEATURE127_SESSION_COMPLETE.md

# Commit with message
git commit -m @"
Feature #127 Phase 3: Bulk Import/Export API Endpoints (60% Complete)

Implements REST API endpoints for bulk import/export functionality with full
RBAC integration, APIResponse wrapper, and comprehensive error handling.

COMPLETED PHASES:
- Phase 1: Database models (ImportJob, ImportRow, ExportJob, ImportExportHistory)
- Phase 2: ImportExportService (18 methods, validation, lifecycle, export)
- Phase 3: API Router (9 endpoints with RBAC permissions) ✅ THIS COMMIT

NEW FILES:
Backend:
- backend/routers/routers_import_export.py (463 lines, 9 endpoints)
- backend/schemas/import_export.py (172 lines, 13 schemas)
- backend/services/import_export_service.py (489 lines, 18 methods)
- backend/migrations/versions/feature127_add_import_export_tables.py (124 lines)

Documentation:
- FEATURE127_PHASE1_COMPLETE.md (191 lines)
- FEATURE127_PHASE3_API_COMPLETE.md (277 lines)
- FEATURE127_PHASE3_PRECOMMIT_VERIFICATION.md (268 lines)
- FEATURE127_SESSION_COMPLETE.md (356 lines)

MODIFIED FILES:
- backend/models.py (+139 lines: 4 models with indexes)
- backend/schemas/__init__.py (+39 lines: 13 schema exports)
- backend/router_registry.py (+1 line: router registration)
- docs/plans/UNIFIED_WORK_PLAN.md (updated Phase 3 status to 60%)

API ENDPOINTS:
Import Operations (imports:create, imports:view):
- POST /api/v1/import-export/imports/students (upload student CSV/Excel)
- POST /api/v1/import-export/imports/courses (upload course CSV/Excel)
- POST /api/v1/import-export/imports/grades (upload grade CSV/Excel)
- GET /api/v1/import-export/imports/{id} (get import job status)
- GET /api/v1/import-export/imports (list with filtering)

Export Operations (exports:generate, exports:view):
- POST /api/v1/import-export/exports (create export job)
- GET /api/v1/import-export/exports/{id} (get export status/download)
- GET /api/v1/import-export/exports (list with filtering)

Audit (audit:view):
- GET /api/v1/import-export/history (complete audit trail)

FEATURES:
- Full RBAC integration (@require_permission, @optional_require_role)
- APIResponse wrapper for all responses
- Comprehensive error handling with user-friendly messages
- File upload via FastAPI UploadFile
- Pagination support (skip/limit)
- Filtering by status, date range, entity type
- Transaction support with rollback capability
- Audit trail for all operations

PENDING PHASES (40-50% remaining):
- Phase 4: Frontend UI components (ImportWizard, ExportDialog, HistoryTable)
- Phase 5: Backend refinement (CSV/Excel parsers, actual import logic, export formats)
- Phase 6: Testing & documentation (unit tests, E2E tests, admin guides)

Issue: #137
Status: Phase 3 complete, API layer ready for frontend integration
Next: Phase 4 frontend components (10-15 hours estimated)
"@

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Commit 2 complete" -ForegroundColor Green
} else {
    Write-Host "✗ Commit 2 failed" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
git log --oneline -2
Write-Host "`n✓ Both commits executed successfully" -ForegroundColor Green
Write-Host "Run 'git status' to verify clean state" -ForegroundColor Yellow
