# Complete User Guide - Student Management System

**Version:** 1.17.9
**Last Updated:** February 13, 2026
**Status:** ✅ Active

---

## 📋 Table of Contents

1. [Introduction](#introduction)

2. [Getting Started](#getting-started)

3. [Installation & Access](#installation--access)

4. [User Interface Overview](#user-interface-overview)

5. [Student Management](#student-management)

6. [Course Management](#course-management)

7. [Grade Management](#grade-management)

8. [Attendance Tracking](#attendance-tracking)

9. [Reports & Analytics](#reports--analytics)

10. [Import/Export Data](#importexport-data)

11. [System Settings](#system-settings)

12. [Troubleshooting](#troubleshooting)

13. [Frequently Asked Questions](#frequently-asked-questions)

14. [RBAC & Permissions](#rbac--permissions)

15. [API Explorer](#api-explorer)

---

## Introduction

### What is the Student Management System?

The Student Management System (SMS) is a comprehensive web-based application designed to help educational institutions manage:

- Student records and enrollment
- Course information and scheduling
- Grade tracking and calculations
- Attendance monitoring
- Performance analytics and reporting

### Key Features

- ✅ **Bilingual Interface**: Full support for English and Greek
- ✅ **Modern UI**: Clean, responsive design with dark/light themes
- ✅ **Comprehensive**: Complete student lifecycle management
- ✅ **Automated Grading**: Weighted component calculations with absence penalties
- ✅ **Data Import/Export**: Excel and JSON support
- ✅ **Real-time Analytics**: Dashboard with charts and statistics
- ✅ **Backup & Restore**: Built-in data protection

### System Requirements

**To Use the Application:**

- Modern web browser (Chrome, Firefox, Edge, Safari)
- Internet connection (for initial setup)
- Screen resolution: 1280x720 or higher recommended

**To Install/Host:**

- See [Installation & Access](#installation--access) section

---

## Getting Started

### First-Time Access

1. **Open your web browser**

2. **Navigate to:** `http://localhost:8080` (Docker mode) or `http://localhost:5173` (Native mode)

3. **Default Admin Credentials:**

- **Email:** `admin@example.com`
- **Password:** `YourSecurePassword123!`

⚠️ **Important:** Change the default admin password immediately after first login!

### Changing Your Password

1. Click **Control Panel** in the navigation menu

2. Select **Maintenance** tab

3. Click **Change Password**

4. Enter current password and new password

5. Click **Update Password**

### Language Selection

The system automatically detects your browser language (English or Greek). To change:

1. Look for the language selector (🇬🇧/🇬🇷) in the top-right corner

2. Click to toggle between English and Greek

3. The interface updates immediately

---

## Installation & Access

### Option 1: Quick Start (Windows)

**Automated Installation:**

```powershell
## Download from GitHub Releases

## Extract SMS_Distribution_1.8.6.3.zip
## Run as Administrator:

.\SMS_Installer_1.8.6.3.exe

```text
**GUI Installer Features:**

- ✅ Visual step-by-step wizard
- ✅ Automatic Docker Desktop installation
- ✅ System requirements validation
- ✅ Real-time installation logs
- ✅ No PowerShell knowledge required

See: [Installer Documentation](../../installer/README.md)

### Option 2: Docker Deployment (All Platforms)

**Prerequisites:**

- Docker Desktop installed and running
- PowerShell 5.1+ (Windows) or bash (Linux/Mac)

**Installation:**

```powershell
## Windows

.\DOCKER.ps1 -Install

## Linux/Mac

docker-compose up -d

```text
**Access:** <http://localhost:8080>

### Option 3: Native Development Mode

**Prerequisites:**

- Python 3.11+
- Node.js 18+
- npm or yarn

**Installation:**

```powershell
## Windows

.\NATIVE.ps1 -Setup
.\NATIVE.ps1 -Start

## Linux/Mac

cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cd ../frontend && npm install
npm run dev

```text
**Access:**

- Frontend: <http://localhost:5173>
- Backend API: <http://localhost:8000>

### Daily Operations

**Start Application:**

```powershell
.\DOCKER.ps1 -Start    # Docker mode
.\NATIVE.ps1 -Start    # Native mode

```text
**Stop Application:**

```powershell
.\DOCKER.ps1 -Stop     # Docker mode
.\NATIVE.ps1 -Stop     # Native mode

```text
**Check Status:**

```powershell
.\DOCKER.ps1 -Status   # Docker mode
.\NATIVE.ps1 -Status   # Native mode

```text
---

## User Interface Overview

### Navigation Menu

The main navigation bar provides access to all major features:

| Menu Item | Description |
|-----------|-------------|
| **Dashboard** | Overview statistics and quick links |
| **Students** | Student management and profiles |
| **Courses** | Course information and enrollment |
| **Grades** | Grade entry and calculations |
| **Attendance** | Attendance tracking and reports |
| **Reports** | Analytics and data exports |
| **Control Panel** | System settings and maintenance |

### Dashboard Overview

The dashboard displays:

- **Total Statistics**: Student count, course count, average grades
- **Recent Activity**: Latest grade entries, attendance records
- **Quick Actions**: Shortcut buttons for common tasks
- **Alerts**: Important notifications (low attendance, missing grades)

### Theme Customization

**Available Themes:**

- **Light Mode**: Default bright theme
- **Dark Mode**: Easy on the eyes
- **High Contrast**: Accessibility mode
- **Custom**: Create your own

**To Switch Themes:**

1. Click the theme icon (🎨) in the top-right corner

2. Select from available themes

3. Changes apply immediately

4. Preference saved in browser

See: [Theme Guide](THEME_GUIDE.md) for custom theme creation

---

## Student Management

### Viewing Students

1. Click **Students** in navigation menu

2. Student list displays with:

- Student ID
- Full Name
- Email
- Enrollment Status
- Quick Actions (Edit/Delete)

### Adding a Student

1. Click **Students** → **Add Student** button

2. Fill in required fields:

- **First Name** (required)
- **Last Name** (required)
- **Email** (required, must be unique)
- **Student ID** (optional, auto-generated if empty)
- **Date of Birth** (optional)
- **Phone** (optional)
- **Address** (optional)

3. Click **Save Student**

**Validation Rules:**

- Email must be valid format (name\@domain.com)
- Student ID must be unique if provided
- All fields are sanitized for security

### Editing a Student

1. Click **Students** in navigation

2. Find the student (use search if needed)

3. Click **Edit** button (✏️) next to student name

4. Modify fields as needed

5. Click **Update Student**

### Deleting a Student

⚠️ **Warning:** Deleting a student removes all associated data (grades, attendance, enrollments)!

1. Click **Students** in navigation

2. Find the student

3. Click **Delete** button (🗑️)

4. Confirm deletion in popup dialog

5. Student and all related data are removed

**Best Practice:** Consider marking students as "inactive" instead of deleting for data retention.

### Searching and Filtering

**Search Bar:**

- Type any part of: name, email, or student ID
- Results filter in real-time

**Filter Options:**

- **Status**: Active, Inactive, Graduated
- **Enrollment Date**: Date range picker
- **Course**: Filter by enrolled course

### Bulk Operations

**Import Students:**

1. Click **Students** → **Import** button

2. Download Excel template

3. Fill in student data

4. Upload completed template

5. Review import preview

6. Confirm import

**Export Students:**

1. Click **Students** → **Export** button

2. Choose format: Excel (.xlsx) or JSON

3. Select fields to include

4. Click **Download**

---

## Course Management

### Viewing Courses

1. Click **Courses** in navigation menu

2. Course list displays with:

- Course Code
- Course Name
- Instructor
- Enrolled Students
- Quick Actions

### Creating a Course

1. Click **Courses** → **Add Course** button

2. Fill in course details:

- **Course Code** (required, unique)
- **Course Name** (required)
- **Description** (optional)
- **Credits** (optional)
- **Instructor** (optional)
- **Semester** (optional)
- **Year** (optional)

3. Click **Save Course**

### Grading Configuration

Each course can have custom grading rules:

**Component-Based Grading:**

1. Edit course → **Grading Rules** section

2. Add grade components:

- **Midterm Exam**: 30% weight
- **Final Exam**: 40% weight
- **Assignments**: 20% weight
- **Participation**: 10% weight

3. Total weights must equal 100%

**Absence Penalty:**

- Set penalty points deducted from final grade
- Example: `-0.5` points per absence
- Applied automatically during grade calculation

**Grade Scale:**

- Default: 0-20 (Greek system)
- Configurable: Can set to 0-100 (percentage)
- Pass threshold: Default 10/20 (50%)

### Enrolling Students

**Manual Enrollment:**

1. Click **Courses** → Select course

2. Click **Enroll Students** button

3. Search and select students

4. Click **Enroll Selected**

**Bulk Enrollment:**

1. Click **Courses** → Select course

2. Click **Import Enrollments**

3. Upload Excel file with student IDs

4. Review and confirm

### Course Schedule

1. Edit course → **Schedule** section

2. Add time slots:

- Day of week
- Start time
- End time
- Room/Location

3. Save schedule

---

## Grade Management

### Recording Grades

**Individual Grade Entry:**

1. Click **Grades** in navigation

2. Select **Course** and **Component Type** (Midterm, Final, etc.)

3. Student list appears with grade input fields

4. Enter grade for each student

5. Click **Save Grades**

**Quick Entry Mode:**

1. Use Tab key to move between fields

2. Press Enter to save and move to next student

3. Validation happens in real-time

**Bulk Grade Import:**

1. Click **Grades** → **Import Grades**

2. Download Excel template

3. Fill in: Student ID, Course Code, Component, Grade, Max Grade

4. Upload completed file

5. Review import preview

6. Confirm import

### Grade Components

Each course can have multiple grade components:

| Component Type | Typical Weight | Notes |
|---------------|---------------|-------|
| **Assignments** | 10-30% | Homework, projects |
| **Quizzes** | 10-20% | Short assessments |
| **Midterm** | 20-35% | Mid-semester exam |
| **Final** | 30-50% | Final examination |
| **Participation** | 5-15% | Class engagement |
| **Lab Work** | 10-25% | Practical exercises |

### Automatic Grade Calculation

The system calculates final grades automatically:

**Formula:**

```text
Final Grade = Σ(Component Grade × Weight) - (Absences × Penalty)

```text
**Example:**

- Midterm: 15/20 × 30% = 4.5
- Final: 18/20 × 40% = 7.2
- Assignments: 16/20 × 20% = 3.2
- Participation: 17/20 × 10% = 1.7
- **Subtotal:** 16.6/20
- Absences: 3 × 0.5 penalty = -1.5
- **Final Grade:** 15.1/20

### Viewing Student Grades

**Individual Student:**

1. Click **Students** → Select student

2. Click **Grades** tab

3. View all courses and components

4. See weighted averages and final grades

**Course Grades:**

1. Click **Courses** → Select course

2. Click **Grades** tab

3. View all enrolled students

4. Export grade sheet to Excel

### Grade Statistics

For each course, view:

- **Average Grade**: Mean of all student final grades
- **Median Grade**: Middle value
- **Standard Deviation**: Grade distribution
- **Pass Rate**: Percentage of students passing
- **Grade Distribution**: Histogram chart

---

## Attendance Tracking

### Recording Attendance

**Daily Attendance:**

1. Click **Attendance** in navigation

2. Select **Course** and **Date**

3. Student list appears with attendance toggles

4. Mark each student as:

- ✅ **Present**
- ❌ **Absent**
- 🏥 **Excused Absence**
- 🕐 **Late**

5. Add notes if needed (optional)

6. Click **Save Attendance**

**Bulk Attendance:**

- Click **Mark All Present** to pre-fill
- Uncheck absences individually
- Saves time for large classes

### Viewing Attendance

**Individual Student:**

1. Click **Students** → Select student

2. Click **Attendance** tab

3. View calendar with attendance markers

4. See statistics:

- Total days present
- Total days absent
- Attendance percentage
- Excused vs unexcused

**Course Attendance:**

1. Click **Courses** → Select course

2. Click **Attendance** tab

3. View attendance grid (students × dates)

4. Filter by date range

5. Export to Excel

### Attendance Reports

**Generate Report:**

1. Click **Attendance** → **Reports**

2. Select filters:

- Course
- Date range
- Student (optional)

3. View report with:

- Attendance summary
- Students at risk (< 80% attendance)
- Daily attendance trends

4. Export as PDF or Excel

### Attendance Alerts

The system automatically flags:

- 🚨 **Low Attendance**: < 70% (red alert)
- ⚠️ **At Risk**: 70-80% (yellow warning)
- ✅ **Good Standing**: > 80% (green)

Administrators receive email notifications for students with low attendance.

---

## Reports & Analytics

### Dashboard Reports

**Quick Statistics:**

- Total students enrolled
- Total active courses
- Average attendance rate
- Average final grades
- Students at risk

**Visual Charts:**

- Enrollment trends over time
- Grade distribution by course
- Attendance rate comparison
- Performance by instructor

### Student Reports

**Individual Performance Report:**

1. Click **Reports** → **Student Reports**

2. Select student

3. Choose report type:

- **Transcript**: All courses and grades
- **Attendance Summary**: Attendance across all courses
- **Performance Trend**: Grade progression over time

4. Select date range

5. Click **Generate Report**

6. Export as PDF

**Cohort Analysis:**

1. Select group of students (by enrollment year, course, etc.)

2. Compare:

- Average grades
- Attendance rates
- Pass/fail rates

3. Visualize with charts

### Course Reports

**Course Performance:**

1. Click **Reports** → **Course Reports**

2. Select course

3. View:

- Grade distribution histogram
- Pass/fail statistics
- Component performance breakdown
- Attendance correlation with grades

**Instructor Report:**

1. Select instructor

2. View all courses taught

3. Compare performance across courses

4. Export summary

### Custom Reports

**Report Builder:**

1. Click **Reports** → **Custom Report**

2. Select data sources:

- Students
- Courses
- Grades
- Attendance

3. Choose fields to include

4. Apply filters

5. Select grouping and sorting

6. Preview report

7. Export in desired format

### Export Formats

Available export formats:

- **Excel (.xlsx)**: Best for data analysis
- **PDF**: Best for printing and sharing
- **CSV**: Best for importing to other systems
- **JSON**: Best for API integration

---

## Import/Export Data

### Importing Students

**Excel Import:**

1. Download template: **Students** → **Import** → **Download Template**

2. Fill in required columns:

- `student_id` (optional, auto-generated if blank)
- `first_name` (required)
- `last_name` (required)
- `email` (required, unique)
- `date_of_birth` (optional, format: YYYY-MM-DD)
- `phone` (optional)
- `address` (optional)

3. Upload file: Click **Choose File** → **Upload**

4. Review preview with validation results

5. Click **Confirm Import**

**Validation Rules:**

- Duplicate emails are rejected
- Invalid email formats are rejected
- Missing required fields are rejected
- Rows with errors are shown in red

**JSON Import:**

```json
[
  {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "student_id": "STU001",
    "date_of_birth": "2000-01-15"
  }
]

```text
### Importing Courses

**Excel Template Columns:**

- `course_code` (required, unique)
- `course_name` (required)
- `description` (optional)
- `credits` (optional, numeric)
- `instructor` (optional)
- `semester` (optional: Fall, Spring, Summer)
- `year` (optional, numeric)

**Grading Configuration Import:**
Include these columns for automatic grading setup:

- `midterm_weight` (numeric, 0-100)
- `final_weight` (numeric, 0-100)
- `assignment_weight` (numeric, 0-100)
- `participation_weight` (numeric, 0-100)
- `absence_penalty` (numeric, points per absence)

### Importing Grades

**Excel Template Columns:**

- `student_id` (required, must exist)
- `course_code` (required, must exist)
- `component_type` (required: midterm, final, assignment, etc.)
- `grade` (required, numeric)
- `max_grade` (required, numeric)
- `date_assigned` (optional, format: YYYY-MM-DD)
- `date_submitted` (optional, format: YYYY-MM-DD)
- `notes` (optional)

**Bulk Grade Update:**

- Import can update existing grades by matching student_id + course_code + component_type
- Use `update_mode: overwrite` or `update_mode: skip_existing`

### Exporting Data

**Student Export:**

1. Click **Students** → **Export**

2. Select fields:

- ☑️ Basic Info (name, email, student ID)
- ☑️ Contact Info (phone, address)
- ☑️ Enrollment Data (courses, status)
- ☑️ Performance Data (GPA, attendance)

3. Choose format: Excel, CSV, JSON, PDF

4. Click **Export**

**Grade Export:**

1. Click **Grades** → **Export**

2. Filters:

- Course (all or specific)
- Date range
- Student group

3. Include:

- Individual component grades
- Calculated final grades
- Grade statistics

4. Export to Excel with multiple sheets:

- **Summary**: Final grades by student
- **Components**: Detailed breakdown
- **Statistics**: Course statistics

**Attendance Export:**

1. Click **Attendance** → **Export**

2. Select course and date range

3. Format options:

- **Grid**: Students × Dates matrix
- **List**: One row per attendance record
- **Summary**: Attendance statistics only

4. Export to Excel or PDF

### Backup & Restore

**Create Backup:**

1. Click **Control Panel** → **Operations**

2. Scroll to **Backups** section

3. Click **Create Backup Now**

4. Backup file saved to `backups/` directory

5. Filename: `backup_YYYYMMDD_HHMMSS.db`

**Automatic Backups:**

- System creates automatic backups daily
- Keeps last 10 backups by default
- Oldest backups auto-deleted

**Restore from Backup:**

1. Click **Control Panel** → **Operations**

2. Click **Restore from Backup**

3. Select backup file from list

4. Confirm restoration (⚠️ Warning: Current data will be replaced!)

5. System restarts with restored data

**Download Backup:**

1. Click **Download** next to backup file

2. Save to safe location

3. Store offsite for disaster recovery

---

## System Settings

### Admin Panel Access

**Location:** Control Panel → Maintenance

**Admin Functions:**

- User management
- System configuration
- Database operations
- Log viewing
- Performance monitoring

### User Management

**Create New User:**

1. Control Panel → Maintenance → **User Management**

2. Click **Add User**

3. Fill in:

- Email (unique)
- Password (strong password required)
- Full Name
- Role (admin, teacher, viewer)

4. Click **Create User**

**User Roles:**

- **Admin**: Full system access, can manage users
- **Teacher**: Can manage courses, grades, attendance
- **Viewer**: Read-only access to reports

**Edit User:**

- Change email, name, or role
- Reset password
- Activate/deactivate account
- Unlock account (if locked due to failed logins)

### Authentication Settings

**AUTH_MODE Configuration:**

- **Disabled**: No authentication required (emergency access only)
- **Permissive**: Authentication optional (recommended for production)
- **Strict**: Full authentication required (maximum security)

⚠️ **Security Warning:** Never leave AUTH_MODE=disabled in production!

**Change AUTH_MODE:**

1. Edit `backend/.env` file

2. Set `AUTH_MODE=permissive` (or strict)

3. Restart backend: `docker restart <container_name>`

### System Configuration

**Edit Configuration:**

1. Control Panel → Maintenance → **System Settings**

2. Available settings:

- **Semester Weeks**: Default semester length (12-16 weeks)
- **Pass Threshold**: Minimum grade to pass (default: 10/20)
- **Grade Scale**: 0-20 or 0-100
- **Attendance Threshold**: Minimum attendance % (default: 80%)
- **Email Notifications**: Enable/disable

3. Click **Save Settings**

**Environment Variables:**
Advanced users can edit `.env` file directly:

```env
## Authentication

AUTH_ENABLED=true
AUTH_MODE=permissive

## Admin Bootstrap

DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=YourSecurePassword123!

Note about automated admin password rotation:

- DEFAULT_ADMIN_AUTO_RESET (default: false): enables safe automatic rotation of the default

   administrator password at application startup. When set to true and a
   DIFFERENT DEFAULT_ADMIN_PASSWORD is present in the environment, the
   application will update the stored admin password to match the configured
   value and revoke any existing refresh tokens for that user. This is useful
   for CI/CD or secret-manager-driven credential rotation, but remains disabled
   by default to avoid unexpected resets in production.

   Recommended safe rotation workflow (CI/CD / secret manager)

   1. Store the new admin password in your secret manager (e.g. Vault, AWS Secrets Manager)
      and make it available to your deployment pipeline as `DEFAULT_ADMIN_PASSWORD`.

   2. Update the environment with the new password and enable auto-reset for the deployment
      by setting `DEFAULT_ADMIN_AUTO_RESET=true` (only for the moment of the rotation).
      Example (Docker Compose):

   ```powershell
#   # Update `.env` in the deployment or set the container env via your orchestration tool

   Set-Content -Path ./backend/.env -Value (Get-Content ./backend/.env) -Force
#   # Then restart the backend so the bootstrap runs at startup

   docker compose restart sms-backend
   ```

   3. After verification (login works with the new password), remove the auto-reset flag
      or revert it to `false` to avoid future automatic password changes:

   ```powershell
#   # Reset flag in your orchestration or .env and restart

   docker compose exec sms-backend pwsh -c "(Get-Content /app/backend/.env) -replace 'DEFAULT_ADMIN_AUTO_RESET=true','DEFAULT_ADMIN_AUTO_RESET=false' | Set-Content /app/backend/.env"
   docker compose restart sms-backend
   ```

   Notes:

- Only the configured default admin (DEFAULT_ADMIN_EMAIL) will be affected.
- The flag defaults to false to avoid unexpected changes in production.
- When password rotation is in your CI/CD, prefer to perform a single atomic rollout

     so the new credential takes effect across all app instances consistently.

## Database

DATABASE_ENGINE=sqlite
DATABASE_URL=sqlite:///./data/student_management.db

## Performance

ENABLE_CACHING=true
CACHE_TTL=300

```text
### Performance Settings

**Enable Caching:**

- Improves response times by 70%
- Cache TTL: 5 minutes (300 seconds)
- Automatically clears on data updates

**Database Optimization:**

- WAL mode enabled by default (40% faster)
- Auto-vacuum scheduled daily
- Indexes on frequently queried fields

### Monitoring

**System Health:**

1. Control Panel → Operations → **Health Check**

2. View:

- ✅ Database connection status
- ✅ Disk space available
- ✅ Response times
- ✅ Active users
- ✅ Uptime

**View Logs:**

1. Control Panel → Operations → **View Logs**

2. Filter by:

- Date/time range
- Log level (ERROR, WARNING, INFO)
- Component (backend, frontend, database)

3. Search for specific errors

4. Download logs for troubleshooting

---

## Troubleshooting

### Common Issues

### Cannot Access Application

**Symptom:** Browser shows "Cannot connect" or timeout error

**Solution:**

1. Check if application is running:
   ```powershell
   .\DOCKER.ps1 -Status
   ```

2. If not running, start it:

   ```powershell
   .\DOCKER.ps1 -Start
   ```

3. Check if Docker Desktop is running (Docker mode)

4. Verify correct URL:

- Docker: <http://localhost:8080>
- Native: <http://localhost:5173>

### Login Failed

**Symptom:** "Invalid credentials" or "Access denied" error

**Solution:**

1. Verify credentials:

- Email: `admin@example.com`
- Password: `YourSecurePassword123!`

2. Check if AUTH_MODE is causing issues:

   ```powershell

# Temporary: Set AUTH_MODE=disabled for emergency access

# Edit backend/.env, restart

   ```

3. Reset password using admin unlock endpoint

4. Check caps lock and keyboard layout

#### Slow Performance

**Symptom:** Pages load slowly, timeouts

**Solution:**

1. Check system resources (CPU, memory, disk)

2. Enable caching in .env:
   ```env
   ENABLE_CACHING=true
   ```

3. Restart application:

   ```powershell
   .\DOCKER.ps1 -Stop
   .\DOCKER.ps1 -Start
   ```

4. Clear browser cache

5. Check database size (optimize if > 1GB)

#### Data Import Failed

**Symptom:** "Validation error" or "Import failed" message

**Solution:**

1. Download fresh template from application

2. Check required fields are filled

3. Verify data formats:

- Dates: YYYY-MM-DD
- Emails: name\@domain.com
- Numbers: No text characters

4. Check for duplicate IDs or emails

5. Import in smaller batches (< 1000 rows)

#### Grades Not Calculating

**Symptom:** Final grade shows as 0 or incorrect value

**Solution:**

1. Check course grading configuration:

- Component weights must total 100%
- All components must have grades

2. Verify grade data:

- `max_grade` must be > 0
- `grade` must be ≤ `max_grade`

3. Check absence penalty is set correctly

4. Recalculate grades: Grades → **Recalculate All**

#### Backup Failed

**Symptom:** "Backup creation failed" error

**Solution:**

1. Check disk space (need at least 2x database size)

2. Verify permissions on `backups/` directory

3. Check database is not locked:

   ```powershell
   .\DOCKER.ps1 -Stop
   .\DOCKER.ps1 -Start
   ```

4. Try manual backup:

   ```powershell

# Docker mode

   docker exec <container> sqlite3 /data/student_management.db ".backup /data/manual_backup.db"

   ```

### Getting Help

**Documentation:**

- [Quick Start Guide](QUICK_START_GUIDE.md)
- [Installation Guide](../../INSTALLATION_GUIDE.md)
- [Deployment Guide](../deployment/DEPLOYMENT_GUIDE_COMPLETE.md)
- [Developer Guide](../development/DEVELOPER_GUIDE_COMPLETE.md)

**Support:**

- GitHub Issues: <https://github.com/bs1gr/AUT_MIEEK_SMS/issues>
- Check logs: `.\DOCKER.ps1 -Logs`
- Health check: <http://localhost:8080/health>

**Before Reporting Issues:**

1. Check this troubleshooting section

2. Review application logs

3. Try restarting the application

4. Include in your report:

- Version number (type `VERSION` or check http://localhost:8080/health)
- Operating system
- Deployment mode (Docker/Native)
- Exact error message
- Steps to reproduce

---

## Frequently Asked Questions

### General Questions

**Q: Can I use a different database than SQLite?**
A: Yes! The system supports PostgreSQL. Edit `backend/.env`:

```env
DATABASE_ENGINE=postgresql
DATABASE_URL=postgresql://user:password@localhost:5432/sms_db

```text
**Q: How do I backup data automatically?**
A: Backups are automatic (daily). Configure in Control Panel → Operations → Backup Settings.

**Q: Is the system mobile-friendly?**
A: Yes! The responsive design works on tablets and phones, though desktop is recommended for data entry.

**Q: Can I customize the grading scale?**
A: Yes! Edit course settings to use 0-100 instead of 0-20, or define custom scales.

**Q: How many students can the system handle?**
A: Tested with 10,000+ students. Performance depends on hardware. Use PostgreSQL for very large deployments.

### Security Questions

**Q: How secure is the system?**
A: Very secure! Features include:

- JWT token authentication
- CSRF protection
- Rate limiting
- SQL injection prevention
- XSS protection
- Secure password hashing (bcrypt)

**Q: Should I use AUTH_MODE=disabled?**
A: No, only for emergency access. Use `permissive` (recommended) or `strict` in production.

**Q: How often should I change the admin password?**
A: Every 90 days minimum, or immediately if compromised.

**Q: Can I enable two-factor authentication?**
A: Not currently supported. Planned for future release.

### Data Questions

**Q: Can I import data from another system?**
A: Yes! Export data to Excel/CSV from your old system, then use our import feature. May need data transformation.

**Q: What happens if I delete a student?**
A: All related data (grades, attendance, enrollments) is permanently deleted. Consider marking inactive instead.

**Q: Can I recover deleted data?**
A: Only from backups. Restore the most recent backup before the deletion.

**Q: How do I handle grade disputes?**
A: View grade history (shows who entered/modified grades and when). Export audit log for documentation.

### Performance Questions

**Q: Why is the application slow?**
A: Common causes:

- Caching disabled (enable in .env)
- Large database (> 1GB, consider PostgreSQL)
- Many concurrent users (upgrade hardware)
- Browser cache full (clear cache)

**Q: How can I speed up imports?**
A: Import in batches of 500-1000 rows. Use native mode for very large imports (faster than Docker).

**Q: Does the system require internet?**
A: No! Works completely offline after installation. Internet only needed for initial setup.

---

## Appendix

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + K` | Open search |
| `Ctrl + S` | Save current form |
| `Esc` | Close dialog/modal |
| `Tab` | Next field in forms |
| `Shift + Tab` | Previous field |
| `Ctrl + /` | Show keyboard shortcuts |

### Grade Scales

**Greek Scale (0-20):**

- 18-20: Excellent (A)
- 16-17: Very Good (B)
- 14-15: Good (C)
- 10-13: Pass (D)
- 0-9: Fail (F)

**Percentage Scale (0-100):**

- 90-100: A
- 80-89: B
- 70-79: C
- 60-69: D
- 0-59: F

### Date/Time Formats

All dates use ISO 8601 format:

- **Date**: YYYY-MM-DD (e.g., 2025-11-22)
- **Time**: HH:MM:SS (e.g., 14:30:00)
- **DateTime**: YYYY-MM-DD HH:MM:SS

### File Size Limits

- **Excel Import**: 10 MB maximum
- **Image Upload**: 5 MB maximum
- **Backup Download**: No limit
- **PDF Export**: 50 MB maximum

---

**Document Version:** 1.0
**Last Updated:** November 22, 2025
**Maintained By:** SMS Development Team
**Feedback:** Create an issue on GitHub with label `documentation`

---

## RBAC & Permissions

The Student Management System now supports fine-grained Role-Based Access Control (RBAC).

- **Roles**: Define what groups of users can do (e.g., admin, teacher).
- **Permissions**: Fine-grained actions (e.g., create student, export data).

### Managing Roles & Permissions

- Admins can create, update, and delete roles and permissions via the Admin → RBAC section or API endpoints.
- Assign roles to users and grant/revoke permissions to roles using the RBAC management UI or API.
- See the [RBAC Permission Matrix](../api/RBAC_API_MATRIX.md) for a full list of actions and required permissions.

### Who Can Manage RBAC?

- Only users with the `*` (wildcard) permission (typically admins) can assign/revoke roles and permissions.
- All RBAC changes are logged and rate-limited for security.

### API Reference

- See the API documentation for endpoint details: [API Contract](../api/API_CONTRACT.md)

---

## API Explorer

You can view and test all API endpoints, including RBAC, using the built-in OpenAPI/Swagger UI:
- [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI)
- [http://localhost:8000/redoc](http://localhost:8000/redoc) (ReDoc)

These pages are available in both development and Docker modes.

---

## RBAC in the User Interface

- The Admin → RBAC section allows you to manage roles, permissions, and assignments visually.
- If you lack permission for an action, the UI will show a clear error message (e.g., "You do not have permission to perform this action").
- Only users with the appropriate permissions will see RBAC management options.
- All changes are reflected in real time and are subject to audit logging and rate limiting.

---
