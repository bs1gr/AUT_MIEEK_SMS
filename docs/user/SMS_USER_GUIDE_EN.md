# Student Management System - User Guide (English)

**Version:** 1.9.7
**Date:** December 4, 2025
**Developed by:** Vasileios Samaras

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Student Management](#student-management)
4. [Course Management](#course-management)
5. [Attendance Tracking](#attendance-tracking)
6. [Grade Management](#grade-management)
7. [Daily Performance](#daily-performance)
8. [Autosave Features](#autosave-features)
9. [Session Export/Import](#session-exportimport)
10. [Reports & Analytics](#reports--analytics)
11. [System Administration](#system-administration)
12. [Troubleshooting](#troubleshooting)
13. [RBAC & Permissions](#rbac--permissions)
14. [API Explorer](#api-explorer)

---

## Introduction

The Student Management System (SMS) is a comprehensive bilingual (English/Greek) web application designed for educational institutions to manage students, courses, attendance, grades, and performance metrics efficiently.

### Key Features

- **Universal Autosave** - Changes save automatically without clicking save buttons
- **Session Export/Import** - Transfer entire semesters between systems
- **Bilingual Interface** - Full support for English and Greek languages
- **Real-time Analytics** - Grade breakdowns, GPA calculations, attendance reports
- **Persistent Authentication** - Stay logged in across sessions
- **Rate-Limited API** - 200 writes/min, 300 reads/min for smooth operation

### System Requirements

- **Browser:** Modern web browser (Chrome, Firefox, Edge, Safari)
- **Screen Resolution:** 1280x720 minimum (1920x1080 recommended)
- **Internet Connection:** Required for database operations
- **JavaScript:** Must be enabled

---

## Getting Started

### First Login

1. Navigate to the application URL (default: `http://localhost:8080`)
2. Click **Login** button in the top-right corner
3. Enter default credentials:
   - **Email:** `admin@example.com`
   - **Password:** `YourSecurePassword123!`
4. Click **Sign In**

**Security Note:** Change the default password immediately after first login.

### Changing Language

Click the language toggle button (EN/EL) in the top-right corner of the navigation bar. Your preference is saved automatically.

### Navigation Overview

- **Dashboard** - Overview of students, courses, and recent activity
- **Students** - Manage student profiles and enrollments
- **Courses** - Create and configure courses with evaluation rules
- **Attendance** - Record and manage student attendance
- **Grades** - Enter and view grades with breakdown analysis
- **Performance** - View student performance analytics
- **Utils** - Export data, manage backups, system tools
- **Operations** - Control panel with advanced features (admin only)

---

## Student Management

### Adding a New Student

1. Navigate to **Students** section
2. Click **Add Student** button (top-right)
3. Fill in required fields:
   - **Full Name** (required)
   - **Student ID** (unique identifier)
   - **Email** (optional)
   - **Date of Birth** (optional)
   - **Phone** (optional)
4. Click **Save**

**Autosave Note:** Student notes save automatically after 2 seconds of inactivity.

### Editing Student Information

1. Go to **Students** section
2. Find the student using search or scrolling
3. Click the **Edit** button (pencil icon)
4. Modify information as needed
5. Click **Save**

### Deleting a Student

1. Go to **Students** section
2. Find the student
3. Click the **Delete** button (trash icon)
4. Confirm deletion in the popup

**Warning:** Deleting a student removes all associated grades, attendance records, and enrollments. This action cannot be undone.

### Student Notes

Each student card has a notes section for personal observations:

- Notes save automatically to your browser (localStorage)
- Notes persist across sessions
- Look for the cloud upload icon to see save status
- No backend storage - notes are private to your browser

---

## Course Management

### Creating a New Course

1. Navigate to **Courses** section
2. Click **Add Course** button
3. Fill in course details:
   - **Course Name** (required)
   - **Course Code** (unique identifier)
   - **Semester** (e.g., "Fall 2025")
   - **Credits** (numeric value)
   - **Description** (optional)
4. Click **Save**

### Configuring Evaluation Rules

Evaluation rules define how grades are calculated for the final grade.

1. Open the course details
2. Go to the **Evaluation Rules** tab
3. Add categories with weights:
   - **Category Name** (e.g., "Midterm Exam", "Homework", "Final Exam")
   - **Weight (%)** - Must total 100%
   - **Daily Performance Multiplier** (optional, default: 1.0)

**Example:**

- Homework: 30%
- Midterm: 30%
- Final Exam: 40%

**Autosave:** Rules save automatically when they total 100% (no save button needed).

### Setting Absence Penalty

Configure point deduction for unexcused absences:

1. In the course evaluation rules section
2. Set **Absence Penalty** (e.g., -2 points per absence)
3. Changes save automatically

---

## Attendance Tracking

### Recording Attendance

1. Navigate to **Attendance** section
2. Select **Course** and **Date**
3. Mark each student's status:
   - **Present** - Student attended (green checkmark)
   - **Absent** - Student did not attend (red X)
   - **Late** - Student arrived late (orange clock)
   - **Excused** - Valid reason for absence (blue shield)
4. Changes save automatically after 2 seconds

**Autosave Status:** Look for the cloud upload icon in the header - it pulses when saving.

### Using the Attendance Calendar

Quick overview of attendance across dates:

1. Go to **Attendance** → **Calendar** tab
2. Click any date to view/edit attendance for that day
3. Use quick-change dropdown to update status
4. Changes save instantly

-**Color Coding:**

- Green dot: All present
- Red dot: Has absences
- Gray: No attendance recorded

---

## Grade Management

### Adding Grades

1. Navigate to **Grades** section
2. Select **Student** and **Course**
3. Fill in grade details:
   - **Assignment Name** (e.g., "Quiz 1")
   - **Category** (must match evaluation rule category)
   - **Grade** (numeric score)
   - **Max Grade** (total possible points)
   - **Weight** (default: 1.0, use 2.0 for double-weighted assignments)
   - **Date Assigned** (optional)
   - **Date Submitted** (optional)
4. Click **Save Grade**

### Grade Validation

The system enforces these rules:

- Grade cannot exceed Max Grade
- Weight must be positive
- Category must match a defined evaluation rule
- Dates must be logical (assigned ≤ submitted)

### Viewing Grade Breakdown

1. Go to **Performance** or **Dashboard**
2. Find the student's course
3. Click **View Breakdown**

-**Breakdown Shows:**

- Category averages with weights
- Daily performance impact
- Attendance percentage (if configured)
- Absence penalty deductions
- Final grade in multiple scales:
  - Percentage (0-100%)
  - Greek scale (0-20)
  - GPA (0.0-4.0)
  - Letter grade (A-F)

---

## Daily Performance

### Rating Daily Performance

Daily performance lets you rate student participation for each class session.

1. In the **Attendance** section, after marking attendance
2. For each **Present** student, rate performance (1-5 scale):
   - **1** - Poor participation
   - **2** - Below average
   - **3** - Satisfactory
   - **4** - Good participation
   - **5** - Excellent participation
3. Absent students cannot be rated
4. Ratings save automatically with attendance

### How Daily Performance Affects Grades

Daily performance scores are:

1. Converted to percentages (1=20%, 2=40%, 3=60%, 4=80%, 5=100%)
2. Multiplied by the category's **Daily Performance Multiplier**
3. Averaged with regular grades in that category

**Example:**

- Category: "Homework" with 30% weight and 1.5 multiplier
- Regular grades: 85%, 90%
- Daily performance average: 80% × 1.5 = 120% (capped at 100%)
- Category average: (85 + 90 + 100) / 3 = 91.67%
- Final contribution: 91.67% × 30% = 27.5%

---

## Autosave Features

### What is Autosave?

Autosave automatically saves your changes without requiring you to click "Save" buttons. After you stop typing for 2 seconds, the system saves your changes.

### Where Autosave Works

1. **Attendance View** - Attendance records and daily performance ratings
2. **Attendance Calendar** - Quick status changes
3. **Student Notes** - Notes save to browser localStorage
4. **Course Evaluation Rules** - Grading rules (when valid: totaling 100%)

### Visual Indicators

Look for the **cloud upload icon** with a pulsing animation:

- **Pulsing** - Changes are being saved
- **Disappeared** - Save complete

### What If Autosave Fails?

If autosave fails (network issues, validation errors):

- You'll see a clear error notification
- Your changes are NOT discarded
- Fix any issues and the system will retry
- For critical data, always verify changes appear in the system

### Autosave Security

- Uses the same authentication as manual saves
- Teachers can only edit courses/attendance assigned to them
- Rate limiting: environment-configurable via backend RATE_LIMIT_* settings (client uses 2-second debounce and chunked writes to avoid bursts)

---

## Session Export/Import

### Overview

Session export/import lets you package entire semesters into JSON files and transfer them between systems.

**What's Included:**

- Courses
- Students
- Course enrollments
- Grades (all categories)
- Attendance records
- Daily performance ratings
- Highlights

### Exporting a Semester

1. Navigate to **Utils** → **Export Center**
2. Go to **Session Export/Import** tab
3. Select semester from dropdown
4. (Optional) Click **Preview Contents** to review data
5. Click **Export Session**
6. JSON file downloads automatically

**Filename Format:** `session_export_Fall_2025_20251125_143022.json`

### Importing a Semester

1. Navigate to **Utils** → **Export Center** → **Session Export/Import**
2. Go to **Import** tab
3. Click **Choose File** and select JSON file
4. Choose merge strategy:
   - **Update** - Create new records and update existing ones
   - **Skip** - Create new records only, skip duplicates
5. (Optional) Enable **Dry Run** to validate without importing
6. Click **Import Session**

-**Safety Features:**

- Automatic backup created before import
- Rollback available if needed
- Dry-run validation shows what will happen
- Detailed progress and error reports

### Merge Strategies

-**Update (Recommended):**

- Creates new students/courses/grades
- Updates existing records with new data
- Best for synchronizing data between systems

-**Skip:**

- Creates only new records
- Skips existing records entirely
- Best for merging non-overlapping data

### Rollback

If import causes issues:

1. Go to **Utils** → **Export Center** → **Session Export/Import**
2. View **Available Backups** list
3. Click **Rollback** on the pre-import backup
4. Confirm rollback

**Note:** System creates a backup before rollback too (safety net).

---

## Reports & Analytics

### Student Reports

**Individual Performance:**

1. Go to **Performance** section
2. Select student
3. View:
   - Overall GPA
   - Course-by-course breakdown
   - Attendance summary
   - Grade trends

-**Grade Breakdown:**

- Click **View Breakdown** on any course
- See weighted category scores
- View daily performance impact
- Check absence penalties
- Multiple grade scales displayed

### Course Reports

**Course Performance:**

1. Go to **Courses** section
2. Open course details
3. View **Statistics** tab:
   - Enrolled students count
   - Average grade
   - Attendance rate
   - Grade distribution

### Exporting Data

Export data in multiple formats:

1. Navigate to **Utils** → **Export Center**
2. Choose export type:
   - **Students** - Excel/PDF
   - **Courses** - Excel/PDF
   - **Grades** - Excel/PDF
   - **Attendance** - Excel/PDF
   - **Session** - JSON (full semester)
3. Select format
4. Click **Export**

**Excel Features:**

- Sortable columns
- Filterable data
- Formulas preserved
- Formatted cells

**PDF Features:**

- Print-ready layout
- Professional formatting
- Page numbers
- Headers/footers

---

## System Administration

### User Management (Admin Only)

1. Navigate to **Operations** → **Maintenance** tab
2. View **Admin Users Panel**
3. Manage users:
   - Create new users
   - Assign roles (admin/teacher)
   - Reset passwords
   - Activate/deactivate accounts

### Backup Management

**Creating Backups:**

1. Go to **Utils** → **Developer Tools**
2. Click **Backup Database**
3. SQLite database file downloads

**Restoring Backups:**

1. Go to **Utils** → **Developer Tools**
2. Click **Restore DB**
3. Upload backup `.db` file
4. Confirm restoration
5. Refresh page to reload data

**Backup Operations Panel (Operations):**

1. Go to **Operations** → **Manage Backups**
2. View all backups with sizes and timestamps
3. Actions:
   - Download individual backups
   - Save backup to custom path
   - Create ZIP of all backups
   - Delete selected backups

### System Health

Check system status:

1. Go to **Utils** → **Developer Tools**
2. View **System Health** indicators:
   - Backend status (green = healthy)
   - Frontend status
   - Database connection
   - API response times
3. Click **Check System Health** to refresh

### Database Management

**Clear All Data:**

1. Go to **Utils** → **Developer Tools**
2. Click **Clear All Data**
3. Confirm action (irreversible)

**Load Sample Data:**

1. Go to **Utils** → **Developer Tools**
2. Click **Load Sample Data**
3. System populates with test data

---

## Troubleshooting

### Common Issues

#### Issue: Can't log in

##### Solution

- Verify credentials (check caps lock)
- Ensure backend is running
- Clear browser cache and cookies
- Check browser console for errors

---

#### Issue: Changes not saving

##### Solution

- Check internet connection
- Look for error notifications
- Verify authentication token is valid
- Check rate limits (200 writes/min)
- Refresh page and try again

---

#### Issue: Autosave not working

##### Solution

- Wait 2 seconds after last change
- Check for pulsing cloud icon
- Verify network connectivity
- Check browser console for errors
- Student notes use localStorage (works offline)

---

#### Issue: Grade breakdown shows unexpected values

##### Solution

- Verify evaluation rules total 100%
- Check absence penalty setting
- Confirm daily performance multipliers
- Review all grades in category
- Check if attendance is an evaluation category

---

#### Issue: Session import fails

##### Solution

- Enable dry-run first to see errors
- Check JSON file is valid export
- Verify merge strategy is appropriate
- Review validation errors in import modal
- Try importing smaller batches

---

#### Issue: PDF exports are blank

##### Solution

- Ensure data exists for selected filters
- Try Excel export instead
- Check browser PDF viewer settings
- Update browser to latest version

---

### Getting More Help

**GitHub Issues:**
Report bugs or request features at: [AUT_MIEEK_SMS issues](https://github.com/bs1gr/AUT_MIEEK_SMS/issues)

**Discussion Forum:**
Ask questions and share experiences: [Discussions](https://github.com/bs1gr/AUT_MIEEK_SMS/discussions)

**Documentation:**
Additional guides in the `docs/` directory:

- `QUICK_START_GUIDE.md`
- `SESSION_EXPORT_IMPORT_GUIDE.md`
- `LOCALIZATION.md`
- `ARCHITECTURE.md`
- `RBAC_GUIDE.md` (roles & permissions)

---

## Appendix A: Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Focus search box |
| `Ctrl/Cmd + S` | Save form (if applicable) |
| `Esc` | Close modal/dialog |
| `Tab` | Navigate between fields |
| `Enter` | Submit form |

---

## Appendix B: Grade Scale Conversions

| Percentage | Greek (0-20) | GPA (4.0) | Letter |
|------------|--------------|-----------|--------|
| 95-100% | 19-20 | 4.0 | A+ |
| 90-94% | 18-18.8 | 3.7-3.9 | A |
| 85-89% | 17-17.8 | 3.3-3.6 | B+ |
| 80-84% | 16-16.8 | 3.0-3.2 | B |
| 75-79% | 15-15.8 | 2.7-2.9 | C+ |
| 70-74% | 14-14.8 | 2.3-2.6 | C |
| 65-69% | 13-13.8 | 2.0-2.2 | D+ |
| 60-64% | 12-12.8 | 1.7-1.9 | D |
| 50-59% | 10-11.8 | 1.0-1.6 | F |
| 0-49% | 0-9.8 | 0.0 | F |

---

## Appendix C: API Rate Limits

| Operation Type | Limit | Notes |
|----------------|-------|-------|
| Read (GET) | 300 per minute | Normal browsing/viewing |
| Write (POST/PUT/DELETE) | 200 per minute | Data entry/modifications |
| Heavy (Import/Export) | 30 per minute | Bulk operations |
| Autosave (with debounce) | ~30 per minute | 2-second delay |

---

## RBAC & Permissions

The Student Management System supports fine-grained Role-Based Access Control (RBAC).

- **Roles**: Groups of permissions (e.g., admin, teacher)
- **Permissions**: Specific actions (e.g., create student, export data)

### Managing Roles & Permissions
- Admins can manage roles and permissions via the Admin → RBAC section or API endpoints.
- Assign roles to users and grant/revoke permissions to roles using the RBAC management UI or API.
- See the [RBAC Permission Matrix](../api/RBAC_API_MATRIX.md) for a full list of actions and required permissions.

### Who Can Manage RBAC?
- Only users with the `*` (wildcard) permission (typically admins) can assign/revoke roles and permissions.
- All RBAC changes are logged and rate-limited for security.

### API Reference
- See the API documentation for endpoint details: [API Contract](../api/API_CONTRACT.md)

---

## RBAC in the User Interface

- The Admin → RBAC section lets you manage roles, permissions, and assignments visually.
- If you lack permission for an action, the UI will display a clear error message (e.g., "You do not have permission to perform this action").
- Only users with the appropriate permissions will see RBAC management options.
- All changes are reflected in real time and are subject to audit logging and rate limiting.

---

## API Explorer

All API endpoints, including RBAC, are documented and testable via the built-in OpenAPI/Swagger UI:
- [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI)
- [http://localhost:8000/redoc](http://localhost:8000/redoc) (ReDoc)

---

### End of User Guide

For the latest updates, visit: [AUT_MIEEK_SMS on GitHub](https://github.com/bs1gr/AUT_MIEEK_SMS)

© 2025 Vasileios Samaras. All rights reserved.
