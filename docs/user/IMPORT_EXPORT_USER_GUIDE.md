# Imports and Exports

**Checked against the application:** 18 November 2026, `main` after v1.18.73.

The earlier text of this guide described one panel, reached through an "Admin Panel" and a
"Data Management" entry; neither name is a text anywhere in the application's source. That
panel exists, for administrators, under System > Control Panel > Maintenance (last part). The
pages that teachers and administrators use are Utils > **Export** and Utils > **Imports**. The
earlier text is in the repository's history.

| To | Go to | Who |
|---|---|---|
| Download lists of records | Utils > **Export** > Export Center | administrators and teachers |
| Add students or courses from files | Utils > **Imports** | administrators and teachers |
| Move one whole semester | Utils > **Export** > Session Export/Import | administrators only |

## Exporting: Utils > Export

The tab holds three bars: **Export Center**, **Session Export/Import** and **Reports &
Templates**, closed when the tab opens; click a bar's name to open it (read from the code).

- **Export Center** lists Students List, Courses List, Attendance Records, All Grades and
  Course Enrollments, each with **Choose format**: PDF, Excel or CSV. **Print Calendar** is
  in the same bar.
- The name of each file carries the date and time.
- Each file holds all the records of its kind. For a selection (one student, one course, a
  range of dates), build a report under Utils > **Reports**. **Reports & Templates** leads
  there.
- **Session Export/Import** moves one whole semester in one file, for administrators only:
  [SESSION_EXPORT_IMPORT_GUIDE.md](SESSION_EXPORT_IMPORT_GUIDE.md).
- Read from the code: the Export Center sends the language of the page with each request,
  and the server takes the language of the file from it ([LOCALIZATION.md](LOCALIZATION.md)).

## Importing: Utils > Imports

For students or courses, from CSV or JSON files. The page first shows what would happen and
stores nothing; only **Confirm & Import** stores.

1. Choose **Students** or **Courses**.
2. Under **Upload files**, pick one or more files, or paste records under **Paste JSON
   (optional)**.
3. Set the two tick boxes (below).
4. Click **Run preview**. Nothing is stored.
5. Read the result: six counts (Total rows, Creates, Updates, Skips, Warnings, Errors) and a
   table with each row's number, action, status, issues and data. The table shows the first
   100 rows and says how many more are hidden.
6. If no row has an error, click **Confirm & Import**. It cannot be used while Errors is
   above zero; warnings do not stop it. **Cancel** clears the preview and the files.

**Allow updates to existing records** is not ticked when the page opens. A row for a record
that already exists is then left as it is: the preview shows a skip, with the warning "would
update existing record; updates not allowed". Ticked, the preview shows an update, and the
import changes the record.

**Skip duplicates** is ticked when the page opens. A record that is in the files twice is
taken once; the repeat shows as a skip ("duplicate in uploaded data"). Unticked, a repeat is
listed like any other row.

A record "already exists" (read from the code) if a student that is not deleted has the same
student ID or e-mail address, or a course that is not deleted has the same course code, in
any semester. A course that exists in another semester shows the warning "course exists in
another semester; importing moves it".

**Background job status**, below, follows the import: the Job ID, the status (Pending,
Processing, Completed, Failed or Cancelled), the percentage, and at the end "N created, N
updated, N skipped", then up to five lines (rows that went wrong first, then rows skipped)
and "...and N more". To follow another job, type its number under **Job ID to track** and
click **Start monitoring**. How it lists and polls is read from the code.

## The files (read from the code, not tried)

Source: `src/backend/routers/routers_imports.py`.
- The picker offers `.json` and `.csv`. A file may not be empty or over 10 MB; pasted JSON
  has the same limit. Excel files are not read.
- JSON: one record or a list, in UTF-8. CSV is read only for **Students**; for **Courses** the
  preview shows one row with the error "CSV import only supported for students".
- JSON students need `student_id` and `email` (one @, and a dot after it).
  `enrollment_date` may be 2025-09-01, 01/09/2025, 01-09-2025 or 01.09.2025 (or month first);
  a date that cannot be read is dropped with a warning.
- JSON courses need `course_code`. An empty `semester` becomes "Α' Εξάμηνο". Greek names of
  grade categories in `evaluation_rules` become the English names the application stores.
- CSV students: separator semicolon; text read as UTF-8, else Latin-1. With a header row of
  the school's registration export, these columns are used: `Επώνυμο:`, `Όνομα:`,
  `Όνομα Πατέρα:`, `Ηλ. Ταχυδρομείο:`, `Αρ. Κινητού Τηλεφώνου:`,
  `Αρ. Σταθερού Τηλεφώνου:`, `Έτος Σπουδών:`, `Αριθμός Δελτίου Ταυτότητας:` (the last is the
  student ID). Without a header row the columns are student ID, first name, last name,
  e-mail, then optionally study year, mobile phone and phone; under four columns is refused.
- Each CSV row needs first and last name, e-mail and student ID. An ID without a leading S
  gets one. The study year Α', Β', Γ' or Δ' (Latin A' and B' too) becomes 1 to 4, a number
  stays, anything else becomes 1. Every CSV student is active, enrolled today.
- **A CSV row that cannot be read is shown as an error.** A refused row (no name, no e-mail,
  no ID, too few columns) is a row of the preview with its message, for example
  "students.csv row 3: Missing email", and counts under Errors: correct the file and run the
  preview again. This is covered by a test. In v1.18.73 and earlier the preview left such
  rows out without a word; compare Total rows with the rows you expect there.

A failure shows a red line: the server's message, or **Import preview failed** or **Import
failed**. A 429 is a request limit; preview and import count under **Heavy Operations**
([RATE_LIMITING_GUIDE.md](RATE_LIMITING_GUIDE.md), read from the code).

## The administrators' panel: Maintenance > Import/Export

System > Control Panel > Maintenance > **Import/Export** is a second panel, for
administrators. Read from the code: it is headed **Data Import/Export**, with the button
**Export Data**, the button **Import Data** (**Import Students**, **Import Courses**,
**Import Grades**) and a list headed **History**.

The user guide says its export dialog does not work in most of its choices
([USER_GUIDE_COMPLETE.md](USER_GUIDE_COMPLETE.md), section 13). Use Utils > **Export**
instead. Its import was not tried. Read from the code only: it takes `.csv` or `.xlsx` files
with the columns `first_name`, `last_name`, `email` (students), `course_code`, `course_name`
(courses) or `student_id`, `course_code`, `grade` (grades).
