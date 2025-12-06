# Session Export/Import Implementation Details (Technical Reference)

> **ℹ️ For Users**: See the **[user guide](../user/SESSION_EXPORT_IMPORT_GUIDE.md)** for how to use this feature.
>
> **Technical Details**: This document describes the implementation of the session export/import feature.

## Overview

Added comprehensive session-based export/import functionality to allow users to export all data for a specific semester with one button, and import/merge session data from another system with another button.

## Changes Made

### Backend Changes

#### 1. New Router: `backend/routers/routers_sessions.py`
- **Purpose**: Provides endpoints for session export/import operations
- **Endpoints**:
  - `GET /api/v1/sessions/semesters` - List all available semesters in the system
  - `POST /api/v1/sessions/export?semester=<name>` - Export complete session data package for a semester
  - `POST /api/v1/sessions/import?merge_strategy=<update|skip>` - Import and merge session data from JSON file

- **Features**:
  - **Session Export**: Bundles all related data for a semester into a single JSON file:
    - Courses for the semester
    - Students enrolled in those courses
    - Course enrollments
    - Grades for those enrollments
    - Attendance records
    - Daily performance records
    - Student highlights for the semester
  - **Session Import**: Intelligent merge/append with two strategies:
    - `update` (default): Update existing records and create new ones
    - `skip`: Only create new records, skip existing ones
  - **Metadata**: Each export includes metadata (exported timestamp, user, counts)
  - **Conflict Resolution**: Uses unique identifiers (student_id, course_code) to match existing records
  - **Error Handling**: Returns detailed summary with counts of created/updated/skipped/errors for each data type

#### 2. Router Registration: `backend/main.py`
- Added `routers_sessions` to `register_routers()` function
- Tags: ["Sessions"]

### Frontend Changes

#### 1. API Client: `frontend/src/api/api.js`
- **New Export**: `sessionAPI` object with three methods:
  - `listSemesters()` - Fetch available semesters
  - `exportSession(semester)` - Download session export file (blob response)
  - `importSession(file, mergeStrategy)` - Upload and import session JSON file

#### 2. UI Component: `frontend/src/components/tools/ExportCenter.tsx`
- **New Component**: `SessionExportImport`
  - Two-column layout (export left, import right)
  - **Export Panel**:
    - Semester dropdown selector
    - Export button with loading state
    - Downloads JSON file with timestamped filename
  - **Import Panel**:
    - File upload input (JSON only)
    - Merge strategy radio buttons (Update Existing / Skip Existing)
    - Import button with loading state
    - Displays import summary (created/updated/errors counts)
- **Integration**: Inserted before "Individual Student Reports" section
- **Icons**: Added `Database` and `Upload` from lucide-react

#### 3. Translations

##### English: `frontend/src/locales/en/export.js`
Added 29 new translation keys:
- Section headers (sessionExportImport, exportCompleteSession, importSession)
- UI labels (selectSemester, selectFile, mergeStrategy, etc.)
- Button labels (exportSession, importSessionButton)
- Status messages (loadingSemesters, exportingSession, importingSession)
- Success/error messages
- Strategy descriptions

##### Greek: `frontend/src/locales/el/export.js`
Added all corresponding Greek translations

## Data Flow

### Export Flow
1. User selects semester from dropdown (populated from `/sessions/semesters`)
2. Clicks "Export Session" button
3. Backend queries all related data for that semester:
   - Courses (filtered by `semester` field)
   - Enrollments (for those courses)
   - Students (enrolled in those courses)
   - Grades, Attendance, Performance (for those enrollments)
   - Highlights (for those students in that semester)
4. Data serialized to JSON with metadata
5. Browser downloads `session_export_<semester>_<timestamp>.json`

### Import Flow
1. User selects JSON file (from previous export)
2. Chooses merge strategy (update vs skip existing)
3. Clicks "Import Session" button
4. Backend parses JSON and validates structure
5. Imports data in dependency order:
   - Courses first (dependencies for other records)
   - Students second (referenced by enrollments)
   - Then: Enrollments → Grades → Attendance → Performance → Highlights
6. For each record:
   - Check if exists (by course_code or student_id)
   - If exists and strategy=skip: skip
   - If exists and strategy=update: update fields
   - If not exists: create new record
7. Returns summary with counts for each data type
8. UI displays toast with totals

## Key Features

### 1. Comprehensive Data Package
- Single JSON file contains ALL data for a semester
- Maintains referential integrity (uses course_code/student_id refs)
- Includes metadata for tracking (exported_at, exported_by, version)

### 2. Intelligent Merge Logic
- **Update Mode**: Merges with existing data (updates duplicates, adds new)
- **Skip Mode**: Only adds new data (leaves existing untouched)
- Handles conflicts gracefully (reports errors without failing entire import)

### 3. User-Friendly UI
- Clear visual distinction between export and import
- Color-coded panels (blue for export, green for import)
- Loading states and progress indicators
- Detailed feedback (toast notifications with counts)
- File validation (JSON only for imports)
- Accessible (ARIA labels, proper form structure)

### 4. Error Resilience
- Individual record failures don't abort entire import
- Error summary lists specific problems
- Database transaction ensures atomicity (commit only if no critical errors)

## Use Cases

### 1. Data Migration Between Systems
- Export session from development PC
- Import to production server
- All data transferred in one operation

### 2. Semester Backup
- Export entire semester at end of term
- Archive JSON file for records
- Can restore specific semester later

### 3. Data Sharing
- Teacher exports session for review
- Share with coordinator/admin
- They import to their system for analysis

### 4. Multi-PC Workflow
- User A fills data on laptop
- Exports session
- User B imports to desktop
- Continues work with merged data

## Technical Details

### Export Serialization
```python
{
  "metadata": {
    "semester": "2024-2025 Fall",
    "exported_at": "2025-01-19T10:30:00",
    "exported_by": "admin@example.com",
    "version": "1.0",
    "counts": {...}
  },
  "courses": [...],
  "students": [...],
  "enrollments": [...],
  "grades": [...],
  "attendance": [...],
  "daily_performance": [...],
  "highlights": [...]
}
```

### Import Logic Pseudocode
```python
for course in import_data["courses"]:
    existing = db.query(Course).filter_by(course_code=course["course_code"]).first()
    if existing:
        if merge_strategy == "skip":
            results["skipped"] += 1
        else:  # update
            update_fields(existing, course)
            results["updated"] += 1
    else:
        create_new(course)
        results["created"] += 1
```

### Database Relationships Preserved
- Enrollments reference `student_id_ref` and `course_code_ref` (not internal IDs)
- Import resolves references to actual database IDs dynamically
- Soft-deleted records excluded from export (`deleted_at IS NULL`)

## Testing Recommendations

1. **Export Test**:
   - Create semester with sample data (courses, students, grades)
   - Export session
   - Verify JSON structure and completeness

2. **Import Test (Update Mode)**:
   - Modify some records in database
   - Import session export
   - Verify existing records updated, new ones created

3. **Import Test (Skip Mode)**:
   - Import same session twice with "skip" strategy
   - Verify no duplicates created, existing records unchanged

4. **Error Handling**:
   - Import malformed JSON → Should show clear error
   - Import session with missing student → Should skip enrollment, log error
   - Import empty semester → Should show "no data" message

5. **UI/UX Test**:
   - Test with no semesters (should show "no semesters found")
   - Test file upload validation (non-JSON files rejected)
   - Test loading states (buttons disabled during operations)
   - Test toast notifications (success/error messages)

## Future Enhancements (Not Implemented)

1. **Partial Session Export**: Select specific data types to export
2. **Date Range Filter**: Export specific time period within semester
3. **Conflict Resolution UI**: Show conflicts and let user choose resolution
4. **Preview Before Import**: Show what will be imported before committing
5. **Batch Import**: Upload multiple session files at once
6. **Export History**: Track all exports with download links
7. **Scheduled Exports**: Automatic backups on schedule
8. **Import Rollback**: Undo last import operation

## File Changes Summary

**Created**:
- `backend/routers/routers_sessions.py` (688 lines)

**Modified**:
- `backend/main.py` (added router registration)
- `frontend/src/api/api.js` (added sessionAPI)
- `frontend/src/components/tools/ExportCenter.tsx` (added SessionExportImport component)
- `frontend/src/locales/en/export.js` (added 29 translation keys)
- `frontend/src/locales/el/export.js` (added 29 translation keys)

**Total**: 1 new file, 5 modified files

## Documentation Updates Needed

- Update `docs/user/QUICK_START_GUIDE.md` with session export/import instructions
- Add screenshot of new UI to docs
- Update API documentation with new endpoints
- Update user manual with data migration workflow

## Deployment Notes

- No database migration required (uses existing tables)
- No environment variables needed
- Backend router auto-registers on startup
- Frontend: Rebuild required to include new UI
- Compatible with both Docker and native deployment modes
