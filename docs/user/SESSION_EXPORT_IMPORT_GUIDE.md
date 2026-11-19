# Session Export/Import

**Checked against the application:** 18 November 2026, `main` after v1.18.73.

The earlier text of this guide sent the reader to "Operations > Export Center", gave a file
name the page does not produce, and did not say who may use the feature. This text corrects
that. The earlier text is in the repository's history.

**Changed on 19 November 2026** (read from the code and its tests, not tried on a page):
teachers may use the feature too, and a grade is recognised with its category.

## What it is

A session is one semester: its courses, the students enrolled in them, and their records.
**Session Export/Import** writes a semester into one JSON file, and reads such a file back,
here or in another installation. It is useful for:

- moving a semester to another computer or installation;
- keeping a copy of a finished semester;
- giving a semester to a colleague who is an administrator.

## Who may use it

Administrators and teachers (teachers since 19 November 2026). To an account without a role
the panel says: "Your account may not export or import a session. Ask an administrator."
Students' health information is the administrator's alone: a teacher's export never holds
it, and a file imported by a teacher is imported without it, so that what is stored stays as
it is.

## Where it is

Utils > **Export**, the bar **Session Export/Import**. It sits between **Export Center** and
**Reports & Templates**. The bars are closed when the tab opens; click the name of the bar to
open it (read from the code). The panel has two parts: **Export Complete Session** and
**Import Session**.

## Exporting a session

1. Under **Select Semester**, choose the semester. The page lists the semesters of the
   courses that are not deleted. The first one is already chosen when the list appears (read
   from the code).
2. Click **Export Session**. The page says "Session exported successfully!" and the browser
   saves the file.
3. Keep the file somewhere safe.

The file is called `session_export_<semester>.json`, with the spaces of the semester's name
written as underscores: for the semester "2024-2025 Fall", `session_export_2024-2025_Fall.json`
(read from the code). It has no date in its name; rename it if you keep several.

If the list says "No semesters found in the system", no course has a semester. If it says
"Could not load the semesters", the list could not be read: open the page again, and if it
stays, tell the administrator who looks after the installation.

### What is in the file

Read from the code:

- the courses of the semester, and the students enrolled in them;
- the enrolments, the grades, the attendance and the daily performance of those students in
  those courses, and their highlights;
- the lesson log of those courses (the material covered and the teacher's notes).

Records that were deleted are left out. Students' health information is not included. User
accounts and settings are not in the file. Other semesters are not in it.

## Importing a session

1. Under **Import Session**, click **Select File** and choose the `.json` file.
2. Under **Merge Strategy**, choose **Update Existing** (update existing records and create
   new ones) or **Skip Existing** (only create new records and skip existing ones).
3. Click **Validate**. It checks the whole file and changes nothing.
   - When the file is good, the page says "Validation Passed" and, after "Ready to import:",
     how many courses, students, grades and lesson log entries the file holds.
   - When it is not, the page says "Validation Failed: N errors" and lists the first ten,
     with "...and N more errors". After a validation that failed, **Import Session** cannot
     be clicked (read from the code).
4. Make a backup (next part), then click **Import Session**.
5. The page says "Session imported successfully!" and, in brackets, how many records were
   created and updated, and how many errors there were if any. It does not list the records
   that went wrong (read from the code). Run **Validate** first, so that most problems
   show before anything is stored.

### What Validate checks

Read from the code: the file has a `metadata` part with the semester; every course has a
course code and a name, and its credits and hours are numbers in a sensible range; every
student has a student ID, a first name, a last name and an e-mail address with an @ and a dot
after it, and a study year from 1 to 10 if one is given; no course code, student ID or
e-mail address appears twice; and every enrolment and every grade names a course and a
student that are in the file.

### Merge strategies

**Update Existing.** A course or student that already exists (same course code or student ID)
is updated; one that does not exist is created. Use it to bring in data from another
computer, or to restore a semester.

**Skip Existing.** Only records that do not exist yet are created; existing ones are left as
they are. Use it to add what is new without touching what is there.

### How records are matched

Read from the code. Records that were deleted are never matched.

- A course by its course code.
- A student by the student ID, compared letter for letter: `S001` and `s001` are two
  students.
- An enrolment by the student and the course.
- A grade by the student, the course, the assignment name and the category. The same
  assignment in two categories is two grades, and each row of the file finds its own; a grade
  without a category is matched with one without. (Until 19 November 2026 the category was
  not part of the match, and the second of two such grades overwrote the first.) Two grades
  of the same name and category on two dates are still one record to the import. A category
  renamed since the file was made is a new grade to the import: it adds one and leaves the
  old one.

### If the import stops

Read from the code. If a course or a student in the file is refused during the import, the
whole import is cancelled and nothing is kept. If saving fails at the end, all changes are
undone. After a good import, whether each course is active is worked out again from its
enrolments.

## Make a backup first

The page's own tip says: "Click "Validate" first to check for errors before importing. Make a
backup first: the import makes a copy of the database by itself only where the database is a
single file (SQLite), not on PostgreSQL." The help answer "How do I import a semester?" ends
with the same warning.

So, before an import into an installation whose database is PostgreSQL, take a backup under
System > Control Panel > Maintenance > System Operations; see
[BACKUP_AND_RESTORE.md](../admin/BACKUP_AND_RESTORE.md). Which database an installation uses
is shown by **System Health** on the System page (user guide, section 13).

Read from the code, for a SQLite database: the copy is a file
`pre_import_backup_<semester>_<date>_<time>.db` in the application's backups folder, made
before anything is changed. If the copy cannot be made, the import goes on without it. The
server has routes to list such copies and to go back to one (`/api/v1/sessions/backups` and
`/api/v1/sessions/rollback`); no page uses them, and going back works only for SQLite and
only for an administrator (it asks for `adminops:restore`).

## Examples

- **Two computers.** On the first, export the semester. Carry the file over. On the second,
  sign in as an administrator, choose the file, **Validate**, and import with **Update
  Existing**. A computer that has nothing yet gets everything created.
- **A finished semester.** Export it and keep the file. To bring it back, import it with
  **Update Existing**.
- **A colleague.** Both of you need an administrator's account. The colleague imports the
  file. What they already have is merged with it, as the strategy says.

## Good habits

- Export after big changes, and name the files so that you can tell them apart.
- Run **Validate** before every import, and read the counts.
- Import only files that you exported yourself or that come from someone you trust.
- Do not edit the file by hand; the import refuses a file that does not pass the checks above.
- One file is one semester; do not join two files.

## The file

JSON, UTF-8. Read from the code, the top-level parts are `metadata` (the semester, the time of
the export, `exported_by`, the version `1.0` and the counts), `courses`, `students`,
`enrollments`, `grades`, `attendance`, `daily_performance`, `highlights` and `lesson_logs`. A
file made before the lesson log existed has no `lesson_logs`, and imports without it. The
import reads the parts in this order: courses, students, enrolments, grades, attendance,
daily performance, highlights, lesson logs.

The source is `src/backend/routers/routers_sessions.py`. The permission is `sessions:manage`;
the roles administrator and teacher have it
([PERMISSION_MATRIX.md](../admin/PERMISSION_MATRIX.md)).
