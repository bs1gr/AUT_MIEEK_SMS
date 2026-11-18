# The Import/Export panel of the Control Panel

**Checked against the application:** 18 November 2026, `main` after v1.18.73. What the
panel does in a browser was seen on 17 November 2026; the rest is read from the code and
marked so.

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
| Move one whole semester | Utils > **Export** > Session Export/Import | administrators |

These were tried in a running copy and are described in
[USER_GUIDE_COMPLETE.md](../user/USER_GUIDE_COMPLETE.md), section 11.

## The panel under Maintenance

**System** > **Show Control Panel** > **Maintenance** > **Import/Export** is a second,
older feature, offered to administrators. Do not rely on it:

- **Seen in a browser, as an administrator:** the panel sends its requests without the
  sign-in. Where the server asks for one (the default), the list of earlier imports and
  exports is refused, and so is what the export dialog asks for. The dialog's choice for
  Excel also sends a word the server does not know.
- **Its import was not tried.**
- **Seen through the API, with a sign-in:** an export job works in one case, an Excel file
  of students, courses or grades (the smoke tests of the releases check that). Asked for as
  CSV or PDF, the job's file is still an Excel file under another name, or the job fails.
  A job for `attendance` or `dashboard` never finishes.

Whether the panel is repaired or taken off the page is open (plan, todo 62).

## Its API (read from the code)

Under `/api/v1/import-export`. Who holds each permission is in
[PERMISSION_REFERENCE.md](PERMISSION_REFERENCE.md).

| Request | Asks for | What it does |
|---|---|---|
| `POST /imports/students`, `/imports/courses`, `/imports/grades` | `imports:create` | Takes one `.csv` or `.xlsx` file and answers with a job. The file is then checked in the background |
| `GET /imports`, `GET /imports/{id}` | `imports:view` | The jobs, or one job with its counts and `validation_errors` |
| `POST /imports/{id}/commit` | `imports:create` | Stores the rows of a job whose status is `ready` |
| `POST /exports` | `exports:generate` | Starts an export job (`export_type`: students, courses, grades, attendance or dashboard; see above for which of them work) |
| `GET /exports`, `GET /exports/{id}` | `exports:view` | The export jobs, or one |
| `GET /exports/{id}/download` | `exports:download` | The file of a finished job |
| `GET /history` | `audit:view` | What was imported and exported |
| `GET /settings/email`, `PUT /settings/email`, `POST /settings/email/test` | the role `admin` | The e-mail settings (**Email Configuration**) |

A teacher holds `imports:create`, `imports:view`, `exports:generate` and
`exports:download`, and not `exports:view`: a teacher can start an export job and download
its file, and cannot look at the job (todo 62).

What a file must hold:

| Import | Columns that must be there |
|---|---|
| Students | `first_name`, `last_name`, `email` |
| Courses | `course_code`, `course_name` |
| Grades | `student_id`, `course_code`, `grade` |

Things to know before anybody uses these requests. All are read from
`src/backend/services/import_export_service.py`; none was tried:

- **The check does not stop an import.** A job becomes `ready` whether or not rows have
  errors; the errors are only listed in `validation_errors`. A file without the columns
  above is the one case where every row counts as wrong.
- A student is recognised by the e-mail address, a course by its code. One that exists is
  left as it is; a new student without a `student_id` column gets a made-up number.
- A grade is recognised by the student, the course and the assignment name (`assignment`,
  or "Imported Grade" when the column is missing): a second row with the same three
  replaces the first, also when its category is another one.
- There is no rollback, no template and no limit on the number of rows in this code.

For adding students or courses, Utils > **Imports** is the page that shows what will
happen before anything is stored.
