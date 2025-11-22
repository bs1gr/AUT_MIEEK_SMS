# Session Export/Import Quick Start Guide

## What is Session Export/Import?

The Session Export/Import feature allows you to:
- **Export** all data for a specific semester (courses, students, grades, attendance, etc.) into a single JSON file
- **Import** that data into another system or restore it later, with intelligent merging

This is perfect for:
- Transferring data between computers
- Creating semester backups
- Sharing data with colleagues
- Migrating between development and production

## How to Use

### Exporting a Session

1. Navigate to **Operations** → **Export Center**
2. Find the **Session Export/Import** section (at the top of the bulk exports)
3. In the left panel (**Export Complete Session**):
   - Select the semester you want to export from the dropdown
   - Click **Export Session**
4. Your browser will download a JSON file named like: `session_export_2024-2025_Fall_20250119_103000.json`
5. Save this file somewhere safe (e.g., USB drive, cloud storage, backup folder)

**What's included in the export:**
- All courses for that semester
- All students enrolled in those courses
- Course enrollments
- All grades for those students in those courses
- All attendance records
- Daily performance records
- Student highlights for that semester

### Importing a Session

1. Navigate to **Operations** → **Export Center**
2. Find the **Session Export/Import** section
3. In the right panel (**Import Session**):
   - Click **Choose file** and select your session JSON file
   - Choose a **Merge Strategy**:
     - **Update Existing** (recommended): Updates existing records and creates new ones
     - **Skip Existing**: Only creates new records, doesn't modify existing data
   - Click **Import Session**
4. Wait for the import to complete (may take a few seconds for large sessions)
5. Check the success message for a summary:
   - Created: X records
   - Updated: Y records
   - Errors: Z (if any)

### Merge Strategies Explained

#### Update Existing (Default)
- **When to use**: You want to merge data from another PC or update outdated records
- **What it does**:
  - If a student/course already exists (same student_id or course_code), it updates their information
  - If they don't exist, it creates a new record
- **Example**: You filled grades on your laptop, then import to your desktop → grades get updated

#### Skip Existing
- **When to use**: You only want to add NEW students/courses without touching existing data
- **What it does**:
  - If a student/course already exists, it skips them (leaves unchanged)
  - Only creates records that don't exist yet
- **Example**: Importing a template with pre-configured courses, but you already have some → only new courses added

## Common Scenarios

### Scenario 1: Working on Multiple Computers

**Problem**: You add data on your laptop, but need it on your desktop too.

**Solution**:
1. On laptop: Export the session you've been working on
2. Transfer the JSON file (USB, email, cloud)
3. On desktop: Import the session with "Update Existing" mode
4. Result: Desktop now has all your laptop's data

### Scenario 2: End-of-Semester Backup

**Problem**: You want to archive all data for Fall 2024 semester.

**Solution**:
1. Export "Fall 2024" session
2. Save the JSON file to your backup folder (e.g., `Backups/Fall_2024_Final.json`)
3. If you ever need to restore: Import that file with "Update Existing"

### Scenario 3: Sharing with Colleagues

**Problem**: Your colleague needs all student data for a specific semester to review.

**Solution**:
1. Export the session
2. Send them the JSON file
3. They import it into their system
4. They can now view/edit the data (import merges with their existing data)

### Scenario 4: Setting Up New System

**Problem**: You installed SMS on a new PC and want to transfer everything.

**Solution**:
1. On old PC: Export each semester you want to transfer
2. On new PC: Install SMS, then import each session file
3. Use "Update Existing" mode (since the new DB is empty, everything will be "created")

## Tips & Best Practices

### ✅ Do's
- **Export regularly**: Create backups before making big changes
- **Name your files**: Rename exports to something meaningful (e.g., `Fall2024_FinalGrades.json`)
- **Test imports**: On important data, try importing to a test system first
- **Check the summary**: Always review the Created/Updated/Errors counts after import
- **Use Update mode**: Unless you specifically need to preserve existing data unchanged

### ❌ Don'ts
- **Don't edit JSON manually**: The file format is complex; use the UI to make changes instead
- **Don't import untrusted files**: Only import files you exported yourself or from trusted sources
- **Don't mix semesters**: Each export is for ONE semester; don't combine multiple semesters manually
- **Don't panic on errors**: A few errors (e.g., "student already exists") are normal and safe

## Troubleshooting

### Problem: "No semesters found in the system"
- **Cause**: You haven't created any courses with a semester field set
- **Fix**: Create courses and assign them a semester (e.g., "2024-2025 Fall")

### Problem: "Failed to load semesters"
- **Cause**: Backend server is not running or unreachable
- **Fix**: Check that the application is running, refresh the page

### Problem: Import says "X errors"
- **Cause**: Some records couldn't be imported (e.g., missing required fields)
- **Fix**: Check the error details in the backend logs (`backend/logs/app.log`)
- **Note**: Other records still imported successfully

### Problem: Duplicate students after import
- **Cause**: Student IDs don't match between systems (e.g., `S001` vs `s001`)
- **Fix**: Standardize student IDs before exporting, or manually merge duplicates

### Problem: Import taking too long
- **Cause**: Large session with thousands of records
- **Fix**: Be patient; imports can take 30-60 seconds for 1000+ students
- **Note**: Don't refresh the page during import

## Technical Details (Advanced Users)

### File Format
- **Type**: JSON (plain text, UTF-8 encoded)
- **Size**: Varies (typically 100KB - 5MB depending on data volume)
- **Structure**:
  ```json
  {
    "metadata": { ... },
    "courses": [ ... ],
    "students": [ ... ],
    "enrollments": [ ... ],
    "grades": [ ... ],
    "attendance": [ ... ],
    "daily_performance": [ ... ],
    "highlights": [ ... ]
  }
  ```

### What Doesn't Get Exported
- User accounts (admin/teacher logins)
- System settings
- Database configuration
- Deleted records (soft-deleted items excluded)
- Other semesters' data

### Import Order
Data is imported in this order to maintain referential integrity:
1. Courses (must exist before enrollments)
2. Students (must exist before enrollments)
3. Enrollments (links students to courses)
4. Grades, Attendance, Performance (reference enrollments)
5. Highlights (reference students)

### Matching Logic
- **Courses**: Matched by `course_code` (e.g., "CS101")
- **Students**: Matched by `student_id` (e.g., "202401001")
- **Enrollments**: Matched by student_id + course_code combination
- **Grades**: Matched by student_id + course_code + assignment_name

## Support

If you encounter issues not covered here:
1. Check `backend/logs/app.log` for detailed error messages
2. Review the import summary for specific failures
3. Consult the full documentation: `SESSION_EXPORT_IMPORT_FEATURE.md`
4. Contact your system administrator

---

**Pro Tip**: Export your sessions regularly (weekly or after major changes) to create automatic backups. It only takes 10 seconds and can save hours if something goes wrong!
