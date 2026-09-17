# Unified Work Plan - Student Management System

**Current Version**: 1.18.43
**Last Updated**: September 17, 2026
**Status**: ✅ **v1.18.43 released 2026-09-16 — signed installer + APK, all workflows green, and the published assets verified directly. Unreleased since: 2026-09-17 — a PostgreSQL restore that could execute backup data as SQL, contained and then properly fixed (data-only COPY-format backups that restore in-app without `psql`, and a Dev Tools restore that finally accepts them), E2E teardown so runs stop leaking rows, four E2E tests that passed without testing anything, plus earlier spec reliability fixes and dead deploy scripts removed.**

- **Shipped in v1.18.43** (sections from the v1.18.43 heading down to v1.18.42, 18 commits):
  4 bugs found by a full pre-release smoke test — 3 in SMS_Lite, plus Android shipping the
  wrong version since 1.18.32 (`05b286b85`); the commit gate made to actually gate
  (`2400a4158`); the batch test runner reporting *why* a batch failed (`936037c7e`,
  `edeceaf00`); the Credits panel and three dead items removed (`570935e3e`, `6c6874b2a`);
  and the release-pipeline fixes — both those recorded inside the v1.18.42 section
  (`47fd7e60d`, `1831288dc`, `2369e1a88`, `efb43649a`) and the five found while cutting this
  release, plus a latent tag-moving hazard (`ad12e30a9`, `1c359d7c0`, `83c26d13d`).
- **Shipped in v1.18.42** (from the v1.18.42 heading down to v1.18.41): the Android
  Preferences fix, the Android release-build fix, the version-sync repairs, the four-agent
  workspace audit, and the 2026-09-11/12 Help-audit bug fixes.
- **Open work**: the single prioritised list is **Next todos**, directly below this header.

*Status labels below were corrected on 2026-09-16: twelve sections still read "not yet
released" for work that had in fact shipped — eleven first in v1.18.42, one (PR #228) as far
back as v1.18.39 — each verified by finding the first tag the cited commit is an ancestor of.
A label now names the release that shipped it.*
**Development Mode**: SOLO DEVELOPER + AI Assistant (NO STAKEHOLDERS - Owner decides all)
**Current Phase**: Active Development
**Current Branch**: `main`

---

## 📋 Next todos

**The one list of open work**, highest priority first. Consolidated 2026-09-17 from the two
lists that used to hold it — in the PostgreSQL restore section and the smoke-test section —
which now point here. The evidence stays in those dated sections. When an item is done, remove
it here and mark it resolved where it was raised.

*Items 1–6 of the 2026-09-17 list are **done** — see "PostgreSQL backups that actually restore"
and "E2E: teardown, and four tests that could not fail" below. What follows is what is left,
plus what that work newly raised.*

1. **Point E2E at a disposable database** — *the second half of the chosen fix; the teardown
   is in.* Accounts are now covered everywhere (`registerUser` records them and the global
   teardown deletes them, including after a crashed run), and `student-management.spec.ts`
   leaves student and course counts unchanged. What is still uncovered: **students, courses and
   grades created by specs other than `student-management.spec.ts`**, which do not use
   `TestDataTracker`. Either extend the tracker to them or — better, and what this item is —
   give the run its own database (separate name, or a throwaway container as the restore tests
   use) that is dropped and recreated per run. Evidence: "E2E: teardown, and four tests that
   could not fail".
2. **The restore round-trip tests never run automatically** — `test_database_manager_restore_roundtrip.py`
   skips unless `SMS_TEST_POSTGRES_URL` is set, so the batch runner and CI both skip all 9 of
   them (they are 9 of the 39 skips in the 2026-09-17 run). They are the only tests that
   exercise the restore engine against a real server, and they caught two bugs the fakes could
   not. Give CI a `postgres:16-alpine` service and set the variable for that job.
3. **`import_export.spec.ts` is skipped with a stale reason** — the whole describe is
   `test.describe.skip` with the comment "Feature not yet implemented - skip until
   import-export page is added", but `/admin/import-export` was given a working click-path in
   the 2026-09-11/12 Help-audit work. Either re-enable the spec or correct the reason.
4. **GradingView rebuilds the course list with one request per course** — selecting a student
   makes it call `enrollmentsAPI.getEnrolledStudents` for *every* active course to find that
   student's courses (`GradingView.tsx`, the `studentId` effect). It is correct but scales with
   the course count. Selecting the course first avoids it entirely, which is what the rewritten
   grade test now does.
5. **The 0.7s commit-gate flake** (2026-09-16) — *no action until it recurs.* The batch runner
   now logs the exit code, names a silent abort and retries it once, so the next occurrence
   should explain itself. Evidence: "The batch runner now records *why* a batch failed".
6. **`SMS_ALLOW_DIRECT_PYTEST=1` in the Windows user environment** — *owner action, outside the
   repo.* It permanently disables the `conftest.py` guard CLAUDE.md relies on to stop a bare
   `pytest` run from overwhelming VS Code. Clear it under System Properties → Environment
   Variables if the guard should apply on this machine. Evidence: gate audit, "Known, not
   changed".

---

## 💾 PostgreSQL backups that actually restore (September 17, 2026)

**Status**: ✅ DONE, not yet released. Closes todos 1 and 2 of the 2026-09-17 list. Owner chose
option (a): implement a real restore rather than ship `pg_dump`/`psql` with Native and SMS_Lite.

### What changed

**The backup format.** Without `pg_dump`, `create_backup` used to write table rows as CSV under
comment headers in a file named `.sql` — a "data export" nothing could restore. It now writes a
**data-only backup in PostgreSQL's COPY text format**: a `BEGIN`, one `TRUNCATE … RESTART
IDENTITY CASCADE`, a `COPY "table" (cols) FROM stdin` block per table, `setval` for every
sequence, `COMMIT`. Tables are emitted in foreign-key dependency order (topological sort over
`pg_constraint`), so parents load before children. The schema is deliberately absent — Alembic
owns it — and the header records the revision the backup was taken at.

**The restore.** `restore_backup` now dispatches on the file's first line:
- a data-only backup → the new `_restore_via_psycopg`, which works **with or without psql**;
- a `pg_dump` script → `psql`, as before, and a clear refusal when psql is missing;
- one of the old CSV exports → refused on sight, exactly as the containment did.

`_restore_via_psycopg` **parses its own format structurally and never executes the file**. It
reads the COPY blocks, checks every table and column against the live catalog, rebuilds each
statement from the catalog's own identifiers through `psycopg.sql.Identifier`, and streams the
row bytes through `COPY … FROM STDIN`. Row data therefore cannot become SQL by construction —
which is what the contained bug did. It also refuses a restore whose Alembic revision differs
from the target's, and runs everything in one transaction, so a failure rolls back.

**Dev Tools.** `/operations/database-restore` accepted files beginning `SQLite format 3` only,
so no PostgreSQL backup its own `/operations/database-backup` produced could be restored
anywhere in the app, Docker included. Non-SQLite files now go to `_restore_postgres_backup`,
which reads the file (handling `.gz`) and hands it to the same `restore_sql_content` entry
point. The backup message no longer says "data export … cannot restore it": both paths are
restorable now, and `restorable_in_app` reports the truth.

Also fixed on the way: the old export decoded each COPY chunk as UTF-8 text, which would raise
on a Greek name split across a chunk boundary. Backups are now written as bytes throughout.

### Verification

`test_database_manager_restore_safety.py` — **19 tests, all passing** (was 9). Keeps every
containment guarantee (old CSV exports refused with and without psql, nothing executed, a
fixture that fails the test if restore opens a connection or spawns a subprocess) and adds the
new engine: the parser returns `x;DELETE FROM users;y` as *data*; a stored `\.` cannot forge
the block terminator; a truncated backup is refused; revision mismatch, unknown table and
unknown column each refuse without writing anything.

`test_database_manager_restore_roundtrip.py` — **new, 8 tests, 7 passing and 1 skipped**
(the skip needs `psql`, which this machine does not have). It runs against a real PostgreSQL in
a throwaway container and is skipped unless `SMS_TEST_POSTGRES_URL` is set; the module docstring
gives the two commands. Round trip with a foreign key, a sequence and awkward data; values with
semicolons, tabs, newlines, Greek text and a literal `\.` survive; the sequence resumes so new
rows do not collide; parents are emitted before children; compressed backups round-trip; a
revision mismatch and a constraint violation both leave the data untouched.

The container also proved the **portability claim** directly: the backup file was restored with
`psql -v ON_ERROR_STOP=1` (exit 0), after which `users` still held both rows and the student
name was still the literal `x;DELETE FROM users;y` — the embedded `DELETE` never ran.

One real bug was caught by the container that the fakes could not: `_sequence_states` read
`is_called` from `pg_sequences`, which has no such column. Without it a restored sequence hands
out its last used id again. It now reads the sequence relation itself.

`test_devtools_postgres_restore.py` — **new, 5 tests**, covering the routing, a failed restore
reported as a failure, the CSV refusal, a PostgreSQL backup on a SQLite deployment, and an
unreadable file. **Proven to catch the bug**: with `operations.py` and `database_manager.py`
reverted to HEAD, all 5 fail with "Backup file is not a valid SQLite database".

`test_admin_backup_encryption.py` (7) passes with assertions updated to the new, honest message.
`ruff`, `tsc --noEmit` and `eslint` are clean.

### Also removed

`/api/v1/admin/backup-database` (todo 6) — SQLite-only, no callers outside the plan document,
superseded by the two panels. Deleted with its now-unused `shutil` import; the app still starts
and the route is gone from the table.

---

## 🧪 E2E: teardown, and four tests that could not fail (September 17, 2026)

**Status**: ✅ DONE, not yet released. Closes todos 3, 4 and 5 of the 2026-09-17 list. Owner
chose "teardown now, disposable database after" — the disposable database is todo 1 above.

### Teardown

`TestDataTracker` in `src/frontend/tests/e2e/helpers.ts` records what a test creates and deletes
it in `afterEach`, newest first, in an order that respects references (enrolments, then grades
and attendance, then students and courses, then accounts). A 404 counts as success, since some
specs delete their own rows. Cleanup never fails a test; it reports what it could not delete,
loudly — a silent cleanup is how the leak went unnoticed.

Accounts need `users:manage`, which the teacher accounts these specs log in as do not have (a
teacher deleting its own account gets 403), so accounts are removed with an admin token
obtained through a **separate request context**, which cannot disturb the signed-in session.
Admin credentials are resolved from `PLAYWRIGHT_ADMIN_EMAIL`/`PLAYWRIGHT_ADMIN_PASSWORD`, then
known defaults; when none work, the tracker names the accounts it is leaving behind.
`loginAsAdmin` uses the same resolution — it was hardcoded to `admin@example.com` with a
password that does not work on this machine, so it would have thrown for any spec that used it.

**Accounts are covered even in specs that do not use the tracker.** `registerUser` now appends
every account it creates to `test-results/e2e-created-users.jsonl` (`tests/e2e/created-users.ts`),
and a new `playwright-global-teardown.ts` deletes whatever the file holds at the end of the run.
Because the record is a file rather than in-memory state, it survives the process: a run that
crashes is tidied up by the **next** one. Accounts it cannot delete are named and the record is
kept, so nothing is silently dropped.

**Verified**:
- before and after a full `student-management.spec.ts` run — 8 students, 27 courses and
  11 accounts, unchanged. The same run previously added 5 students, 3 courses and 4 accounts;
- `login.spec.ts`, which registers two accounts through `registerUser` and never touches the
  tracker: "🧹 [E2E TEARDOWN] Removed 2 test account(s) created by this run", account total
  unchanged. The two accounts an earlier run of that same spec left behind — before this
  existed — were still sitting in the database, which is exactly the leak it closes.

### Four tests that passed without testing anything

1. **Grade assignment** (todo 4) navigated to `/#/grades`. The grading route is **`/#/grading`**;
   finding no form, it logged "Grades page UI not found, skipping test" and returned. Its final
   assertion was no better — it fell back to matching `/Grades?|Grade/i`, which any page with
   the word "Grade" satisfies. The selectors it used were right all along. It now uses the real
   route, treats a missing form as a failure, picks course-then-student (so the student
   appearing is itself proof the enrolment reached the UI), and confirms the grade by reading it
   back from the API instead of from the screen.
2. **Enrolment had never worked anywhere.** Specs posted `{student_id, course_id, semester}` to
   `/api/v1/enrollments/` — a route that only accepts GET — and swallowed the resulting **405**
   with `.catch(() => {})`. The endpoint is `POST /enrollments/course/{course_id}` with a
   `student_ids` list. That is what the attendance spec's "Could not find matching course
   option" workaround was working around. Now a checked `enrollStudentViaAPI` helper.
3. **Every test course was created inactive.** The fixture hardcoded `semester: 'Fall 2025'`.
   The backend derives `is_active` from the semester when the field is omitted
   (`_auto_is_active`), and Fall 2025 ended 30 January 2026 — so the API created the course
   *inactive*, and the grading and attendance views list active courses only. The fixture now
   computes a current semester label and sends `is_active` explicitly, so it cannot rot again.
4. **The analytics test computed a "final grade" with no grades.** Both of its grade POSTs
   returned **422** (`assignment_name` is required) and neither response was checked. Fixed in
   the spec and in `createGradeViaAPI`, which had the same omission.

The two student setup steps that logged and `return`ed on failure now assert instead.

### `test@example.com` (todo 5)

The account is a **teacher**; `loginAsTestUser` declared `role: 'admin'`, and that label was
never checked against anything — it was only logged. The helper now reads the role back from the
session after login and returns the truth (the run log shows `role: teacher`), and a spec that
needs admin rights says so with the new `expectRole(page, 'admin')` or uses `loginAsAdmin`.
Nothing needed the admin rights: all 7 specs pass as a teacher.

**Verified**: `student-management.spec.ts` — **7/7 passing**, repeatedly, against Native mode.

---

## 🛡️ PostgreSQL restore could execute backup data as SQL — contained (September 17, 2026)

**Status**: ✅ CONTAINED, not yet released (owner chose containment; a real restore is still
open). Found while investigating the follow-up "`/api/v1/admin/backup-database` refuses
PostgreSQL", which turned out to be the smallest of the problems in this area.

### What was wrong

This applies wherever the PostgreSQL client tools are **not** installed — this dev machine,
Native mode, and SMS_Lite installs connecting to the QNAP Postgres. `Dockerfile.fullstack`
does install `postgresql-client`, so the Docker stack never reaches these fallbacks.

1. **The Database panel's backup** (`POST /control/api/database/instances/{name}/backup` →
   `database_manager.create_backup`) falls back without `pg_dump` to a psycopg `COPY`
   export: every table's rows as **CSV** under comment headers, with no schema and no SQL,
   in a file named `.sql`. The panel still reported "Backup created".
2. **Its restore** (`POST /control/api/database/backups/{file}/restore` → `restore_backup`),
   without `psql`, split the file on `;` and executed every fragment on an **autocommit**
   connection. Proven by calling the real `_restore_via_psycopg` with a fake connection that
   recorded statements instead of running them:
   - a typical export → `success=True, statements_executed=0`: **reported success,
     restored nothing** (the whole file is one chunk starting with `--`, which is skipped);
   - a student named `x;DELETE FROM users;y` → it would execute exactly
     **`DELETE FROM users`**, still reporting `success=True`. PostgreSQL's CSV output does
     not quote semicolons, and the split ignores quoting anyway. Stored SQL injection,
     triggered by an admin clicking Restore (`DatabasePanel.tsx`).
   The executor could not restore anything this module writes: `pg_dump`'s plain format
   carries its data in `COPY … FROM stdin` blocks, and the fallback export is CSV.
3. **The Dev Tools backup** (`/operations/database-backup`) said "Encrypted PostgreSQL backup
   created successfully", but its paired `/operations/database-restore` accepts only files
   that start `SQLite format 3`. **No PostgreSQL backup made there — `pg_dump` or not — can
   be restored through the app**, including on Docker. That restore at least fails loudly.

**Correction to the 2026-09-16 account cleanup:** the "encrypted PostgreSQL backup" taken
before deleting the 234 stress-test accounts came from path 3 via the CSV fallback, so it was
never a usable restore point. Nothing was lost — the deleted accounts were disposable — but it
was described as a safety net it was not.

### Containment

- `restore_backup` recognises a psycopg COPY export by its first line — both the original
  `-- SMS PostgreSQL Backup (psycopg COPY)` header and the new one, so exports already on disk
  are covered — and **refuses** it before anything runs, with or without `psql`.
- The split-and-execute fallback is **removed**. Without `psql`, restore returns
  `success=False` with "needs the PostgreSQL client tools (psql) … Nothing was changed."
- The fallback export now says in its own header that it is **not a restorable backup**, and
  its result carries `restorable: false` and a `warning`. `BackupResult` gained both fields,
  and the Database panel shows the warning (new `db.backupNotRestorable`, EN + EL); `pg_dump`
  backups carry `restorable: true`.
- The Dev Tools backup message now says what was produced: "PostgreSQL data export … the app
  cannot restore it" without `pg_dump`, or, with `pg_dump`, that it must be restored with
  `psql` because the Dev Tools restore accepts SQLite backups only. Details carry
  `restorable_in_app: false` and the warning.

### Verification

`test_database_manager_restore_safety.py`, 9 tests:
- refusal of both header generations with `psql` present and absent, with a fixture that
  fails the test if restore opens a connection or runs a subprocess;
- refusal instead of execution when `psql` is missing;
- genuine SQL handed to `psql` when it is present;
- the export detector matching only exports;
- a **round trip** — what the fallback backup writes is exactly what restore refuses;
- `pg_dump` results marked restorable.

**Proven to catch the bug**: with `database_manager.py` swapped back to its HEAD version,
**8 of 9 fail**. The no-`psql` test fails on `assert 'psycopg' == 'none'`, showing the
original really took the executor path; the one that still passes is the `psql` hand-off,
which was already correct. Restored, 9/9 pass. `test_admin_backup_encryption.py` (7) passes
with new assertions on the honest Dev Tools message. `ruff`, `tsc --noEmit` and `eslint`
are clean.

### Left open — all resolved on 2026-09-17

Everything this section left open was fixed the same day; see **PostgreSQL backups that
actually restore** above for the implementation and its evidence.

- ~~**No working PostgreSQL restore without the client tools**~~ — backups are now data-only
  COPY-format files that `_restore_via_psycopg` restores in-app, no `psql` needed.
- ~~**The Dev Tools restore accepts SQLite only**~~ — non-SQLite files are routed to the same
  restore engine, so its own PostgreSQL backups can finally be restored, on any deployment.
- ~~`/api/v1/admin/backup-database`~~ — deleted.

---

## ✅ Follow-ups closed: E2E reliability + dead deploy scripts (September 17, 2026)

**Status**: ✅ DONE, not yet released. Tests, scripts and docs only — no application code.

Two items from the open follow-ups list (end of the smoke-test section below).

### E2E specs that failed, or silently tested nothing, in a local run

All three causes recorded on 2026-09-16 are fixed, plus two more found while fixing them:

- `advanced_search.spec.ts` navigated to a hardcoded `http://localhost:5173` fallback while
  `loginViaAPI` planted the session on the config's `127.0.0.1` origin — now a relative
  `page.goto('/#/students')`, so both use the configured baseURL.
- The student edit/delete tests created records through the API and hash-navigated into an
  app that had already cached the student list (`cachedGet`, 10s, in memory). They now
  `page.reload()` after navigating, which discards that cache. The grade and attendance tests
  had the same race — attendance logged "Could not find matching course option" and passed
  without exercising selection — and got the same fix.
- `feature_127_import_export.spec.ts` hardcoded the Docker default admin credentials with no
  override; it now honours `E2E_EMAIL` / `E2E_PASSWORD`, like `advanced_search`.
- **New:** five student-management tests computed their API base as
  `process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8000'` — the *frontend* URL whenever
  that variable is set, and a different hostname from the page otherwise. `helpers.ts` now
  exports its origin-aware `getApiBase()` and all five use it.
- **New:** the analytics test could not fail. It navigated to `/students/<id>` without the
  `#` (HashRouter loads the app root, not the profile), swallowed its only content assertion
  in a `.catch` that logged "Student name not visible on profile", then asserted the URL
  contained the path it had just navigated to. It now navigates to `/#/students/<id>` and
  hard-asserts the `student-profile` element and the student's name.

**Verified** in exactly the configuration that failed before (default local config, no
`PLAYWRIGHT_BASE_URL`, credentials via `E2E_EMAIL`/`E2E_PASSWORD`): **13/13 passed** across the
three specs, where the 2026-09-16 run had 8 failures in them. Attendance no longer logs the
course-option warning; the analytics test passes with real assertions. `eslint` reports no
errors on the changed files, and `playwright --list` compiles all 13. One test still passes
without testing — grade assignment's selectors no longer match the UI — logged as a new
follow-up rather than rewritten here.

The run's own side effects were measured against a pre-run snapshot and removed: 5 students
and 4 `teacher-*@test.edu` accounts, bringing both counts back to baseline (8 students, 4
users). Its 3 test courses and the 3 left by the 2026-09-16 smoke test were then deleted with
the owner's explicit approval, after checking each was a `CS*` "Test Course" row with zero
enrollments: 26 courses remain, all real `AUT*` curriculum.

### Dead deploy scripts removed, deploy README rewritten

`scripts/deploy/run-docker-release.ps1` **and an identical `.sh` twin** only launched a
`SMART_SETUP.ps1` that exists nowhere in the repo, so both always failed with "not found".
Both deleted.

Checking the README entries that referenced them showed `scripts/deploy/README.md` was almost
entirely stale: it documented **five scripts that no longer exist** (`DOCKER_UP.ps1`,
`DOCKER_DOWN.ps1`, `CREATE_PACKAGE.ps1`, `INSTALLER.ps1`, `SMART_SETUP.ps1`), gave pre-flatten
paths for three that do, claimed versioned volume names (`sms_data_v1.2.3`) when the volume is
plain `sms_data`, and cited an archive folder that does not exist. It was rewritten to state
only verified facts, each named path checked to exist.

Its old Linux fallback, `docker compose -f docker/docker-compose.yml up -d --build`, was wrong
twice: the path is pre-flatten, and at the correct path `docker compose config` fails with
`required variable SECRET_KEY is missing a value`. `DOCKER.ps1` supplies secrets through
`--env-file` and runs a single-image `sms-fullstack` container rather than plain Compose. No
simple equivalent exists, so the new README says `pwsh` is required instead of documenting a
command that does not work. `scripts/README.md` listed the dead launcher as "Active" and put
`CHECK_VOLUME_VERSION.ps1` in the wrong folder; both corrected.

---

## 🚀 v1.18.43 (September 16, 2026) — released

**Status**: ✅ RELEASED | Tag `v1.18.43` on release commit `70bfa355e` |
<https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.43>

Ships the 18 commits since v1.18.42 — every section between this heading and the v1.18.42
heading. Cut with `RELEASE_READY.ps1 -ReleaseVersion 1.18.43 -TagRelease` on the third run;
the first two stopped on release-pipeline bugs described in the next section.

**Verified on the published assets themselves**, downloaded back from the release rather
than trusting workflow status:

| Asset | Check |
|---|---|
| `SMS_Installer_1.18.43.exe` (76.17 MB) | Authenticode **Valid**, signed `CN=AUT MIEEK`, timestamped; file and product version **v1.18.43** |
| `SMS_Android_1.18.43.apk` (3.96 MB) | `aapt dump badging`: `versionCode='118043' versionName='1.18.43'` — the first APK since 1.18.32 to report its real version |
| Release body | 781 characters, **4 code fences intact**, no false breaking-change banner, not the `Release v1.18.43` fallback |

At the tag: `VERSION` v1.18.43, `build.gradle` 118043/1.18.43, `package.json` 1.18.43, and
`.github/RELEASE_NOTES_v1.18.43.md` present. Workflows: Create GitHub Release, Build & Upload
Installer, and Build & Upload Android APK all succeeded, as did CI/CD and E2E on the release
commit. The release is published, not draft or pre-release, and is `latest`.

This was the first release to exercise, for real: the Android version sync, the
always-rebuild SMS_Lite and frontend fixes, the release-notes generator fixes, and the
content-bound commit guard — which let the release commit through with "Checkpoint matches
the content being committed".

---

## 🧯 Cutting v1.18.43: five release-pipeline bugs, two of which together published a bad tag (September 16, 2026)

**Status**: ✅ All FIXED, **released in v1.18.43**; the bad tag was rolled back before any asset was
attached. Numbered in the order they were found, which is the reverse of the order below:

1. step 2's version list had drifted from the verifier's — found by reading the script
   before running it (`ad12e30a9`);
2. an array splat bound `-Action` as a value — found by the first run (`1c359d7c0`);
3. the commit guard was not staging-invariant for new files — found by the second run;
4. RELEASE_READY tagged after that failed commit — found by the second run;
5. the published release body lost every backtick — found by inspecting the second run's
   generated notes before re-cutting.

Bugs 3-5 are fixed in `83c26d13d`, along with a latent hazard found while fixing 4: the tag
step force-moved any existing tag.

*(This section and the status block originally said "four" bugs, counting 3 and 4 as one;
corrected by the post-release plan review.)*

### Bug 5: the release body would have lost every code block

Before re-running, the release notes that run two generated were checked for the problems
last session fixed. No false breaking-change banner and no backslash-mangled paths — but the
install commands appeared as bare text under a stray `powershell` line. The generator's
fences were intact in `docs/releases/GITHUB_RELEASE_v1.18.43.md`; they were removed on the
way into `.github/RELEASE_NOTES_v1.18.43.md`, the **only** file `release-on-tag.yml`
publishes as the release body, by this line in `GENERATE_RELEASE_DOCS.ps1`:

```powershell
# Sanitize: remove fenced code blocks (just in case) by replacing triple backticks
$sanitized = ($githubRelease -replace "```+", "")
```

In a double-quoted string that is the regex `` `+ ``, which deletes every run of backticks —
fences and inline `code` alike. It silently undid last session's fence fix (trap 3 in the
v1.18.42 section) for the text that is actually published.

The strip also protected against nothing. The workflow reads the file with `$(cat …)`,
base64-encodes it and decodes it in JavaScript, so no backtick ever reaches a shell.
Replayed locally with the workflow's exact bash lines and Node decoding, a body containing
fences, inline `` `code` ``, `$(whoami)` and `` `date` `` came back **byte for byte**.
**Fixed**: the notes are written verbatim. Checked on run two's real generated body:
4 fences generated → 0 after the old strip → 4 with the fix.

### Bugs 3 and 4: the second run tagged the wrong commit

With the splat fixed and CI green, run two got through validation, the version bump, a
signed installer build (Authenticode valid, file/product version v1.18.43), both remaining
gates and release-doc generation — then printed, in order:

```text
Committing release changes...
❌ COMMIT BLOCKED: the code changed after it was validated
No changes to commit (or commit failed). Continuing with push/tag...
✅ Tag v1.18.43 pushed successfully!
```

and exited **0** with "Release 1.18.43 Complete!". The tag landed on `1c359d7c0`, whose
`VERSION` still read v1.18.42 and which had no release notes. `release-on-tag.yml` had
already created a **published** GitHub release and dispatched the installer and APK builds
from that tag.

**Contained** within minutes: both builds cancelled mid-run, confirmed **zero assets
attached**. With the owner's approval, the empty release and the remote and local tag were
deleted, the staged release changes were backed up to a patch and discarded, and v1.18.42
became "latest" again — as if the run had not happened, apart from cancelled runs in the
Actions history.

Two bugs had to line up:

3. **The commit guard was not staging-invariant for new files** (introduced in `2400a4158`,
   this session). Its fingerprint hashed the *text* of `git diff HEAD` for tracked changes
   and the content of untracked files separately. Staging a modified tracked file leaves the
   diff unchanged — the only case that commit tested — but staging a **new** file moves it
   from the untracked half into the diff half. A release always creates new files (the
   release notes), so `git add .` changed the fingerprint and the hook reported "same file
   list, different contents — a file was edited after validation" when nothing had been
   edited. The claim recorded in the gate-audit section below, that `git add -A` "does not
   invalidate the checkpoint — verified", was true only for modified files.
   **Fixed**: the fingerprint now hashes (path, working-tree content) pairs over one path set
   — every path differing from HEAD (`git diff HEAD --name-only --no-renames`) plus every
   untracked path — so staging only moves a path between the two lists and changes nothing.
   `--no-renames` keeps a rename symmetric in both states, and the computation is pinned to
   the repo root because `ls-files --others` and `hash-object` resolve against the current
   directory. Verified across nine scenarios (checkpoint with a new untracked file, then
   `git add -A`: **PASS**; from `src/backend` as cwd: PASS; staged new file edited: BLOCK;
   reverted: PASS; another file appears: BLOCK; removed: PASS; unstaged again: PASS;
   validated file deleted: BLOCK). The **old** guard, extracted from HEAD, reproduced the
   release failure on the same steps: PASS before `git add -A`, BLOCK after.
4. **RELEASE_READY treated a failed commit as "no changes" and tagged anyway** (pre-existing).
   **Fixed**: `git diff --cached --quiet` now distinguishes "nothing to commit"; any other
   commit or push failure in steps 7 and 8 exits 1. Before tagging it now also refuses unless
   HEAD's *committed* `VERSION` equals the tag, the tree is clean, and HEAD equals
   `origin/main` — any one of which would have stopped this tag on its own. Separately, the
   tag step used to **delete an existing tag locally and on the remote and re-push it with
   `--force`**, so re-running with an old version number would silently move a published
   tag, against CLAUDE.md's "release tags are immutable". It now refuses and prints the
   commands for a deliberate deletion. Verified against the real repo in exactly the bad
   state (HEAD at v1.18.42, releasing 1.18.43): the VERSION check refuses, a dirty tree
   refuses, moving `v1.18.42` refuses, creating an absent `v1.18.43` is allowed, and a commit
   blocked by the real pre-commit hook takes the new exit-1 path with HEAD unchanged.

### Bug 1: the version bump would have aborted the release at step 4

Read through `RELEASE_READY.ps1` before trusting it with the release, because two of today's
fixes (the Android version sync and the release-pipeline traps) had never been through a
scripted release. Step 2, `Update-VersionReferences`, bumps the version by **hand-editing a
fixed list of files** — and that list had drifted from the one `VERIFY_VERSION.ps1` checks.
It never touched the user guide, the developer guide, `pyproject.toml` or Android's
`build.gradle`. Step 4 then runs `COMMIT_READY -Quick`, whose version phase runs the
verifier with `-CheckOnly` and **fails the gate on exit code 2**. So the script would have
aborted with "Pre-commit validation failed after retry" — after step 3 had already built
and signed the installer, leaving a half-bumped tree.

Not a guess: reproduced by bumping every reference to 1.18.43 and then restoring exactly
the four step 2 never touches. `VERIFY_VERSION.ps1 -CheckOnly` returned **exit code 2 with
five inconsistencies** (both guides, `pyproject.toml`, `versionName`, `versionCode`). The
v1.18.42 release was cut by hand, which is why this path had not run end to end since the
guides and `pyproject.toml` were added to the verifier.

**Fixed**: step 2 now finishes by calling `VERIFY_VERSION.ps1 -Version <new> -Update` and
then `-CheckOnly`, and aborts *before any build* if either fails — so the verifier's list is
the only list. It exits rather than returning `$false` on purpose: the function's `python`
and `INSTALLER_BUILDER` calls write to the pipeline, so a return value would arrive as an
array and read as success — the same trap that disabled COMMIT_READY's checkpoint. Verified:
after those two calls, step 4's own invocation (`VERIFY_VERSION.ps1 -CheckOnly`, reading
`VERSION`) reported **11/11 consistent, exit 0**. Also corrected COMMIT_READY's hardcoded
"All 9 version checks passed" — there are 11. (Commit `ad12e30a9`.)

### Bug 2: the first real run died at step 3 anyway

With that fixed and CI green, the first `RELEASE_READY.ps1 -ReleaseVersion 1.18.43
-TagRelease` passed validation (gate plus the full batch suite), bumped all 11 references
cleanly — the fix above working as intended — and then failed at the installer build:

```text
Cannot validate argument on parameter 'Action'. The argument "-Action" does not belong
to the set "audit;build;validate;sign;test;release;update-images"
```

`Invoke-InstallerBuild` called the builder with an **array** splat —
`$builderArgs = @('-Action', 'build', '-Version', $Version, '-AutoFix')` then
`& $installerBuilderScript @builderArgs`. Splatting an array into a PowerShell script passes
every element *positionally*: `'-Action'` is just a string, so it was bound as the **value**
of `$Action`, and the ValidateSet rejected it. Array splatting of `-Name` strings only
behaves the way this code assumed for native executables. `git blame` puts those lines in
`47fd7e60d` — the previous session's own fix for the stale-SMS_Lite trap — and since
v1.18.42 was cut by hand, no release had executed them until this one.

**Nothing was published.** The script exits before step 7, so there was no commit, push or
tag; the 14 files step 2 had bumped were restored with `git checkout`, leaving `main`
exactly at `ad12e30a9`.

**Fixed** with a hashtable splat (`@{ Action = 'build'; Version = $Version; AutoFix = $true }`,
adding `ReuseLiteBuild = $true` under `-SkipLiteBuild`). Verified three ways: the array form
reproduces the release's exact error against the real builder (`-Action validate`, which
modifies nothing), the hashtable form binds (`Action: VALIDATE`), and the fix's exact shape
binds every parameter in both branches — `Action=build Version=1.18.43 AutoFix=True`, with
`ReuseLiteBuild` false by default and true under `-SkipLiteBuild`.

The other two array splats in the scripts were checked too. `precommit_workflow.ps1` is
correct — it goes through `pwsh -File`, a native call where array splatting is right.
`scripts/deploy/run-docker-release.ps1` has the same bug but cannot reach it: it targets a
`SMART_SETUP.ps1` that no longer exists anywhere in the repo, so it throws "not found"
first — logged under "Follow-ups raised during this work" as a dead script (removed 2026-09-17).

---

## 🔥 Pre-release smoke test: 4 real bugs, 3 of them in SMS_Lite (September 16, 2026)

**Status**: ✅ FIXED and re-verified against rebuilt artifacts, **released in v1.18.43**. Commit
`05b286b85`.

A full smoke test before cutting a release. Native and Docker passed; **every bug was in
the two modes that only a packaged artifact can exercise**, which is the argument for
running this against real builds rather than against `npm run dev`.

### 1. SMS_Lite answered static file requests with HTML

`lite_simple_entrypoint.py` registered a catch-all `@app.get("/{path:path}")` that returned
`index.html` for every non-API path **without checking whether the file existed**.
`logo.png` and the favicons survived only because `app_factory` gives each of them its own
explicit route; the Credits image has none, so a request for
`/AUT_Logo_realistic_Credits.jpg` was answered `200 text/html`, 5,216 bytes — the browser
asked for a JPEG and got a web page. The image was in the bundle the whole time; only the
routing was wrong.

Caught by running `credits.spec.ts` against the Lite binary: `naturalWidth: 0`, exactly the
broken-image case that assertion was written for. **Fixed**: real files under the bundled
dist now win over the SPA fallback, with a traversal guard so `..` cannot escape it.
After: `200 image/jpeg, 689,409 bytes`.

### 2. SMS_Lite only worked when opened as `localhost`

`src/frontend/.env` carries `VITE_API_URL=http://localhost:8000/api/v1`, and Vite bakes it
into any build that does not override it. Lite serves UI and API from one origin, so the
absolute URL turns every API call into a **cross-origin** request when the user opens
`http://127.0.0.1:8000` — the HttpOnly `refresh_token` cookie belongs to the other origin,
`refreshAccessToken()` fails, and the app sits on the login screen with correct credentials
and no error. The same applies to reaching a Lite install from another machine on the LAN,
where `localhost` resolves to the *client*.

Proven by running the identical build twice: **0/3** credits specs passed via `127.0.0.1`,
**2/3** via `localhost` (the third being bug 1). **Fixed**: `Invoke-NativeLiteBuild` now
sets `VITE_API_URL=/api/v1` for the frontend build — what `docker-compose.yml` and
`NATIVE.ps1` already did — and restores the caller's value afterwards. The rebuilt bundle
contains zero occurrences of `http://localhost:8000`, and all **3/3** specs pass via
`127.0.0.1`.

### 3. SMS_Lite reported `version=unknown`

`get_version()` walks the ancestors of `app_factory.py` looking for a `VERSION` file — its
docstring covers the native and Docker layouts, but the PyInstaller spec never bundled one,
so the frozen exe fell through to `"unknown"` in `/health` and everywhere the version is
shown. **Fixed** in `lite_simple_entrypoint.spec` by shipping `VERSION` to `_internal/`,
which the existing lookup finds with no code change. After: `version=v1.18.42`.

### 4. Android had been shipping the wrong version since 1.18.32

`src/frontend/android/app/build.gradle` still read `versionName "1.18.32"` /
`versionCode 118032` while `VERSION` said 1.18.42 — confirmed on the device itself, which
reported 1.18.32 for a build installed the day before. `VERIFY_VERSION.ps1` had **no
Android check at all**, so roughly ten releases published an APK that misreported its own
version, with a `versionCode` that never incremented (Android refuses an upgrade whose code
does not increase).

**Fixed**: both values are now in the sync chain (11 checks, all green). The versionCode is
derived as `major*100000 + minor*1000 + patch`, matching the existing numbering. The
verifier needed a small extension to express this honestly: its comparison assumed every
reference is a semver string, so an integer check could only ever print "Pattern matched
but couldn't extract version" — a check that never passes. Checks may now declare an
`ExpectedLiteral`, so the versionCode check genuinely verifies rather than permanently
warns.

### What passed

- **Native**: health `v1.18.42` matching VERSION, Postgres connected, migrations at head;
  E2E 82 passed / 8 failed / 43 skipped, with **all 8 failures explained and none a product
  defect** — 2 from a spec hardcoding `localhost:5173` against a `127.0.0.1` baseURL, 2 from
  tests racing the deliberate 10s `cachedGet` TTL (network log shows no refetch on hash
  navigation and the row appearing once the TTL expires), 4 from credentials that no longer
  match this database.
- **Docker**: `v1.18.42`, `env=docker`, container healthy, same remote Postgres as Native,
  and `credits.spec.ts` **3/3 against the production bundle**.
- **Installer**: built, **Authenticode Valid**, file and product version both `v1.18.42`.
- **RBAC spot-checks**: a teacher is correctly bounced from `/admin/import-export`, and
  `/api/v1/admin/health` returns **403 from the LAN address** while answering on loopback —
  the documented loopback-only rule, working.

### Dev-database cleanup (owner-approved)

238 accounts, of which **234 were leftovers from previous stress tests** (186
`teacher-*@test.edu`, 48 `e2e-*@example.com`, 1 `e2e-smoke-*`): every E2E run registers
accounts and nothing ever removed them. Deleted after taking an encrypted PostgreSQL backup
(`backups/database/backup_20260916_112732.enc`, AES-256-GCM), leaving exactly the 4 real
accounts. Also removed the 8 student rows this session's own E2E runs created.

Two notes from doing it: the **`/api/v1/admin/backup-database` endpoint refuses PostgreSQL**
("Backup supported only for SQLite DB") while `/control/api/operations/database-backup`
handles it — two backup implementations, only one of which works in the deployed
configuration. And three `Test Course *` rows (ids 80-82) from this session's E2E run are
still present; removing them was out of scope for the approval given.

### Follow-ups raised during this work

History of what this smoke test and the 2026-09-16 plan review raised. The items still open
are tracked in **Next todos** at the top (since 2026-09-17), each marked below with its number.
The first three had been reported but were not written into this plan until the plan review.

- ~~**Android: `triggerEvent` console error on launch.**~~ **EXPLAINED 2026-09-17 — harmless, no
  change needed.** Reproduced on the Galaxy A55 across four cold launches: **0** errors on
  two normal launches (screen on, unlocked), **exactly 1** when the app was sent Home ~300 ms
  into loading, and **exactly 1** when launched with the screen off (how it was first seen).
  Cause, read in Capacitor 7.6.6: `MockCordovaWebViewImpl.handlePause` calls
  `triggerDocumentEvent("pause")`, which evals `window.Capacitor.triggerEvent(...)` without
  checking the bridge has loaded, so a pause during page load throws. The event is lost, but
  SMS registers no `pause`/`resume` document listener and no `appStateChange` handler — its
  only App listener is `backButton`, which uses the plugin channel — so nothing depends on it.
  Upstream behaviour, not SMS code. Original note: logcat on the Galaxy A55 shows
  `Uncaught TypeError: Cannot read properties of undefined (reading 'triggerEvent')` once
  per launch, from `Capacitor/Console` at line 1. The app launches, logs in and works
  normally, so impact is unknown rather than visible — which is also how the
  `Preferences.then()` error looked before it turned out to disable storage entirely.
  Worth identifying the caller before calling it cosmetic.
- ~~**E2E suite is fragile in a local environment**~~ **FIXED 2026-09-17** — see "Follow-ups
  closed" at the top. Originally, for three separate reasons, none a product defect but all
  wasting time on every local run:
  - `advanced_search.spec.ts` falls back to `BASE_URL = 'http://localhost:5173'` while
    `playwright.config.ts` falls back to `http://127.0.0.1:5173` — so they disagree
    whenever `PLAYWRIGHT_BASE_URL` is unset, i.e. every local run. `loginViaAPI` plants the
    session on the config origin, the spec navigates to the other one, and the user lands
    on the login page. The helper's `getApiBase()` already warns about exactly this.
  - The student edit/delete tests create a student via the API and hash-navigate straight
    to `/#/students`, which triggers no refetch inside `studentsAPI.getAll`'s 10s
    `cachedGet` TTL — so they race a deliberate cache. They need a reload or a wait on the
    list request, not a longer timeout.
  - `feature_127_import_export.spec.ts` (and `advanced_search`'s defaults) hardcode
    `admin@example.com` / `YourSecurePassword123!` — the Docker default — which stops
    matching as soon as that password is changed, and `feature_127` offers no
    `E2E_EMAIL`/`E2E_PASSWORD` override.
- ~~**E2E runs leak data into the database they run against**~~ **FIXED 2026-09-17** — a
  `TestDataTracker` teardown now deletes what each spec creates; a full `student-management.spec.ts`
  run leaves students, courses and account counts unchanged. Pointing E2E at a disposable
  database remains **Next todos #1**. Original note: every run registers accounts
  and creates students and courses, and nothing removes them: 234 accumulated accounts had
  to be cleared by hand on 2026-09-16, and ~148 stray rows on 2026-09-05. The one-off
  cleanups treat the symptom; a teardown (or a disposable database) would stop the leak.
  Measured again on 2026-09-17: one run of three specs added 5 students, 3 courses and 4
  `teacher-*@test.edu` accounts.
- ~~**`test@example.com` is a teacher in the dev database**~~ **RESOLVED 2026-09-17** — the
  account really is a teacher and nothing needed admin; `loginAsTestUser` now reads the role
  back from the session instead of asserting one, and specs needing admin say so explicitly.
  Original note: while `loginAsTestUser` in
  `tests/e2e/helpers.ts` declares it `role: 'admin'`. Specs that assume admin rights behave
  differently here than wherever that user really is an admin.
- ~~**6 `Test Course *` rows** (ids 80-85) in the dev database~~ **DELETED 2026-09-17** with the
  owner's approval, after verifying each was a `CS*` test row with zero enrollments; 26 real
  `AUT*` courses remain.
- ~~**The grade-assignment E2E test passes without testing anything**~~ **FIXED 2026-09-17** —
  the selectors were right; the route was not (`/#/grades` vs `/#/grading`). Rewritten, and
  three more silent failures found behind it. See "E2E: teardown, and four tests that could not
  fail". Original note: it looks for
  `select[name="studentId"]` / `[data-testid="grade-form"]`, finds neither on the current
  grading page, logs "Grades page UI not found, skipping test" and returns — a pass. It is not
  the cache race (it still skips after the 2026-09-17 reload fix), so its selectors no longer
  match the UI and it needs rewriting against the current grading view.
- ~~**`/api/v1/admin/backup-database` refuses PostgreSQL**~~ **Investigated 2026-09-17** — it led
  to the restore that could execute backup data as SQL, now contained. See that section at
  the top, and then properly fixed the same day — see "PostgreSQL backups that actually restore". The endpoint itself has been deleted.
- **`SMS_ALLOW_DIRECT_PYTEST=1` is set in the Windows user environment** (→ **Next todos #6**),
  disabling the `conftest.py` guard — see the gate-audit section. Only fixable outside the repo.
- **The 0.7s commit-gate flake is still unexplained** (→ **Next todos #5**) — the batch runner
  now records enough to diagnose it (and retries a silent abort once), so the next occurrence
  should say why.
- ~~**`scripts/deploy/run-docker-release.ps1` is dead.**~~ **REMOVED 2026-09-17**, together with
  an identical `.sh` twin — see "Follow-ups closed" at the top. Original note: it invokes a `SMART_SETUP.ps1` that
  exists nowhere in the repo (a pre-flatten leftover), so it always throws "not found" — yet
  `scripts/README.md:265` and `scripts/deploy/README.md:98` still document it. It also
  array-splats named parameters (`@('-PreferDocker')`), the bug that killed the first
  v1.18.43 release attempt. Delete it and its README entries rather than repair it.

---

## 🚧 Gate audit: the commit gate was not actually gating (September 16, 2026)

**Status**: ✅ DONE, **released in v1.18.43**. Commit `2400a4158`. Scripts only —
`ENFORCE_COMMIT_READY_GUARD.ps1`, `COMMIT_READY.ps1`, `RELEASE_READY.ps1`,
`RUN_TESTS_BATCH.ps1`, `AUTO_COMMIT_AFTER_READY.ps1`, `.githooks/pre-commit`.

A review of how the gates actually run, prompted by the flake above. Every finding is the
same shape: a check that reports success without having checked anything.

### 1. The pre-commit checkpoint passed on file existence alone

`.commit-ready-validated` had `$MaxAgeMinutes = 0` and `Test-CheckpointValidity` returned
`$true` if the file was present. The pre-commit hook only ran `-ValidateOnly`, so **one
successful COMMIT_READY run, ever, unblocked every commit afterwards** — any branch, any
content, indefinitely. The hook's comment still said it checked the checkpoint was "fresh
(<5 minutes)" and its failure message still said "missing or expired"; neither had been
true since 2026-01-31.

That change was made for a good reason — validations legitimately outlast any deadline,
and the false "expired" failures were worse than useless. The mistake was dropping the
question rather than asking it properly: elapsed time was only ever a **proxy** for "has
the code changed since it was validated?".

The checkpoint now records what it validated and the hook compares against it:

- the fingerprint is SHA-256 over the HEAD commit, `git diff HEAD` (tracked changes,
  staged or not) and the content hashes of untracked non-ignored files, obtained from a
  single `git hash-object` call;
- `git diff HEAD` deliberately does not change when files are staged, so `git add -A`
  between validating and committing does **not** invalidate the checkpoint — verified;
  **⚠️ CORRECTED 2026-09-16: true only for *modified* files.** Staging a *new* file moved it
  from the untracked half into the diff half and changed the fingerprint, which blocked the
  v1.18.43 release commit. The fingerprint was rebuilt as (path, content) pairs over one
  path set so that staging cannot change it — see the release section at the top;
- there is still **no time limit**: a checkpoint from last week passes if the tree still
  matches, and one from a minute ago is refused if a file was edited after the run;
- a clean working tree passes regardless, since an amend or an empty commit contains
  nothing the gate could have validated — otherwise the guard would push people toward
  `--no-verify`, which skips the version-format check too;
- on mismatch it prints which paths entered or left the validated set, or says "same file
  list, different contents" when only the bytes changed;
- `SMS_COMMIT_READY_BYPASS=1` is a loud, documented single-commit escape, for the same
  reason.

Verified by exercising each path: checkpoint written, valid; `git add -A`, still valid;
new untracked file, blocked; file removed, valid again; one validated file edited,
blocked with "same file list, different contents"; reverted, valid again.

### 2. Every commit ran the hook's work twice

`.git/hooks/pre-commit` chains `pre-commit-legacy` "if present" — and `pre-commit-legacy`
turned out to be a **byte-identical older copy of the generated guard itself** (an earlier
install saved the hook it was replacing, which was already ours). So each commit ran the
checkpoint guard and the version validator twice, in four separate `pwsh` processes. The
generated hook now skips a legacy hook carrying our own `Auto-generated by COMMIT_READY.ps1`
marker. The stale copies were left in place rather than deleted — they are inert now.

### 3. `.githooks/` installed a file git never runs

`scripts/install-git-hooks.ps1` / `.sh` copy every file from `.githooks/` into
`.git/hooks/` **under its own name**, and the only file there was
`commit-ready-precommit.sample` — so the documented cross-platform install path installed
a hook that could never fire. Its body also invoked `${PWD}/COMMIT_READY.ps1`, a
pre-flatten path dead since June. Renamed to `.githooks/pre-commit` (git mv, so history
follows) and rewritten to match the generated hook: guard + version format, with a
pwsh-missing fallback. It deliberately does *not* run the full gate inline — a
multi-minute `git commit` would just get bypassed.

### 4. The release script's test run was a warning, not a gate

`RELEASE_READY.ps1` piped the full suite to `Out-Null` and, on failure, printed
"⚠️ Some tests failed - review before releasing" **and returned `$true`** — so a release
could be cut on a red suite with the failure output discarded. It now fails the release,
prints the last 40 lines and points at `backend_batch_full.txt`; `-SkipTests` remains the
deliberate override.

### 5. Quick mode's frontend scoping never matched anything

`COMMIT_READY.ps1` filtered changed frontend tests with `^frontend/src/…`, but git reports
paths from the repo root, i.e. `src/frontend/src/…` — dead since the June flatten, so quick
mode always ran the whole frontend suite. Also fixed `Get-ChangedFiles`, which looked at
unstaged files *only when nothing was staged*: a partially staged tree reported a subset,
so the quick scope could run tests for the wrong files. It now unions staged, unstaged and
untracked.

### 6. The gate edited the tree without saying so

`markdownlint --fix` runs over `**/*.md` on every invocation, rewriting files unrelated to
the commit, and then reported "passed" — so those edits rode along in the next `git add -A`
unreviewed. The run now snapshots markdown state before and after (numstat vs HEAD for
tracked files, content hashes for untracked) and lists what it rewrote. Separately, docs
lint was **non-blocking in `full` mode** unless `STRICT_DOCS_LINT=1`, which made the most
thorough mode the most permissive; it now blocks in every mode, with
`ALLOW_DOCS_LINT_FAILURE=1` as the explicit opt-out.

### 7. The checkpoint was never written at all — `$exitCode` was an array

Found by checking, after fixing (1), that a passing run actually produced a checkpoint. It
did not. The run ended, printed its summary, exited 0 — and never reached the
`🔒 Recording...` block.

`Invoke-MainWorkflow` ends with `return $(if ($script:Results.Overall) { 0 } else { 1 })`,
but several phase calls inside it (`Invoke-DocumentationCheck`, the cleanup-mode
`Invoke-AutomatedCleanup`, `Invoke-PreCommitHookValidation`) were **not** piped to
`Out-Null`, so their return values joined the function's output. `$exitCode` was therefore
an array like `@($true, 0)`, and in PowerShell:

```powershell
@($true, 0) -eq 0        # → @(0)   (filtering, not comparison)
if (@(0)) { ... }        # → False  (single-element array unwraps to 0)
```

So `if ($exitCode -eq 0)` was **false on success**. The checkpoint block, the snapshot
block and the "next steps" hints inside it had all been dead. That is why
`.commit-ready-validated` on this machine was a **zero-byte file** — no writer had touched
it in a long time — and why nobody noticed: the old guard accepted it on existence alone.
Both halves of the gate had to be broken for the whole thing to look like it worked.

Fixed in two places: the leaking calls are piped to `Out-Null`, and the entry point takes
the last emitted value and coerces it to `[int]` so a future leak cannot re-break it.

With the block reachable again, it needed guarding: `-Mode cleanup` returns 0 based on
cleanup results only, so it would have minted a "validated" checkpoint having run no lint
and no tests. A cleanup-only run, and any run with `-SkipTests`/`-SkipLint`, now says so
and writes nothing. Verified: `-Mode cleanup` printed *"Cleanup-only run - no checkpoint
written (nothing was validated)"* and left the checkpoint's timestamp untouched.

### 8. Three different expiry policies for one file

`scripts/AUTO_COMMIT_AFTER_READY.ps1` enforced its own **90-minute** age limit on
`.commit-ready-validated`, while the guard treated it as valid forever and the hook's
comment claimed 5 minutes. It now calls the guard's `-ValidateOnly` instead of keeping a
private rule, so there is one answer to "is this checkpoint good?".

### 9. The checkpoint is taken at the end of the run

A design limit of (1), worth stating rather than hiding: the fingerprint is recorded after
the checks finish, so a file edited *while* the gate is running gets blessed without having
been linted or tested. COMMIT_READY now fingerprints the tree before it starts and again at
the end, and warns when they differ — which also catches the gate's own auto-fixes. It
warns rather than fails because `markdownlint --fix` and version sync legitimately rewrite
files mid-run.

Demonstrated live rather than reasoned about: a `-Quick` run during which these scripts
were still being edited ended with *"Files changed while this run was in progress (or were
auto-fixed above) — the checkpoint covers the CURRENT contents, which the checks above did
not all see"*, immediately above the checkpoint it then wrote for 8 files. The final run
for this commit was made on a static tree and printed no such warning.

### 10. Smaller corrections

- The checkpoint was written by `& .\scripts\ENFORCE_COMMIT_READY_GUARD.ps1` — a relative
  path, so it silently did nothing whenever COMMIT_READY ran from anywhere but the project
  root. Now resolved from `$PROJECT_ROOT`, and the guard resolves its own checkpoint path
  from `git rev-parse --show-toplevel`.
- `-Quick` was documented as "2-3 min". Measured twice this session: **520s and 492s**. The
  help text and `docs/AGENT_POLICY_ENFORCEMENT.md` now say ~8-9 min, because quick mode
  runs the whole backend batch suite unless it can scope to changed test files.
- `RUN_TESTS_BATCH.ps1` retries a batch **once** when it exits non-zero having printed
  nothing — the flake signature. A reported test failure always prints output and is never
  retried. Verified with two probes in one run: the `os._exit(134)` probe retried and
  reported "failed twice" (2.3s for two 1.1s attempts), while an `assert False` probe
  failed once with "exit code 1 - tests failed" and no retry.

### Known, not changed

`SMS_ALLOW_DIRECT_PYTEST=1` is set in the **user environment** on this machine, which
disables the `conftest.py` guard that CLAUDE.md relies on to stop a bare `pytest` run from
taking down VS Code. Nothing in the repo can override that; it needs clearing in the
Windows environment variables if the guard is meant to apply here. Tracked as **Next todos #6**.

---

## 🔬 The batch runner now records *why* a batch failed (September 16, 2026)

**Status**: ✅ DONE, **released in v1.18.43**. Commits `936037c7e` (failure diagnostics) and
`edeceaf00` (log location and `backend_batch_full.txt`). `infra/scripts/testing/RUN_TESTS_BATCH.ps1`
only.

Reading the log of the flake above (`src/backend/test-results/backend_batch_run_20260916_005035.txt`)
corrected the diagnosis recorded there: the log is **not** dropping pytest's output. pytest
genuinely wrote nothing at all — and the runner never recorded the one fact that survives
that case, the **exit code**, which it read into `$exitCode` and used solely for an
`-eq 0` test. So the entire record of the failure was the line `✗ Batch 2 failed in 0.7s`.

Changes:

- **Exit code is always reported** on failure, in decimal and hex, with its meaning
  (pytest: `1` tests failed, `2` interrupted, `3` internal error, `4` usage error, `5`
  nothing collected — anything else means the interpreter itself aborted). That single
  number separates "tests failed" from "the process died", which the 0.7s duration could
  only hint at.
- **An empty batch is called out as an abort**, with the files in that batch and the
  command to re-run it with output shown. The log also now carries an explicit
  `(pytest wrote nothing to stdout or stderr for this batch)` marker, so a blank region in
  the log can no longer be mistaken for a logging failure — which is exactly the wrong
  turn the note above took.
- **`E` markers count as failures.** Only `F` was counted, so a batch whose tests errored
  during collection or fixture setup summarised as `Failed: 0` while exiting non-zero.
- **Failed *batches* are counted, not failed files.** The summary printed
  `$failedFiles.Count` under the label `Failed Batches`, and every file of a failing batch
  is recorded for retest — so one bad batch of 5 files read as "Failed Batches: 5". This
  is not hypothetical: `docs/development/PHASE4_ISSUE145_BLOCKER_REPORT.md` quotes
  `✗ Batch 16 failed` immediately above `Failed Batches: 5` in the same block. Batches are
  now reported as Ran / Passed / Failed, replacing `Completed: N` — which counted
  *attempted* batches and so described the failing one as completed.
- Skipped tests are now surfaced in the summary (they were counted per batch and thrown
  away), and the test total includes them.

### Verification

Reproduced the exact signature instead of waiting for the flake: a throwaway
`test_zzz_crash_probe.py` calling `os._exit(134)` at import time dies during collection
having printed nothing, run through the runner alongside a passing file (`-RetestFailed
-BatchSize 1`). The run reported:

```
✗ Batch 2 failed in 1.1s (exit code 134 / 0x00000086 - not a pytest exit code - the interpreter itself aborted)
✗   No output was captured, so this is an abort (crash/kill), not reported test failures.
✗   Files in this batch: test_zzz_crash_probe.py
```

with the summary reading `Passed: 1` / `Failed: 1 (1 test file recorded for retest)`, and
the same lines present in the log file. Probe and its log deleted afterwards; `git status`
clean apart from the script.

Also removed three dead variables the script carried: `$results` (a summary hashtable
initialised with zeros, then never written to or read — the summary uses loose counters)
and `$logStream`/`$logLocked`, left over from a logging approach that isn't used.

### The log file the docs tell you to read never existed

Found while fixing the above, and the same failure shape as the version-sync no-ops: a
check that cannot pass, reported as if nothing were wrong.

`CLAUDE.md`'s **Verification — evidence required** rule, `.claude/agents/test-runner.md`
and six places in `.github/copilot-instructions.md` all say to check results by reading
`src/backend/test-results/backend_batch_full.txt`. **No such file existed anywhere in the
repo**, and nothing in the runner ever wrote one. Run verbatim, the documented command
fails with `Cannot find path ... because it does not exist` — and because the error goes to
stderr while the piped `Select-String` prints nothing, the result looks exactly like a run
with no failures. Every "verified against the batch log" claim made that way was reading
nothing.

The reason no fixed path could be right: `$logPath` was `Join-Path (Get-Location) $LogFile`,
i.e. relative to **the caller's** working directory. `COMMIT_READY` pushes into
`src/backend` before invoking the runner, while `CLAUDE.md` tells a developer to run it
from the repo root — so logs accumulated in two unrelated directories (127 files in
`src/backend/test-results/`, 29 in `test-results/` at the root, same naming, same script).

Fixed at the source rather than by editing three documents to describe the mess:

- a relative `-LogFile` now resolves against `src/backend/`, so runs land in
  `src/backend/test-results/` regardless of the working directory (an absolute `-LogFile`
  is still honoured as given);
- the finished log is copied to `src/backend/test-results/backend_batch_full.txt` on both
  the pass and fail exits, which makes all three existing documents true as written;
- `$projectRoot` is now resolved once at the top from `$PSScriptRoot`, replacing a
  duplicate `$MyInvocation`-based computation further down.

Verified from the **repo root** (the case that used to write to the wrong place): the log
was announced and written at `src/backend/test-results/`, the root `test-results/` file
count stayed at 29, `backend_batch_full.txt` appeared, and CLAUDE.md's command run verbatim
against it printed the batch lines — including the new failure detail. The old root-level
`test-results/` directory still holds its 29 historical logs; nothing writes there now, and
they are gitignored, so they were left alone rather than deleted.

---

## 🧹 Post-release cleanup: Credits panel + three dead items (September 16, 2026)

**Status**: ✅ DONE, **released in v1.18.43**. Commits `570935e3e` (feature) and `6c6874b2a`
(cleanup).

### Credits panel added to the System tab (`570935e3e`)

A collapsible **Credits** card below Control Panel on `/#/power`, matching the existing
System Health / Control Panel card pattern (same toggle styling, `aria-expanded`/
`aria-controls`, and a `?showCredits=1` param alongside the existing ones). Shows the AUT
credits logo, app name and build version, the author with a LinkedIn link, the institution,
the MIT licence and copyright, and the open-source projects the system is built on.

Decisions worth keeping:

- The LinkedIn link uses `rel="noopener noreferrer"` — `target="_blank"` alone lets the
  opened page reach back through `window.opener` — plus an sr-only "(opens in a new
  window)" so the behaviour is announced rather than implied by an icon.
- The LinkedIn mark is an **inline SVG**, so the panel renders without a third-party
  request.
- Version comes from `VITE_APP_VERSION`, the same build-time value the footer uses, rather
  than a second hardcoded copy.
- The copyright year is pinned to **2025 to match the `LICENSE` file**, not
  `new Date().getFullYear()`, so the notice cannot drift from the licence it cites.
- The stack list was read from `package.json` and `requirements.txt` rather than assumed.
- Image lives in `src/frontend/public/` and is referenced as `/AUT_Logo_realistic_Credits.jpg`,
  matching the existing `/logo.png` usage; Capacitor serves from `https://localhost/`, so
  the root-absolute path also resolves on Android despite that build's relative base.

EN + EL translations both added (translation-integrity check passes). E2E coverage in
`tests/e2e/credits.spec.ts` (3 tests), including two that are more than box-ticking: the
logo is asserted via `naturalWidth > 0` so a missing file **fails** instead of passing on a
broken-image placeholder, and one asserts no raw `system.credits*` key leaks into the UI,
since i18next echoes missing keys back verbatim and would otherwise render them silently.

### Three dead items removed (`6c6874b2a`)

1. **`src/frontend/src/pages/PowerPage.tsx`** — zero references repo-wide. `routes.ts`
   exports the *name* `PowerPage` but lazy-loads `SystemPage`, so this file had not
   rendered since v1.17.5 despite its own docstring saying exactly that.
2. **`src/frontend/src/__e2e__/`** — **unrunnable**, not merely unused: its spec imports
   `login`/`logout`/`ensureTestUserExists` from a **0-byte** `helpers.ts`, so it cannot
   compile. Also excluded from vitest and outside Playwright's `testDir`. Its only commit
   is the June flatten. Checked for unique coverage first — its "Responsive Design" block
   looked unique but Playwright already runs the **whole** suite under Mobile Chrome
   (Pixel 5) and Mobile Safari (iPhone 12) projects, and `custom-dashboards.spec.ts` has
   its own responsive block at the same viewports. Nothing lost.
3. **`src/backend/data/data/`** (20 files) — runtime artifacts tracked because of a
   **doubled path**. The correct `data/exports/` and `data/imports/` are gitignored
   (`.gitignore:300-301`); the doubled path is not, so 17 zero-byte export CSVs and 3
   trivial import leftovers got committed while the real directories stayed clean. Same
   doubling disease `38f2d3e6b` fixed for `backend/backend`/`frontend/frontend`, missed
   here. Timestamps are the flatten date and nothing has written there since, so it was a
   leftover, not a live bug — no gitignore change needed.

### ⚠️ Flaky commit gate observed once (not reproduced)

During this work `COMMIT_READY -Quick` failed with backend batch 2 aborting **in 0.7s** —
far too fast to have run its tests. Not caused by the deletions: the same 5 files passed
directly (69 tests), and the suite then went green three times, including COMMIT_READY's
exact `-BatchSize 5 -FastFail` invocation where that batch took 14.5s. Worth knowing the
gate can flake this way, because `-FastFail` turns one bad batch into a full gate failure
and the batch runner's log **does not capture pytest output** for a failing batch, so
there is nothing to diagnose after the fact. If it recurs, that missing output is the first
thing to fix. **Fixed on 2026-09-16 rather than waiting for a recurrence — see the next
section.** The flake itself is still unexplained; the point is that the next occurrence
will leave evidence.

---

## 🚀 v1.18.42 (September 15, 2026) — released

**Status**: ✅ RELEASED | Tag `v1.18.42` | commit `ac63f81b6` |
<https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.42>

Ships everything logged below since v1.18.41 (2026-09-09): the in-app Help audit fixes,
the four-agent workspace audit remediation, four component refactors (~120 new tests),
the Android Preferences fix, the version-sync chain repairs, and the Android release-build
fix.

**Assets**: `SMS_Installer_1.18.42.exe` (74.86 MB) and `SMS_Android_1.18.42.apk` (3.3 MB).
All workflows green — release-on-tag, Android APK, installer (with its mandatory signature
gate), E2E.

### Verification

Full `RUN_TESTS_BATCH` (38/38 batches, 1054 tests, zero failures), `COMMIT_READY -Quick`
(10/10 lint, 4/4 suites), locally-built installer signed and Authenticode-**Valid**
(AUT MIEEK Limassol, DigiCert timestamped), smoke test passing with file *and* product
version both `v1.18.42`.

**The Android release-build fix landed just in time.** The APK workflow runs
`./gradlew assembleRelease`, and `v1.18.41` predates the AGP 9 upgrade — so this was the
**first release to exercise it**. Without `64ab67b77` the APK step would have failed
*after* the tag was already pushed and immutable.

Two fixes from earlier today were confirmed working on their first real release: the
version propagation reached all 9 tracked references plus `package-lock.json` (both of
which were silent no-ops until `9c95d93e0`, and the lockfile edit stayed surgical at 2
lines), and the `[1.18.42]` CHANGELOG header appeared exactly once.

### 🐛 Three release-pipeline traps caught during this release — ✅ ALL FIXED

Each silently shipped wrong content rather than failing, which is why none had ever been
noticed. Found by cutting the release by hand; fixed immediately afterwards — **after the
`v1.18.42` tag, so these fixes are not in that release**: traps 1-2 in `47fd7e60d`, trap 3
in `1831288dc`. They were first used for a real release by v1.18.43; the 2026-09-16 smoke test
already exercised traps 1-2 for real, rebuilding SMS_Lite and the frontend rather than
reusing a build that predated the Credits panel.

1. **Stale SMS_Lite was reused, never rebuilt.** Both `RELEASE_READY.ps1` (line ~292) and
   `INSTALLER_BUILDER.ps1`'s `Confirm-NativeLiteEditionReady` (line ~578) guarded the
   build with `if (-not (Test-Path $LiteOutExe))` — an existence test, not a freshness
   test. The Lite build on disk was from 2026-09-08, predating every fix in this release,
   and would have shipped *even without* `-SkipLiteBuild`. **Fixed**: rebuilding is now
   the default; reuse is opt-in via a new `-ReuseLiteBuild`, which logs the artifact's age
   in days when used. `RELEASE_READY`'s `-SkipLiteBuild` maps onto it.
2. **The frontend `dist/` was reused as-is.** `Invoke-NativeLiteBuild` only ran
   `npm run build` if `dist/index.html` was missing, so it bundled whatever was there —
   and `dist/` is shared with other build modes. During this release it held an
   **Android-mode** bundle from `npm run build:android` during the APK work, so the
   *desktop* installer would have shipped an Android frontend. A mode mismatch is
   invisible in the packaged output, so absence is not a safe freshness test. **Fixed**:
   always rebuilds (and clears `dist/` first, since asset names are content-hashed and
   orphans would otherwise survive), with `-ReuseFrontendDist` as an explicit escape
   hatch. Costs ~20s against a 10-20 min PyInstaller step.
3. **The generated GitHub release description was broken.** Traced to
   `scripts/generate-release-github-description.ps1` (not `GENERATE_RELEASE_DOCS.ps1` as
   first assumed). Three links to documents the pipeline never generates, two pre-flatten
   script paths dead since June, and backticks mangled because **the backtick is
   PowerShell's escape character** — `` "\`SMS_Installer...\`" `` emitted a backslash and
   ``"``powershell"`` emitted a single backtick, so every release up to v1.18.41 published
   `\SMS_Installer_x.y.z.exe\` and unrendered code blocks. **Fixed**: literals are now
   single-quoted, paths corrected, and optional docs linked only when the file actually
   exists, with absolute URLs (relative links do not resolve in a GitHub release body).
   **⚠️ Incomplete, corrected 2026-09-16:** the generator's output was right, but
   `GENERATE_RELEASE_DOCS.ps1` then stripped every backtick from the copy the workflow
   actually publishes, so the published body would still have had no code blocks — see the
   v1.18.43 release section at the top.
   The sibling generator in `GENERATE_RELEASE_DOCS.ps1` also advertised
   `StudentManagementSystem_<ver>_Setup.exe`, an asset name this project has never
   published — corrected to `SMS_Installer_<ver>.exe`.

### 🐛 Two further bugs found while fixing the above — ✅ both fixed (`1831288dc`, after the tag)

4. **Commit parsing counted lines, not commits.** `GENERATE_RELEASE_DOCS.ps1` used
   `--pretty=format:'%H|%s|%b|%an|%ae|%ad'` and consumed the output line by line, but `%b`
   is the multi-line commit body — so a 29-commit range parsed as "575 commits, 546
   unrecognized", and any newline in a body shifted every field after it. **Fixed**: body
   moved last (so a `|` inside it cannot misalign the rest) with an explicit record
   separator, plus a cross-check against `git rev-list --count` that warns when the parsed
   total disagrees — the absence of which is why this survived so long.
5. **Any exclamation mark marked the release as breaking.** `BreakingChangeMarkers`
   contained a bare `'!'`, regex-matched against subject *and* body. Masked by bug 4;
   fixing that exposed it, and it fired on a commit body quoting the password
   `"SMSCodeSign2025!"` — which would have published a **"⚠️ BREAKING CHANGES - MAJOR
   Release"** banner, complete with a migration-required warning, on an ordinary patch
   release. **Fixed**: proper Conventional Commits detection — `!` immediately before the
   colon in the subject, or a `BREAKING CHANGE:` footer.

Also noted while fixing 1: `RELEASE_READY`'s Lite pre-build block `return $true`d
immediately after building, **skipping the installer verification** that follows — so a
missing or truncated installer went unreported on exactly the runs that built Lite from
scratch. That block was redundant (both branches called the same builder) and is gone, so
there is now a single build path and verification always runs.

### Minor, pre-existing

- ~~26 historical CHANGELOG versions carry duplicate `## [x.y.z]` headers, scars from the
  bug fixed in September.~~ **CLEANED 2026-09-15 (`2369e1a88`)** — 125 headers for 78
  versions, now 81. Two passes: 36 pure-boilerplate stub blocks removed (nothing but
  "Release Type / Focus / Version references updated"), then 6 versions with genuinely
  multiple content blocks merged section-by-section. Verified against a backup: content
  lines 3197 → 3178, the difference being exactly 19 reported exact-duplicate bullets,
  all 78 versions retained.
  - **Two stubs deliberately kept** (1.12.6, 1.18.28) — each is that version's *only*
    block, so deleting it would drop the version from the changelog entirely.
  - **Three versions keep their duplicate headers — DECIDED, not outstanding**: `1.9.8`,
    `1.12.8` and `1.15.0` each have two real content blocks with **conflicting dates**
    (e.g. 1.15.0 at 2026-01-07 and 2026-01-05) and predate tagging, so nothing records
    which date the version actually shipped on. Owner decision on 2026-09-16: **leave them
    as an honest record that the history is genuinely ambiguous**, rather than collapsing
    them and presenting a guessed release date as fact. A note in `CHANGELOG.md`'s
    preamble (`efb43649a`) explains this in place, so the entries do not read as a cleanup that missed
    three versions and do not get "fixed" later. Do not merge these without a new
    decision. (`1.18.0` had the same conflict but its git tag settled it at 2026-02-16,
    so it was merged.)
  - Cosmetic leftover: `1.14.0`'s merged entry lists its `⚠️ BREAKING CHANGES` section in
    the middle rather than first, because sections were kept in first-appearance order
    rather than reordered. Content is complete; only the ordering is unconventional.
- The code-signing password exposed in git history (found in `10c55b328`) is **less severe
  than that commit implies**: no `.pfx` was ever committed and `*.pfx` is gitignored, so it
  is password-only exposure and cannot sign anything without the certificate file. The
  "rotate if the cert is ever regenerated" caveat still applies.

---

## 🐛 Capacitor Preferences was dead on Android — `Preferences.then()` (September 15, 2026)

**Status**: ✅ FIXED, **released in v1.18.42** (`683eb410b`). This closes the "Preferences.then() is not
implemented on android" follow-up logged (as an unexplained console error) in the
September 11 housekeeping section below. Investigation showed it was **not** a cosmetic
log line: it disabled `appStorage`'s entire reason for existing on Android.

### What was actually happening

`src/frontend/src/utils/appStorage.ts` loaded the plugin like this:

```ts
async function _getPrefs() {
  const { Preferences } = await import('@capacitor/preferences');
  return Preferences;   // ← the bug
}
```

Returning the plugin object bare from an `async` function puts it on the promise
resolution path, and promise resolution performs a **thenable check** — it reads
`.then` off the resolution value and, if callable, calls it.

Capacitor's `registerPlugin` returns a `Proxy` whose `get` trap special-cases only
`$$typeof`, `toJSON`, `addListener` and `removeListener`, then falls through to
`createPluginMethodWrapper(prop)` for *everything else* (verified directly in
`node_modules/@capacitor/core/dist/index.js`). So `Preferences.then` resolved to a
real bridge-call stub, the engine invoked it as `then(resolve, reject)`, the native
side had no `then` method, and the wrapper threw
`` `"${pluginName}.${prop}()" is not implemented on ${platform}` `` — the exact
string seen in logcat.

The wrapper rejects its own internal promise and never calls the `resolve`/`reject`
it was handed, so `_getPrefs()` **never settles**. The chain of consequences:

1. `init()`'s `Promise.race([_getPrefs(), _timeout(3000)])` could only ever be won by
   the timeout — so every Android launch stalled the full 3 seconds here.
2. The timeout rejects, the `catch` sets `_prefsReady = false`.
3. `_persistAsync` early-returns on `!_prefsReady`, so **nothing was ever written to
   Preferences**, and nothing was ever read back at startup.
4. The unhandled rejection from the stub surfaced as the logged
   `Uncaught (in promise)` error.

Net effect: `appStorage` silently degraded to localStorage-only on Android — exactly
the failure mode this module was written to prevent, since Android can wipe
localStorage under memory pressure. Server URL, auth token and the three offline
mutation queues were all unprotected. The 3-second timeout, added as a safety net
against a broken bridge, is what kept the bug invisible.

### Fix

Wrap the plugin so it is never itself a resolution value — `return { prefs: Preferences }`
— and destructure at the two call sites. The module header now explains why the
wrapper is load-bearing, so it doesn't get "simplified" back into the bug.

### Verification

`appStorage.ts` had **zero** test coverage; added `appStorage.test.ts` (7 tests) whose
plugin mock reproduces Capacitor's proxy semantics faithfully — any non-implemented
property still returns a callable bridge stub, `then` included.

Confirmed the tests actually catch the bug rather than just passing alongside the fix:
reverted `appStorage.ts` to its `HEAD` state and re-ran them — 4 of 7 failed, and the
recorded property-access log for the whole run was exactly `['then']`. `get`, `set` and
`remove` were never reached even once, which is the direct proof that Preferences was
100% unused on Android before this fix. Restored, all 7 pass; `eslint` and a full
project `tsc --noEmit` are clean.

### On-device verification (Galaxy A55, SM-A556B, Wi-Fi ADB)

Confirmed on real hardware, not just at unit level. The sequence gives a genuine
before/after because the device still had the **pre-fix** build installed from the
2026-09-11 AGP session:

1. **Before state — the decisive one.** The installed pre-fix app had been launched and
   used (it had `CapWebViewSettings.xml`, `WebViewChromiumPrefs.xml` and
   `AwOriginVisitLoggerPrefs.xml`, all dated 2026-09-11 21:16), yet
   `/data/data/cy.mieek.sms/shared_prefs/CapacitorStorage.xml` — the file
   `@capacitor/preferences` writes into — **did not exist at all**. Direct hardware
   proof that Preferences was never written to even once.
2. Built and installed the fixed debug APK (`npm run build:android`, `gradlew
   assembleDebug`, 177 tasks, 6.2 MB). Cleared logcat, launched: **no
   `"Preferences.then()" is not implemented on android`**, no `Capacitor/Console`
   errors, no crash.
3. Configured Local Network → `172.16.0.15:8000` against a running `NATIVE.ps1` backend.
   `CapacitorStorage.xml` was **created** and contained
   `sms_server_url=http://172.16.0.15:8000/api/v1` and `sms_server_type=local`. This
   can only happen if `init()` succeeded, since `_persistAsync` returns early while
   `_prefsReady` is false.
4. **The scenario this module exists for.** Force-stopped the app, deleted the WebView's
   entire `app_webview/Default/Local Storage` directory (simulating Android evicting
   localStorage under memory pressure) while leaving `shared_prefs` intact, and
   relaunched. The app went **straight to the login screen**, not back to the
   connection-type wizard — it rehydrated the server URL from Preferences. Pre-fix this
   would have lost the server entirely, since localStorage was the only copy.

Screenshots captured at each step. Note the test device is now pointed at
`172.16.0.15:8000`, a dev-machine LAN address that only resolves while `NATIVE.ps1` is
running; change it on the device when testing against something else.

---

## 🤖 Android release builds were broken + AGP flag cleanup (September 15, 2026)

**Status**: ✅ FIXED, **released in v1.18.42**. Commits `64ab67b77` (release-build fix) and
`f1dac0d46` (flag removal).

### 🐛 `assembleRelease` had been failing since the AGP 9 upgrade

Found while establishing a baseline *before* touching the deprecated flags — the point
of a baseline being to tell a pre-existing failure from one you caused. It was
pre-existing, reproducing on a clean tree:

```
Execution failed for task ':capacitor-android:lintVitalAnalyzeRelease'
> 'kotlin.sequences.Sequence kotlin.sequences.SequencesKt.sequenceOf(java.lang.Object)'
```

(and the same for `:capacitor-app`.) The root `build.gradle` forced **every**
`org.jetbrains.kotlin` dependency to `1.8.22` through `configurations.all`. That arrived
with the original Capacitor setup (`324f63d20`, June 2026) and was harmless under AGP
8.13.2 — but AGP 9.4.0's lint is compiled against a Kotlin 2.x stdlib, and
`configurations.all` reaches **AGP's own internal lint classpath**, so lint ran against a
stdlib nine minor versions too old and died on a missing `sequenceOf` overload.

**Why it went unnoticed**: `lintVital` only runs for *release* variants, and the AGP 9
upgrade was verified on-device with `assembleDebug` alone. So the APK that ships with
releases could not have been built at all — a genuine release blocker, sitting on `main`
since 2026-09-11.

Removed the pin rather than raising it: Capacitor manages Kotlin versions for its own
modules via `kotlin-bom` (defaulting to 1.9.25), this project has no Kotlin sources or
plugin, and a blanket `configurations.all` override is the wrong tool for pinning one
module's dependency.

**Lesson**: verifying an Android toolchain upgrade with `assembleDebug` only is not
enough — `assembleRelease` exercises lintVital, R8 and shrinking, none of which debug
touches.

### Deprecated AGP flags removed

Seven of the ten flags the upgrade assistant added were already deprecated. Each was
checked against what this project actually uses before removal — all seven proved inert
here (no `resValue()` anywhere, `targetSdkVersion` set explicitly, no `<uses-sdk>` in any
manifest, `shrinkResources` not enabled, no Kotlin sources or plugin, single app module,
build files already parsing under the new DSL). The three non-deprecated flags stay, with
a comment in the file recording the reasoning for the eventual AGP 10 upgrade.

### Verification

Clean `assembleDebug` + `assembleRelease` (405 tasks) both succeed, no new AGP option
warnings, and both APKs match their pre-change sizes (debug 6.28 MB, release 3.30 MB).

On-device on the Galaxy A55 with the resulting debug APK: launches with no crash or
`AndroidRuntime` error, process stays alive, rehydrates the server URL from Capacitor
Preferences, **logs in against a live `NATIVE.ps1` backend and renders real student
data**. Preferences keeps persisting correctly (`sms_user_v1` written alongside the server
keys); the access token is correctly *absent* from storage, since it is held in memory
only per the June 2026 security audit.

---

## 🔧 Version-sync chain: the last three no-op paths (September 15, 2026, `9c95d93e0`)

**Status**: ✅ FIXED, **released in v1.18.42**. Follow-on to `fccb5a301` below, which fixed the
flatten-stale paths in `COMMIT_READY.ps1` and the v-prefix regex in `RELEASE_READY.ps1`
but left the **same two bug classes alive in `VERIFY_VERSION.ps1`**. Both had been
surfacing as `[WARN] Pattern not found in file` on every `COMMIT_READY` run — a warning
easy to read as noise, which is how they survived the audit.

1. The `COMMIT_READY.ps1` entry used `'Version:\s*\d+\.\d+\.\d+'`, requiring a digit
   immediately after `"Version: "`, but that file's banner reads `Version: v1.18.x` with
   a literal `v`. The check could never pass, never fail meaningfully and never repair —
   which is why **the very banner `fccb5a301` cited as proof the chain was broken was
   still reading `v1.18.25`** against a real `v1.18.41`. Now captures the optional `v`
   and restores it, so `INSTALLER_BUILDER.ps1`'s v-less banner keeps its own shape. With
   the pattern fixed the check immediately reported the real drift, and `-Update`
   corrected the banner.
2. Dropped the dead `**Project Version (documented)**` entry — that line was removed when
   `DOCUMENTATION_INDEX.md` was rewritten on 2026-09-03 and exists nowhere in the repo.
3. The `package-lock.json` block had **never run to completion**: `ConvertFrom-Json`
   throws on the `packages.""` key without `-AsHashtable`, so every invocation landed in
   the catch. Switching to `-AsHashtable` would have worked but its `ConvertTo-Json`
   round-trip reserializes all ~13,700 lines and reorders keys — not a diff worth taking
   for one version field — so the two project-version fields are now edited as text,
   capped at one replacement each.

**Gotcha worth keeping**: the 4-argument static `[regex]::Replace` overload takes
`RegexOptions`, **not** a count, so passing `1` there silently means `IgnoreCase` and
replaces every match. Doing this rewrote all 980 dependency versions in the lockfile;
caught on the diff before it went anywhere. The count-limited form is the *instance*
`.Replace(input, replacement, count)` method.

Verified both directions on the lockfile: already-in-sync runs are a true no-op leaving
the file byte-identical, and after deliberately drifting both project-version fields the
run restores it to byte-identical with the committed state — 2 lines repaired, the other
13,694 untouched. All 9 version checks now report OK with no warnings.

---

## 🔍 Four-agent workspace audit + full remediation (September 14–15, 2026)

**Status**: ✅ DONE, **released in v1.18.42**. Eleven commits, `b644ee42c..8fbf66ee0`. Four
parallel sub-agents audited CI/CD, backend, frontend and infra; every finding was then
either fixed or explicitly ruled out. The audit's oversized-component list is now
**fully closed**.

### Security — `10c55b328`

- `/api/v1/admin/health` leaked student/course counts with **no auth dependency at
  all**, while every other route in that router requires `require_control_admin`.
- `DOCKER.ps1` generated `SECRET_KEY`/`POSTGRES_PASSWORD` with `Get-Random`
  (`System.Random`, not a CSPRNG) — directly contradicting the script's own warning
  about weak `SECRET_KEY` enabling JWT forgery. Now `RandomNumberGenerator`.
- `CREATE_CERTIFICATE.ps1` had the code-signing PFX password as a **hardcoded literal
  committed to git** (`"SMSCodeSign2025!"`, duplicated in `README.md`). Now CSPRNG-
  generated into a gitignored `.password.txt`, read automatically by
  `SIGN_INSTALLER.ps1`. ⚠️ The old password remains in git history — treat as
  compromised if the signing cert is ever regenerated.
- `Dockerfile.fullstack` copied `src/backend` without stripping `.env` first
  (`Dockerfile.backend` already did), so local dev secrets could be baked into a
  production image.

**Reverted deliberately**: a stricter admin-path guard in `security/permissions.py`.
`COMMIT_READY`'s test gate caught it breaking 7 deliberate, passing tests in
`test_adminops_router.py`. **Gotcha worth remembering** — a substring guard on
`"/admin"` also matches `"/adminops"`, and `AUTH_ENABLED=False` intentionally allows
`/adminops/*` (backup/restore/clear) in this project's tested contract, unlike genuine
`/admin/*` routes.

### i18n — `72b73c376`

`EnhancedAttendanceCalendar.tsx` passed raw English sentences into `t()` instead of
the real keys, which already existed in both locale files. i18next returns a missing
key verbatim, so **English users saw correct text purely by coincidence while Greek
users got untranslated English toasts** on course-selection and save errors.

### CI/CD — `6be8c6cb6`, `755414837`, `b644ee42c`

- `maintenance-consolidated.yml` and `stale.yml` ran an identical `actions/stale@v9`
  config on an identical daily cron. The former's docstring claimed to replace three
  workflows, none of which were ever removed — deleted it.
- `cleanup-workflow-runs.yml` (weekly, keep-count) was superseded in practice by
  `orchestrated-maintenance.yml`'s own daily age-based job — deleted.
- `orchestrated-maintenance.yml`'s `stale-cleanup`/`security-audit` jobs only ran
  `gh workflow run` against workflows that already have their own schedules — a
  same-day duplicate trigger costing Actions minutes for no effect. Removed both, and
  wired the orphaned `run_health_check` output (computed but consumed by no job, so the
  "health-check" dispatch option silently did nothing) to the real health-check workflow.
- `pr-hygiene.yml` duplicated standalone `dependency-review.yml` while also gating it
  behind two unrelated jobs — removed the duplicate.
- `deploy.yml` (reusable `workflow_call`) was referenced nowhere — deleted.
- `installer.yml` checked `.\installer\SMS_Manager\SMS_Manager.csproj`, a pre-flatten
  path that has **never existed there**, so the check always no-op'd and CI always
  embedded a stale pre-built launcher. Repointed at the real path.
- Added `workflow_dispatch` to the dependency audit workflows; bumped `pytest` to
  `>=9.0.3` for CVE-2025-71176.

### Release version-sync chain, broken since the June flatten — `fccb5a301`

`COMMIT_READY.ps1`'s version propagation targeted **repo-root paths that stopped
existing when the June 2026 flatten moved these scripts into `infra/scripts/*`**.
`Update-TextFileVersionLines` silently no-ops on a missing path, so this ran on every
release without touching a single real file — proven by `COMMIT_READY.ps1`'s own
`.NOTES Version:` banner still reading `v1.18.25` against a real `v1.18.41`.

`RELEASE_READY.ps1`'s `Update-VersionReferences` had an independent bug on the same
files: its regex `'Version: [0-9\.]+'` requires a digit immediately after `"Version: "`,
but the banner reads `Version: v1.18.x` — so it was a permanent no-op regardless of the
path fix. Now captures an optional `v` and preserves it (`INSTALLER_BUILDER.ps1`'s
banner has no `v`, and is still handled correctly).

Also: `docker-compose.yml`'s `VERSION`/`BUILD_DATE`/`VCS_REF` build args fell back to
`latest`/`unknown`/`unknown` on every build because nothing set them. `DOCKER.ps1` now
sets them alongside `FRONTEND_VERSION`, instead of relying on `.env`'s `VERSION=`, which
is written once at first-run setup and drifts thereafter. This closes the
"Docker version-unknown health-check gap" noted after the September 5 smoke test.

### Dead code removal — `14e3a1eb4` (19 files, ~1,700 deletions)

- `dependencies.py` trimmed ~300 lines to the only two symbols with live callers
  (`get_db`, `get_notification_service`), confirmed by repo-wide grep — removed an
  unused exception hierarchy, `ValidationMixin`, five validators, `paginate_query`, two
  logging helpers, two session context managers, and a duplicate `setup_logging()` that
  ran as an unused import-time side effect.
- Archived `migrations/005_websocket_notifications.py` (sat outside
  `migrations/versions/`; no `down_revision` in the real chain ever pointed at it — the
  actual tables come from `aabbccdd2025_add_notification_tables.py`).
- Deleted orphaned `src/scripts/VERIFY_VERSION.ps1`, a stale diverged fork of the real
  script; repointed the one test asserting its existence.
- Deleted `features/importExport/*` (8 files) + `hooks/useImportExport.ts` — zero
  importers; the live UI is `components/import-export/*`. **This closes open finding #5
  in the Help-audit bug list below.**
- Trimmed `analytics.js`'s dead `builder.*` i18n subtree in both languages down to the
  one key with a real caller. That key was itself a nested object rather than a string,
  so it could never resolve through `t()` and always fell back to hardcoded English even
  for Greek users — now a plain string with a real Greek translation ("Πρότυπο").
- `infra/docker/.dockerignore` was never read by any build (all compose builds use
  `context: ../../..`, and Docker only reads `.dockerignore` from the context root) —
  moved to the repo root with paths updated for the flatten, and `SMS_Installer.iss`
  repointed.

**Corrected audit finding**: `routers_imports.py` and `routers_import_export.py` were
flagged as duplicates. They are not — both are live. Left alone.

### Oversized components — all 4 now closed (~120 new tests)

| Commit | Component | Lines | Shape of the problem |
|---|---|---|---|
| `5e8dacdae` | `GradingView` | 988 → — | Tangled state+API+render → `useGradeEntrySync` hook (23 tests) |
| `05fca562f` | `ExportCenter` | 1383 → 633 | **Colocation**, not tangled state → file split (42 tests) |
| `8742b644e` | `ControlPanel` | 1190 → 922 | Data layer → `useControlPanelData` (21 tests) |
| `8fbf66ee0` | `CoursesView` | 1068 → 991 | Duplicated logic → `features/courses/utils/courseSchedule.ts` (30 tests) |

Two things worth carrying forward:

- **Diagnose the shape before picking the technique.** `ExportCenter` needed a *file
  split* (three components plus pure helpers crammed in one file), not the hook
  extraction `GradingView` needed. Applying `GradingView`'s approach there would have
  been wrong.
- **The audit's own claims needed verifying.** It described `ControlPanel.tsx` as "only
  3 state hooks — mostly JSX orchestration"; it actually had 17 `useState` calls, a
  hand-rolled TTL response cache, five per-tab fetchers, a status auto-refresh with a
  derived uptime ticker and two operation runners. That was one of two audit claims that
  didn't survive inspection.

Real bugs found and fixed along the way: a latent blank-grade-list bug in `GradingView`,
and a schedule-normalization written twice in `CoursesView` (the second copy inside
`checkScheduleConflicts`), now deduped with the previously-unstated schedule-conflict
overlap rules pinned down in tests — back-to-back sessions don't clash, the occupied
span is `duration × periods`, overlap is symmetric, one entry reported per clashing day.

---

## 🧹 Fixed all 128 pre-existing duplicate-key lint errors, repo-wide (September 12, 2026, early hours)

**Status**: ✅ FIXED, **released in v1.18.42** (`ddf24ac3a`). This closes out the full bug list from the in-app Help
audit session — bugs #1-#4 are now all addressed (2 fixed by wiring/adding, 1 fixed by deleting,
1 fixed by deduping), plus every new finding surfaced along the way is logged for later.

Before fixing bug #4 (`el/help.js`'s 90 `no-dupe-keys` errors), ran `eslint` across every
locale file in the repo rather than just the one file already known about — per the note left
in bug #3's fix that this "merged-content-block" duplicate-key disease had already been
confirmed in a second file pair (`common.js`). The sweep found it in **9 files, 128 errors
total**, not just the 2 already known:

| File | Duplicate keys |
|---|---|
| `en/analytics.js` / `el/analytics.js` | 6 each (`template`, `dataseries`, `charttype`, `filters`, `preview`, `reportName` — all under `analytics.builder.step`/`analytics.builder`, the now-deleted `CustomReportBuilder`'s translation keys from bug #2) |
| `en/common.js` / `el/common.js` | 10 each (already found while fixing bug #3) |
| `el/help.js` | 90 (`en/help.js` has none — the duplication is asymmetric, Greek-only) |
| `en/search.js` / `el/search.js` | 2 each (`filters`, `advancedFilters`) |
| `en/students.js` / `el/students.js` | 1 each (`enrolled`) |

### Approach: AST-based removal, not hand-editing 128 spots

Wrote a throwaway Node script (`_dedupe_locale_keys.cjs`, deleted after use) using the
TypeScript compiler API to parse each file, find every object literal (recursing into nested
ones, since `analytics.js`'s duplicates are nested under `builder.step`), group properties by
key name within each literal, and remove every occurrence but the **last** — matching plain JS
object-literal semantics (last definition silently wins at runtime), so this is guaranteed to
preserve exactly the behavior already in effect, not change it. Removal is whole-line-based
(from the property's start line to its end line inclusive, so multi-line object-valued
duplicates like `template: { desc: '...' }` are removed cleanly without leftover blank lines
or dangling commas).

### Verifying "keep last" was actually correct, not just convenient

Before trusting the mechanical rule blindly, spot-checked the non-trivial cases where the two
duplicate definitions had genuinely different shapes (not just reworded text):

- `search.js`'s `advancedFilters`: the **removed** (first) definition was a fully-built nested
  object (`title`, `addFilter`, `clearAll`, `condition.field/operator/value`,
  `operators.equals/contains/...`). The **kept** (last) definition is a flat string plus
  separate top-level keys (`addFilter`, `filterField`, `filterOperator`, `resetFilters`, ...).
  Grepped actual component usage before trusting this: `features/search/AdvancedFilters.tsx`
  calls exactly the flat, kept structure (`t('advancedFilters', {ns:'search'})`,
  `t('filterField', ...)`, top-level `t('equals'/'contains'/...)`) — confirming the kept
  version is what real code actually uses. The nested version's caller,
  `features/advanced-search/components/AdvancedFilters.tsx`, turned out to read from a
  completely different key path (`t('search.advancedFilters.title', ...)`, default namespace,
  not the `search` namespace file at all) — unaffected by this change either way.
- `analytics.js`'s `builder.*` subtree: confirmed via grep that only one key from this whole
  now-mostly-dead subtree (`analytics.builder.step.template`) still has a live caller
  (`SavedReportsPanel.tsx`, which already passes a hardcoded English fallback default —
  defensive code that was likely added because this exact key was already broken). Left the
  subtree as-is structurally (didn't additionally clean up the now-fully-dead siblings
  `dataseries`/`charttype`/`filters`/`preview`/`reportName`/`title`/`ui` — that's dead-content
  removal, a different, judgment-heavier task than a mechanical lint fix; noted below instead
  of scope-creeping into it).

Verified: `eslint` across all 9 files — 0 errors (was 128). `tsc --noEmit` clean. A full vitest
run across every touched feature area (`i18n`, `search`, `advanced-search`, `students`,
`dashboard`, `components/tools`) — 470/470 passing, unchanged. `git diff` reviewed file-by-file
before committing, not just trusted the script.

### Root cause of why COMMIT_READY never caught this: fixed

`src/frontend/package.json`'s `lint` script was `eslint "src/**/*.{ts,tsx}"` — the glob never
included `.js` at all, so every plain-`.js` file under `src/`, every locale file included, has
been completely unlinted by `COMMIT_READY.ps1` (and therefore CI) for as long as that script
has existed. Widened it to `"src/**/*.{ts,tsx,js}"` after confirming via a direct
`npx eslint "src/**/*.js"` run (post-dedup) that this surfaces zero new errors — the only thing
it exposes is exactly the bug class just fixed, so enabling it now is safe. `npm run lint`
afterward: 0 errors, 4 pre-existing unrelated `testing-library` warnings.

### New finding — ✅ closed 2026-09-15 in `14e3a1eb4`

`analytics.js`'s `builder.*` subtree (title, ui, and 5 of its 6 step/detail sub-objects) was
confirmed fully dead content in both languages — the same "translations for a component that
no longer exists" situation as bug #2. **Removed in the workspace-audit dead-code sweep**
(see that section above); verified 2026-09-16 that both `en/analytics.js` and `el/analytics.js`
now contain nothing under `builder` but `step.template`, with a comment in `en` recording why.
Keeping `builder.step.template` also fixed a live bug: it was a nested object (`{ desc: ... }`),
not a string, so `t('analytics.builder.step.template', 'Template')` could never resolve and
always fell through to the hardcoded English fallback — including for Greek users.

---

## 📥 Import/Export click-path added + ~35 missing i18n keys fixed (September 11, 2026, past midnight)

**Status**: ✅ FIXED, **released in v1.18.42** (`ce3f7e65e`). Owner picked bug #3 from the list below; investigation
showed the underlying feature was real and actively maintained (not a duplicate like bug #2),
so "wire it up" — and asked to complete the fix fully rather than defer the i18n gap it exposed.

Investigated whether `components/import-export/*` (behind `/admin/import-export`) was a live
feature or another abandoned duplicate — unlike bug #2, it wasn't: it was touched as recently
as 2026-09-01 for a deliberate dedupe/cleanup pass, and its sibling
`features/importExport/*` (a genuinely unused duplicate, imported nowhere) is the real dead
copy — flagged below as a new, separate finding, not fixed this session.

Chose the "complete the existing pattern" option from two nav approaches (offered to and picked
by the owner): added Import/Export as a 4th collapsible section in `ControlPanel.tsx`'s
Maintenance tab, matching RBAC Configuration/Email Configuration/Semester Archive exactly —
`Power → Show Control Panel → Maintenance → Import/Export`, admin-only. Considered but did not
pursue adding a new top-level "Admin" nav tab (bigger, riskier UX change, not requested).

### Missing i18n discovered and fixed

Clicking all the way through (History table → Export dialog → Import wizard) showed the base
History view, the Export dialog, and the Import wizard rendering almost entirely as raw
camelCase keys (`format`, `dateRange`, `includeHeaders`, `csv`, `allTime`, even the modal title
`importWizard`) — a pre-existing gap invisible until this page had any click-path at all.
Mapped every `t(...)` call across `ExportDialog.tsx`, `ImportWizard.tsx`, and `HistoryTable.tsx`
(28 distinct keys across the `export` and `common` namespaces) and added every missing one, in
both `en` and `el`:

- `common.js`: `noData`, `status`, `user`, `download`, `import`, `unknownError`, `refresh` (7 keys).
- `export.js`: `format`, `csv`, `excel`, `pdf`, `dateRange`, `allTime`, `thisMonth`, `thisYear`,
  `includeHeaders`, `import`, `export`, `type`, `entity`, `records`, `viewError`,
  `invalidFileFormat`, `fileTooLarge`, `uploadFailed`, `importFailed`, `importTimeout`,
  `importWizard`, `dragDropFile`, `selectedFile`, `readyToImport`, `processing`,
  `selectDifferent` (26 keys).

**Self-caught mistake worth remembering**: while adding `common.js`'s `export` key, discovered
it already existed — at a different, inconsistent indentation (3 spaces vs. the file's normal
2), which is why an initial anchored grep (`^  export:`) missed it and produced a false
"missing" positive. Caused a real `no-dupe-keys` ESLint failure; caught immediately by running
lint before committing, removed the duplicate. Worth checking for irregular indentation before
trusting a "key doesn't exist" grep result in these locale files.

**New finding, not fixed this session**: while confirming `common.js`'s `export` collision,
`eslint` surfaced 10 *other* pre-existing duplicate keys already on `main` in both
`en/common.js` and `el/common.js` (`info`, `classes`, `final`, `overall`, `attendance`,
`present`, `averageScore`, `credits`, `previous`, `next`) — confirmed via `git stash` that
these predate this session. This is the same "merged-content-block" duplicate-key disease as
`el/help.js` (bug #4 below), now confirmed present in a second (`common.js`, both languages)
and almost certainly not the last locale file affected — worth a repo-wide sweep, not just
`el/help.js`, whenever bug #4 gets picked up.

**New finding, not fixed this session**: `features/importExport/*` (`ImportWizard.tsx`,
`HistoryTable.tsx`, `ExportDialog.tsx`, each with their own passing test) is a fully orphaned
duplicate of `components/import-export/*` — imported nowhere in the app. Same dead-duplicate
shape as bug #2's `CustomReportBuilder`, just not yet investigated for deletion.

Verified: `tsc --noEmit` clean, `eslint` clean on every touched file (confirmed the 10
`common.js` duplicates are pre-existing via `git stash`), `translations.test.ts` (key parity),
and a full bilingual Playwright click-through against `NATIVE.ps1` + the real dev backend
(deleted after use) — History table, Export dialog (format/date-range/include-headers/
cancel/export), and Import wizard (title/drag-drop/select-file/cancel/import), in both English
and Greek, screenshotted, zero raw-key leaks, zero console/network errors.

---

## 🗑️ Deleted the dead 8-chart-type report builder (September 11, 2026, later still)

**Status**: ✅ FIXED (deleted), **released in v1.18.42** (`768ba1a07`). Owner picked bug #2 from the list below to
fix next; investigation showed "delete" was the right call, not "wire up."

Before deciding, checked git history and the actual data each component saves:

- `ChartTypeSelector.tsx`/`CustomReportBuilder.tsx` (in `features/dashboard/`)
  were added 2026-03-01/02 as part of an "Analytics dashboard and prediction
  system" feature. `CustomReportBuilder`'s `ReportConfig` shape (`template`,
  `dataSeries`, `chartType: string`, `filters`, `name`, `description`) predates
  the current `CustomReport` backend schema (`report_type`, `fields`,
  `export_format`, `include_charts: boolean`, ... — see
  `src/frontend/src/api/customReportsAPI.ts`). Even though it calls the same
  `useCreateReport()` hook the real, routed `ReportBuilder.tsx` uses, the
  payload shape doesn't match what the backend model expects — wiring it to a
  route would not have produced working saves, just a differently-broken
  feature.
- The problem it was solving — "let a user pick which chart types to include
  in a personalized view" — was already fully solved 2026-06-09 by the
  Dashboard Manager feature (`DashboardManager.tsx` /
  `CreateEditDashboardDialog.tsx` / `useDashboards.ts`, documented in the
  in-app Help "Custom Dashboards" section added earlier this session): a
  working, routed, schema-correct 10-chart-type checkbox picker.
  `CustomReportBuilder` hasn't been touched since except a mechanical
  June 12 path-flatten — genuinely abandoned, not just forgotten.

Deleted the whole isolated cluster (confirmed via grep that nothing outside
it imports any of these — safe, no other feature depends on them):
`features/dashboard/components/CustomReportBuilder.tsx`, its test
(`__tests__/CustomReportBuilder.test.tsx`), and the entire
`components/builder-steps/` directory (`ChartTypeSelector.tsx`,
`DataSeriesPicker.tsx`, `FilterConfiguration.tsx`, `ReportPreview.tsx`,
`ReportTemplate.tsx`, `index.ts`) — 8 files total. Removed the corresponding
exports from `features/dashboard/index.ts`. Left `PredictiveAnalyticsPanel`
alone (same March 2026 feature batch, different component, not part of this
bug and not audited this session).

Verified: `tsc --noEmit` clean, `eslint` clean, the dashboard feature's full
test suite (57/57, same count as before minus the deleted
`CustomReportBuilder.test.tsx`'s own tests), and a full production
`npm run build` (no broken imports, all chunks generated normally).

---

## 📧 Email Configuration wired up + 2 latent bugs found fixing it (September 11, 2026, late night)

**Status**: ✅ FIXED, **released in v1.18.42** (`9ffafbb95`). Owner picked bug #1 from the list below to fix next;
fixing it surfaced 2 more real, previously-undetected bugs in the same code path.

Wired the dead `EmailConfigPanel`/SMTP settings UI (bug #1 in the section below) into
`ControlPanel.tsx`'s "Maintenance" tab, admin-only, alongside the existing RBAC
Configuration and System Operations sections — same collapsible-section pattern
already used for those two. Chose this over deleting the code because the
backend (`GET/PUT /api/v1/import-export/settings/email`, `POST .../test`) was
fully built, admin-gated, and covered by `test_email_settings.py` — a genuine
finished feature that was simply never mounted anywhere in the routed UI.

- New `src/frontend/src/features/export-admin/components/EmailSettingsPanel.tsx`:
  a small self-contained wrapper around the existing `EmailConfigPanel` using
  the existing `useEmailConfig`/`useUpdateEmailConfig`/`useTestEmailConfig`
  hooks — deliberately does *not* pull in the rest of `ExportDashboard.tsx`
  (jobs/schedules/metrics/analytics tabs), which duplicates functionality the
  app already exposes elsewhere and is a separate, bigger, unreviewed surface.
- Registered the `exportAdmin` i18n namespace (existing, complete EN/EL
  translations in `features/export-admin/locales/translations.ts` — already
  written back in Jan/June 2026, just never wired into `translations.ts` /
  `i18n/config.ts`'s namespace list).
- Added `emailConfigurationHeading` to `controlPanel.js` (en/el), matching the
  `administratorUsersHeading`/`semesterArchiveHeading` pattern.

### 🐛 2 more real bugs found while verifying this end-to-end (both fixed)

1. **`useExportAdmin.ts`'s `API_BASE` constant duplicated the `/api/v1`
   prefix** (`const API_BASE = '/api/v1/import-export'`) that the shared
   `apiClient` already adds via its `baseURL` — every hook in that file was
   requesting `/api/v1/api/v1/import-export/...` and 404ing. Every other
   hook file in the codebase (e.g. `useDashboards.ts`) calls `apiClient` with
   a bare relative path and no such constant. Fixed to `'/import-export'`.
   This bug affects every hook in `useExportAdmin.ts`, not just email — the
   export-jobs/schedules/metrics hooks have the same latent bug, currently
   unobservable because nothing routes to `ExportDashboard.tsx` either (see
   the still-open `/admin/import-export` gap below).
2. **`routers_import_export.py`'s 3 email-settings endpoints called
   `optional_require_role(["admin"])` — a list — instead of
   `optional_require_role("admin")`.** The checker's signature is
   `def optional_require_role(*roles: str)`; passing a single list argument
   makes `roles = (["admin"],)`, so the membership test
   `role not in normalized_roles` compares the string `"admin"` against a
   tuple containing one list — never equal, so **every real admin got a 403**
   ("Access denied. Required role: ['admin']. Your role: admin" — the
   checker's own error message shows the mismatch). `routers_import_export.py`
   was the only file in the entire backend using the list form; every other
   router already uses the correct bare-string form. Invisible to
   `test_email_settings.py` because the whole test suite runs with
   `AUTH_ENABLED=False`, which short-circuits `optional_require_role` before
   it ever reaches the role-matching code — the bug only manifests when auth
   is actually enabled, i.e. never under CI/local test conditions, always in
   a real deployment. Added a regression test,
   `test_rbac_admin_can_access_email_settings` in
   `test_rbac_enforcement.py` (that file's existing `build_app_with_auth_enabled()`
   harness builds a real app with `AUTH_ENABLED=True`) — confirmed it fails
   with the bug present (reverted via `git stash` to check) and passes with
   the fix.

Verified: `tsc`, `eslint` (0 errors on all touched files), the full
`export-admin` test suite (57/57, unchanged), `translations.test.ts` (key
parity), `test_rbac_enforcement.py` (5/5 including the new regression test),
and a real click-through against `NATIVE.ps1` + the real dev Postgres backend
(Playwright, deleted after use) as a genuine admin: Power → Show Control
Panel → Maintenance → Email Configuration now loads real data (200, not 403),
renders the form, zero console/network errors — confirmed in English; not
re-confirmed in Greek this round (the EN/EL translation keys were verified
statically via `translations.test.ts`, not re-screenshotted).

**Still open at the time this section was written** (bugs #2 and #3 below were fixed later the
same session — see their own sections above): `/admin/import-export` still has no click-path;
the 8-chart-type `ChartTypeSelector`/`CustomReportBuilder` is still dead code; `el/help.js`
still has its 90 pre-existing duplicate-key lint errors (the last of these, bug #4, remains
open).

---

## 📚 In-app Help audit: 3 missing sections added + 4 real bugs found (September 11, 2026, evening)

**Status**: ✅ Documentation DONE, **released in v1.18.42** (`226bca077`). The 4 bugs it found
were deliberately deferred at the time (owner decision: docs now, bugs later) and were **all
fixed afterwards** — see the four sections above, also released in v1.18.42.

Reviewed `HelpDocumentation.tsx` (the in-app FAQ under Operations → Help) against
shipped-but-undocumented features. Before writing new FAQ entries, verified the
actual click-path for each feature by reading the routing/component code
directly (rather than assuming nav labels), which surfaced that several
supposedly-shipped features are only partially wired into the UI.

### Documentation added

Added 3 new expandable sections to `HelpDocumentation.tsx` (+ matching
`en/help.js` / `el/help.js` keys, both languages) and 2 new items to the
existing "Custom Reports & Templates" section:

- **🧩 Custom Dashboards** — the `/dashboard-manager` CRUD feature (create,
  edit, delete, set-default; 10 selectable chart types). Documented the real
  click-path: Dashboard tab → "Analytics" sub-tab → "Manage" button — this
  path was non-obvious since there is no top-level "Analytics" nav item.
- **🗄️ Semester Archive** — explicitly distinguished from the pre-existing
  "Session Export/Import" FAQ entries (which describe a different, older,
  non-destructive feature). Documented what it does, how it differs, the
  real (buried) admin click-path, and where results surface (student
  profile's "Academic History" section).
- **🔐 Roles & Permissions** — RBAC Configuration and User Accounts
  management, previously undocumented entirely.
- Two items added to Custom Reports: per-report email delivery
  (`Enable email delivery` + `Email Recipients`) and scheduling
  (`Schedule Report` + frequency).

Verified via the frontend's `translations.test.ts` (key parity), `tsc`,
`eslint` (on the 3 touched files — see bug below re: pre-existing `el/help.js`
lint debt this didn't catch), and a real click-through against `NATIVE.ps1`
using a small throwaway Playwright script (deleted after use): logged in,
opened Operations → Help in both English and Greek, expanded all 3 new
sections plus the extended Reports section, confirmed real translated text
renders (not raw i18n keys), screenshotted both languages.

### 🐛 Bugs found while verifying click-paths (not fixed — logged for later)

1. ~~**`EmailConfigPanel`/`ExportScheduler` (SMTP server configuration) is
   dead code.**~~ **FIXED same day, see the "Email Configuration wired up"
   section above.** `features/export-admin/components/ExportDashboard.tsx`
   contains a full "Email Settings" tab (host/port/username/password/admin
   emails) but no route or nav link anywhere in the app imports
   `ExportDashboard` — grep shows it's referenced only by its own test
   files. There is currently no way to configure outgoing email from the
   running app, by URL or otherwise. The per-report "Enable email delivery"
   checkbox in the real Report Builder has no working SMTP backend to send
   through as a result (unless one is set via backend env vars/
   `smtp_override.py` outside the UI). (`ExportScheduler` itself — the
   recurring full-data-export scheduler, as opposed to `EmailConfigPanel` —
   remains unwired; only the email settings panel was mounted.)
2. ~~**The 8-chart-type picker (`ChartTypeSelector.tsx`, in
   `features/dashboard/components/builder-steps/`) is also dead code.**~~
   **DELETED same day, see the "Deleted the dead 8-chart-type report
   builder" section above** — investigation showed it predated and was
   incompatible with the current `CustomReport` backend schema, and its use
   case was already solved properly by the June 2026 Dashboard Manager
   feature, so removal (not wiring) was the right call.
3. ~~**`/admin/import-export` has no click-path at all**~~ **FIXED same day,
   see the "Import/Export click-path added" section above.** Was reachable
   only by typing the URL directly (admin-only via `RequireAdmin`). Its
   siblings `/admin/permissions` and `/admin/semester-archive` are
   technically reachable, but only via a buried, unlabeled path: Power tab →
   "Show Control Panel" → "Maintenance" tab → expand "RBAC Configuration"
   (embeds the same `PermissionsPage` as `/admin/permissions`) or "System
   Operations" → "Semester Archive" (embeds the same `SemesterArchivePage`).
   Owner chose to complete this existing embedded pattern (adding
   Import/Export as a 4th Maintenance-tab section) rather than build a new
   top-level "Admin" nav entry — the "Move admin pages into System >
   Control Panel > Maintenance" consolidation recorded as done in the
   v1.18.36 section below is now, in effect, actually true for all four
   admin features (Permissions, Semester Archive, Email Configuration,
   Import/Export), just not under a separately-labeled "Admin" section.
4. ~~**`el/help.js` has 90 pre-existing ESLint `no-dupe-keys` errors**~~
   **FIXED same session, see "Fixed all 128 pre-existing duplicate-key lint
   errors, repo-wide" above** — the repo-wide sweep that section describes
   found this same disease in 9 files (128 errors total), not just
   `el/help.js`, and fixed all of them via an AST-based script rather than
   hand-editing each spot. The "why doesn't `COMMIT_READY` catch this"
   question is **answered in this same entry** — see "Root cause found and
   fixed" below; it was `package.json`'s `lint` glob omitting `.js`
   entirely. (This sentence previously called that question open, which
   contradicted the paragraph three lines further down.)
   (confirmed present on `main` before this session, via `git stash` +
   direct `npx eslint src/locales/el/help.js` — unrelated to tonight's
   edits, which added no new duplicates). Roughly 45 keys were defined
   twice in the file; JS object-literal semantics mean the second
   definition silently won, so the first copy of each was dead text.
   **Root cause found and fixed**: `COMMIT_READY.ps1`'s "Frontend: ESLint"
   phase runs `npm run lint`, and `package.json`'s `lint` script was
   `eslint "src/**/*.{ts,tsx}"` — no `.js` extension at all, so it silently
   skipped every plain-`.js` file under `src/`, locale files included, for
   as long as that script has existed. Widened it to
   `"src/**/*.{ts,tsx,js}"` after confirming (via a direct
   `npx eslint "src/**/*.js"` run, post-dedup) that doing so surfaces zero
   new errors — the only thing this widening exposes is exactly the class
   of bug just fixed, so it's safe to turn on now. `npm run lint` afterward:
   0 errors, 4 pre-existing unrelated `testing-library` warnings.
5. ~~**New finding (bug #3 fix session): `features/importExport/*` is a third
   instance of the dead-duplicate-component pattern** first seen in bug #2.~~
   **DELETED 2026-09-15 in `14e3a1eb4`, see the workspace-audit section
   above.** `ImportWizard.tsx`, `HistoryTable.tsx`, `ExportDialog.tsx` (each
   with their own passing test) duplicated `components/import-export/*` (the
   real, now-reachable copy used by `/admin/import-export`) but were imported
   nowhere in the app. The git-history + payload-compatibility check bug #2
   used was repeated here before removal, rather than deleting on shape
   alone — 8 files plus `hooks/useImportExport.ts`, zero importers confirmed
   by repo-wide grep.

---

## 🔧 Session housekeeping: custom subagents, vitest security bump, AGP/Gradle 9 upgrade (September 11, 2026, later same day)

**Status**: ✅ DONE, **released in v1.18.42**.

- **`0bc758cf1`** — bumped `vitest` 4.1.9→4.1.11, fixing Dependabot alerts
  #262/#263 (`@vitest/mocker` path-traversal / arbitrary file read via a
  redirect mock — dev-dependency only, no runtime/production exposure).
  Supersedes Dependabot PR #229, which was stuck failing CI on a stale
  branch that predated the installer-guard fix already on `main`
  (`60abe0433`). Verified: `npm audit` reports 0 vulnerabilities, all 122
  frontend test files (1940 tests) pass on vitest 4.1.11, lint/`tsc` clean.
- **`28dc337e1`** — added `test-runner` and `release-manager` custom
  subagents (`.claude/agents/`). `test-runner` wraps
  `RUN_TESTS_BATCH.ps1` and reports pass/fail without ever invoking pytest
  directly on the full suite; `release-manager` encodes this file's
  Release Workflow phase order so a release can be delegated end-to-end
  without re-deriving the script order each time.
- **`43a71e0f7`** — committed an AGP `8.13.2→9.4.0` / Gradle `8.13→9.6.0`
  upgrade in `src/frontend/android/` that was already sitting uncommitted
  in the working tree at session start — almost certainly Android
  Studio's AGP Upgrade Assistant ran on last IDE open, not a deliberate
  hand-edit (no prior commit had touched those files besides the original
  Capacitor setup). Verified before committing: `gradlew assembleDebug`
  succeeded (177/177 tasks), then installed and launched on a physical
  Galaxy A55 over Wi-Fi ADB (USB was too flaky) — app loaded, no
  `AndroidRuntime` crash, process stayed alive. `COMMIT_READY.ps1 -Quick`
  passed clean with these changes present (1053/1053 backend tests, all
  lint/type checks).
- **`bd84bc29d`** — added a `plan-review` skill (`.claude/skills/`) that
  audits this file against `git log`/tags and spot-checks its technical
  claims against the actual code, for repeatable staleness checks going
  forward. This entry is itself an example of the gap it caught: the three
  commits above had landed with no corresponding entry here until now.

### Follow-ups (all closed)

- ~~7 of the 10 flags added to `src/frontend/android/gradle.properties` by
  the AGP upgrade assistant are already deprecated and will be removed in
  AGP 10.0 (`usesSdkInManifest.disallowed`,
  `sdk.defaultTargetSdkToCompileSdkIfUnset`, `enableAppCompileTimeRClass`,
  `builtInKotlin`, `newDsl`, `r8.optimizedResourceShrinking`,
  `defaults.buildfeatures.resvalues`) — safe cosmetic cleanup whenever
  convenient.~~ **DONE 2026-09-15 in `f1dac0d46`** — but the "safe cosmetic
  cleanup" framing here was wrong and worth correcting: the assistant writes
  these flags to *preserve* AGP 8 behaviour, so removing them opts into AGP 9
  defaults. That is a behavioural change needing a real build and device test,
  not a text edit. Each was checked against what this project actually uses
  before removal (all seven turned out inert here) and verified with a clean
  `assembleDebug` + `assembleRelease` plus an on-device smoke test — see the
  section at the top of this file. Doing it properly is also what surfaced the
  broken release build below.
- ~~Found (not fixed, unrelated to the AGP/Gradle change) — a pre-existing
  frontend bug: `Uncaught (in promise) Error: "Preferences.then()" is not
  implemented on android`, logged via Capacitor/Console on every app
  launch.~~ **FIXED 2026-09-15 — see the "Capacitor Preferences was dead on
  Android" section at the top of this file.** The guess recorded here (a
  `.then()` chained onto the plugin's API) was close but not the mechanism:
  nothing in our code called `.then()` on the plugin. `appStorage.ts`
  returned the plugin proxy bare from an `async` function, and *promise
  resolution itself* probed `.then` — which Capacitor answers with a native
  bridge stub. It was also not cosmetic: it disabled Preferences-backed
  storage on Android entirely and stalled every launch by 3 seconds.

---

## 🧹 Release pipeline: duplicate CHANGELOG.md headers + DOCKER.ps1 -Update path bug (September 11, 2026)

**Status**: ✅ FIXED, **released in v1.18.42** (`fcb19c916`).

Routine state review found `CHANGELOG.md` had carried a duplicate `## [x.y.z]`
header on every release since v1.18.36: `RELEASE_READY.ps1`'s version-bump
step unconditionally inserted a generic "Automated release workflow
improvements" placeholder section, and then the same run later called
`GENERATE_RELEASE_DOCS.ps1` (its documented Phase 3 docs step), which
unconditionally inserted its own real, commit-categorized entry for the same
version — neither script checked whether an entry for that version already
existed. A `## [Unreleased]` section (used by same-day fix commits to record
notes ahead of the next release) was never consumed by either script either,
so it lingered permanently once its content shipped, duplicating whatever the
next release's generated entry said.

- Removed `RELEASE_READY.ps1`'s redundant generic changelog insert —
  `GENERATE_RELEASE_DOCS.ps1`'s categorized entry (from actual commit
  messages) is the only one needed and already ran later in the same script.
- `GENERATE_RELEASE_DOCS.ps1` now skips inserting if an entry for the target
  version already exists, and strips a pre-existing `## [Unreleased]` section
  when writing the new version entry instead of leaving it behind stale.
- Cleaned up the existing duplicate/stale entries for v1.18.39–v1.18.41 in
  `CHANGELOG.md` (older duplicates from v1.18.36–v1.18.38 left as-is — pure
  historical text, not worth the risk of a larger rewrite for a cosmetic
  issue). Verified via `[System.Management.Automation.Language.Parser]` syntax
  checks on both edited scripts and by tracing the regex against sample
  content; not verified via an actual `RELEASE_READY.ps1` run (that script
  performs real version bumps, npm installs, and git commits/tags — out of
  scope to execute just to test a changelog-formatting fix).
- Also fixed a known, previously-flagged `DOCKER.ps1 -Update` bug while in
  the area: its fast-rebuild path hardcoded a stale `docker/Dockerfile.fullstack`
  relative path left over from the June 12 flattening (should be
  `$DOCKERFILE_FULLSTACK`, i.e. `infra/docker/compose/Dockerfile.fullstack`,
  as every other build call site in the script already uses) and swallowed
  the real build error with `2>&1 | Out-Null` on failure. Both fixed;
  `-UpdateClean`'s no-cache path had the same hardcoded-path bug and is fixed
  too.

---

## 🐛 QNAP credential save path + DB-unavailable error clarity (September 9, 2026, commit `e5eb1e2b6`)

**Status**: ✅ FIXED, released as part of `v1.18.41`.

Owner-reported after installing SMS_Lite on a laptop: QNAP PostgreSQL
credentials entered via the installer wizard "failed" even though correct.
Root cause: `SaveLiteEditionQnapCredentials.ps1` wrote credentials to
`{InstallPath}\local-secrets\qnap-credentials.json`, but the frozen
`SMS_Lite.exe` only ever reads `%LOCALAPPDATA%\SMS_Native_Lite_Simple\local-secrets\`
(`lite_simple_entrypoint.py`) — credentials entered on a fresh/remote machine
were silently discarded, so the app fell back to a new empty local SQLite
database instead of the shared QNAP database, surfacing as an unexplained
login failure. Fixed to write to the path the app actually reads.

Also, since a DB-connectivity failure and a real application bug both used to
collapse into the same generic 500 "Login failed": added a 5s
`connect_timeout` on the PostgreSQL engine (`models.py`) so an unreachable
host fails fast instead of hanging on the OS TCP timeout; a global
`OperationalError` handler (`error_handlers.py`) now returns a distinct `503
DATABASE_UNAVAILABLE`; `routers_auth.py`'s login no longer swallows that into
the generic exception path; `lite_simple_entrypoint.py` probes QNAP
reachability at startup and falls back to local SQLite, logging the outcome
to `debug.log`; frontend (`useErrorHandler.ts` + EN/EL i18n) shows a distinct,
actionable message for this case. New test:
`test_login_returns_503_when_database_unavailable`.

---

## 📦 SMS_Lite onefile → onedir switch + build-path consolidation (September 8–9, 2026)

**Status**: ✅ DONE, released as part of `v1.18.39`.

1. **Onefile → onedir, no UPX** (commit `78abe1068`). Onefile mode re-extracted
   the whole bundle to a fresh `%TEMP%` dir on every launch; onedir keeps
   files on disk after install for faster, more consistent startup. UPX
   compression dropped too (adds decompression overhead and is a common AV
   heuristic trigger). `INSTALLER_BUILDER.ps1`, `RELEASE_READY.ps1`, and
   `SMS_Installer.iss` updated to stage/package the onedir folder (`exe` +
   `_internal/`) instead of a single exe. Also timestamped
   `lite_simple_entrypoint.py`'s debug-log entries for startup-timing
   diagnosis, and excluded `dist/`/`build/` from `config/mypy.ini` (onedir
   leaves loose vendored `.py` files, e.g. `pydantic_core/core_schema.py`,
   that mypy was failing on).
2. **CI release workflow still checked the old onefile path** (commit
   `7d7793295`). `release-installer-with-sha.yml`'s pre-build validation
   still looked for `dist\SMS_Lite.exe`; after (1) the real output was
   `dist\SMS_Lite\SMS_Lite.exe`, so the workflow failed immediately after a
   successful PyInstaller build — blocking the `v1.18.39` release. Fixed the
   path check and the size-reporting logic (folder size via
   `Get-ChildItem -Recurse` instead of a single file).
3. **Four scripts had drifted onto four different on-disk output paths**
   (commit `60abe0433`, confirmed failing on PR #229). `INSTALLER_BUILDER.ps1`,
   `RELEASE_READY.ps1`, the CI release workflow, and
   `validate_installer_release_inputs.ps1` each independently re-derived
   "where does the SMS_Lite PyInstaller output live" after the onefile→onedir
   switch. Consolidated to one canonical path:
   `infra/installer/windows/dist/SMS_Lite/` — PyInstaller now writes there
   directly via explicit `-distpath`, removing the build→stage→copy chain
   entirely (`Copy-NativeLiteExecutable` renamed to
   `Confirm-NativeLiteEditionReady`, since there's nothing left to copy).
   Also fixed a live regression this drift caused: the validator's
   optional-generated allowlist still referenced the old onefile single-file
   path, so it never matched the new onedir wildcard `Source:` line — turning
   a missing `SMS_Lite` folder into a hard failure on any clean checkout
   instead of the intended optional skip, which had been failing
   COMMIT_READY's installer guard on every CI run since the onedir switch.

---

## 🧪 Full 4-mode smoke test ahead of v1.18.38 (September 5, 2026)

**Status**: ✅ DONE — all four deployment modes verified end-to-end (health check,
login, authenticated API fetch); one real bug found and fixed per mode area.

Scope requested: smoke test Native + Docker + Lite + Android before deciding
whether to cut v1.18.38 (candidate scope: the npm CI fix, the
performSave/syncSnapshotToServer dedup, and a CodeQL fix — see the sections
below).

- **Native** (`NATIVE.ps1 -Start`): ✅ pass. Health check, login, authenticated
  `/api/v1/students` fetch, frontend on :5173 all healthy, version correctly
  reports `v1.18.37`.
- **Docker** (`DOCKER.ps1 -Start`, fresh image build — first local build to
  exercise the `npm@11` pin fix from earlier in this file): ✅ pass
  functionally (health, login, authenticated fetch on :8080). One cosmetic
  gap found and **fixed same day** (commit `54cde030a`): `/health` reported
  `"version": "unknown"` instead of `v1.18.37` because `app_factory.py`'s
  `get_version()` (and its duplicate in `main.py`) hardcoded the `VERSION`
  file at exactly 3 ancestor levels above the module — correct for the
  native/source layout (`src/backend/` → repo root) but wrong for Docker's
  flatter layout (`Dockerfile.fullstack` copies to `/app/backend` +
  `/app/VERSION`, only 1 level up). Now checks 1–3 levels. Verified by
  rebuilding the image directly (note: `DOCKER.ps1 -Update`'s "fast rebuild"
  path is broken — hardcodes a stale `docker/Dockerfile.fullstack` relative
  path left over from the June 12 flattening, unlike `-Start`'s correct
  `infra/docker/compose/Dockerfile.fullstack`, and swallows the real error
  with `2>&1 | Out-Null`; not fixed, out of scope for this session) and
  confirming `/health` now reports the real version with login/fetch still
  working.
- **Lite** (`SMS_Lite.exe`, fresh PyInstaller build): ❌→✅ **found and fixed
  a completely broken build** — see the dedicated section below. This had
  clearly not been smoke-tested since well before the June 2026 security
  hardening that (correctly) added strict `SECRET_KEY` placeholder rejection.
- **Android** (`npm run build:android` + `gradlew assembleDebug`): build
  verified only — `app-debug.apk` (6.19 MB) built successfully. No AVD or
  physical device was available in this session to install/run it (past
  sessions used a physical device over Tailscale); functional on-device
  testing is still outstanding.
- Also found and fixed the same session: GitHub code-scanning alert #1857
  (`js/insecure-randomness`) — see the CodeQL section below.

### 🐛 SMS_Lite.exe was completely broken — fixed (commit `907292fd7`)

**Status**: ✅ FIXED. Two independent, real bugs, both now confirmed fixed via
a clean rebuild + repeated launches (health, login, authenticated fetch,
frontend serving all pass).

1. **`pydantic_core`'s compiled binary was never bundled.**
   `pyinstaller-hooks-contrib`'s `hook-pydantic.py` only collects the
   pure-Python `pydantic` package's submodules — there is no
   `hook-pydantic_core.py` in the installed hooks-contrib version (2026.6),
   so the separate compiled `_pydantic_core.cp313-win_amd64.pyd` extension
   was never picked up by PyInstaller's automatic analysis in onefile mode.
   Manifested as a different `ModuleNotFoundError` on almost every launch
   (`unicodedata`, `_overlapped`, `pydantic_core._pydantic_core`) —
   confusing because it looked non-deterministic/AV-related but was fully
   reproducible (3/3, then 3/3 again after a `--clean` rebuild). Fixed in
   `lite_simple_entrypoint.spec` via `collect_all('pydantic_core')`, merging
   its `binaries`/`datas`/`hiddenimports` into the `Analysis`. Confirmed via
   `pyi-archive_viewer` that the `.pyd` is now actually inside the onefile
   archive.
2. **No real `SECRET_KEY` was ever available to the frozen exe** — the real
   root cause, only visible after fixing (1). There's no bundled
   `backend/.env` in the exe, and `lite_simple_entrypoint.py` never set
   `SECRET_KEY`, so `backend.config.Settings`' `check_secret_key` validator
   (added during the June 2026 security audit) correctly rejected the
   placeholder default and raised, crashing app creation every time.
   `lite_simple_entrypoint.py` now generates a secure `SECRET_KEY` with
   `secrets.token_urlsafe(48)` on first run and persists it under
   `%LOCALAPPDATA%\SMS_Native_Lite_Simple\local-secrets\secret_key.txt`
   (same pattern as the existing `qnap-credentials.json`), so existing
   JWTs/sessions survive app restarts instead of a new key invalidating them
   every launch.
   - **Diagnostic dead-end worth remembering**: the real `SECRET_KEY`
     `ValidationError` was invisible for most of this investigation because
     `lite_simple_entrypoint.py`'s exception logging truncated
     `traceback.format_exc()` from the **head** (`[:1000]`) — but the actual
     exception message is always the **last** lines of a traceback, so long
     import-chain tracebacks silently hid the real error and showed
     unrelated frames instead. Fixed to truncate from the tail (`[-1500:]`).
     Also fixed `_debug_log()` to open its log file with explicit
     `encoding='utf-8'` (was relying on the OS locale codepage — this is a
     Greek-locale machine — which likely explains some of the short
     one-line error summaries silently failing to write at all).

### 🐛 QNAP credentials URL-encoding bug in SMS_Lite.exe (September 8, 2026, PR #228)

**Status**: ✅ FIXED, **released in v1.18.39** (`df1cd488d`, PR #228).

Reported by the owner after installing SMS_Lite on a laptop: QNAP PostgreSQL
credentials "failing" even though correct. Root cause:
`lite_simple_entrypoint.py` built `DATABASE_URL` from
`qnap-credentials.json` by raw f-string interpolation of `user`/`password`/
`dbname`, the only place in the codebase doing so — `config.py`,
`database_manager.py`, and `routers/control/database.py` all already
`quote_plus()`-encode the same fields when building this kind of URL. Any
QNAP password containing a URL-special character (`@`, `:`, `/`, `#`, `%`,
etc.) corrupted the connection string, so a correct password looked like a
rejected/wrong credential. Fixed to match the existing `quote_plus()`
pattern. No test added — `lite_simple_entrypoint.py` has import-time side
effects (PyInstaller bundle detection, env var mutation) with no existing
test harness; building one was judged out of scope for this fix.

---

## 🔒 CodeQL js/insecure-randomness fix (September 5, 2026, commit `efa56ed1c`)

**Status**: ✅ FIXED, verified via manual `workflow_dispatch` CodeQL re-run —
alert #1857 confirmed `state: fixed`.

`offlineAttendanceQueue.ts`, `offlineGradesQueue.ts`,
`offlineStudentUpdateQueue.ts`, and `useSearchHistory.ts` each built local
IDs with `Math.random()`. Not actual security-sensitive values (client-side
offline-queue/history dedup keys, never used for auth or crypto), but a
legitimate CodeQL finding worth fixing correctly: added a shared
`generateLocalId()` helper (`src/frontend/src/utils/randomId.ts`) using
`crypto.getRandomValues()` with a `Math.random()` fallback for environments
without Web Crypto, matching the existing pattern already in
`calendarUtils.ts`. Note for future CI awareness: this repo's
`codeql.yml` only runs on PRs to `main`, a weekly Monday-2am schedule, or
manual `workflow_dispatch` — **not** on direct pushes to `main` (this is a
solo-dev repo that commits straight to `main`), so alerts don't auto-close
until one of those triggers fires; triggered a manual dispatch to confirm.

---

## 🗄️ Dev-DB stray E2E test data cleanup (September 5, 2026)

**Status**: ✅ DONE, owner-confirmed before executing.

Deleted 96 stray students (`email LIKE '%@test.edu'`) and 53 stray courses
(`course_name LIKE 'Test Course %'`) — leftover `tests/e2e/helpers.ts`
generator artifacts noted but deliberately left alone in the
2026-09-04 AttendanceView session (see the archive/memory for that note).
Matched via the exact generator patterns; a broader `Test%` sweep on both
tables returned identical counts, confirming no real data was at risk. 95 of
the 96 students were live (not soft-deleted) and were occupying slots in the
paginated (`limit=100`) students list. Deleted dependents first (attendances
→ grades → daily_performances → highlights → course_enrollments →
`student_course_performance`) in one transaction, since `Course`'s
SQLAlchemy relationships to `Attendance`/`Grade`/`DailyPerformance` carry no
cascade (only `CourseEnrollment` does) — a plain ORM delete would have hit
an `IntegrityError`.

---

## ♻️ performSave/syncSnapshotToServer dedup (September 4, 2026, post-release)

**Status**: ✅ DONE | commit `afc1b62c0` | the deliberately-deferred follow-up from the AttendanceView save/offline-sync extraction earlier this session

`performSave` and `syncSnapshotToServer` in `useAttendanceSaveSync.ts` independently
reimplemented ~150 near-identical lines (PUT-with-404-fallback-to-POST per
attendance/daily-performance record, DELETE-with-404-tolerance per pending
deletion, chunked in batches of 30 with a 200ms pause between chunks).
Extracted into a shared, independently-testable module-level function
`syncAttendanceAndPerformanceRequests` — each caller still resolves its own
id map first (React state vs. a server GET, unchanged) and calls the shared
function. Standardized 3 small pre-existing inconsistencies between the two
functions (attendance-key normalization, record-id validity strictness,
dropped 12 debug `console.warn` calls) on the stricter/safer existing
behavior, confirmed safe by tracing every call site.

Design was independently verified by a Plan agent against the actual file
content before implementation (not just self-reviewed). Added 6 new tests
(direct coverage of the shared function + an equivalence test proving both
callers now produce identical request shapes) — the existing 12 tests
needed zero changes. Verified via `tsc`, `eslint`, the full 22-test
attendance suite, and a real click-through against `NATIVE.ps1` + the dev
backend with status verified via **direct API reads** (not just UI
proxies) after both the online-save and offline-queue-sync paths.

**Test-methodology note for future E2E work against this same dev DB**:
repeated runs against the same course/student record can leave it already
in the "target" state, silently no-op-ing a click (no diff → autosave never
fires → nothing to assert on). Read the actual persisted value via the API
first and pick actions guaranteed to differ from it, rather than assuming
"click Present" is a real state change.

---

## 🚀 v1.18.37 (September 4, 2026) — release + CI fix

**Status**: ✅ RELEASED | Tag `v1.18.37` | Installer + Android APK uploaded to GitHub Releases | `CI/CD Pipeline` and `E2E Tests` green on `main`

Cut via `.\infra\scripts\release\RELEASE_READY.ps1 -ReleaseVersion "1.18.37" -TagRelease` (full Lite rebuild, not `-SkipLiteBuild` — the pre-built `SMS_Lite.exe` was from 2026-06-18, ~2.5 months stale). Installer Authenticode-signed and verified; release workflow (`Release - Build & Upload Installer`, `Release - Build & Upload Android APK`) both succeeded.

**Real CI break found and fixed post-tag** (`main`'s `CI/CD Pipeline` failed twice after the release commit, both times at the `🐳 Build Docker Images` job):
- `node:22-slim`'s bundled `npm 10.9.8` has a reproducible arborist crash
  (`Cannot read properties of null (reading 'edgesOut')`, in
  `#loadPeerSet`) resolving this project's peer-dependency graph — hit
  during `Dockerfile.fullstack`'s frontend-stage `RUN npm install` (which
  deliberately installs from `package.json` alone, no lockfile, so it does
  a fresh dependency-graph resolution on every cache-miss — normally
  masked by Docker layer caching, exposed here because the release
  commit's `package.json` version bump invalidated that `COPY` layer).
  Reproduced locally via `docker build`/`docker buildx build` after
  starting Docker Desktop; root-caused via `npm verbose` stack trace.
- First fix attempt (commit `12c8e58c7`): removed a genuine bug — commit
  `3e5f5dc5e` had accidentally added `@vitest/coverage-v8` to **both**
  `dependencies` (`^4.0.16`) and `devDependencies` (`^4.0.8`) with
  conflicting ranges (pure test-tool, never imported from app code — the
  `dependencies` entry was always wrong). Real bug, worth having fixed,
  but **did not** fix the Docker CI crash — confirmed by a second failed
  CI run on that exact commit.
- Actual fix (commit `07fea9cbf`): pin `npm install -g npm@11` before
  `npm install` in `Dockerfile.fullstack`'s frontend stage. npm 11
  resolves the same graph without crashing. Verified via a full local
  `docker buildx build -f infra/docker/compose/Dockerfile.fullstack .`
  (both stages) plus a container smoke run (migrations applied, admin
  user created, all routers registered, SPA served).
- **Self-inflicted gotcha while debugging, worth remembering**: testing
  `npm install`/`npm run build` inside a container with a **writable**
  bind mount of `src/frontend` (`-v "${PWD}\src\frontend:/app/frontend"`)
  overwrites the host's `node_modules` with Linux-native binaries
  (`@rollup/rollup-linux-*` etc.), breaking the Windows host's dev
  environment (`Cannot find module '@rollup/rollup-win32-x64-msvc'`,
  `'eslint' is not recognized`) — this is npm/cli#4828's optional-deps
  bug, self-triggered. Fix: `Remove-Item -Recurse -Force node_modules`
  - `npm install` on the host to restore Windows-native binaries. For any
  future Docker-based repro of a frontend build issue, mount `package.json`
  read-only and a **separate empty writable directory** for `node_modules`
  (or just don't reuse the host's real `src/frontend` as the container's
  `WORKDIR` bind mount) to avoid this.

---

## 📋 Post-v1.18.36 Codebase Review (September 4, 2026)

**Status**: ✅ CLOSED — both todo items done, released as `v1.18.37` (2026-09-04).

**Scope**: 22 commits landed on `main` since the `v1.18.36` tag (router dedup,
4 large-component splits, new router test coverage, CI/CodeQL fixes, dependency
bumps). Reviewed by reading the diffs directly (backgrounded multi-agent review
hit the session rate limit before finishing) and verifying with `tsc --noEmit`
(clean), `eslint` on the touched directories (clean), `ruff` on the touched
backend files (clean), and running the 10 new/touched backend test files
directly (125 passed). No functional regressions found — extractions correctly
preserve auth gating, alignment/logging quirks, and prop wiring.

### Todo — before next release

- [x] Update `CHANGELOG.md` with an entry for these 22 commits — added an
      `[Unreleased]` section (2026-09-04).
- [x] Bump `VERSION` past `v1.18.36` as part of the next release — done
      2026-09-04: cut and published as `v1.18.37` (see the section above),
      which also carried the AttendanceView save/offline-sync extraction and
      a Docker CI fix landed the same day.

### Todo — small cleanup found during review

- [x] `src/backend/routers/routers_feedback.py:218` used `datetime.utcnow()`,
      which is deprecated — switched to `datetime.now(timezone.utc)` to match
      the pattern used elsewhere in the backend (2026-09-04).

### AttendanceView.tsx — JSX extraction completed 2026-09-04 (commit `ae5f38b83`)

- [x] Student List attendance-marking grid → `AttendanceStudentList.tsx`
- [x] Performance/Rate modal → `AttendancePerformanceModal.tsx`
- `AttendanceView.tsx`: 1,821 → 1,629 lines. Verified via `tsc`/`eslint`, the
      existing `AttendanceView.specialParticipation.test.tsx`, and a real
      click-through against `NATIVE.ps1` (course select, day pick, mark
      Present, Rate modal, checkbox toggle, autosave "File saved
      successfully" toast) — screenshots confirmed identical rendering.
- **Save/offline-sync/autosave block — extracted 2026-09-04** (dedicated
      session, as called for above): `performSave`, `syncSnapshotToServer`,
      `queueAttendanceSnapshot`, `flushQueuedSnapshots`, `refreshAttendancePrefill`
      and their helpers moved into `src/frontend/src/features/attendance/hooks/useAttendanceSaveSync.ts`
      (605 lines). All state stayed owned by `AttendanceView.tsx` (passed to
      the hook as explicit params/setters, mirroring the exact prior closure)
      — a pure logic relocation, not a state-ownership redesign, to keep the
      risk surface minimal in this daily-use save path.
      `AttendanceView.tsx`: 1,452 → 939 lines.
      - Added `useAttendanceSaveSync.test.ts` (12 tests) — this logic had
        **zero** prior test coverage (the existing
        `AttendanceView.specialParticipation.test.tsx` mocks `useAutosave`
        and the offline queue module to no-ops). New tests cover PUT/POST
        fallback, 404→POST fallback, DELETE of pending-removal performance
        records, offline queueing, network-error→queue fallback, genuine-error
        surfacing + rethrow, queue drain/stop-at-first-failure, and
        request de-dup in `refreshAttendancePrefill`.
      - Verified via `tsc`, `eslint` (0 errors), the full attendance test
        suite (16/16 passing, including the untouched
        `specialParticipation` test), and a real click-through against
        `NATIVE.ps1` + the actual dev Postgres backend (Playwright,
        deleted after use): course/date select, mark Present → "Saving" →
        "File saved successfully" toast → `Coverage: 100%`, reload
        persistence, then DevTools-equivalent offline simulation (mark
        Absent while offline → "Offline: changes queued..." toast +
        "1 queued for sync" badge) → reconnect (`window` `online` event) →
        "1 queued change set(s) synced." toast. All screenshots confirmed.
      - Flagged, deliberately deferred to avoid combining a logic dedup with
        a logic relocation in the same change: `performSave` and
        `syncSnapshotToServer` independently reimplement ~150 lines of
        near-identical PUT/POST-fallback/DELETE logic. **Done same day as a
        separate follow-up** — see the "performSave/syncSnapshotToServer
        dedup" section above.
      - Also noted, out of scope: the dev Postgres DB has ~148 stray
        "Test Course \*"/"Test\* Student\*" rows accumulated from prior e2e
        sessions using `tests/e2e/helpers.ts`'s data generators (not created
        by this session beyond a handful during verification, indistinguishable
        from the rest) — left alone rather than bulk-deleting shared dev data
        without explicit confirmation.
      - **Cleaned up 2026-09-05**: confirmed with the owner and hard-deleted.
        Matched via the exact generator patterns from `helpers.ts`
        (`generateStudentData`/`generateCourseData`): students with
        `email LIKE '%@test.edu'` (96 rows) and courses with
        `course_name LIKE 'Test Course %'` (53 rows) — a broad `Test%` sweep
        on both tables returned identical counts, confirming no real data
        matched loosely. 95 of the 96 students were live (`is_active=true`,
        not soft-deleted) and would have been occupying slots in the
        paginated (limit=100) students list referenced in the
        [[project_remaining_backlog_2026_09]] Attendance gotcha; all 53
        courses were already `is_active=false` but not soft-deleted. Deleted
        via a single transaction in dependency order (attendances → grades →
        daily_performances → highlights → course_enrollments →
        `student_course_performance` (0 matched) → courses → students) since
        `Course`'s SQLAlchemy relationships to `Attendance`/`Grade`/
        `DailyPerformance` carry no cascade (only `CourseEnrollment` does),
        so a plain ORM/ondelete cascade would not have covered them. 2
        attendance rows and 9 enrollment rows were removed as dependents;
        verified 0 remaining matches on both the narrow and broad patterns
        after commit.

---

## 📋 v1.18.36 (September 1, 2026) — commits since v1.18.35

| Hash | Area | Description |
|------|------|-------------|
| `e54f8a089` | Test | Add `test_download_rejects_path_traversal_export_filename` (semester-archive download guard) + `StudentProfile.test.tsx` (Academic History coverage) |
| `3dd499418` | Fix | Consolidate all backup paths (session-import, semester-archive, admin DB, Postgres) to a single `Settings.BACKUPS_DIR` source of truth |
| `1a9665502` | Refactor | Rename `docker-old`→`compose`/`installer-old`→`windows`, dedupe session-import lookups, fix N+1 queries in semester archive preview/execute |
| `3d14b91b4` | Fix | Security/correctness gaps from codebase review: Docker AUTH_MODE=strict default, `sessions:manage` RBAC seed gap, session-import filename path-traversal sanitization, `/control/reset-database` via Alembic, plaintext export staging dir hardening, i18n fallback fixes |
| `7aa22e0f6` | Fix | Correct CodeQL path-injection suppression syntax on validated paths |
| `dab7f5b23` | Fix | Sweep orphaned multiprocessing workers on backend restart/stop |
| `a0dd54321` | Fix | User permission lookup 500 error on PostgreSQL |
| `404965139` | Fix | PermissionsPage showed 0 permissions and raw i18n keys |
| `8f0bc0696` | Fix | Remove redundant Grant Permission tab from RBAC Configuration |
| `182a6276b` | Fix | Unify Permissions into RBAC Configuration as a tab |
| `68071b242` | Fix | Shift letter-grade scale to align with a 50% pass mark |
| `3d6b5537b` | Fix | Nest Semester Archive inside System Operations instead of its own section |
| `a30319d21` | Fix | Remove duplicate Import/Export section from Control Panel maintenance tab |
| `cfc65e0e5` | Fix | Move admin pages into System > Control Panel > Maintenance |
| `3b88bf974` | Fix | Expose admin section (Permissions/Import-Export/Semester Archive) in main nav |
| `737d2f602` | Feat | Add semester archive - back up and archive passed courses per semester |
| `ada862ced` | Release | Bump version to 1.18.35 and update docs |

---

## 🧩 Semester Archive Feature (shipped in v1.18.35, commit `737d2f602`)

**Status**: ✅ Implemented and released as part of v1.18.35.

Adds an admin-only "semester archive" operation: pick a semester (grouped by the
existing free-text `Course.semester` label), preview which student+course pairs
have been passed and fully graded (weighted final grade vs. a configurable
threshold, reusing `AnalyticsService.calculate_final_grade`), back up the whole
semester's data (reuses the existing session-export dataset/serializers from
`routers_sessions.py`, now extracted into `services/session_data_service.py`,
persisted as an AES-256-GCM encrypted artifact via `BackupServiceEncrypted`),
then replace the raw `CourseEnrollment`/`Grade`/`Attendance`/`DailyPerformance`
rows for each passed course with one permanent `StudentCoursePerformance`
record. Failed/dropped/still-in-progress enrollments are left untouched.
Student profiles are never touched.

### New/changed backend

- `models.py`: `SemesterArchiveExport`, `StudentCoursePerformance` tables.
- Migration `a3f7c9e2b5d1_add_semester_archive_tables.py` (head, on `e8f9a1b2c3d4`).
- `services/session_data_service.py` (new — extracted from `routers_sessions.py`
  so the semester export payload is built in exactly one place).
- `services/semester_export_service.py`, `services/semester_archive_service.py` (new).
- `routers/routers_semester_archive.py` (new, `optional_require_role("admin")` gated,
  registered in `router_registry.py`); `GET /enrollments/student/{id}/performance-history`
  added to `routers_enrollments.py`.
- New `ErrorCode` entries (`SEMESTER_ARCHIVE_*`).
- Tests: `test_semester_archive_service.py`, `test_semester_archive_router.py`.

### New/changed frontend

- `features/semesterArchive/` (`SemesterArchivePage.tsx` + `useSemesterArchive.ts`),
  wired into `AdminLayout.tsx` as a third tab (`/admin/semester-archive`).
- `StudentProfile.tsx`: new "Academic History" section reading the new endpoint.
- New `semesterArchive` i18n namespace (en/el); `students.js` gained
  `academicHistory`/`academicHistoryDescription` keys.

### Operational follow-up: re-seed existing databases

- `sessions:manage` permission (used by `routers_sessions.py` export/import/
  rollback/backup endpoints) was missing from `ROLE_PERMISSIONS`/`PERMISSIONS`
  in `scripts/seed_permissions.py` — fixed in code 2026-09-01. Any database
  created *before* that fix still needs `scripts/seed_permissions.py`
  re-run against it to pick up the permission.

### Resolved 2026-09-01

- ✅ `StudentProfile.test.tsx` added (`src/frontend/src/features/students/components/`)
  covering the "Academic History" section: hidden when empty, renders archived
  records, hides on a failed fetch.
- ✅ `test_download_rejects_path_traversal_export_filename` added to
  `test_semester_archive_router.py`, proving the `is_relative_to` guard on
  `routers_semester_archive.py`'s download endpoint rejects a `../`-escaped
  `export_filename` even when a file exists at the resolved (out-of-bounds)
  path — isolates the 404 to the guard rather than a plain not-found.

---

## 🚀 v1.18.34 — Android Student Card Layout Fix + Tailscale CORS (June 26, 2026)

**Status**: ✅ RELEASED | Tag `v1.18.34` | GitHub: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.34
**Installer**: `SMS_Installer_1.18.34.exe` (~97 MB) — built locally and uploaded 2026-06-26
**Wiki**: Updated to v1.18.34 — Home, Release History, Sidebar, Footer

### Changes

| Hash | Area | Description |
|------|------|-------------|
| `aaa0505ad` | Android/UI | Fix student card layout and View Performance overlap on mobile |
| `d375c9e62` | Chore | Add `.backend.port` to `.gitignore` (native server runtime file) |
| `e7f4359af` | Android | Allow cleartext HTTP for Tailscale/LAN backend connections |
| `895d0f9d7` | Android | Replace QNAP card with Tailscale; fix CORS for Capacitor WebView |
| `a857cc09b` | Release | Bump version to 1.18.34 and update docs |

### Root Cause: VirtualList + Expandable Cards

`VirtualList` (TanStack Virtual) used absolute positioning with `estimateSize={150}px` inside a fixed `600px` container. With 67+ active students the threshold triggered. When a card expanded, the virtualizer didn't re-measure — subsequent cards overlapped the expanded content.

**Fix**: Removed `VirtualList` from `StudentsView.tsx` entirely; always use plain `<ul>`. Action buttons switched from `flex flex-wrap` to `grid grid-cols-2` so long Greek labels ("Προβολή Επίδοσης", "Επεξεργασία") fit cleanly in 2×2 layout.

---

## 🚀 v1.18.33 — E2E TDZ Fix + Security Hardening (June 25, 2026)

**Status**: ✅ RELEASED | Tag `v1.18.33` | GitHub: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.33
**Installer**: `SMS_Installer_1.18.33.exe` — built and published by CI on 2026-06-25

### Changes Since v1.18.32

| Hash | Area | Description |
|------|------|-------------|
| `c38bd964c` | E2E/Security | Remove `sms-e2e-login` production backdoor; use `addInitScript`+cookie auth |
| `86d02f30d` | Build | Remove per-feature `manualChunks` — eliminated circular-chunk Rollup TDZ |
| `dba81dc44` | E2E | Add `pageerror`/DOM diagnostics to `loginViaAPI` for CI debugging |
| `317500645` | Chore | Gitignore e2e-metrics-and-patterns, e2e-test-results, tsconfig.node.tsbuildinfo |
| `bd15d9c97` | Release | Bump version to 1.18.33 and update docs |
| `f7eb3901a` | Fix | Restore CLAUDE.md to repo root (accidentally moved by release pipeline) |
| `eea640f92` | Fix | Protect CLAUDE.md and AGENTS.md from WORKSPACE_CLEANUP.ps1 relocation |
| `a8f06989e` | CI | Upgrade Android build to Java 21 (capacitor-android requires VERSION_21) |

### Security (June 24–25)

| Hash | Area | Description |
|------|------|-------------|
| `a3a9cfa14` | CI | Resolve 3 CI failures from security-audit auth defaults change |
| `68a4ffbc6` | Security | Replace dangerouslySetInnerHTML with Trans in ExportCenter |
| `439a1777d` | Security | Add CSP + HSTS headers, mask admin token in debug log |
| `71a2ad750` | Security | Sync pyproject.toml deps, clear exempt-email defaults, SSLMODE warning |
| `c030ed0eb` | CI+Security | Playwright cache restored, capacitor gate, weak-pw warn, py3.13 floor |
| `5d8088211` | Security | bcrypt migration, secure auth defaults, deps pinned, aioredis removed |
| `e7252c050` | Security | CI Python version, token storage in-memory only, exception logging |

**Security action COMPLETED (2026-06-25)**: Android signing keystore rotated. New PKCS12 keystore generated (RSA-2048, 10 000-day validity, alias `sms-release`). GitHub secrets updated. ⚠️ First APK release after this rotation requires reinstall on existing devices.

**E2E**: 84/84 tests passing. Analytics dashboard tests fixed (Rollup TDZ root cause resolved).

---

## 📋 Post-v1.18.32 Accumulation (June 21–25, 2026) — RELEASED AS v1.18.33

**Status**: ✅ RELEASED in v1.18.33

### June 25 — E2E + Build fixes (this session)

| Hash | Area | Description |
|------|------|-------------|
| `c38bd964c` | E2E/Security | Remove `sms-e2e-login` production backdoor; use `addInitScript`+cookie auth |
| `86d02f30d` | Build | Remove per-feature `manualChunks` — eliminated circular-chunk Rollup TDZ |
| `dba81dc44` | E2E | Add `pageerror`/DOM diagnostics to `loginViaAPI` for CI debugging |
| `d706b462b` | Fix | Revert IIFE from `authService._token` (was causing Rollup TDZ) |
| `94a7ac472` | E2E | (Superseded by c38bd964c) sms-e2e-login event approach |

### June 24 — Security audit follow-up

| Hash | Area | Description |
|------|------|-------------|
| `a3a9cfa14` | CI | Resolve 3 CI failures from security-audit auth defaults change |
| `68a4ffbc6` | Security | Replace dangerouslySetInnerHTML with Trans in ExportCenter |
| `439a1777d` | Security | Add CSP + HSTS headers, mask admin token in debug log |
| `71a2ad750` | Security | Sync pyproject.toml deps, clear exempt-email defaults, SSLMODE warning |
| `c030ed0eb` | CI+Security | Playwright cache restored, capacitor gate, weak-pw warn, py3.13 floor |
| `5d8088211` | Security | bcrypt migration, secure auth defaults, deps pinned, aioredis removed |
| `e7252c050` | Security | CI Python version, token storage in-memory only, exception logging |

### June 23 — CI/CD audit + Android security

| Hash | Area | Description |
|------|------|-------------|
| `abf994389` | CI | Resolve CI/CD audit BLOCKERs, HIGH, and MEDIUM findings |
| `7636e895f` | Release | Add Android APK to release pipeline |
| `2629a2b91` | Fix | local-mode: clear broken state on SW restore failure + activation timeout |
| `31cbd1808` | Android | Security hardening: cleartext scoped, allowBackup=false, minification on |
| `bceacc657` | Chore | Untrack runtime files + stale test artifacts; fix gitignore |
| `20ec8e44f` | E2E | Add data-testid="submit-student" to EditStudentModal |
| `89a37c311` | E2E | Add missing data-testids to StudentForm + fix curl exit code |
| `b16445a86` | E2E | Unskip student edit + delete tests; fix window.confirm handler |
| `84bc253e6` | Lint | Remove debug console.log + fix i18n warnings in ServerSetupPage |
| `e741358b4` | E2E | Replace networkidle with load in loginViaUI and critical-flows |
| `e0cfad4dd` | E2E | Remove sms_server_url injection from loginViaUI and loginViaAPI |
| `953aaca9f` | Fix | Use Capacitor.isNativePlatform() to eliminate 3s init delay in CI |
| `4f11d6d7c` | E2E | Fix ServerGuard redirect: set sms_server_url in localStorage |
| `27751eac4` | E2E | Always render analytics summary cards; fix loginViaUI nav |
| `01a4b6796` | Tests | Fix 7 CI failures caused by Android standalone commit |
| `cdff5f586` | Android | Standalone local mode + fix mobile API calls |

### June 21 — Docs + Installer fixes

| Hash | Area | Description |
|------|------|-------------|
| `e46c130db` | Docs | Register academic monographs in DOCUMENTATION_INDEX |
| `9471125d4` | Docs | Refine bilingual academic monograph (EN/EL final merge) |
| `ccf4a1217` | Docs | Add bilingual EN/EL academic monograph for CS community presentation |
| `f4be40ba3` | Installer | Patch Dockerfile src/ paths for installed layout |
| `9ddf25805` | Installer | Fix docker path mismatch and exit-code bug in DOCKER.ps1 |
| `9c03580e0` | Installer | Resolve PROJECT_ROOT to install dir when run from installer root |
| `0047e0308` | Project | Restore CLAUDE.md to project root |

**Notable**: Deep security audit (20+ findings), Android standalone mode, installer Docker path fixes, E2E auth TDZ fix, and full E2E suite stability (84 passing) make this a strong v1.18.33 candidate.

**Security action COMPLETED (2026-06-25)**: Android signing keystore rotated. New PKCS12 keystore generated (RSA-2048, 10 000-day validity, alias `sms-release`). GitHub secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, and `ANDROID_KEY_ALIAS` all updated. Old `SmsRelease2024!` password is now dead. ⚠️ First APK release after this rotation requires reinstall on existing devices (different signing certificate).

---

## 🚀 v1.18.32 — Android Standalone + Installer Path Fixes (June 21, 2026)

**Status**: ✅ RELEASED | Commit `d35fc8a3d` | Tag `v1.18.32` | GitHub: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.32
**Installer**: `SMS_Installer_1.18.32.exe` — built and published by CI on 2026-06-21

### Changes Since v1.18.31

| Hash | Area | Description |
|------|------|-------------|
| `d35fc8a3d` | Release | Bump version to 1.18.32 and update docs |
| `799e5a486` | Dev | Pin ruff to exact version to prevent WinError 5 on upgrade |
| `fa53d9aaf` | CI | 8 workflow correctness bugs from deep multi-angle review |
| `51e0575ab` | CI | Repair 8 workflow bugs found in post-v1.18.31 audit |
| `6ececf02e` | E2E | Revert loginViaAPI final goto to /dashboard (forces full reload) |
| `e10c1d3a0` | E2E | Fix all remaining page.goto paths for HashRouter across 5 spec files |
| `57852240a` | E2E | Repair logout waitForURL regex and advanced_search goto for HashRouter |
| `10917c347` | E2E | Use hash routes for HashRouter navigation in analytics E2E tests |
| `48f55fba2` | i18n | Add 43 missing analytics keys that caused E2E failures |
| `fd7f84aa8` | Build | vitest-results.xml flag + bump vitest to 4.1.9 |

---

## 🚀 v1.18.31 — Docker + esbuild + Android Release (June 19, 2026)

**Status**: ✅ RELEASED | Commit `cfc643531` | Tag `v1.18.31` | GitHub: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.31

### Changes
| # | Area | Fix |
|---|------|-----|
| 1 | Docker compose | `context: ../../..` (project root) — was `..` resolving to `infra/docker/` |
| 2 | Dockerfile.frontend | `node:22-slim` (was `node:22.3.0-alpine3.20`); copy only `package.json`, run `npm install` fresh |
| 3 | esbuild override | `"esbuild": "^0.27.0"` in `package.json` overrides — matches vite 7.3.5 peer dep, eliminates host/binary mismatch |
| 4 | SQLite Docker | `sqlite:////data/...` (4-slash absolute path) in `config.py` — was 3-slash, resolved relative to CWD `/app` |
| 5 | DOCKER.ps1 | `config\.env` path after June 12 reorganization |
| 6 | Inno Setup | Added `build,.ruff_cache,dist` to backend Excludes — prevented 267 MB bloat |
| 7 | Android signing | Release keystore configured; `app-release.apk` 5.13 MB (versionCode 118031, versionName 1.18.31) |

### Evidence
- ✅ Docker smoke test: `/health` 200, `status: healthy` on port 8080
- ✅ Installer: `SMS_Installer_1.18.31.exe` — 97.24 MB — Authenticode Valid
- ✅ Android: `app-release.apk` signed with `CN=SMS App, OU=MIEEK, O=AUT, L=Nicosia` — 5.13 MB
- ✅ Backend: 914 tests passing | Frontend: 1939 tests passing

### Keystore (local only — never committed via keystore.properties)
- File: `C:\Users\Vasilis\.android\sms-release.jks` | Alias: `sms-release`
- **Rotate password**: credentials were exposed in this file in a prior commit — generate a new keystore or change the key password.

---

## 🔧 Post-v1.18.30 Audit Fixes (June 19, 2026)

**Status**: ✅ COMMITTED | Commit `d7f4ab762` on `main`

Full honest audit of all four deployment modes (native, lite, docker, mobile) found 6 gaps. All fixed in one commit.

| # | File | Fix |
|---|------|-----|
| 1 | `infra/scripts/dev/DOCKER.ps1` | Added `$PROJECT_ROOT` (3 levels up) + repointed all 20+ path vars broken by June 12 restructure |
| 2 | `.github/workflows/release-installer-with-sha.yml` | Switched PyInstaller spec from `lite_entrypoint.spec` → `lite_simple_entrypoint.spec`; updated expected output from `SMS_Native_Lite_Simple.exe` → `SMS_Lite.exe` |
| 3 | `infra/scripts/testing/RUN_TESTS_BATCH.ps1` | Fixed `Tests: Total: 0` bug — count `.`/`F`/`s` markers from progress lines (pytest summary line is not emitted to captured stdout on Windows non-TTY) |
| 4 | `src/backend/lite_simple_entrypoint.py:218` | Documented intentional `Base.metadata.create_all()` fallback with `# noqa` comment explaining frozen EXE constraint |
| 5 | `src/frontend/capacitor.config.ts` | Changed `androidScheme` from `'http'` → `'https'` for production APK |
| 6 | `src/frontend/src/components/notifications/__tests__/NotificationDropdown.test.tsx` | Added `MemoryRouter` wrapper via local `render` override — fixed 17 failing tests (react-router `<Link>` without Router context) |

**Validation**: COMMIT_READY -Quick passed (ruff ✅, mypy ✅, eslint ✅, ts ✅, translations ✅). Backend: 914/914 tests. Frontend: 1939/1939 tests.

---

## 🚀 v1.18.30 — Checkpoint Release (June 16, 2026)

**Status**: ✅ RELEASED | GitHub: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.30

### What was released
- **31 prior releases archived** (v1.18.0–v1.18.29) → all converted to Pre-release on GitHub with ARCHIVED banners
- **Comprehensive release notes** → `docs/releases/GITHUB_RELEASE_v1.18.30.md` (full feature inventory, tech stack, milestone table)
- **Installer**: `SMS_Installer_1.18.30.exe` (25.08 MB), Authenticode-signed, smoke test passed
- **Security**: starlette 1.3.1, cryptography 49.0.0, python-multipart 0.0.32, PyJWT 2.13.0, js-yaml >=4.2.0 (25 Dependabot alerts resolved)
- **CI fix**: `((VAR++))` bash arithmetic crash under `set -euo pipefail` in 3 workflow files
- **Installer source restore**: `dc21014fe` declutter had erroneously removed `installer-old/` build inputs; restored and re-tracked 15 essential files

### Release Evidence
- ✅ Tag `v1.18.30` created and pushed June 16, 2026
- ✅ GitHub release published: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.30
- ✅ Installer asset: `SMS_Installer_1.18.30.exe` uploaded
- ✅ Version consistency tests: 8 passed, 4 skipped
- ✅ CI/CD Pipeline: passing on main

---

## 🔧 Post-v1.18.28 Improvements → Released as v1.18.29 (June 15, 2026)

**Status**: ✅ RELEASED as v1.18.29 | 8 commits since `v1.18.28` tag, plus version bump + repo declutter

| Hash | Description |
|------|-------------|
| `566e6eeb8` | feat: wire email report delivery and report scheduling UI |
| `ff180e896` | feat: expand chart type selector from 4 to 8 types with EN/EL i18n |
| `25c31626f` | fix: persist SMTP override across server restarts |
| `0e3d406e2` | feat: show email config status badge and sync form on prop change |
| `5eaa9675a` | test: add 16 tests for SMTP override service and email settings endpoints |
| `72574564a` | docs: record post-v1.18.28 improvements in work plan |
| `f7fddbbf4` | fix: email SSL/TLS support + TS any cleanup |
| `7b291ce95` | fix: convert AuthContext default export to named export for HMR compat |

### Changes Summary
- **Email delivery**: SMTP settings persist across server restarts (`services/smtp_override.py`, applied at startup via `lifespan.py`). Fixed missing `request_id` arg that caused 500 errors on all 3 email endpoints.
- **Email SSL/TLS**: `send_email()` now uses `smtplib.SMTP_SSL` for port 465 (implicit SSL) and `STARTTLS` with explicit `ehlo()` handshake for port 587. 30s timeout on both paths.
- **Chart types**: Custom report builder supports 8 chart types (scatter, heatmap, treemap, boxplot) with full EN/EL translations. Fixed lucide-react TypeScript export shim.
- **UI polish**: EmailConfigPanel shows `Active` / `Not configured` status badge; form state syncs correctly after save.
- **TypeScript health**: Replaced `[key: string]: any` with `unknown` in `AnalyticsCharts.tsx` and `useDashboards.ts`. Removed stale `eslint-disable` comments.
- **HMR fix**: `AuthContext` default export converted to named export — eliminates Vite Fast Refresh incompatibility warning.
- **Tests**: 18 new tests covering smtp_override service, email endpoint edge cases, and SMTP transport branches (port 587 STARTTLS / port 465 SSL).

### Release Evidence
- ✅ Tag `v1.18.29` created and published June 15, 2026
- ✅ GitHub release: https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.29
- ✅ Installer asset: `SMS_Installer_1.18.29.exe` uploaded
- ✅ Post-release: repo declutter (234 stale files removed, commit `dc21014fe`)
- ✅ CI fix: `((VAR++))` bash arithmetic bug under `set -euo pipefail` fixed in 3 workflow files (commit follows)

---

## 🗄️ Historical Archive (Feb–Aug 2026)

Older release-cycle logs (Feb 2026 Phase 6 work through the many v1.18.25
publication/preparation snapshots, April 2026) have been moved to
[`UNIFIED_WORK_PLAN_ARCHIVE_2026_H1.md`](./UNIFIED_WORK_PLAN_ARCHIVE_2026_H1.md)
to keep this file focused on current/recent state. Nothing in the archive
reflects current app state — check the sections above and `CHANGELOG.md`
for that.

## 📖 Documentation

### For Developers

**MANDATORY READ (10 min total):**
1. [`docs/AGENT_POLICY_ENFORCEMENT.md`](../AGENT_POLICY_ENFORCEMENT.md) - Non-negotiable policies
2. [`docs/AGENT_QUICK_START.md`](../AGENT_QUICK_START.md) - 5-minute onboarding
3. This file - Current work status

**Key References:**
- [`README.md`](../../README.md) - Project overview
- [`DOCUMENTATION_INDEX.md`](../DOCUMENTATION_INDEX.md) - Doc navigation
- [`docs/development/DEVELOPER_GUIDE_COMPLETE.md`](../development/DEVELOPER_GUIDE_COMPLETE.md) - Complete developer guide

### Archive

- [`UNIFIED_WORK_PLAN_ARCHIVE_2026_H1.md`](./UNIFIED_WORK_PLAN_ARCHIVE_2026_H1.md) - Feb–Aug 2026 history (Phase 6 work through the v1.18.25 release cycle)

---

## ⚙️ Critical Policies (Read Before Starting Work)

### Testing

❌ **NEVER**: `cd src/backend && pytest -q` (crashes VS Code)
✅ **ALWAYS**: `.\infra\scripts\testing\RUN_TESTS_BATCH.ps1`

### Deployment

❌ **NEVER**: Custom deployment procedures
✅ **ALWAYS**: `.\infra\scripts\dev\NATIVE.ps1 -Start` (dev) or `.\infra\scripts\dev\DOCKER.ps1 -Start` (prod)

### Planning

❌ **NEVER**: Create new backlog docs or planning docs
✅ **ALWAYS**: Update this file (UNIFIED_WORK_PLAN.md)

### Pre-Commit

❌ **NEVER**: Commit without validation
✅ **ALWAYS**: Run `.\infra\scripts\ops\COMMIT_READY.ps1 -Quick` first

### Work Verification

❌ **NEVER**: Start new work without checking git status
✅ **ALWAYS**: Run `git status` and check this plan first

---

## 🔄 How to Use This Document

### Daily Workflow

1. Check the status line and most recent section at top
2. Update with completed work before moving to next task
3. Run `git status` to verify clean state

### Before Commit

1. Run `.\infra\scripts\ops\COMMIT_READY.ps1 -Quick`
2. Verify all tests passing
3. Update this document with completed items
4. Commit with clear semantic message

### When Starting New Phase

1. Archive completed phase to `UNIFIED_WORK_PLAN_ARCHIVE_*.md`
2. Update "Current Status" with new phase
3. Create detailed timeline for new phase
4. Mark features complete as you finish them

---

## 📞 Contact & References

**For Questions:**
- See [`CONTRIBUTING.md`](../../CONTRIBUTING.md)
- Reference [`docs/AGENT_POLICY_ENFORCEMENT.md`](../AGENT_POLICY_ENFORCEMENT.md) for policies
- Check [`DOCUMENTATION_INDEX.md`](../DOCUMENTATION_INDEX.md) for navigation

**Repository:**
- GitHub: https://github.com/bs1gr/AUT_MIEEK_SMS
- Branch: `main`

---

*See the top of this document for current version/status — this footer no longer duplicates it to avoid drifting out of sync (it previously sat unmaintained for 2.5+ months).*



