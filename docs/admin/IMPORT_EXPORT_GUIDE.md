# The Import/Export panel of the Control Panel

**Checked against the application:** 19 November 2026, `main` after v1.18.73, with the
repair of the panel that is in v1.18.74 (plan, todo 62). What the panel does was tried in a
browser on a scratch copy that day, as an administrator; its API was tried by the tests.

**Related:** [IMPORT_EXPORT_USER_GUIDE.md](../user/IMPORT_EXPORT_USER_GUIDE.md) (the pages
teachers and administrators use), [SESSION_EXPORT_IMPORT_GUIDE.md](../user/SESSION_EXPORT_IMPORT_GUIDE.md)
(one whole semester), [PERMISSION_MATRIX.md](PERMISSION_MATRIX.md) (every endpoint and what
it asks for).

This file described a wizard of four steps, a page "Data Management > Export", a template
to download, a **Rollback** button that worked for 24 hours, a limit of 5,000 rows, a
permission `exports:create` and a role "Manager". The application has none of them. The
earlier text is in the repository's history.

## Which page to use

| To | Use | Who |
|---|---|---|
| Download lists of records | Utils > **Export** > Export Center | administrators and teachers |
| Add students or courses from files | Utils > **Imports** | administrators and teachers |
| Move one whole semester | Utils > **Export** > Session Export/Import | administrators and teachers |

These were tried in a running copy and are described in
[USER_GUIDE_COMPLETE.md](../user/USER_GUIDE_COMPLETE.md), section 11.

## The panel under Maintenance

**System** > **Show Control Panel** > **Maintenance** > **Import/Export** is a second,
older feature, offered to administrators. Until v1.18.73 it did not work: its requests went
out without the sign-in and were refused, an export was an Excel file whatever was asked for
(or failed), and its import stopped after the check and stored nothing. From v1.18.74:

- **Export Data** asks what to export (**Students**, **Courses**, **Grades**,
  **Attendance**) and in which format (**Excel**, **CSV**, **PDF**), makes the file on the
  server and saves it. All twelve were tried; a CSV file opens in Excel with its Greek names,
  and a PDF file holds them.
- **Import Data** > **Import Students**, **Import Courses** or **Import Grades** takes one
  `.csv` or `.xlsx` file. The wizard says which columns the file needs, sends it, and shows
  what the check found. A file with a fault lists its rows ("Row 3: Missing email") and
  cannot be stored. A file without one says so, and **Store the rows** stores it: all of the
  file, or nothing of it.
- **History** lists the import and export jobs, the newest first, with their state and
  **Download** for the file of a finished export.

For adding students or courses, Utils > **Imports** remains the page that shows row by row
what will happen before anything is stored, and it takes several files at once.

## Its API

Under `/api/v1/import-export`. Who holds each permission is in
[PERMISSION_REFERENCE.md](PERMISSION_REFERENCE.md).

| Request | Asks for | What it does |
|---|---|---|
| `POST /imports/students`, `/imports/courses`, `/imports/grades` | `imports:create` | Takes one `.csv` or `.xlsx` file and answers with a job. The file is then checked in the background |
| `GET /imports`, `GET /imports/{id}` | `imports:view` | The jobs (the newest first), or one job with its counts and `validation_errors` |
| `POST /imports/{id}/commit` | `imports:create` | Stores the rows of a job whose status is `ready` |
| `POST /exports` | `exports:generate` | Starts an export job. In the body: `export_type` (students, courses, grades, attendance) and `file_format` (xlsx, csv, pdf; "excel" is read as xlsx) |
| `GET /exports`, `GET /exports/{id}` | `exports:view` or `exports:generate` | The export jobs (the newest first), or one |
| `GET /exports/{id}/download` | `exports:download` | The file of a finished job |
| `GET /history` | `audit:view` | An entry for every import that was checked or stored. Exports made through `POST /exports` are not in it |
| `GET /settings/email`, `PUT /settings/email`, `POST /settings/email/test` | the role `admin` | The e-mail settings (**Email Configuration**) |

A teacher holds `imports:create`, `imports:view`, `exports:generate` and
`exports:download`: enough for all of the above but the history and the e-mail settings.

What a file must hold, and what else is read from it:

| Import | Columns that must be there | Also read |
|---|---|---|
| Students | `student_id`, `first_name`, `last_name`, `email` | `study_year`, `father_name`, `phone` |
| Courses | `course_code`, `course_name` | `semester`, `credits`, `description` |
| Grades | `student_id`, `course_code`, `grade` | `assignment`, `category`, `max_grade`, `weight` |

How an import decides (each tried by a test):

- **The check stops an import.** A job whose file has a fault ends as `invalid`, and only a
  job that is `ready` can be committed. The faults are in `validation_errors` under the
  row's number as a spreadsheet shows it (the first data row is 2): a required cell that is
  empty, an e-mail address without "@", a number that is not one, the same student or
  course twice in the file, a grade for a student or a course that is not there.
- **A student is the one with that student ID or that e-mail address; a course the one
  with that code**, as in Utils > **Imports**. One that is there is updated; a deleted one
  comes back.
- **A grade is recognised by the student, the course, the assignment name and the
  category** (`assignment` is "Imported Grade" and `category` is "General" when the column
  is missing). The same assignment in two categories is two grades.
- **All or nothing.** If a row cannot be stored, the rows before it are taken back and the
  job ends as `failed`, with the reason under `commit_error`.
- There is no template to download and no limit on the number of rows.
