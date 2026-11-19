# Unified Work Plan - Student Management System

**Current Version**: 1.18.73
**Last Updated**: November 19, 2026
**Status**: ✅ **v1.18.73 released 2026-11-17** (tag on `50e4b57fc`, run by the assistant; the
owner: "Release v1.18.73 with what has been merged since v1.18.72 (#409 to #415)", the last of
four things asked for in one message, after the other three were done: so it carries PRs 409
to 418). It ships what is under "In v1.18.73" below: the Search page that sorts, pages and
filters and finds a Greek name, the form that sends a message offered to teachers, the
Students page's message for a list that could not be loaded, the page and server fixes of 16
and 17 November (#409, #411, #412), and the release step that builds the Docker image before
a tag (#413). No database changes. The open work is listed at the start of "Next todos".

**The Docker build check, in real use for the first time.** `RELEASE_READY` started a
build-only run for the release commit `8e0164423` once it was pushed (run 44142091454: amd64
and arm64, passed in under five minutes, nothing published). The tag was to go on a later
commit, the one with the hand-written notes, so `DOCKER_BUILD_CHECK.ps1 -Version 1.18.73` was
run on that commit, `50e4b57fc`: it dispatched run 44144703408, waited 6.5 minutes and ended
with exit code 0. The tag was made after that, and after CI/CD and E2E were green on the
same commit.

**Before the tag:** a smoke test of three editions (below), then `RELEASE_READY` (no
`-TagRelease`): 55 minutes, exit 0, every gate passed, the backend suite ran 58/58 batches with
1,739 passed, 43 gated skips and 0 failed, and the local installer (90,266,856 bytes) was built
and signed with the frozen-Lite check passing 11/11. The generated GitHub body only said
"1 new features" and "5 bug fixes" and was rewritten by hand in `50e4b57fc`.

**Smoke test (2026-11-17, evening; isolated copies under `D:\tmp`, scratch databases only;
built from the tree of PRs 416 to 418, which is the code of the release before its version
number).** Each edition as an administrator and as a teacher: 32 to 35 checks through the
API (a first sign-in, a teacher's day with Greek names, the search, a message sent by a
teacher, another account's notification, an Excel export job, a PDF), the packaged-edition
check, and ten pages in a browser with every API answer and every console line watched.

- *Server from source, a first start on SQLite:* every check held, two of them only on a
  second pass, after the check itself was corrected (one had asked the export job for a CSV
  file, which is todo 62 and not this release; one tripped over the first pass's students);
  11/11; in the browser all claims for the teacher, and for the administrator all but the
  comparison of the order of names, which the check had wrong on that pass (the list it
  printed was in the right order; the corrected check held for both roles on the other two
  editions). The six ERROR lines of the server's log all came from the probes of the export
  jobs (todo 62).
- *Docker image on PostgreSQL 14.25:* 32/32, 11/11, in the browser all claims for each role;
  the automatic backup was made a minute after the start. After the container was replaced
  on the same database and the same data volume: 35/35, the students, the grades and the
  teacher's message of before among them, and the backups still there. No ERROR line in
  either log (1,366 and 285 lines), no router skipped.
- *Packaged SMS Lite, upgraded:* the released v1.18.72 build was run in a throwaway profile
  and the same checks run against it: 25 of 32, the seven failures being what v1.18.73
  repairs (the counts without a token, the search's pages and total, a Greek name that was
  not found at all, a filter with two values, the grade row, an order that does not exist,
  and a server error for another account's notification). The new build was then started on
  that profile: 35/35, among them the student the old build had stored, found by the surname
  in small letters without accents; 11/11; in the browser all claims for each role; no
  ERROR line in 1,063 log lines, no router skipped.
- Not checked: the installer was not installed, and the Android app was not run on a device.

**Verified on the published assets:** `SMS_Installer_1.18.73.exe` 87,360,944 bytes, SHA-256
`e967bb36…432d29` = GitHub's digest, Authenticode Valid, signer CN=AUT MIEEK, thumbprint
`2693C1B1…075D`, timestamped, file version v1.18.73; `SMS_Android_1.18.73.apk` 4,196,606
bytes, SHA-256 `8678ceef…ac3482` = GitHub's digest, `versionName 1.18.73` /
`versionCode 118073`, target SDK 36, signed with the same certificate as v1.18.72 (SHA-256
`686fb6ed…d2ea`, so phones upgrade in place); the new texts are in its bundle. The release
on GitHub carries the hand-written text. The release, installer and APK workflows on the tag
succeeded.

**The cloud VM was not updated.** It runs `main` at `38d1111b3` (v1.18.72 with #409) and
stays there until the owner says so: it is a change to the server in use. No database change
comes with v1.18.73.

v1.18.72 was released 2026-11-16 (tag on `4ffa6afa2`, run by the assistant; the
second release of the day. Asked after #408 was merged, the owner chose "Release v1.18.72").
It ships #408 ("In v1.18.72" below): a notice to the administrators when the daily backup
fails, a signal to a monitoring service outside, mail settings that last, and the Import/Export
part of the API that could be missing on a freshly installed SMS Lite. No database changes.
The open work is listed at the start of "Next todos".

**Before the tag:** a smoke test of three editions (below), then `RELEASE_READY` (no
`-TagRelease`): 46 minutes, exit 0, every gate passed, the backend suite ran 33/33 batches with
1573 passed, 43 gated skips and 0 failed, and the local installer (90,236,480 bytes) was built
and signed with the frozen-Lite check passing 11/11. The generated GitHub body only said
"1 new features" and was rewritten by hand in `4ffa6afa2`; the tag was pushed once CI/CD and
E2E were green on that commit.

**Smoke test (2026-11-16, evening; isolated copies under `D:\tmp`, scratch databases only).**
As for v1.18.71, each edition as an administrator and as a teacher: 26 API checks, the
packaged-edition check, an export job made and downloaded, made-up mail settings saved, and
ten pages in a browser with every API answer and every console line watched.

- *Server from source, SQLite:* 26/26, 11/11, browser 10/10 for each role, no ERROR line.
- *Docker image on PostgreSQL 14:* 26/26 with the real refusals, 11/11, browser 10/10 for each
  role; after the container was replaced, the backups, the key and the mail settings were
  still there. No ERROR line.
- *Packaged SMS Lite, upgraded:* the released v1.18.71 build was run in a throwaway profile
  with a writable folder (as after a first start with the installer's rights): three
  students, an encrypted backup, mail settings saved next to the code. The new build was
  then started on that profile with those files left in the program folder and the folder
  read-only. No router was skipped, the mail settings had been brought into the profile, the
  old backup restored after the data had been changed. 26/26, 11/11, browser 10/10 for each
  role, no ERROR line in 1,037 log lines.
- Not checked: the installer was not installed, and the Android app was not run on a device.

**Verified on the published assets:** `SMS_Installer_1.18.72.exe` 87,321,024 bytes, SHA-256
`78df3014…540119` = GitHub's digest, Authenticode Valid, signer CN=AUT MIEEK, thumbprint
`2693C1B1…075D`, timestamped, file version v1.18.72; `SMS_Android_1.18.72.apk` 4,194,409
bytes, SHA-256 `24d86a14…ad230e` = GitHub's digest, `versionName 1.18.72` /
`versionCode 118072`, target SDK 36, signed with the same certificate as v1.18.71 (SHA-256
`686fb6ed…d2ea`, so phones upgrade in place); the new notice text is in its bundle. The
release, installer and APK workflows on the tag succeeded.

**Cloud VM, and the monitoring service (the same evening).** The owner created an account at
healthchecks.io with the assistant's steps and pasted the ping address; it is in the VM's
`.env` only (mode 600, ignored by git), with the failure address. The VM was rebuilt on the
tag (under 2 minutes); `/health` reports v1.18.72. The backup of the afternoon and its key
were still on the data volume after the rebuild, and the hourly check left them alone (not
due). The first signal went out 150 seconds after the start, at 18:41 UTC, with no delivery
warning; the address is not in the log; no ERROR line, no router skipped. **Confirmed by the
owner the same evening, in screenshots of the service's pages:** ping #1 received at 18:41:23
UTC (the second the server logged it), by HTTPS from the VM's address, user agent
`sms-heartbeat`; the check up; its schedule period 1 hour, grace time 1 hour; and, after the
owner added an email integration, the service's test notification in the owner's inbox at
21:09 local time; the integration is listed as assigned to "1 of 1" checks, ready to
deliver. No real alarm was tried (the server stopped for longer than period plus grace).

v1.18.71 was released 2026-11-16 (tag on `9afbbeea1`, run by the assistant; asked
after #407 was merged, the owner chose "Release v1.18.71" and "Yes, do the drill"). It ships
what was on `main` since v1.18.70 ("In v1.18.71" below): the automatic daily backup and a
restore that works (#407), the permission layer that no longer holds the event loop (#393),
the removal of the idle Socket.IO channel (#391) and the week's dependency updates. No
database changes.

**Before the tag:** a smoke test of three editions (below), then `RELEASE_READY` (no
`-TagRelease`): 45 minutes, exit 0, every gate passed, the backend suite ran 33/33 batches with
1539 passed, 43 gated skips and 0 failed, and the local installer (90,238,184 bytes) was built
and signed with the frozen-Lite check passing 11/11. The generated GitHub body again only
counted ("1 new features, 3 bug fixes, 6 dependency updates") and was rewritten by hand in
`9afbbeea1`; the tag was pushed once CI/CD and E2E were green on that commit.

**Smoke test (2026-11-16, isolated copies under `D:\tmp`, scratch databases only).** Each
edition was driven as an administrator and as a teacher: 26 API checks (who is refused what,
the refresh-token rule, 40 requests with 20 at once, three students with Greek names, a backup
by hand, a restore after one student had been deleted), the packaged-edition check (PDF and
Excel with Greek text) and ten pages in a browser with every API answer and every console line
watched.

- *Server from source, SQLite:* 26/26, 11/11, browser 10/10 for each role; no ERROR line in
  the log.
- *Packaged SMS Lite, upgraded:* the released v1.18.70 build was run in a throwaway Windows
  profile, given three students and made an encrypted backup. The new build was then started
  on that profile the way an installer leaves things: the backups and the old key in the
  program folder, and that folder read-only. The key was brought to the profile (the same
  key), the old build's backup was restored after the data had been changed, and the
  automatic backup was made. 26/26, 11/11, browser 10/10 for each role, no ERROR line in 1,160
  log lines.
- *Docker image on PostgreSQL 14:* 26/26 (here the requests arrive from outside the container,
  so the refusals of a teacher and of a request without a token are real ones), 11/11, browser
  10/10 for each role, the automatic backup on the volume, no ERROR line in 1,350 log lines.
  There was no database upgrade to test: no migration since v1.18.70.
- Not checked: the installer was not installed, and the Android app was not run on a device.

**Verified on the published assets:** `SMS_Installer_1.18.71.exe` 87,322,304 bytes, SHA-256
`a74d42bd…b7f333` = GitHub's digest, Authenticode Valid, signer CN=AUT MIEEK, thumbprint
`2693C1B1…075D`, timestamped, file version v1.18.71; `SMS_Android_1.18.71.apk` 4,194,069
bytes, SHA-256 `fae34b4a…32aea3` = GitHub's digest, `versionName 1.18.71` /
`versionCode 118071`, target SDK 36, signed with the same certificate as v1.18.70 (SHA-256
`686fb6ed…d2ea`, so phones upgrade in place); none of its 58 script files mentions Socket.IO.
The release, installer and APK workflows on the tag succeeded.

**Cloud VM, and the first backup of the shared database (the same afternoon).** The VM was
rebuilt on the tag (under 3 minutes); `/health` reports v1.18.71. One minute after its start
it made the first automatic backup of the shared database: `auto_backup_20261116_150613.enc`,
30 tables, 2,265 rows, 8 seconds, on the data volume with its key, and no ERROR line in its
log. It makes one a day from now on and keeps 30.

**The restore drill on that backup (the owner's yes).** The backup and its key were copied to
the dev PC. The backup was decrypted in memory and restored with the application's own restore
engine into a throwaway PostgreSQL 14 whose tables the application's migrations had built: 30
tables, 2,265 rows. Compared with the live database through read-only queries that return
numbers only: the same row count in all 31 tables and the same checksum of the content of all
31 tables. (A first checksum differed for ten tables. It sorted the rows as text, and the
Debian-based server of the shared database and the Alpine-based scratch server sort text
differently under the same collation name; column by column in primary-key order, and with a
fixed sort order, everything is identical.) The copies on the dev PC and on the VM were deleted
afterwards.

v1.18.70 was released 2026-11-15 (tag on `a8da036c7`, run by the assistant; the
owner chose "Release v1.18.70" among the next steps offered that day). It ships the fixes of the
2026-11-15 review, #384 to #390 ("In v1.18.70" below): a refresh token is no longer a login
credential, one live row per attendance period and per rating, the server log that was empty,
quieter logs and the purge of dead refresh tokens. One additive migration, `a7d4e9c2b5f8`.

**Before the tag:** a smoke test of three editions (below), then `RELEASE_READY` (no
`-TagRelease`): 55 minutes, exit 0, every gate passed, the backend suite ran 32/32 batches with
1489 passed, 39 gated skips and 0 failed, and the local installer (90,519,592 bytes) was built
and signed with the frozen-Lite check passing 11/11. The generated GitHub body again only
counted "1 new features, 5 bug fixes" and was rewritten by hand in `a8da036c7`; the tag was
pushed once CI/CD and E2E were green on that commit.

**Smoke test (2026-11-15, isolated copies under `D:\tmp`, scratch databases only).** Each
edition was driven as an administrator and as a teacher: about 30 API checks (the token rules,
one row per slot, the attendance sheet twice, a 409 and a 404 inside a transaction, the lesson
log, the overview pages), the packaged-edition check (PDF and Excel with Greek text) and a pass
through the main pages in a browser under strict authentication.
- *Server from source, SQLite:* 32/32, 11/11, browser 13/13; no ERROR or traceback line in
  `app.log`.
- *Packaged SMS Lite, upgraded:* the v1.18.69 build was run in a throwaway Windows profile and
  given data through its API (it stored the same rating three times, as the shared database
  has it, and left 8 dead refresh tokens); the new build was then started on that profile.
  Migration applied, the three surplus ratings soft-deleted with the newest kept, both indexes
  there, 8 tokens removed, the sessions from before the upgrade still refreshing, 577 log lines
  where v1.18.69 wrote none. 11/11 after-upgrade checks, 30/30, 11/11, browser 13/13.
- *Docker image on PostgreSQL 16, upgraded:* a database at the v1.18.69 revision with repeated
  slots, a period that was never set and 7 dead tokens; the image built from the release tree
  and run with the cloud host's settings did the upgrade at its first start (2 attendance rows
  and 3 ratings soft-deleted, the period backfilled, 7 tokens removed) and logged it. 30/30,
  11/11, browser 13/13, no ERROR line in 839 log lines.
- *The same database upgrade on PostgreSQL 14* (the shared database runs 14.18; this was
  noticed after the tag and checked before the cloud host was updated): identical result, and
  a second migration run is a no-op.
- Not checked: the installer was not installed, and the Android app was not run on a device
  (no frontend source changed since v1.18.69; the two frontend files that changed are tests).

**Verified on the published assets:** `SMS_Installer_1.18.70.exe` 87,662,992 bytes, SHA-256
`e5eea32e…fac6bbd` = GitHub's digest, Authenticode Valid, signer CN=AUT MIEEK, thumbprint
`2693C1B1…075D`, timestamped, file version v1.18.70; `SMS_Android_1.18.70.apk` 4,201,361
bytes, SHA-256 `388197f7…d84ac7` = GitHub's digest, `versionName 1.18.70` /
`versionCode 118070`, target SDK 36, signed with the same certificate as v1.18.69 (SHA-256
`686fb6ed…d2ea`, so phones upgrade in place). The release, installer and APK workflows on the
tag succeeded.

**Cloud VM and the shared database (the same evening).** The VM was rebuilt on the tag;
`/health` reports v1.18.70 with the database connected, requests without a valid token get
401, and its log runs on after the migrations (no traceback in it). Its first start did to the
shared database (PostgreSQL 14.18) what #386 and #390 announced, checked before and after
through a read-only session: the migration soft-deleted the six surplus rating copies (ids 147
to 152; 153, 154 and 155 are the ones kept; 202 live ratings now), changed no attendance row
(971, no repeats, none without a period) and added the two indexes; the purge removed 834 dead
refresh tokens and left the one in use. The six rows as they were are in
`backups/pre_v1.18.70_migration_rows_2026-11-15.json` on the dev PC (git-ignored), with how to
undo it. Not checked by the assistant: the app on the owner's phone against the VM (the owner,
the same evening: attendance works on the phone).

**Every install that uses the shared database should now be updated.** A build older than
v1.18.70 stores a rating for a slot that already has one as a second row; the database now
refuses that, so such a build answers with an error there (v1.18.69's Attendance page saves
through the sheet endpoint and is not affected; its `POST /daily-performance/` is).

v1.18.69 was released 2026-11-13 (tag on `71f9b7d9c`, run by the assistant). It
ships todo 51 (#380, #381): attendance saved as one request per sheet, the offline queues no
longer re-sent on every render, and lesson-log text typed during a failed save. No database
changes. `RELEASE_READY` (no `-TagRelease`) exited 0: every gate passed, the backend suite ran
30/30 batches with 1402 passed and 0 failed, and the local installer was built and signed. The
generated GitHub body again only counted the fixes and was rewritten by hand.

**The tag is one commit after the release commit.** Dependabot merged #382 (`pyproject.toml`
only: the `opentelemetry-api` pin brought in line with `requirements.txt`, which already had
1.45.2 during the release run) right after the notes commit, which cancelled CI on it. CI/CD and
E2E were green on `71f9b7d9c`, so the tag went there.

**Verified on the published assets:** `SMS_Installer_1.18.69.exe` 87,636,576 bytes, SHA-256
`06a8d66a…840e88` = GitHub's digest, Authenticode Valid, signer CN=AUT MIEEK, thumbprint
`2693C1B1…075D`, timestamped, file version v1.18.69; `SMS_Android_1.18.69.apk` 4,201,421
bytes, SHA-256 `a824d961…fc6674` = GitHub's digest, `versionName 1.18.69` /
`versionCode 118069`, target SDK 36, signed with the same certificate as v1.18.68 (SHA-256
`686fb6ed…d2ea`, so phones upgrade in place); its attendance bundle contains the
`/attendance/sheet` call. The release, installer and APK workflows on the tag succeeded.
**Cloud VM:** rebuilt on the tag; `/health` reports v1.18.69 with the database connected, and
`POST /attendance/sheet` answers 401 without a valid token. Not checked: the installer was not
installed, the APK was not run on a device, and the fix has not yet been seen on the owner's
phone against the cloud host, which is where the problem was reported. **Seen: the owner
confirmed on 2026-11-15 that the attendance fix works on the phone** (todo 51 closed).

v1.18.68 was released 2026-11-13 (tag on `1acc6c053`, run by the assistant); v1.18.67 the same
morning (tag on `ec987afa8`).

**Verified on the published assets:** `SMS_Installer_1.18.68.exe` 87,615,104 bytes, SHA-256
`d03fecf8…2bd101` = GitHub's digest, Authenticode Valid, signer CN=AUT MIEEK, thumbprint
`2693C1B1…075D`, timestamped, file version v1.18.68; `SMS_Android_1.18.68.apk` 4,200,925
bytes, SHA-256 `b236e817…871ef7` = GitHub's digest, `versionName 1.18.68` /
`versionCode 118068`, target SDK 36, signed with the same certificate as v1.18.67 (SHA-256
`686fb6ed…d2ea`, so phones upgrade in place). The release, installer and APK workflows on the
tag succeeded; CI/CD and E2E were green on the tagged commit. Not checked: the installer was
not installed, and the APK was not run on a device.

v1.18.68 ships the lesson-log follow-ups (todos 45-47, #376), the privacy round
(todo 50, #377, #378, #379: health information off by default, staff notes on the server, the
Privacy page, the access and erasure tools), the cloud-host files and speed switches
(todos 44, 48, 49, #373, #374) and the stale-tab reload (#375). Two additive migrations:
`e5b2c7a9d4f1` and `f6c3d8b1a2e4`; the shared database already has both (the cloud VM applied
them).
**Before the tag:** `RELEASE_READY` (no `-TagRelease`) took 43 minutes and exited 0: every
gate passed, the backend suite ran 30/30 batches, 1394 passed, 39 gated skips, 0 failed, and
the local installer (90,449,800 bytes) was built and signed with the frozen-Lite check passing.
The generated GitHub body again only counted features and fixes and was rewritten by hand.
**Oracle terms, read the same day:** the Data Processing Agreement (14 August 2025) and the
Cyprus Cloud Services Agreement (22 June 2023) apply the processor terms automatically and
exclude neither free nor trial accounts; both rule out regulated health data, which was
deleted and switched off. The order record of the free account was not visible to read. The
owner's phone runs the app against the cloud address; Tailscale key expiry is disabled for
the VM and the QNAP.

### On `main` since v1.18.73 (unreleased)

**2026-11-19: the owner's go-ahead for everything that waited** (one message, after the list
of what waited for a word: "after getting finished with the tasks pending, you should proceed
without stop until finish all suggested actions as of these you listed", and the list: the
release of v1.18.74 and the update of the cloud VM; the nine local installer builds; *Clear*
on the Attendance page; the database choice of the Docker wizard; the uninstaller's "Delete
all user data"; the unique index on the permission keys; CLAUDE.md's release text; what
identifies a grade in a session import; teachers and the session file; the Import/Export
panel of todo 62; the unused tools and page parts). Where the list left a choice open ("delete
or keep", "repair or take off the page") the entries below say which was taken and why; each
is the assistant's choice and one change to undo.

**2026-11-19: the Import/Export panel of the Control Panel does what it offers** (PR 436;
todo 62, the last of the things of the owner's go-ahead above that is code. The plan had
left it open: "repair it as the Search page was repaired, or take the dialog off the page".
It is repaired: nothing the owner sees goes away, and what it offered now works. Taking it
off instead would be a smaller change: say so if that is wanted.)

- **What was wrong, beyond what todo 62 listed.** Reading the code for the repair showed
  more than the smoke test had seen:
  - *The export.* Nine generators, one for each kind of record and format, written against
    columns the models do not have (`Student.status`, `Course.code`, `Grade.points`): only
    the Excel file of students could be made. A PDF used a font without Greek letters.
  - *The import wizard never stored anything.* It sent the file, waited for the check, and
    closed as if the import were done. No request asked for the rows to be stored.
  - *The list* asked for the audit history and showed columns that history does not have.
  - *The older import itself*, for whoever called it by hand: a file with faults was "ready"
    all the same; a commit that failed half-way kept the rows before the failure; a student
    was matched by e-mail address alone, also among deleted ones, and one that was there
    was left as it was; a new student without a `student_id` column got a made-up number.
- **What changes.**
  - *Exports* (`async_export_service.py`, written anew): a kind of record is one table (the
    same columns in every format) and a format is one writer. **Students, courses, grades
    and attendance, each as Excel, CSV or PDF.** The file is in the format of the request's
    body, the one the job is stored with; "excel" is read as xlsx; "dashboard", which
    nothing ever wrote, is refused; a job whose file cannot be written ends as "failed" and
    does not stay "processing". A CSV file has a byte order mark, so that Excel opens its
    Greek names; a PDF uses the fonts of the other PDF files.
  - *Who may see a job.* The state of a job and the list ask for `exports:view` or
    `exports:generate`: whoever may start a job may see how it went. No grant was changed.
  - *Imports* (`import_export_service.py`): a file with faults ends as "invalid" and cannot
    be committed; the faults are listed under the row's number as a spreadsheet shows it; a
    commit is all of the file or nothing of it; students and courses follow the rule of
    Utils > Imports (the same student ID or e-mail address, the same course code; one that
    is there is updated); a file of students needs the `student_id` column; a grade row is
    checked for its student, its course and its numbers.
  - *The page.* The three components go through the signed-in client. **Export Data** asks
    what and in which format (the date range and "include headers", which the server never
    looked at, are gone). The import wizard shows what the check found and has **Store the
    rows**. **History** lists the import and export jobs with **Download**. New texts in
    both languages.
- **Tests.** `test_import_export_panel.py` (28): every kind in every format is the file it
  is called, with its rows; the format of the request; "excel"; what nothing writes; a file
  that cannot be written; a teacher's job; an account without a role; a file with faults; a
  missing column; a checked file stored when committed and not before; a student who is
  there; a commit that fails; courses; grades with their category; the order of the lists.
  `ImportExportComponents.test.tsx` (11; the file held one test, which asserted that true is
  true).
- **Tried in a browser on a scratch copy, as an administrator.** The page opens with both
  lists answered. All twelve exports were saved and are what their names say (Excel files,
  PDF files with the Greek names in their text, CSV files with them). An import with a
  fault names its row and offers nothing to store; one without is stored only after **Store
  the rows**, and the students are then on the server. 85 requests of the panel, none
  refused. The Greek page was looked at.
- **Documents.** `docs/admin/IMPORT_EXPORT_GUIDE.md` says what the panel does now; the
  permission reference and matrix; a dated note on `EXPORT_API_REFERENCE.md`, which
  describes schedules, metrics and settings the application never had.
- **What it leaves.** The panel stays for administrators (the Control Panel). No template
  to download and no limit on rows. Exports made here are not in `GET /history`. The two
  ways to import students and courses remain (this panel, and Utils > Imports, which shows
  more and takes several files).

**2026-11-19: the database chosen in the installer reaches a new installation, and the
uninstaller says what it deletes** (PR 435; two of the things of the owner's go-ahead above.
Both were read from the scripts on 18 November and not seen on an installation; **no
installer was run for this either**.)

- **The database choice of the Docker wizard.** The wizard writes it to `.env` in the
  installation folder (`WritePostgresEnv`); `DOCKER.ps1` works with `config\.env` and never
  read the other file, so a new installation ran on its own SQLite database whatever the
  wizard was told.
  - *A new installation* (its `config\.env` was made in this run): `DOCKER.ps1` writes the
    wizard's choice into `config\.env` (`Sync-InstallerDatabaseChoice`: engine, `POSTGRES_*`,
    `DATABASE_URL`; what the first start generated, the secret key and the administrator's
    password, stays).
  - *An installation that already has a `config\.env`* keeps the database it runs on. This is
    the assistant's choice, and the careful one: every installation made so far ran on its own
    database whatever its wizard's file says, its records are there, and a switch at an update
    would look as if they were gone. When the wizard's file names another database,
    `DOCKER.ps1` changes nothing and says so (output and `DOCKER_INSTALL.log`).
  - *The wizard's database page* on an update showed what its own file of an earlier run
    said; it reads `config\.env` first now.
- **The uninstaller's second question** asked "Do you want to delete all user data?" and
  listed "Database (data folder)". Yes deletes the folders `data`, `backups`, `logs` and
  `config`; the database of the Docker edition is in the Docker volume `sms_data` or on a
  PostgreSQL server, and the one of SMS Lite in the user's AppData. **The question now says
  what it deletes, that the database is not among it, and where the database is.** Deleting
  the database from the uninstaller was not built: it cannot be tried here, and it would
  remove what cannot be brought back. Say so if it is wanted.
- **Two questions in Greek.** That question, and the wizard's question about an installation
  that is already there, were English text in the code; they are texts in both languages now
  (the Greek texts that existed were for a choice between update and "fresh install" that the
  wizard no longer offers).
- **Documents.** `INSTALLATION_GUIDE.md` (sections 2, 7 and 10). The installer's own
  `README.md` describes v1.18.11: it has a dated note and two repaired links, and was not
  rewritten.
- **Tests.** `test_installer_database_choice.py` (12): the function taken out of `DOCKER.ps1`
  and run on folders of two files (a new installation told PostgreSQL; told its own database;
  an installation that runs; the same server with another password; no file, no database, an
  engine it does not know; no `config\.env`), where the script calls it, the wizard's page,
  the uninstaller's text in both languages, and that every text the code asks for is there in
  English and in Greek.
- **Compiled, not run.** Inno Setup compiled the whole script without making an installer
  (`ISCC /O-`): it passes, and a copy with a deliberate mistake in the uninstaller's code
  fails. The wizard, the uninstaller and `DOCKER.ps1 -Install` were not run.
- **Not changed:** the copy the installer makes before an update still does not hold the
  database; `DOCKER_OPERATIONS.md`, the two `.rtf` pages and the rest of the installer's
  README are as they were.

**2026-11-19: permission keys are unique in every database, the tools nothing ran and the
unused page parts are gone, and CLAUDE.md's release text no longer ends with an upload by
hand** (PR 434, merged as `2f2f65a0d`; on the PR's commit CI's backend job passed 1,888 tests
with 55 skipped and the frontend job 2,125, and the E2E job passed (its count could not be
read: GitHub did not hand out the log). Three of the things of the owner's go-ahead above).

- **The unique index on a permission's key** (migration `e2b7c9d4a1f6`). The model says
  unique. Read from the migrations: on PostgreSQL revision `3af743932574` already makes
  `ix_permissions_key` a unique index, so **the shared database needs nothing and the
  migration does nothing there**; that revision skips SQLite, and a migrated SQLite database
  (every SMS Lite, a Docker installation on its own database) had no unique index on the key.
  The migration does nothing where a unique index or constraint is there; otherwise it first
  makes every key single (of rows that share a key the oldest stays and takes over the
  others' grants to roles and accounts; none are expected, and a database that has them must
  not fail to start because of them) and then makes the index. The way back leaves the index.
- **Deleted, on the owner's go-ahead ("the unused tools and page parts"; the list said
  "delete or keep", and nothing ran or used any of them):**
  - `src/backend/scripts/seed_permissions.py` (a second seed, "53 permissions", beside the one
    the application uses), `scripts/audit_router_permissions.py`,
    `scripts/validate_rbac_decorators.py` and `scripts/rbac_monitor.py` (all three looked for
    `backend/routers` where it was before the folders were rearranged);
  - `components/tools/DevTools.tsx` (a panel with "Add Sample Data" that no page imported)
    and `adminOpsAPI.generateSampleData`, which nothing called. The server never had that
    route: only the on-device worker of the Android app (`sw-local-api.js`) answers
    `POST /adminops/generate-sample-data`, and nothing calls it now. The worker was left as
    it is (it cannot be tried here without a device).
  - `PRE_COMMIT_HOOKS_GUIDE.md` (January 2026) describes three hooks of which none is
    configured; it has a dated note now and was not rewritten. The dated deployment records
    of January that name `rbac_monitor.py` are left as records.
- **CLAUDE.md, "Release Workflow"**, ended with `gh release upload vX.X.X
  SMS_Installer_X.X.X.exe`. The workflow on the tag builds, signs and uploads the installer;
  the text now says so, says to verify the published installer, and says never to upload or
  hand out the one built on this PC. The same line of `.claude/agents/release-manager.md` is
  corrected. Not touched, because the owner's list did not name it: CLAUDE.md's i18n
  example, which does not resolve as written (see the entry of PR 429).
- **Tests.** `test_permission_keys_unique.py` (4): before the migration a SQLite database
  takes a key twice; after it the database refuses; keys that are there twice become one and
  keep their grants, without a grant twice; it can run again and the way back leaves the
  index.
- **Not tried:** the migration on PostgreSQL (it is expected to find the index and do
  nothing; the smoke test before the release starts a database of v1.18.73 on PostgreSQL and
  upgrades it).

**2026-11-19: *Clear* on the Attendance page takes saved marks off** (PR 433, merged as
`aceaf1dcd`; on the PR's commit CI's backend job passed 1,884 tests with 55 skipped, the
frontend job 2,125 and E2E 77, each at its first try. One of the
things of the owner's go-ahead above. Found on 18 November while PR 430 was made: *Clear*
emptied the page, and two seconds later the marks were back.)

- **Why it did nothing lasting.** A sheet could only create and update
  (`attendance_sheet_service.py`). The page sent the sheet without the marks it had taken
  off, the server kept its rows, and the refresh after the save put them back.
- **What changes.**
  - *The server.* A sheet has a list of marks to take off (`attendance_deletes`: student and
    period), beside the one it had for ratings. Each is marked as deleted, as every delete
    here, and a slot that is taken off and marked in the same request ends with the new
    mark. It asks for nothing more than the sheet already asks (`attendance:edit`,
    `students:edit`): taking a mark off is part of editing the sheet, as changing it is.
    `DELETE /attendance/{id}` keeps `attendance:delete`.
  - *The page.* What the server holds, as far as the page knows, and the page no longer
    shows is sent as deletions (`removedAttendanceKeys`): with the autosave, with the sheet
    that is sent when a day is left, and in the offline queue. A server without the sheet
    endpoint is asked to delete the records one by one.
  - *A question before the whole day goes.* **Clear** above the list now deletes: when saved
    marks are among those it takes off, the page asks first ("This takes the saved marks of
    Students with saved marks on this day: N…"). One student's **Clear** is not asked about. This was the
    assistant's addition: say so if the question is in the way.
  - *The Greek label.* The button read **Άκυρο** ("Cancel") in Greek; it reads
    **Εκκαθάριση**, which is what the Greek guide already called it.
- **Tests.** `test_attendance_sheet.py` (14, six new: one mark, the whole day and marking it
  again, a slot taken off and marked at once, a mark that is not there, this day and this
  course only, the row kept as deleted). `useAttendanceSaveSync.marksKept.test.ts` (nine
  new: the hook with real state, one student, the whole day, a mark never saved, a sheet
  without deletions, the offline queue, the day left inside the two seconds, a server
  without the sheet endpoint).
- **Tried in a browser on a scratch copy** (two students marked and saved, then **Clear**):
  answered "Cancel", both marks stay and the server holds both; answered "OK", the marks are
  off at once, the next sheet carries two deletions, the server holds nothing, and the page
  loaded anew shows both unmarked. A mark that was never saved is cleared without a question
  and without a request. In Greek the button reads **Εκκαθάριση** and the question is Greek.
  Seven of the nine new hook tests fail on the hook as it was. Not tried in the browser: one
  student's **Clear** (the scratch course has no day with several periods; the hook's test
  covers it).
- **What it leaves.** A phone app newer than its server: a server from v1.18.69 to v1.18.73
  has the sheet endpoint and does not know the list, so there *Clear* still does nothing
  lasting. A sheet that waited in the offline queue deletes what it was told to when it is
  sent, also a mark somebody else made meanwhile (as it overwrites one).

**2026-11-19: a semester's session file is the teacher's too, and an import knows a grade by
its category as well** (PR 432, merged as `b470d8f00`; on the PR's commit CI's backend job
passed 1,878 tests with 55 skipped, the frontend job 2,116 and E2E 77, each at its first
try. Two of the things above).

- **Teachers and the session file.** "Who may import: both teachers and admins" was read on
  18 November as the import of students and courses (PR 425), and the session file stayed
  with the administrator. The role teacher now holds `sessions:manage`: the seed gives it in
  a new database, migration `9c41f7e2a6d3` in an existing one (data only: one grant for the
  teacher, the same for the administrator beside the wildcard, the permission row if a
  database lacks it; a database without roles is left to the seed; the downgrade takes the
  teacher's grant away). **The shared database gets this migration at the first start of
  this code.**
- **Two things stay the administrator's**, both changed here because the grant would have
  opened them:
  - *Returning the whole database to a backup.* `POST /sessions/rollback` replaces the
    database with the copy made before an import. It asked for `sessions:manage`; it asks for
    `adminops:restore` now, as every other restore does. No page uses it.
  - *Students' health information.* A session file can carry it, and an import stored it
    whenever recording was on. A file imported by an account that is not an administrator's
    is now imported without it, and what is stored stays as it is (the export already left
    it out for such an account).
- **What identifies a grade.** The session import (`routers_sessions.py`) and the older import
  behind Control Panel > Import/Export (`import_export_service.py`) recognised a grade by
  student, course and assignment name. The same assignment is kept under two categories on
  purpose (the owner, 15 November: rows 141 and 146), and those two were one record to both:
  with **Update Existing** the first record got the second row's category and mark and the
  second kept its old mark. **The category is part of the match now** (chosen: name and
  category, not the date as well, because a corrected date must not make a second grade). A
  grade without a category is matched with one without. The older import also took a deleted
  grade for the one meant; it no longer does. What this leaves: two grades of the same name
  and category on two dates are still one record, and a category renamed since the file was
  made gives a second grade.
- **Texts.** The help's answer on the session file, the guides that said "administrators
  only" (`SESSION_EXPORT_IMPORT_GUIDE.md`, the two import/export guides, the user guide in
  both languages, `RBAC_GUIDE.md` and its Greek twin, `RBAC_ADMIN_GUIDE.md`), the permission
  reference and matrix (26 permissions for the teacher, 53 grants in a new database; the
  endpoint table written anew by the application's own script).
- **Tests.** `test_teachers_session_file.py` (16): the migration (the grant and nothing
  else; taken back and run again; a database that lacks the permission; one without roles),
  a teacher's export and import, the return to a backup refused to a teacher and open to
  the administrator, an account without a role, health information in a teacher's file, two
  grades in two categories with "update" and with "skip", a grade without a category in four
  spellings, a deleted grade, and the older import. Five of them fail on the code as it was.
- **Not tried:** no page was opened as a teacher for this; the panel shows itself to whoever
  the server answers, and its tests cover that.

**2026-11-19: the `release-manager` agent and the `plan-review` skill run on a cheaper
model** (asked for by the owner after `/usage`: which models the subagents use, and a
cheaper one in the file that defines them where it fits the work. Each change was shown and
chosen before it was made. Nothing of the application changes.)

- **What the subagent logs of this project showed** (29 runs since October):
  `release-manager` said `model: inherit` and used the session's model in its four runs;
  `test-runner` and the built-in page reader were already on the cheapest model. The
  largest cost by far was the three document audits of 18 November (PR 429): they were
  already on the cheaper model, and their length was the cost (565 requests).
- **What changes.** `.claude/agents/release-manager.md`: `model: sonnet`.
  `.claude/skills/plan-review/SKILL.md`: `model: sonnet` and `context: fork`, so the audit
  runs as a separate agent and only its report comes back, instead of this plan being read
  into the main conversation.
- **Not tried.** Neither has been run since the change. The first use shows the model in
  the subagent's log. In a separate agent the skill's step 5 (the memory notes) may find
  nothing to read.
- **Not changed, by the owner's choice:** no default model for subagents is set
  (`CLAUDE_CODE_SUBAGENT_MODEL`). The built-in agents have no file of their own; their
  model is named on each call.

**2026-11-18: an installer built by hand takes tracked files only; the installation guide
read against the installer** (PR 431, merged on 19 November as `9616411fc`; on the PR's
last commit CI's backend job passed 1,862 tests with 55 skipped, the frontend job 2,116 and
E2E 77, each at its first try, and the job that runs the gate passed on Ubuntu and on
Windows. The last things named for a "continue" after PR 429:
`docs/operations/INSTALLATION_GUIDE.md`, the toast of a session import, the index of the
permission keys).

- **After the merge the guard was run in the main tree**, with its own script and the files
  as they lie there (about 570 untracked files under the backend folder besides the caches,
  three under `config`): it passes, every one of them is left out by the lines.

- **What an installer built on the developer's PC packed.** A wildcard line of
  `SMS_Installer.iss` (`Source: "..\..\..\src\backend\*"`) takes every file in its folder,
  tracked by git or not. The published installers are built by the workflow
  `release-installer-with-sha.yml` from a clean checkout, which holds tracked files only.
  `RELEASE_READY` also builds one locally, from the main tree, and there the two lines for
  `config\*` and `src\backend\*` found (counted in the main tree on 18 November; the local
  builds themselves were not unpacked, but Inno Setup was run on a sample folder with the
  two lines as they were, and it packed every one of these kinds of file):
  - `config\.env`, `config\environments\production.env` and its `.SECURE` copy: the PC's
    secret key and database password;
  - `src\backend\.keys\master.key`, the key of the encrypted backups;
  - 273 generated reports, 185 exports, four uploaded import files and 46 test result
    files (`src\backend\reports`, `exports`, `data`, `test-results`).
  - Nine such local builds lie in `infra\installer\dist` (v1.18.65 to v1.18.73, ignored by
    git). **None was published:** the v1.18.73 asset on GitHub is another file (87,360,944
    bytes against 90,266,856, another SHA-256). The copy installed on this PC from the
    v1.18.63 installer holds no packed `config\.env` (its uninstall data lists the files
    placed; the file there was made by `DOCKER.ps1` a minute after the install).
- **What changes.**
  - `SMS_Installer.iss` excludes those files on the two lines: `.env`, `*.env` and
    `*.env.SECURE` under `config` (the `*.example` templates stay), and `reports`,
    `exports`, `data`, `test-results`, `.keys` and `.mypy_cache` under the backend. None of
    these folders holds a tracked file. Tried with Inno Setup on the same sample folder:
    with the new lines it packs the code (a `routers_reports.py` and a `schemas\reports.py`
    included) and the `*.example` templates, and none of the others.
  - **The gate's "Installer Input Guard" now fails when a wildcard line would take a file
    that git does not track** and the line does not exclude
    (`scripts/validate_installer_release_inputs.ps1`). It used to look for database files
    only. It asks git once per folder and takes 3.5 seconds. A clean checkout passes; a
    working tree passes as long as every local file is excluded, so a new kind of local
    file stops the gate with its name instead of travelling in the next local build.
  - *What the guard found on its first run on CI.* The job that runs the gate on CI
    machines ("COMMIT_READY Smoke (quick)", Ubuntu and Windows) first runs the tests, which
    write `src\backend\pytest-results.xml` and `src\frontend\vitest-results.xml`; the guard
    named both and the job failed. A test run's reports are not part of an installer: the
    two lines leave them out now, with the other reports a run can write there
    (`.coverage`, `coverage.xml`, `htmlcov`; `coverage`, `.vitest`, `test-results*.json`,
    `test-output.log`, `e2e-results.txt`, `*.tsbuildinfo`). No tracked file has such a name
    (a test checks it), Inno Setup packed none of them from a sample folder, and with the
    two reports in place the guard passes. The new lines were also tried, read-only,
    against the files of the main tree as they lie there: the guard passes.
  - `DOCKER.ps1` no longer writes the first administrator's password into
    `DOCKER_INSTALL.log` when the installer runs it: the console shows it, the log gets the
    address and where the password is kept (`config\.env`).
- **The installation guide** (`docs/operations/INSTALLATION_GUIDE.md`, "Version 1.9.8",
  607 lines) is written anew from the installer's script, `DOCKER.ps1`, the Lite entry
  point and the Control Panel's texts (246 lines): which edition, what the wizard asks and
  does, the first sign-in, where the data and the backups are, updating, uninstalling.
  Nothing was installed for it, and it says so, with a list of what was never tried.
  `LITE_EDITION_GUIDE.md` named an installation folder (`C:\Program Files (x86)\SMS-UT\`)
  and a layout of files that the installer does not make; both are corrected, and two dead
  links. The README linked a Docker guide that does not exist.
- **The toast of a session import** read "Created: 3, updated: 2, errors: 1", and in Greek
  a singular beside two plurals: the three words were found in three places. They are asked
  for in the export texts by name now.
- **Tests.** `test_installer_packs_tracked_files_only.py` (8): the guard run against a
  throwaway repository (a tracked checkout passes; a local settings file, a key and an
  untracked note fail it and are named; what a line excludes is not counted; a line without
  `recursesubdirs`), the two lines of the real script, the reports of a test run, and this
  checkout.
- **Found and not changed** (read from the scripts by the helper that wrote the guide, and
  not tried on an installation; each is the owner's word or a later entry):
  - *The database choice of the Docker wizard may not reach the application* (**repaired in PR 435** for a new installation)*.* The wizard
    writes it to `.env` in the installation folder (`WritePostgresEnv`); `DOCKER.ps1` reads
    `config\.env` there and nothing was found that reads the other file. A new Docker
    installation would then run on local SQLite whatever the wizard offered. To settle it:
    one installation with the QNAP choice, then **System** > **Show System Health**.
  - *"Delete all user data" of the uninstaller does not delete the database* (**the question says so since PR 435**)*.* It deletes
    the folders `data`, `backups`, `logs` and `config`; the Docker edition's database is in
    the Docker volume `sms_data`, and Lite's in `%LOCALAPPDATA%\SMS_Native_Lite_Simple`.
    Neither is touched, and the question's own list says "Database (data folder)".
  - *The copy the installer makes before an update does not hold the database*, for the
    same reason: it copies the installation folder's `data` folder and the `.env` files.
  - *The permission keys are not unique in a migrated SQLite database* (**done in PR 434**)*.* Its `permissions`
    table has no index at all (read from a scratch database at the head revision): the
    application's own checks keep a key from being stored twice, the database does not. A
    migration that adds the unique index is a change to the shared database's schema: the
    owner's word. What the same migrations leave on PostgreSQL was not looked at.
  - *CLAUDE.md, "Release Workflow", ends with `gh release upload vX.X.X
    SMS_Installer_X.X.X.exe`* (**corrected in PR 434**, on the owner's go-ahead)*.* The workflow on the tag builds and uploads the installer;
    uploading the local build by hand would have published the files above. Not edited: the
    file is the owner's instruction to the assistant.
  - Stale texts that were not corrected: `infra/installer/windows/README.md` (it says the
    upgrade restores the `.env` files and offers a "Fresh Install", names an uninstaller
    file of v1.18.11 and links a file that does not exist); `installer_welcome.rtf` and
    `installer_complete.rtf` (a version of their own; "the container will be built and
    started", which the wizard does not do); the existing-installation box of the wizard
    is English only although Greek texts for it exist; `DOCKER_OPERATIONS.md` on what
    `-Install` does; `docs/misc/INSTALLER_STRATEGY.md` links the missing Docker guide.

**2026-11-18: a mark on the Attendance page is no longer lost** (PR 430, merged as
`30fc8cd30`; on the PR's last commit CI's backend job passed 1,854 tests with 55 skipped,
the frontend job 2,116 and E2E 77, each at its first try. Taken up from the E2E test that
needed a second try on the CI of PR 429, "should mark student attendance").

- **What happened.** The page replaced its marks with the server's answer whenever one
  arrived: the records of a day that was just chosen, and the refresh that follows every
  save. A mark made while such an answer travelled was dropped by it, and never saved,
  because the page then agreed with the server again. Seen in a browser on a scratch copy,
  with the server's answers held back as a far-away server holds them (the cloud VM, a
  phone on mobile data):
  - *A mark made before the chosen day's records had arrived:* the button went green and
    back to unmarked when the records came. If the save went out first, the page showed the
    student unmarked while the server held "Present". This is what the E2E test ran into on
    a slow runner.
  - *A mark made while the autosave of an earlier mark was on its way:* gone when the
    refresh after that save arrived. One sheet with one mark was sent; the second mark never
    reached the server. A teacher who marks a class with a pause of two seconds in it could
    lose the first mark after the pause, on any server that takes a moment to answer.
  - *A mark followed, inside the two seconds before the autosave, by another day, another
    course or another page:* dropped with the sheet. No request went out.
  - A refresh that failed after a save emptied the page of every mark, saved or not.
- **What changes** (`useAttendanceSaveSync.ts`). When an answer arrives the page keeps what
  the user changed since it last agreed with the server (`keepLocalChanges`: marks, ratings
  and observations), and what is kept is unsaved, so the autosave sends it. An answer that
  crossed a save is not used: the day is asked for again. What is unsaved when a sheet is
  left (another day, another course, another page) is sent on the way out, and queued when
  there is no connection. A refresh that fails leaves the page as it is.
- **Tests.** `useAttendanceSaveSync.marksKept.test.ts` (16): the hook with real state
  around it, for each of the cases above, the queue without a connection, and a sheet the
  server refuses. An E2E test, "keeps the marks made while the server is slow to answer":
  two students marked while the day's records and then a save are held back; on the old
  code it fails (no save ever goes out), on the new one both are stored.
- **Tried in a browser on a scratch copy, before and after:** the four cases, each with the
  server asked afterwards what it holds. Before: the mark lost in all four. After: kept and
  stored in all four.
- **The new E2E test itself needed a second try on its first CI run, and why is not
  known.** On the first try none of the page's requests passed through Playwright's
  `page.route`, and none was seen as an event, so the test waited for an answer it could
  not see. The page had done its work: the video of that try shows the mark kept and the
  "saved" message after five seconds. Looked at and ruled out here: the service worker of
  the production build (a page under its control had its requests routed, with `fetch` and
  with XMLHttpRequest), the on-device worker `sw-local-api.js` (only in the app's local
  mode), and the request layer (nothing withholds a request). Twenty local runs with
  service workers and eight without all passed at the first try. The test was rewritten to
  judge by what the page shows and what the server holds, never by a request it expects
  to see, and to skip, saying so, when nothing could be held back. Tests that wait for a
  response are open to the same thing; it was not seen on them.
- **The message after a save of the attendance read "File saved successfully"** (seen in
  that video): the page asked for a text without its namespace and found the one of the
  backup files. It has a text of its own now, "Attendance saved".
- **Found and not changed:**
  - ***Clear* does nothing lasting to saved marks.** It empties the page; two seconds later
    the marks are back, and the server never heard of it: a sheet only creates and updates
    attendance rows (`attendance_sheet_service.py`). The same holds for clearing one
    student. The user guide said that Clear "takes all of them away"; it now says what
    happens. To make Clear remove saved marks, the sheet needs a list of marks to delete
    (as it has for ratings), on the server, the page and the offline queue: the owner's word.
    **Done in PR 433 (above), on the owner's go-ahead of 19 November.**
  - Closing the browser or reloading the page inside the two seconds still loses the mark
    (the request of a page that is going away is not sent). The help already says to wait
    until "Changes pending..." has gone.
  - The lesson log and a student's notes save by themselves too, each with code of its own;
    they were not looked at for the same faults.

**2026-11-18: the older documents, read and corrected, and what the reading found in the
code** (PR 429, merged as `aeceec62f`; on the PR's commit CI's backend job passed 1,854
tests with 55 skipped, the frontend job 2,100, and E2E 75 with one more that passed on its
second try: see the end of this entry. The owner's message of that day, at the head of
todo 63: point 6, "About twenty-five older documents (admin and user) were not read: read
and correct as needed").

- **The documents.** Twenty-three: the 22 that `docs/user/INDEX.md` and todo 63 listed as
  not read, and `docs/admin/IMPORT_EXPORT_GUIDE.md`, which was in neither list. None was
  deleted or renamed, because other documents link to them; each was corrected in place or
  written anew, says at its head how it was checked, marks what is read from the code and
  was not tried, and says that its earlier text is in the repository's history. Together
  they went from 9,577 lines to 2,841.
  - *Roles and permissions:* `PERMISSION_MANAGEMENT_GUIDE.md` (now "Managing permissions
    through the API": the requests behind the pages, with bodies and answers),
    `RBAC_OPERATIONS_GUIDE.md` (what to check, what every start repairs, adding a
    permission), `RBAC_DATABASE_SCHEMA.md` (the tables, completed, and how a permission is
    resolved), `API_PERMISSIONS_REFERENCE.md` (for developers; no endpoint table of its
    own, the generated one in `PERMISSION_MATRIX.md` is the list), `RBAC_GUIDE.md` and
    `RBAC_GUIDE_EL.md` (the model on one page), and three records of January 2026 cut down
    to "what it found then, what is true today" (`RBAC_CODEBASE_REVIEW.md`,
    `RBAC_ENDPOINT_AUDIT.md`, `PERMISSION_MATRIX_ENDPOINT_MAPPING.md`).
  - **`RBAC_GUIDE.md` and its Greek twin recommended `AUTH_MODE=permissive` for production
    and said it still asked for a sign-in.** It does not: a request without a sign-in
    passes the permission checks. Both now say so, in bold.
  - *The user guide in Greek:* `ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md` is the text of `USER_GUIDE_COMPLETE.md`
    in Greek, with the names the Greek pages show (154 of its names in bold or in «» are
    texts of the Greek locale files; the others are headings and examples). It was not
    itself read against a running copy, and says so. `SMS_USER_GUIDE_EN.md` and `_EL.md`
    (the guide of version 1.9.7) are short notes that point to the current guide and keep
    the three things that were true and nowhere else.
  - *Starting the application:* `QUICK_START_GUIDE.md` and `ΓΡΗΓΟΡΗ_ΕΚΚΙΝΗΣΗ.md`, read
    against `DOCKER.ps1` and `NATIVE.ps1` (where the scripts are, what `-Install` and
    `-Setup` do, the password they generate and print); not run. **The README's "First-Time
    Login" published `admin@example.com` with a fixed password that no edition creates any
    more** (the server lists it among the known public ones); it now points to the Lite
    guide and the quick start.
  - *Features:* `IMPORT_EXPORT_USER_GUIDE.md`, `SESSION_EXPORT_IMPORT_GUIDE.md`,
    `RATE_LIMITING_GUIDE.md`, `RATE_LIMITING_QUICK_REFERENCE.md`, `THEME_GUIDE.md`,
    `THEMES_SUMMARY.md` (eight themes under Utils > Settings, not six in the Control
    Panel), `LOCALIZATION.md`, `README_PDF_CONVERSION.md`, and the admin
    `IMPORT_EXPORT_GUIDE.md` (the older panel of the Control Panel: which page to use
    instead, and its API).
  - `docs/user/INDEX.md` and `docs/INDEX.md` list them as corrected, not as "not checked".
- **Repaired, because a document or a page said something the application does not do:**
  - *The Rate Limits tab said "Changes apply immediately".* Tried on a scratch copy: the
    read limit saved as 3 per minute, the server reported 3, and eight reads in a row were
    still answered; after a restart the fourth was refused (429, `{"detail":"3 per 1
    minute"}`, no `Retry-After`). Each endpoint takes its limit when its module is
    imported. The tab and its two messages now say that a saved limit takes effect the next
    time the server starts (both languages); `ENV_VARS.md` lists the five
    `RATE_LIMIT_*_PER_MINUTE` variables, which it lacked. The limits were not made to apply
    at once.
  - *The session import promised a backup that most installations do not get.* The tip on
    the page and the help answer said "A backup is automatically created before import".
    The copy is made only where the database is a SQLite file
    (`routers_sessions.py`); on PostgreSQL, which the shared database and the cloud VM
    use, none is. Both texts now say to make a backup first.
  - *A role or a permission created, changed or deleted left no line in the audit log*, so
    PR 428's "every change" was not yet true. No page does these; the API does
    (`/admin/rbac/roles`, `/admin/rbac/permissions`, `/permissions`). They write an entry
    now: a role created, renamed, described anew or deleted (with how many accounts held
    it), a permission created, changed, switched off or on, or deleted (with how many
    roles and accounts held it); a save that changed nothing writes none. The Audit Log
    page has a sentence for each, and for three operations the server already wrote and
    the page showed as "Role changed" without the role (`bulk_assign_role`,
    `bulk_grant_permission`, `auto_assign_inherited`). The page's test now reads the
    operation names out of the three server modules, so one added there fails it until it
    has a sentence in both languages.
  - *Found while testing that: the accounts of a deleted role held the next role created.*
    On SQLite (no foreign-key enforcement, and the number of the last role deleted is
    handed out again) the rows in `user_roles` stayed and pointed at the new role. Seen in
    a test before the repair (`{'auditor', 'teacher'}` for an account that had been given
    "librarian"). Deleting a role now removes those rows itself, and creating one clears
    any that an earlier version left under its number. Reachable through the API only.
  - *Renaming a role or a permission to a name that exists answered 500* (the database
    refused the second row). It is a 400 now.
  - *The check of Utils > Imports dropped what it could not read.* The messages for a CSV
    row without a name, an address or a student ID, and for a CSV file offered for
    courses, were collected and then thrown away: the check showed the other rows, said
    nothing, and left **Confirm & Import** open. Each is a row with an error now, which
    closes the button as any other error does. (Found by the helper that read the import
    guide against the code; the new test fails on the old code.)
  - `USER_GUIDE_COMPLETE.md`, section 15, still said the application has no page for the
    audit log (it has since PR 428). The Greek page text of the ΜΙΕΕΚ theme had a wrong
    article ("με πράσινη τονισμό"). Comments in five modules still named viewer, guest
    and student roles, "83 requests per minute" and a dependency that is not used.
- **Tried in a browser, in English and in Greek, on a scratch copy:** a role created, given
  to an account, renamed, described, refused the name "teacher" and deleted, and a
  permission created, granted, switched off and on, described and deleted, all through
  the API; the Audit Log lists each with its sentence, its author and its details, and no
  row of `user_roles` is left for the deleted role; the Rate Limits tab's line and what it
  says after **Save Changes**; the tip of the session import.
- **Tests.** `test_audit_author.py` (27, eight new: the entries for roles and permissions,
  the role made after one was deleted, what an earlier version left behind, the two 400s);
  `test_imports_integration.py` (23, two new); `AuditLogPanel.test.tsx` (13, two new).
- **How it was done.** Three helpers read the documents against the code and the checked
  guides, each wrote the corrections for its own documents, and every file was then read
  by the assistant, with a script that looks up each quoted message, setting and
  permission in the code (43 of 43 found) and each name in bold among the page texts.
- **Found and not changed** (the owner's word, or a later entry):
  - *The session import recognises a grade by student, course and assignment name, not by
    category* (`routers_sessions.py`), and the older `/import-export/imports/grades` does
    the same. Two grades of one assignment in two categories, which the owner keeps on
    purpose (rows 141 and 146), are one record to both: with **Update Existing** the
    second overwrites the first, with **Skip Existing** it is left out. Two grades of the
    same name and category on two dates collapse the same way. Read from the code, not
    tried; the guide warns. What identifies a grade (name and category, or the date too)
    is a decision. **Done in PR 432: name and category.**
  - The older import path of the Control Panel's Import/Export panel (todo 62) marks a job
    "ready" also when rows have errors, recognises a student by the e-mail address among
    deleted ones too, and has no rollback, template or row limit, all of which its old
    guide promised. Read from the code.
  - *CLAUDE.md's own i18n example does not work as written:* `useTranslation()` without a
    namespace reads only the root texts, so its `t('common.save')` never resolves
    (`useTranslationKeys.test.ts` says so and guards it). `useLanguage().t('common.save')`
    or `useTranslation('common')` with `t('save')` do. Not edited: the file is the
    owner's instruction to the assistant.
  - The **Bulk Imports** limit of the Rate Limits tab covers one route that Utils >
    Imports does not use; the imports of that page count under **Heavy Operations**.
  - `GET /admin/rbac/change-history` lists three kinds of action, so a change to a
    permission's description or key (action "update") is in the Audit Log and not there.
    No page uses that request.
  - The toast of a finished session import may mix capital and small letters in
    "Created/Updated/Errors" (two namespaces hold the words); not tried.
  - Not looked at: `docs/operations/INSTALLATION_GUIDE.md` (the helper says it still
    tells the reader to unzip and run `.\DOCKER.ps1`), and the records under
    `docs/deployment/`, `docs/releases/`, `docs/training/` and `ACADEMIC_PRESENTATION.md`
    that describe the nine RBAC documents as they were ("1,050 lines covering daily ops").
  - Carried over from the reading and still open: the migration `d37fb9f4bd49` creates the
    index on a permission's key without "unique" while the model says unique (not checked
    on a real database; **done in PR 434**: a later revision makes it unique on PostgreSQL, a
    migrated SQLite database lacked it and gets it); the download links of the help are plain addresses that the
    Android app may not reach (not tried); the tools nothing runs and the two unused page
    parts (todo 63).
- **Seen on this PR's CI and not explained:**
  - *One E2E test passed only on its second try:* "Attendance Tracking › should mark
    student attendance" (`student-management.spec.ts`). On the first try the **Present**
    button of the test's student was clicked and had not turned green after ten seconds;
    on the second it did. The PR changes nothing of the Attendance page, and the five E2E
    runs before it (PRs 427 and 428, and three pushes to `main`) passed all 76 at once.
    Whether a click can be lost on that page while its list is still loading was not
    looked into: if it is seen again, start there. **Looked into the same day: it can, and
    in three more ways. Repaired in PR 430 (above).**
  - *The Auto-label workflow failed*, on this PR alone: GitHub's API refused the labeler
    with "too many files changed" (the diff removes 9,354 lines). It is not one of the
    required checks, and the label `requires:e2e` was on the PR from its opening.

**2026-11-18: the audit log says who did it, has a line for every change of an account, a
role or a permission, and a page shows it** (PR 428, merged as `f0f07e085`; on the PR's
commit CI's backend job passed 1,844 tests with 55 skipped, the frontend job 2,098 and E2E
76. The owner's message of that day, at the
head of todo 63: point 5, "Fix The audit log does not say who changed a role, and no page
shows it", and the last of the things to take up, "audit log entries that do not say who
changed a role").

- **No entry ever had an author.** The audit service names the author from a note on the
  request (`request.state.current_user`) that, by its own comment, an "auth middleware" was
  to set. There is no such middleware, and nothing else set it: every entry written through
  it, the imports and the data-subject requests included, had an empty `user_id` and
  `user_email`. The note is now made where the account behind a request is resolved
  (`remember_actor` in `backend/security/current_user.py`): its number and address, not the
  database object, because an entry is written after the endpoint's own commits.
- **Most changes had no entry at all.** Only the requests under `/admin/rbac` (Assign Role
  to User) wrote one. What User Accounts does (create an account, change its role,
  activate, deactivate, delete, reset a password) and what the Permissions Catalog does
  (grant and revoke, for a role or for one account) left no line, so the usual way of making
  somebody an administrator was not in the log. All of them write an entry now, and so does
  an account's change of its own password. A password is never in an entry; a deleted
  account stays in the log by its address; a refused request, and a save that changed
  nothing, leave none.
- **The page.** Control Panel > Maintenance > **Audit Log**, for administrators: When, Who,
  What and About, the newest first, 25 to a page, narrowed by what was done, by who did it
  and by a range of days. An entry is a sentence where the page knows what was done
  ("Changed the role of ... from Teacher to Administrator", "Granted audit:view to the role
  Teacher", "Set a new password for ..."), and the server's own words with its details where
  it does not. "Not recorded" stands for an entry without an author: the ones written before
  this change, and a request without a sign-in.
- **Seen in the browser and repaired: the time of an entry was two hours early.** The time is
  stored in UTC, SQLite hands it back without its zone, and a browser reads a time without a
  zone as local time. The answer now carries the zone.
- **Texts.** A help answer "Where do I see who changed what?" (82 answers); a section "The
  audit log" in the administrator's guide; the matrix, the reference and the user guide.
- **Tests.** `test_audit_author.py` (19): who is named, for each of the three panels'
  changes; that nothing secret is written; that a refusal and an unchanged save write
  nothing; the time with its zone. `AuditLogPanel.test.tsx` (11): the sentences, the
  filters, the pages, a refusal told from a failure, and a name for every action and kind of
  record in both languages.
- **Tried in a browser, in English and in Greek, on a scratch copy:** ten changes made as two
  administrators and a teacher (a role from Edit, a role revoked, a grant to a role and its
  revoke, a grant to one account, an account deactivated, reset and deleted, an own
  password, and a teacher's refused try to make itself an administrator); the page lists
  each of the nine that happened with the right author and none for the refused one; the
  filters by action and by author; a teacher is not shown the section.
- **Not changed:** the panel is offered to administrators only, although the API answers any
  account that was granted `audit:view`. Signing in and out is not written to the log.
  Entries of before this change keep their empty author.

**2026-11-18: what an account can do for itself, and what it is told** (PR 427, merged as
`3d465ab21`; on the PR's commit CI's backend job passed 1,825 tests with 55 skipped, the
frontend job 2,087 and E2E 76. From the owner's message of that day, at the head of todo 63: point 4, "A teacher has no page for
changing their own password, should have access there", and three of the four things to take
up: "the registration form's message that appears in two languages at once; a sentence
telling an account without access why its pages fail; the text of the one-page PDF behind the
help").

- **Every account changes its own password.** The form "Change Your Password" stood behind
  the administrator check of User Accounts, so the panel answered a teacher "Access Denied".
  It now shows an account that is not an administrator that form, and a line saying that the
  other accounts are managed by an administrator; the list of accounts and the form for a new
  one stay with the administrator. The panel also asks the account itself whether it is an
  administrator, where it waited for an effect: for a moment a teacher was shown the
  administrator's forms. Tried as a teacher with the Control API answering 404, as it does in
  Docker: the request is `POST /auth/change-password`, the old password is refused afterwards
  and the new one accepted.
- **An account without a role is told so**, by one line at the top of every page ("Your
  account has no role, so no page of records opens for it. Ask an administrator to give it a
  role."). It used to see a row of unrelated failures. Any word but Administrator and Teacher
  counts as no role; an administrator and a teacher see nothing.
- **The sign-in form's own messages are in the page's language.** It was the sign-in form,
  not the registration form: an empty address and an empty password were answered in Greek
  and English at once, written in the code, and an address that is not one with the server's
  English ("Validation failed: body.email — ..."). Three texts in both languages.
- **The Quick Guide** (the one-page PDF behind Utils > Help & Documentation) is written anew
  in both languages. It promised a "Help" button, video tutorials "coming soon" and support
  links, none of which exist; its Greek called the students "φοιτητές". It now gives the five
  steps to start, the pages, the account and where the help is, naming each button, tab and
  page as the application names it; `quickGuide.test.ts` finds every such name among the
  application's texts of that language, so a renamed button fails the test. A4, one page.
- **The Greek Quick Guide had no Greek letters on Docker.** The page was set in a font of the
  operating system; the Docker image installs none, so there it fell back to Helvetica, which
  has no Greek letters (read from the code and the image's packages; not looked at on a
  Docker copy). It is set in the DejaVu fonts the application carries, like the other PDFs.
- **Texts.** A help answer "How do I change my password?" (81 answers); the user guide
  (sections 1, 13 and 14), the administrator's guide, the matrix and the reference.
- **Tests.** `AdminUsersPanel.ownPassword.test.tsx` (7), `NoRoleBanner.test.tsx` (14),
  three changed and one new in `LoginWidget.test.tsx`, `quickGuide.test.ts` (4),
  `test_quick_guide.py` (10).
- **Tried in a browser, in English and in Greek:** the teacher's password change as above;
  the line for an account without a role on four pages, and none for a teacher or an
  administrator; the three messages of the sign-in form. The text of both PDFs was read back
  out of the files.
- **Seen and not changed:** the two download links of the help are addresses of the page's
  own origin (`/api/v1/help/user-guide/en`). In the Android app, whose pages do not come from
  the server, they would not reach it (read from the code, not tried on a phone).

**2026-11-18: the Weight of a grade counts** (PR 426, merged as `56b7e873f`; on the PR's
commit CI's backend job passed 1,815 tests with 55 skipped, the frontend job 2,061 and E2E
76. The owner's decision of that day, point 7 of the message at the head of todo 63: "The
Weight box of a grade: make it count").

- **What it was.** Grades > Grade Entry has a Weight box, and Grade History showed what was
  typed ("×3"). The number was stored and never read: the final grade took the plain average
  of a category's grades.
- **What it is.** Within its category a grade counts as often as its Weight says: 20/20 with
  weight 1 and 0/20 with weight 3 average 25%, not 50%. Grades of equal weight average as
  before. A grade without a weight, or with 0, counts once: the pages have always shown such
  a grade as "×1", and a grade that is recorded and silently left out would be worse than one
  that counts. Midterm Exam and Final Exam take their latest grade alone, so a weight changes
  nothing there. A day's rating from Attendance counts beside the weighted grades, with the
  multiplier of the category's rule.
- **What it means for the grades that exist.** A final grade changes where one category
  holds grades of different weights; nothing else changes. Which final grades of the real
  database that touches was not looked at.
- **The pages.** Under the Weight box a line says what the weight does. The box is closed for
  both exam categories: it was closed for the form's starting value only, and for "Midterm
  Exam" it stayed open and silently saved 1. On the card of Students > View Performance the
  average of a category is the weighted one, so that it agrees with the final grade, and a
  grade whose weight is not 1 is marked ("×3"). `total_items` of a category is the number of
  grades and ratings, where it was the sum of their weights.
- **Found in the browser and repaired: a grade of 0/20 shown as "10000.0%" with the letter
  A**, under Recent Grades on a student's profile. The fallback for the points possible stood
  on the quotient, and a quotient of 0 counted as "nothing there".
- **Left as they are:** the other averages of the application (a student's "Average", the
  class statistics, the projections of the Outlook) are plain averages over all the grades,
  whatever their category or weight. They are not the final grade and never followed its
  rules.
- **Texts.** The help answer on the Weight and the one on the final grade, in both languages;
  sections 7 and 8 of the user guide.
- **Tests.** `test_grade_weight_counts.py` (20): through the API for each case above, and a
  changed weight changes the final grade at once. `GradingView.weight.test.tsx` (7), four
  more in `CourseGradeBreakdown.test.tsx`, one more in `StudentProfile.test.tsx`.
- **Tried in a browser, in English and in Greek, on a scratch copy:** two homework grades
  with weights 1 and 3 give "Homework: 25.0%" and a final grade of 25; with a final exam of
  10/20 (rules 40 and 60) the final grade is 40; the history shows ×1 and ×3; the card shows
  25.0% and "×3"; the profile shows 0/20 as "0.0%" with an F.

**2026-11-18: two roles, "No role" for every other account, and nothing but the rows**
(PR 425, merged as `8b91caa2b`; on the PR's commit CI's backend job passed 1,795 tests with
55 skipped, the frontend job 2,049 and E2E 76. The E2E run was started by hand: the workflow
reads a pull request's labels from the event that opened it, and this time the label
`requires:e2e` was attached a moment later, so the run was skipped; the pipeline's own check
for the label cannot work at all, because it asks `gh pr view` without naming the
repository in a job that has no checkout, and throws the error away. The owner's decisions
of that day on the three choices the report on PRs 422 to 424 had left: "1. Who may import: both teachers and admins. 2. Student accounts: Remove "Student"
from the role boxes. 3. Viewer and Guest: Remove both considering Removing the built-in
permission list for accounts that never got a role row, which the note also asks for. It is a
larger change: a start-up step, and most test fixtures." The rest of that message is at the
head of todo 63.)

- **How the message was read.** Point 3 as "remove Viewer and Guest, and remove the built-in
  list as well". Point 1 as the import of students and courses from a file (Utils >
  Imports); a semester's session file (`sessions:manage`: grades and attendance of a whole
  semester in one file) stays with the administrator. If teachers are to have that too, it is
  one more grant. **Granted on 19 November: PR 432.**
- **What an account may do is what its rows say.** `backend/rbac.py` had a list of
  permissions for each word an account's Role column can hold, used when the account had no
  matching role row. It is gone, with the special case that let the word "admin" pass every
  `imports:` permission. A leftover word grants nothing any more.
- **Two roles.** `admin` and `teacher`. The Role column of an account holds one of them or
  `none` ("No role"). User Accounts offers Administrator and Teacher for a new account, and
  Administrator, Teacher and No role under Edit; Assign Role to User and the Permissions
  Catalog list the two roles; a message "to a role" goes to one of the two. The server refuses
  any other word (422).
- **A closed list of 44 permissions:** `*:*` and the 43 the endpoints ask for. The thirteen
  that were asked for without a row were added (`imports:create`, `imports:view`,
  `exports:view`, `sessions:manage`, four `jobs:`, two `diagnostics:`, `admin:manage`,
  `reports:create`, `analytics:export`), so each can be granted from the Permissions Catalog;
  the eight that opened nothing were removed. Two tests fail when an endpoint asks for a key
  without a row, or the list holds a key nothing asks for.
- **Teachers import.** The role `teacher` holds 25 permissions: the 20 it had that open
  something, the four `imports:` ones, and `jobs:view`. The last was found in a browser: the
  import ran, and the Imports tab could not follow it, because the job's status asked for a
  permission only the administrator's wildcard covered.
- **The step at every start.** Each account whose Role column says `admin` or `teacher` is
  given the row of that role if it lacks it (`backfill_role_rows`). Without it three kinds of
  account would have been left with nothing: the first administrator of an installation (the
  start creates it after it seeded the roles), an account from before the role tables, and one
  created with `python -m backend.db.cli.admin`. The bootstrap and that command now give the
  row themselves; the step also runs after a restore from a backup, with "Initialize RBAC
  Defaults", and at a start whose migrations failed (so that an administrator can sign in and
  see what went wrong). It never gives a role back: "No role" names none.
- **What the upgrade does to a database** (migration `5189ab647b5a`, data only, no table or
  column changes): an account whose Role column says student, viewer or guest becomes `none`,
  or keeps `teacher`/`admin` if it held that role too; the roles `viewer` and `guest` go with
  their grants and the rows that gave them to accounts; the eight permissions go, the thirteen
  come; `teacher` is granted the four `imports:` permissions and `jobs:view`. Changes an
  administrator made to what `teacher` holds, and grants to single accounts, stay. A copy of
  an older version keeps working against a database at this revision (it starts on a newer
  revision, and gives the word `none` nothing). The downgrade puts roles, permissions and
  standard grants back; it cannot know who was a Student, Viewer or Guest.
- **Found while the tests were adapted, and repaired: with the list gone, deleting the role
  `admin` would have locked every administrator out for good.** PR 422 had left renaming and
  deleting that role as they were, because an administrator without the role was served by
  the list. Without the list a deleted role left no administrator with anything, "Initialize
  RBAC Defaults" included, and a restart did not seed (the tables were not empty); a renamed
  one left every administrator created afterwards with nothing. The roles `admin` and
  `teacher` can now be neither renamed nor deleted (400), and a start puts a missing one
  back.
- **The pages.** The names of the permissions are a table of exactly the 44, in both
  languages, pinned to the server's list by a test (it had some sixty names, forty of them
  for permissions that never existed). The help has an answer on importing (80 answers), and
  its roles answer names two roles; the privacy notice says that students have no accounts.
  Two Greek misspellings on the Imports tab corrected.
- **Documents.** `PERMISSION_REFERENCE.md` rewritten (the sections "In the list, opening
  nothing" and "Asked for by an endpoint, not in the list" are gone with their contents; new:
  "Accounts without a role", with the step at start and the upgrade); the head of
  `PERMISSION_MATRIX.md` (three kinds of account) and `RBAC_ADMIN_GUIDE.md` (no read-only
  account any more; a section "After the upgrade"); `USER_GUIDE_COMPLETE.md` sections 10, 11,
  12 and 14.
- **Tests.** `test_two_roles_model.py` (15): the seed's shape; the step at start, also after
  failed migrations, for the bootstrap and for the command line; a teacher's import from the
  check to the finished job; what stays with the administrator; and the migration on a
  scratch database filled as the version before left one (ten kinds of account), up, down and
  up again. Eighteen test files had relied on the list or on the four roles: their accounts
  now get what a start gives (`started_installation` in `conftest.py`). Page tests for the
  role boxes, the message form and the name table.
- **Tried on running copies.** A database made by the code of `main` with ten kinds of
  account, then started with the new code: the two roles, 44 permissions, every Viewer, Guest
  and Student account "No role" and refused everywhere, the two accounts without rows working
  again, a grant to one account kept. In a browser, in English and in Greek: a teacher checks
  and imports a student and the tab shows the job as completed; the session panel still says
  the account may not use it; the role boxes offer what is written above; "No role" from Edit
  takes the access away and "Initialize RBAC Defaults" does not give it back; Overview lists
  2 roles and 44 permissions, each with a name. Every row of the matrix's table tried as an
  administrator, a teacher, an account without a role and without a sign-in.
- **What an installation will see at its first start of the next version:** accounts that
  were Student, Viewer or Guest are listed with "No role" and can do nothing until an
  administrator gives them a role. On the shared database that happens as soon as any copy of
  this code starts on it, the development server of the main tree included. A copy of an
  older version that still runs on the same database (the cloud VM, until it is updated)
  goes on working; "Initialize RBAC Defaults" pressed on such a copy would put the two roles
  and the eight permissions back (read from the older code, not tried).
- **Left as it is:** `exports:view` stays with the administrator (the export jobs are todo
  62); the rule in `backend/rbac.py` that lets an account with the word "student" read its own
  student record (no account can have that word any more; removing it touches nine endpoints);
  `src/backend/seed_database.py`, which still makes four roles and cannot run (it imports
  `models` from a path that does not exist).

**2026-11-18: the answers of Utils > Help & Documentation say what the pages do** (PR 424,
merged as `38f8052ae`; the last of what the owner's "continue" selected: "read the ninety-one
answers of the in-app help against the pages"; on the PR's commit CI's backend job passed
1,768 tests with 55 skipped, the frontend job 2,045 and E2E 76).

- **What it was.** 91 answers in 18 groups, most of them older than the pages. "Click Save
  Attendance" (no such button); "Only unexcused absences affect grades" (excused periods
  count towards both limits); "Operations → Export Center", "Operations → Backups",
  "Operations → Settings", "Operations → Reports" (the tab is Utils, the backups are under
  System); a "Power" tab (it is called System); themes "Light", "Dark" and "System" with a
  Save button (there are eight themes, none of those names, and no Save); "use sample data
  first" (no page offers sample data); ten charts for a dashboard (there are five); "the
  role tabs" of RBAC Configuration; a "performance multiplier" set in the rules (no page
  sets one). The Greek answers were older again, in two vocabularies ("φοιτητής" and
  "σπουδαστής"), beside two whole groups of texts that no page showed.
- **What it is.** 79 answers in the same 18 groups, in English and in Greek, written from
  the recordings of the pages of 17 November, the code, and an experiment for the grades.
  Every button, tab and page an answer names is named as the page names it, in each
  language. Twelve answers are gone: about things that do not exist (sample data, a System
  theme, a performance multiplier, the Windows installer) or that said nothing ("Can I
  disable autosave?"); four Docker answers became one, about what Control Panel >
  Operations is for. The texts no page showed are removed from both files.
- **Tried with grades on a scratch copy, because the help and the code disagreed.**
  - *The Weight of a grade does nothing.* Homework 20/20 with weight 1 and 0/20 with weight
    3 give a category average of 50%, the plain average. The page's own hint says "Higher
    weight = more important". The help and the user guide (which called it a multiplier)
    now say what happens; whether the box should count or go is todo 63.
  - *For Midterm Exam and Final Exam only the latest grade counts:* 10/20 and then 20/20
    give 100%.
  - *A day's rating counts like one more grade of its category.*
  - *The absence penalty of a course is real, and the user guide did not have it:* with a
    penalty of 2, two Absent periods took 4 points off (75% became 71%); an Excused and a
    Late period took nothing. Section 8 of the guide has it now.
- **The page ran every answer's lines together** into one paragraph ("1. Open … 2. Click …
  3. …"), in both languages: the answers are shown line by line.
- **"User Guide, Complete reference guide"** above the two PDF links is "Quick Guide, a
  one-page summary, as a PDF", which is what the links give.
- **Tests.** `helpContent.test.ts` (7): the page shows only texts that exist in both
  languages, the two files hold the same texts and none that the page does not show, and
  every name an answer puts in quotation marks is a text of the application in that
  language, so that a renamed button fails the test. `HelpDocumentation.test.tsx` (3).
- **Not read:** the text of the one-page PDF. **Not tried:** a scheduled report and a report
  sent by e-mail, from end to end; the answers say what the form offers.

**2026-11-18: an account whose last role is revoked is left with nothing** (PR 423, merged
as `dfd11a55c`; the first point of a note the owner sent that day, in answer to the four
decisions the report of the night before had left open: revoking the only role, who may
import, student accounts, Viewer accounts; on the PR's commit CI's backend job passed 1,768
tests with 55 skipped, the frontend job 2,035 and E2E 76).

- **What the note says, and what of it applies here.** Its four points: an account without
  a role is denied by default and a revoke takes effect at once; the permissions are one
  closed list, each one asked for by some endpoint and present in the database; a student
  account is tied to a student record or the choice "Student" goes; a Viewer has one
  coherent purpose or goes. Read against the code:
  - *Already so:* every check reads the account and its roles from the database at each
    request; the role in the sign-in token is not used, and the optional cache is emptied by
    any change made through the application. A revoke counted from the next request before.
  - *The mechanism the first point is about:* an account without role rows gets a built-in
    list for the word in its Role column (`backend.rbac._default_role_permissions`), and
    the endpoints that ask for the administrator role read that word. A revoke removed the
    row and left the word, so nothing was lost; "Initialize RBAC Defaults" then gave the
    role back, because it gives every account the role its Role column names.
- **What changed.** `POST /admin/rbac/revoke-role` makes the Role column follow the roles
  that are left: the highest of them, or `none` when the last is gone (it used to stay, and
  an administrator's became "teacher"). `none` is not a role and nothing is built in for
  it, so every permission check and every role check refuses the account; it can still sign
  in. The page says "The account has no role left…" after such a revoke, User Accounts
  lists the account as "No role" (EN) / "Χωρίς ρόλο" (EL), and a role given again, under
  Assign Role to User or in Edit, brings the access back. A permission granted to the
  account itself stays, as the administrator's own word about that account.
- **Seen on a scratch copy**, in English and in Greek: a teacher's only role revoked in the
  browser; students, courses, the Dashboard's figures and an export answered 200 before and
  403 after, for the sign-in the account already had and for a new one; "Initialize RBAC
  Defaults" changed nothing; Edit > Teacher > Save brought it back. Signed in, such an
  account lands on the Dashboard and sees the pages' failure messages, with no page error.
- **Not done, on purpose: taking the built-in list away altogether** (the note's "never let
  a leftover role name grant access"). It still serves an account that has no role rows
  because it never got any: a database from before the role tables, and most accounts the
  test suite creates. Removing it needs a start-up step that gives every such account its
  row first, and a pass over the test fixtures; offered to the owner as a next step.
- **Tests.** Backend `test_revoke_last_role.py`, 7 tests, all failing on the old code.
  Frontend: 2 added to `RBACPanel`, 1 to `AdminUsersPanel.roles`.
- **Documents.** The admin guide, the permission reference, the matrix and the user guide
  name the fifth kind of account, "No role", and say how the older versions behave.
- **The note's other three points wait for the owner's choice** (todo 63): who may import,
  student accounts, Viewer and Guest.

**2026-11-18: the small page repairs of todo 63, and what they uncovered** (PR 422, merged
as `bf6535bda`; on the PR's commit CI's backend job passed 1,761 tests with 55 skipped, the
frontend job 2,032 and E2E 76; the
owner's "continue" after a report that named five repairs as what it would take up: the two
places where a page shows the name of a text, the empty role list of the Permissions
Catalog with a guard for the administrator's full access, the blank permission names of the
Overview tab, saving a Viewer account from Edit, and the dates on a student's page). Each
was seen on a scratch copy before and after, in English and in Greek.

- **Pressing Save could turn an administrator into a teacher** (found while repairing Edit;
  the worst of the day). User Accounts replaced each account's role with the first of its
  role rows. An administrator who got the role under Assign Role to User has the rows
  teacher, admin, viewer, guest: the list said "Teacher", the Edit row said "Teacher", and
  **Save**, with nothing changed, sent `"role": "teacher"`. The server did as told. The list
  now shows the role the server sends with the account (which follows the highest role),
  and Save sends the role only when another one was chosen.
- **A Viewer or Guest account can be saved from Edit.** The role box shows the account's own
  role as a fourth entry, selected, and leaves it alone. Before, the box showed
  "Administrator" and the save was refused (422). Whether the two roles are offered for a
  new account stays with the owner's decision on read-only accounts (todo 63).
- **The Permissions Catalog can grant to a role and revoke from one.** Both role boxes were
  empty: the page asked `GET /rbac/roles`, which does not exist (`/admin/rbac/roles` does).
  The page's own test answered the wrong address too, so it could not fail. Seen in a
  browser: `audit:view` granted to the role teacher opened the audit log for a teacher,
  revoked it closed again.
- **The administrator's full access cannot be taken away any more.** Now that the page can
  send it, `POST /permissions/roles/revoke` refuses `*:*` for the role `admin`, as
  `POST /admin/rbac/revoke-permission` always did; the page refuses first, with a sentence.
  Looking for other ways found three, none sent by a page: switching the permission `*:*`
  off (`PATCH /permissions/{id}`), deleting it (two addresses) and renaming it. After the
  switch-off **a restart did not put it back** (the check at start looked for the grant, not
  at whether the permission was on): seen on the scratch copy, whose administrator stayed
  out of the account and role panels until the new code started. All are refused now, and
  the check at start repairs a database in that state. Renaming or deleting the *role*
  `admin` was tried as well and locks nobody out (the grants follow the role's number, and
  an administrator without the role gets the built-in list); those requests are unchanged.
- **The Overview tab names the permissions, and the Users tab the accounts.** Overview read
  a `name` the server never sent: 39 blank rows, and mappings with nothing after the arrow.
  It shows the key and a name in the page's language (20 of the 39 had none in either
  language; added). i18next splits a key such as `students:view` at the colon and answered
  "view", so the table of names is read whole. Users showed "User 3", "user_3@system",
  "Legacy role: user"; it lists every account with its name, address, number, Role word and
  roles, and says so when the list of accounts is refused. `rbacAPI.grantPermission`, which
  posted to an address that does not exist and was called by nothing, is removed.
- **The two names of texts, and four more.** "currentRules:" above a course's rules and
  "failedToLoadSemesters" in Session Export/Import have their texts. The session panel no
  longer raises an error for an account the server refuses: it says "Your account may not
  export or import a session. Ask an administrator." and offers no form (every request of
  the panel asks for the same permission). **Why they got through:** a test checks every
  key used through `useTranslation()`, none checked the application's own `useLanguage()`,
  which most pages use. `useLanguageKeys.test.ts` does now, and found four more:
  `localModeLabel` (the "Local" badge of SMS Lite, English for a Greek reader), `dialog`
  (the spoken name of a window without a title), and `other` and `noGradesAvailable` in the
  grade breakdown of a student's page, where two tests expected the raw names.
- **A student's page.** The dates of enrolment were labelled "Courses" (the word for the
  count on a student's row); they read "Enrolled:". **A correction of yesterday's entry:**
  the dates of "Recent Grades" are not missing for grades typed on the Grades page, which
  stores a "date submitted". They read "N/A" for a grade that has only a "date assigned"
  (one made through the API, as mine were, or brought by a session import). The table now
  shows either date, as the Grades page and the student card do, and a dash for none.
- **Tests.** Backend `test_permissions_role_grants.py`, 11 tests, 6 of them failing on the
  old code. Frontend: `AdminUsersPanel.roles` (4), `SessionExportImport` (4),
  `useLanguageKeys` (4), and additions to `RBACPanel` (3), `PermissionsPage` (1),
  `useSessionExportImport` (2) and `StudentProfile` (2).
- **Documents.** `RBAC_ADMIN_GUIDE.md`, `PERMISSION_REFERENCE.md` and the user guide said
  what the application did; they say what it does, with the old behaviour kept under "In
  v1.18.73 and earlier" for installations that are not updated.

**2026-11-17: the user guide says what the application does** (PR 421, merged as
`8eb82f9e9`; the owner's "continue": the rest of the last entry of todo 59; on the PR's
commit CI's backend job passed 1,750 tests with 55 skipped and the frontend job 2,012; E2E
does not run on a PR that changes documents only). `docs/user/USER_GUIDE_COMPLETE.md` is
written anew, 430 lines for 1,560. Nothing of the application changes.

- **What it was.** A text of 2025 about the application as planned: an installer
  "SMS_Installer_1.8.6.3", a default administrator "admin@example.com", navigation entries
  "Reports" and "Control Panel", a "System Settings" page (semester weeks, e-mail
  notifications, caching), keyboard shortcuts, attendance alerts at 70 and 80 per cent,
  `AUTH_MODE=permissive` as the recommended setting, and the advice to set
  `AUTH_MODE=disabled` when a sign-in fails. Its one checked part was the lesson log.
- **How it was checked.** A scratch copy with a course set up as a teacher would (rules, a
  schedule, a week of attendance, a lesson log, grades). Every page was opened as a teacher
  and as an administrator, and as a viewer and a student account for what they are refused;
  every window, tab and form was opened and its text and fields written down by a script
  (several thousand lines of page text), with every refused request.
- **What it says now.** Signing in and asking for an account; the frame of every page; the
  Dashboard; Students; Courses with rules, schedule and enrolment; Attendance with the day's
  rating, the lesson log and the absence table; Grades; how absences and the final grade are
  worked out; Calendar; Search; the six tabs of Utils; Analytics; System; what each kind of
  account may do; what the application does not have; what to do when something goes wrong.
- **The index of the user documents** (`docs/user/INDEX.md`) named neither this guide nor
  the notification guide and recommended keyboard shortcuts. It now lists what was checked
  and, apart, the fifteen older documents that were not.
- **A pointer** in `docs/deployment/QNAP_POSTGRES_SINGLE_SOURCE.md` led to a section of the
  old guide; it leads to the new one's.
- **Found on the way:** seven more entries of todo 63.

**2026-11-17: the three permission documents say what the application does, and a test
keeps them to it** (PR 420, merged as `a192ace59`; the owner's "continue", which takes up
the last entry of todo 59; on the PR's commit CI's backend job passed 1,750 tests with 55
skipped, the frontend job 2,012 and E2E 76). `docs/admin/PERMISSION_REFERENCE.md`, `RBAC_ADMIN_GUIDE.md` and `PERMISSION_MATRIX.md`
are written anew. Nothing of the application changes.

- **What they were.** Texts of the design of January 2026, kept as if they described the
  product: "26 permissions" with three the code never had ("notifications:broadcast",
  "imports:manage", "metrics:view"), a working Student role, tasks done with `curl` and SQL,
  a "migration guide" from v1.18.3 to v1.18.3, and a matrix in which a teacher could not add
  a student.
- **How they were checked.** What each endpoint asks for was read from the application's own
  route table (344 endpoints of the API and the Control API), not from the source by eye.
  Then a scratch copy (SQLite, `AUTH_MODE=strict`) was used as an administrator, a teacher, a
  viewer, a guest, a student account and without a sign-in: 52 requests for each, and every
  step of the administrator's guide in a browser, with what each click sends.
- **What they say now.** The matrix: the five kinds of account, 22 tasks with who may do
  them, what the pages show to whom, the rules of the Control API, and the table of all 344
  endpoints. The reference: how a request is decided, what the four roles hold, the 39
  permissions with what each opens, the eight that open nothing, the thirteen the code asks
  for that are not in the database, the checks that are not permissions, the three auth
  modes. The guide: accounts, roles, a read-only account step by step, how to take access
  away, what the Permissions Catalog can and cannot do, what to do when locked out, and what
  the application does not have.
- **The table is written by a program and the documents are tested.**
  `python -m backend.scripts.endpoint_requirements --write` writes the table of endpoints
  into the matrix. `test_permission_documents.py` (13 tests) fails when a document names a
  permission the code does not have, when the reference leaves one out or sorts it under the
  wrong heading, when what it says a role holds is not what a new database gets, and when
  the table is behind the route table. Against the old documents ten of the thirteen fail.
- **The index** (`DOCUMENTATION_INDEX.md`) sends an administrator to these three. The row
  named `PERMISSION_MANAGEMENT_GUIDE.md`, which has not been read (todo 63).
- **Found on the way:** two ways an account kept access it should not have had, repaired in
  PR 419 (below), and the entries of todo 63, none of them changed.

**2026-11-17: an account changed to "Student" no longer keeps its old access, and a deleted
account leaves nothing for the next one** (PR 419, merged as `31dd259f0`; not asked for:
both were found while the permission documents were being checked against a running copy, on
the owner's "continue", and repaired at once because each let an account do what the list of
accounts said it could not; on the PR's commit CI's backend job passed 1,737 tests with 55
skipped, the frontend job 2,012 and E2E 76). The server only; no database change, no page change.

- **The role "Student" took nothing away.** Changing an account's role to Student in Control
  Panel > Maintenance > User Accounts changed the word in the Role column and left the
  account's role rows as they were: "student" is not a role in the tables, and the code
  returned early for a role without a row. Seen on a scratch server: a teacher changed to
  Student went on reading, adding and exporting students and sending messages to all users;
  an administrator changed to Student still listed the accounts and gave itself a role. On
  every database, PostgreSQL included. Now the rows of the four built-in roles are removed
  whatever the new role is. A change between Administrator and Teacher worked before and is
  unchanged; a role made through the API, and a permission granted to the account itself,
  stay.
- **A deleted account's roles passed to the next account** (SQLite only). Deleting an
  account left its rows in `user_roles`, `user_permissions`, `notifications`,
  `notification_preferences`, `saved_searches`, `reports`, `generated_reports` and
  `custom_dashboards`. PostgreSQL removes them through the foreign keys; SQLite does not,
  because the application runs it without foreign-key enforcement (todo 61), and SQLite gives
  the next account the number of the last one deleted. Seen on a scratch server: an account
  created as a teacher straight after an administrator was deleted held the administrator's
  role. Now deleting an account does what its foreign keys say (the rows marked `CASCADE` go,
  the columns marked `SET NULL` are emptied), read from the models, so a table added later is
  covered. And because a database may still hold what an earlier deletion left, the same
  rows are cleared under a new account's number when the account is created, by an
  administrator or by registration.
- **Tests.** `test_account_role_leftovers.py`, ten tests through the API with the roles and
  permissions of a new installation: a teacher and an administrator changed to Student, back
  to Teacher, between Administrator and Teacher, a role outside the four; what a deletion
  leaves, what the next account gets, what stays for another account (`granted_by` emptied);
  rows planted under the next number before an account is created by an administrator and
  before one registers. On the old code nine of the ten fail; the tenth guards what already
  worked.
- **Checked on a running copy** (scratch SQLite, the fixed code, a database that still held
  an administrator's role row under the number of an account deleted before the fix): the
  next Student account got that number and no role, and was refused the students, the
  accounts and the audit log; a teacher changed to Student was refused at once with the
  sign-in it already had; after a deletion no table held a row of the account.
- **Not done.** The foreign keys of SQLite stay off (todo 61): this repairs the one place
  where it gave access away, not the setting. Nothing looks for rows that earlier deletions
  left under numbers no account will get again; they do no harm there.

### In v1.18.73

**2026-11-17: six E2E tests for things the application does not have are deleted, and four
components that no page uses** (PR 418; the owner: "Delete the six E2E tests for things
that do not exist, and the four unused components"; merged as `ace62bcdf`). Nothing of the
application changes. On the PR's commit CI's backend job passed 1,727 tests with 55 skipped
and the frontend job 2,012, both as before, and E2E 76 with none skipped (76 and 6 before).

- **The six tests.** In `search_advanced.spec.ts` the group "not there at all" (saving and
  loading a search, in two tests; a "clear" control for the query; keyboard navigation in
  the list); `saved-search.spec.ts` (a page of saved searches: there is none, and the rule
  the test was about is tested in the backend); `student-list.spec.ts` (a Students table
  with virtual scrolling: the page is a list of cards). All six were switched off and none
  could pass. The E2E suite is 76 tests in 16 files and none of them is switched off (82 in
  18, six switched off, before).
- **The four components.** `VirtualStudentList`, `CascadedStudentView`, `StudentForm` and the
  hook `useRateLimit`: 438 lines that nothing imported. The frontend builds to the same 82 files, byte for byte, with them and without.
- **With them.** `run-saved-search-test.ps1` did nothing but start the deleted spec file; two
  other runner scripts in that folder started the two deleted files among others and no
  longer do; the hooks reference loses its entry for `useRateLimit`.
- **Checked.** The type check and the lint of the frontend; the whole frontend suite; the
  whole E2E suite against a server set up as CI's: 76 passed and none
  skipped.
- **Left without a user by this, and not deleted** (added to todo 61): the hook
  `useVirtualScroll` and `features/students/StudentRow.tsx`, which only `VirtualStudentList`
  used.

**2026-11-17: a teacher is offered the form that sends a message** (PR 417; the owner:
"Teachers and broadcast (todo 59): allow it on the page"; merged as `05d59a094`). The
server is not changed, and neither is the database. On the PR's commit CI's backend job
passed 1,727 tests with 55 skipped (1,720 and 55 on `main` before it), the frontend job
2,012 (2,002 before) and E2E 76 with 6 skipped, as before.

- **What was.** The server lets an account that holds `notifications:manage` send a message
  to other accounts, and the teacher role holds that permission, by default and in the
  grants made at start. Utils > Notifications showed the form to administrators only: a
  teacher could send through the API and not through the page.
- **Now.** The form is shown to administrators and to teachers. A teacher is offered "All
  users" and "Role"; "Specific users" asks for account numbers, which no page shows to a
  teacher, so that target stays with administrators. Any other account is told "Your
  account is not allowed to send notifications." (it said "Only admins with broadcast
  permission can send notifications."). A refusal of the server, on an installation that
  took the permission from a role, is said in the same words and not as "Failed to send
  notification."
- **On the same tab.** The feedback inbox under the form said "# entries": its two texts
  had a "#" where the number goes, in both languages. It says "3 entries".
- **Tests.** `test_notifications_broadcast_roles.py` (8 tests, on a server that checks
  accounts): a teacher sends to everyone and to one role, and the messages arrive; an
  administrator sends; a student, a viewer and a guest are refused with 403 and nothing is
  sent; nobody sends without an account where a sign-in is required. The one test there was
  of this ("requires admin") sent no token to a server that asks for none and accepted four
  status codes; it is gone. `OperationsView.broadcast.test.tsx` (10 tests): who is offered
  the form, what a teacher's form sends, the two failure texts, the count of the inbox,
  Greek.
- **The guides.** Both notification guides say who may send; the user guide has the steps
  for a teacher. One row of `PERMISSION_MATRIX.md` said "Limited" for teachers.
- **Checked in a running copy** (a scratch server from the branch that requires a sign-in;
  an administrator created a teacher and a student). In a browser: the teacher is offered
  the form with two targets, sends to all users, and is told that it was sent; the server
  made four copies (two administrators, the teacher, the student); the administrator finds
  the message under the bell and is offered three targets; the student has the message and
  is refused with 403 when sending through the API; the form is in Greek on a Greek page.
  All 16 claims hold, with no error on the console.
- **Found and not changed** (added to todo 59): a message does not say who sent it.

**2026-11-17: the Search page sorts, pages and filters, and finds a Greek name; the Students
page says when its list could not be loaded** (PR 416; the owner: "Repair the Search page and
the Students error state (todo 60)"; merged as `597d0149f`). No database changes. It closes
todo 60 but for the unused components, and the four tests of todo 53 that waited for it. On
the merge commit CI's backend job passed 1,720 tests with 55 skipped (1,674 and 55 before
it), the frontend job 2,002 (1,995 before) and E2E 76 with 6 skipped (71 and 10 before).

- **Paging and the total.** `POST /search/advanced` reads `page` and `page_size` from the
  body of the request, where the page always sent them (the `limit` and `offset` of the
  address still work). `total` is the number of records that match, not the length of the
  answer, and `has_more` follows from it: twelve matching students at ten per page are ten
  and two. Paging that cannot be (a size of 0 or over 100, a negative page) is refused.
- **Sorting.** The server orders by the `sort` of the body, with the record's own number as
  the last word, so that two pages never share a record. Each kind of record has the orders
  it can have: students by relevance, name or e-mail; courses by relevance or name; grades
  by relevance, name or date. The page offered "Created" and "Updated" for all three; no
  record has such a date. They are gone, and an order that does not exist is refused, not
  ignored. "Relevance" means something now: a name that starts with the typed text, then a
  name that contains it, then a record found by another field (the e-mail address, the
  student number). By name is by the name as the list shows it, the first name first.
- **The filter panel.** Three faults kept it empty or wrong. The page read the groups as a
  map, and from the HTTP response instead of its body. The panel kept its own ticks and
  reported only the box that was clicked, so a cleared box kept filtering, a second tick
  replaced the first and "Clear all" cleared nothing. And the server counted all students,
  whatever was typed. Now the groups show (status, study year, enrolment year; for courses
  semester and credits, where the page had shown the students' groups), in the language of
  the page; the counts are of what the search finds; several ticks in a group mean any of
  them and ticks in different groups must all hold; every count is what a search with that
  filter returns. The counts are asked for once per search, when the typing has stopped,
  not once per letter. Changing the kind of record drops the filters.
- **Found on the first look at a running copy, and fixed.**
  - *The two endpoints with the counts answered anyone.* `GET /search/students/facets` and
    `/search/courses/facets` had no dependency on the caller: on a server that requires a
    sign-in, a request without a token was told how many students are active, how many in
    each study year and how many enrolled in each year. 401 now, as for the search itself.
  - *On SQLite a Greek name was not found at all.* SQLite lowers the letters A to Z only;
    the search lowers what is typed and compares it with what is stored, so "Γιάννης" was
    found neither by "γιάννης" nor by "Γιάννης". Every SQLite connection of the application
    now gets a `lower()` for all letters (`backend/sqlite_unicode.py`), whichever part of
    the application or of its tests opens it. That reaches every
    case-insensitive comparison of the application on SQLite (`lower()` and `ilike`, 48
    places in 8 files), not only the search. PostgreSQL never had this fault.
  - *On PostgreSQL a surname stored in capitals was not found when typed in full.*
    PostgreSQL lowers the last letter of "ΠΑΠΑΔΟΠΟΥΛΟΣ" to "σ"; Python lowers the typed
    text to "…ς". The search now compares text in lower case, without the Greek accents and
    with one form of sigma, on both databases: "Παπαδόπουλος", "παπαδοπουλος" and
    "ΠΑΠΑΔΟΠΟΥΛΟΣ" find each other, and in a list by name "Όλγα" stands between "Νίκος"
    and "Πέτρος".
  - *A typed `%` or `_` was a wildcard:* "%" found every student.
  - *A search that failed was "No results found".* The endpoint answers a failure with HTTP
    200 and `success: false`, and the page read that as an empty list; a filter with two
    values made the server fail in just that way. The page now says "The search could not
    be done. Try again." with a button, in its language; it used to show the HTTP client's
    English text ("Network Error").
  - *A grade in the list said neither whose it was nor the mark:* ten students' "Midterm"
    were ten identical lines. It shows the student, the course, the mark out of its maximum
    and the day.
- **Smaller.** The page no longer asks for the saved searches at every opening.
- **The Students page.** When its list cannot be loaded it says "The list of students could
  not be loaded." with a "Try again" button, in both languages; students of an earlier load
  stay on the screen under the message. It said "No students found".
- **Tests.** Backend: `test_search_page_contract.py`, 46 tests of what the page asks of the
  server (paging, order, filters, typed text, the counts, the two SQLite functions); with the
  server's sources as they were, 41 of them fail. One existing test asked for one record per
  page and expected `limit == 20`, which is what the endpoint answered whatever was asked;
  corrected. And the two search tests of `test_rbac_enforcement.py` could not fail: their
  application took the search router's sessions from the database the whole test run shares,
  not from its own, and where that one has no tables (CI, by the time they run) every search
  failed with "no such table" while the tests looked only for 401 and 403. The application
  is wired to its own database, and a teacher's search has to succeed. Frontend: `SearchIntegration.test.tsx` had replaced the search hook with a fake
  and looked for buttons "if they exist"; it is rewritten with the real view, hooks and
  panel over a small server that answers as the real one does. The tests of the panel and
  of its hook had given them a shape the server never sent; rewritten too. With the page's
  sources as they were, 46 of the 110 frontend tests in the changed files fail. E2E: the
  three tests of the Search page that waited run as they were written, with more asked of
  each, and a fourth is new (a student who has left, so that a filter has something to take
  away); the test of the Students page runs after one change (it opened the address the
  page was already on, which loads nothing again: it reloads).
- **Checked in running copies** (scratch servers from the branch, throwaway databases).
  The same requests to a server from `main` and to one from the branch: the counts without
  a token 200 and then 401; four spellings of a Greek name 0 results each and then 1 each;
  the counts for "John" 5 (every student) and then 2. A script of 31 claims through the API
  (paging, order, Greek text, filters and their counts, courses, grades): all 31 hold on
  SQLite and on PostgreSQL 14.25. The pages in a browser, in English and in Greek, at 1280
  and at 390 pixels, with no error on the console but the refused requests of the two
  failure checks. The whole E2E suite against a server set up as CI's: 76 passed
  and 6 skipped, where `main` has 71 and 10.
- **Found and not changed:** todo 61.

**2026-11-17: ten of the twenty E2E tests that never ran now run, and the other ten say why
they do not** (PR 415, merged as `7c1b89a26`; the owner: "continue"; the part of todo 53
that needed no decision of the owner's). One line of the application changes; the rest is
tests. On the merge commit the backend job passed 1,674 tests with 55 skipped on PostgreSQL
14 (1,671 and 55 before it: the three new tests), the frontend job 1,995 (1,994 before: the
new one), and E2E 71 with 10 skipped (61 and 20 before).

- **What was wrong with them.** The six suites and the one test that were switched off were
  written for pages the application does not have. They signed in on "/login" as
  `teacher1@example.com`, opened "/students" and "/search" without the `#` that every address
  of the application has, and looked for a table with column headers, a virtual-scroll
  container, a "Save" button and a "/saved-searches" page. None of them could ever pass.
- **Running now (10).** The sign-in form sent empty says what is missing (the test waited for
  an element the form does not have). A new student is announced and is found by its Student
  ID alone: the two things the existing creation test does not check. A second click on the
  submit button cannot create a second student: the form closes with the first, and one
  request is sent. The Students list shows its first student within five seconds (0.8 on
  the development PC). And six on the Search page: a search by name, the three kinds of
  record, a phone-sized screen, a failed request (the page says so, and recovers), one
  request for a typed word, and the badge that leads to the record.
- **Not running, each with its reason in the file (10).** Three describe controls of the
  Search page that do nothing (sorting, paging, filters) and one an error state the Students
  page does not have: they are marked as known defects and should pass once the pages are
  repaired (todo 60). Six describe things that do not exist at all: on the Search page,
  saving and loading a search (two tests), a "clear" control and keyboard navigation in the
  list; a page of saved searches; a Students table with virtual scrolling. Deleting those
  six is the owner's call (todo 53).
- **The saved-search rule is now tested where it exists.** There is no page for saved
  searches, only the API. That one account cannot read, delete or mark as favourite another
  account's saved search was tested with the owner's own account only; three new backend
  tests use two accounts, and the existing "cannot update" test also checks that nothing
  changed. With the owner rule switched off in the service, all five fail.
- **One fix in the application.** The Search page listed every course as "Unknown" with its
  code underneath: the name is in a field the page did not look at. It shows the name. A
  unit test fails on the page as it was.
- **Removed.** Eight helper functions in `tests/helpers.ts` that only the switched-off root
  test used and that could not work (the sign-in wrote a key the application deletes at
  start; the rest looked for a table).
- **Checked.** The whole E2E suite against a scratch server set up as CI's E2E job (SQLite,
  the seed, the same switches): 71 passed and 10 skipped, where `main` has 61 and 20. The
  three tests marked as known defects were run once as ordinary tests and failed where
  their comments say. CI's E2E job on the PR gave the same 71 and 10, with no test retried;
  the Students list showed its first student after 0.9 seconds there.

**2026-11-17: the two notification guides say what the application does, and a refusal that
was a server error** (PR 414, merged as `25d505322`; the owner: "continue"; an open entry of
todo 58 that needed no decision of the owner's). No database changes. On the PR's commit the
backend job passed 1,671 tests with 55 skipped on PostgreSQL 14 (1,669 and 55 on `main`
before it: the two new tests) and the frontend job 1,994 as before; after the merge E2E on
`main` was 61 with 20 skipped, as before.

- **The guides.** `docs/admin/NOTIFICATIONS_ADMIN_GUIDE.md` and
  `docs/user/NOTIFICATIONS_USER_GUIDE.md` were written in January 2026 for a design: an
  administration panel with dashboards, reports and alert thresholds, e-mail and SMS
  delivery, personal settings with quiet hours and digests, fifteen kinds of notification.
  None of it exists. Both are rewritten from the code (513 and 321 lines became 128 and 93):
  the four things that create a notification (a registration that waits for approval, an
  activation e-mail that could not be sent, a failed automatic backup, a message an
  administrator sends), when the bell reads its number, the list under the bell and the full
  list, how to send a message (Utils > Notifications), how notifications are kept, and a
  list of what the application does not have, so that nobody looks for it. One sentence in
  `USER_GUIDE_COMPLETE.md` promised e-mails for low attendance; it now says there are none.
- **Checked in a running copy, not only read.** A scratch server from the branch (a
  throwaway SQLite file, the normal sign-in rules, no mail), the two seeded administrators
  and a teacher who registered and was approved during the check. 49 checks through the API
  and in a browser, among them: a registration notifies every administrator and its owner
  cannot sign in until approved; an approval without mail notifies the approving
  administrator only; the number on the bell does not change while the page stays open and
  does on return to the tab; ten entries under the bell, twenty at a time in the full list;
  the eye, the bin and "Mark all as read" change the bell at once; the registration notice
  opens User Management; the form's seven types, three targets and four roles; a deleted
  notification stays in the database, marked. All 49 hold.
- **Found by that check and fixed: a refusal answered as a server error.** An attempt to
  mark as read, update or delete another account's notification was refused, but with a 500
  and a traceback in the log: nothing handled the service's `PermissionError`. It is a 403
  now. The three tests named "wrong user" could not fail: they gave the notification to the
  account that made the request and accepted 200. They use two accounts now, and on the
  router as it was three of them fail. A fourth checks that one account's list and count
  never include another's.
- **Found and not changed:** todo 59 (a teacher can send a message to every account through
  the API; four smaller things).

**2026-11-17: the tag waits for a build-only Docker run of its commit** (PR 413, merged as
`dc7cd2796`; the owner: "continue" for todo 48, which it closes). Nothing in the application
changes: a release script, a title in one workflow, tests and three documents. On the merge
commit the backend job passed 1,669 tests with 55 skipped on PostgreSQL 14 (1,633 and 55 on
`main` before it: the 36 new tests), the frontend job 1,994 as before, and E2E 61 with 20
skipped as before.

- **Why.** CI builds `Dockerfile.fullstack` on every push, for amd64 only. The cloud VM is
  arm64 and builds its image itself, after the tag. An image that does not build there would
  have shown on the VM with the release already published.
- **`infra/scripts/release/DOCKER_BUILD_CHECK.ps1` (new).** It dispatches
  `docker-publish.yml` with `dry_run` for the commit that is checked out (amd64 and arm64;
  nothing is pushed to a registry) and exits 0 only when that run succeeded. It refuses a
  commit that is not pushed, because a dispatch builds the branch as it is on GitHub. A
  build-only run of the same commit that already succeeded is the answer and nothing is
  dispatched; one that is under way is waited for; after one that failed another is started.
  `-NoWait` starts the run and returns. The workflow now titles its runs
  ("Docker build check v1.18.73 (linux/amd64,linux/arm64)", or "Docker publish ..."), and the
  script finds its run by that title and by the commit.
- **`RELEASE_READY.ps1`.** Without `-TagRelease` it starts the run once the release commit
  is pushed. With `-TagRelease` the tag is made only after the run passed: it is the last of
  the tag guards, which moved into one function as they were. `-SkipDockerCheck` is the
  override. `CLAUDE.md`, the release-manager agent and `RELEASE_SCRIPTS_OVERVIEW.md` name
  the step.
- **For a tag made by hand** (every release so far: `RELEASE_READY` without `-TagRelease`,
  the GitHub body rewritten in a further commit, then the tag): run
  `DOCKER_BUILD_CHECK.ps1 -Version X.X.X` on the commit that gets the tag. The run that
  `RELEASE_READY` started was of the release commit; a commit added after it needs a run of
  its own (about six minutes, at the same time as CI).
- **Checked with tests:** 36 in `test_release_docker_build_check.py`. The real script runs
  on scratch repositories with a scratch origin and a stand-in for `gh` whose run titles are
  read from the workflow file, so a title changed in the workflow alone fails them; the tag
  function and the function that calls the check are taken from `RELEASE_READY.ps1` itself
  (check failed: no tag, locally or on the origin). Eight deliberate breakages of the three
  files were each caught by at least one test.
- **Checked for real, on the PR's branch** (commit `ef79dd87b`): the script dispatched run
  44057856806, GitHub gave it the expected title, and it passed for both platforms in six
  minutes; the two publish-only steps were skipped and the account still has no container
  package. A second call found that run in 2 seconds and dispatched nothing. With `-NoWait`
  (amd64 only, run 44058916467) it returned in 10 seconds, and a waiting call then picked up
  that same run and passed after a minute. That showed one mistake, fixed in the PR: after
  `-NoWait` with one platform, the command it named for reading the result left the
  platform out. On the PR's last commit (`37a6d0f4f`, the same tree as the merge commit)
  the script was run once more: run 44061282670, both platforms, passed after six and a
  half minutes.
- **Not checked:** `RELEASE_READY.ps1` was not run end to end; its first real use is the
  next release. No image that fails to build was produced: that path is covered by the
  tests only.

**2026-11-17: two small server fixes, and a third found while checking them** (PR 412,
merged as `263cdca44`; the owner, a second time: "continue"; two more open entries that
needed no decision of the owner's). No database changes. Checked on two scratch servers
started side by side on throwaway SQLite files, one from `main` and one from the branch.
On the PR's commit the backend job passed 1,633 tests with 55 skipped on PostgreSQL 14
(1,609 and 55 on `main` before it: the 24 new tests), the frontend job 1,994 as before, and
E2E 61 with 20 skipped as before. Not on the cloud VM (it runs `38d1111b3`) and not in the
home installs until their next update.

- **`migrations.log` is written to `logs/`.** Both migration runners (the server's,
  `scripts/migrate/runner.py`, and `run_migrations.py` of the Docker entrypoint and the
  command-line tools) took "the first folder, going up, with a `backend` folder in it" for
  the project's root. In a checkout that is `src`, since the code moved under `src` in June
  2026, so the file went to `src/logs/`. The root is now the first folder with the `VERSION`
  file: the checkout's root, and `/app` in the Docker image, where nothing changes. One
  function, used by both runners. *Side by side:* the server from `main` wrote
  `src\logs\migrations.log`, the one from the branch `logs\migrations.log`. The packaged SMS
  Lite keeps writing it to the user's profile. One existing test had the same mistake in it
  and so passed on the bug (`test_run_migrations_repo_root.py` took `src` for the
  repository root and looked for the file there); the first gate of this change failed on
  it. It also deleted that folder's `migrations.log` before each run. It now checks the
  right folder and lets the run write into a temporary one.
- **The N+1 detector counts per request.** `detect_n_plus_one` compared the statements per
  table since the start of the server with five, and every call of the summary or of the
  patterns endpoint wrote one warning per table. The profiler now keeps, for the newest 200
  requests, how often each of them read each table (the middleware's request id reaches the
  engine's hook, on the worker threads too), and reports a table that one request read more
  than five times, with the highest count and that request's id; the log has the request's
  path under the same id. Only `SELECT`s inside a request count, and nothing is written to
  the log.
  *Side by side, the same 30 requests (what the Dashboard and the Attendance page ask for,
  three times; 221 statements on 12 tables):* the server from `main` reported 10 of the 12
  tables and wrote 50 warnings in five calls; the one from the branch reported none and
  wrote none.
  *Then every `GET` endpoint of the API once on the branch* (102 endpoints, 617 statements,
  15 students in one course): one entry, `grades` read 15 times by
  `GET /analytics/course/1/students-comparison`, which is a real one (below). The first run
  also listed a table called `(SELECT`: six aggregate queries over sub-queries in the
  dashboard's request. Those are no longer counted as reads of one table.
- **psutil is asked for names it knows (the third).** That sweep left one ERROR in the log:
  `GET /admin/debug-processes` failed with "invalid attr name 'connections'". psutil 6 renamed
  the attribute to `net_connections` and psutil 7 (the pinned version since at least June
  2026) refuses the old name. The endpoint caught it and answered "Process diagnostics unavailable". The
  same name was in SMS Lite's last resort at startup, when port 8000 is held by something
  that does not answer its shutdown request: the loop raised before its first step, the
  error was swallowed without a word, nothing was stopped, and Lite went on to start on a
  busy port. Both use the new name, and Lite now writes to its debug log if that step
  fails. **Not run in the packaged SMS Lite**: the function it calls was run against a real
  process (below).
- **Tests.** 24 new ones. 12 on the detector: a busy table, statements outside a request,
  writes and sub-queries are not reported, the worst request is, only the newest requests
  are kept, and three through a real application with the middleware, an engine and both an
  `async` and a worker-thread endpoint. 7 on the log folder (a checkout, the image's layout,
  a copy unpacked inside another repository, and both runners writing where the function
  says). 5 on psutil: a scan of every attribute name the backend gives to psutil against
  the installed version, the endpoint, and Lite's function stopping a process the test
  starts on a free port (found by the port, and never the test itself). On the code from
  `main`: the five psutil tests fail, as do the detector's tests of a busy table, of
  statements outside a request and of writes; the rest ask for functions that are new.

**2026-11-17: four small fixes in the pages** (PR 411, merged as `08a2503d3`; the owner:
"continue"; these are the open entries of todo 58 and of the 2026-11-12 smoke test that
needed no decision of the owner's). No server code and no database changes. Each was checked
in a browser on a scratch server (a throwaway SQLite file; five students, one course, an
administrator with three unread notices, a teacher), with no console error and no failed
request. On the PR's commit the frontend job passed 1,994 tests in 138 files (1,972 in 136
on `main` before it: the 22 new tests), the backend job 1,609 with 55 skipped as before, and
E2E 61 with 20 skipped as before. Not on the cloud VM (it runs `38d1111b3`) and not in the
home installs until their next update.

- **A notification marked as read is read everywhere at once.** The bell, the dropdown and
  every item in it call `useNotifications`, and each got a copy of the state of its own. An
  item marked as read stayed unread in the list, a deleted one stayed in it, and the bell
  kept its count until the page next became visible. The "View all" window kept a fourth
  copy, and on a second opening showed the list it had fetched up to five minutes before.
  The component tests could not see it: each of them replaces the hook by a mock.
  Now the list and the count live in one place (`hooks/useNotifications.ts`) and every user
  of the hook reads it; the window's three actions go through it, and the window asks for
  its list at every opening; signing out, or a session that expires, empties it, so the
  next account on the same page is not shown the previous one's list.
  *In the browser:* the bell showed 3; marking one item made it 2 with one request (the
  `POST`), deleting an unread one made it 1 and took it out of the list (the `DELETE`
  alone), "Mark all as read" in the window removed the badge, the dropdown opened right
  after showed both remaining items as read without asking the server, and the window's
  second opening asked again. After the administrator signed out, a teacher who signed in
  on the same page saw the loading state and then an empty list.
- **A text that reads the same as its key is shown as the text.** `t()` of
  `LanguageContext.tsx` took an answer equal to the key for "missing", so `utils.created`
  (English "created") came back as `utils.created`. It now asks i18next whether the key
  exists. A scan in the test found 27 such English texts in 11 namespaces (`common.of`,
  `common.hours`, `calendar.class`, `courses.period`, the four in `utils`, ...) and one
  Greek one; no source file asks for any of them with its namespace in front today (the
  backup list, which did, got a key of its own in PR 407), so no screen changes: the trap
  is closed for the next caller.
- **The Absence limits table fits a phone.** At 412 px, in Greek, the table was 501 px wide
  in a 340 px panel: the last two columns were out of sight, the status of every student
  among them (161 px hidden; 213 px at 360 px; 96 px and 148 px in English). Below 640 px
  each student is now a block: the name with the status beside it, then one line per column
  with the column's name in front. Measured after the change at 412 px and 360 px, in both
  languages: nothing hidden, every status in view; at 768 px and 1366 px it is the table
  it was.
- **`hideLegacyDatabaseTools` is `showLegacyDatabaseTools`.** `DevToolsPanel` read the prop
  as "visible" and the Control Panel passed it to have the tools shown. The name only.
- **Tests.** 22 new ones. The bell, the dropdown, its items and the window are rendered
  together for the first time, with only the HTTP client replaced by a small server that
  remembers what it was told (7 tests); 7 on the shared state itself; 5 on `t()` against the
  application's own translations (the test setup's i18n instance has seven namespaces, and
  `utils` is not one of them); 2 on sign-out and session expiry; 1 on what the phone layout
  is made of (jsdom has no layout: the widths are the browser's). Run against the old code,
  19 of them fail; the other three are the guard rails (a key that does not exist still
  comes back whole, an ordinary key is still translated, the bell shows the server's
  count).

**2026-11-16, late: the commit gate runs the changed tests alone only when nothing but test
files changed** (#410, merged as `625df78a8`; the owner, to the last finding of #409:
"fix it"). No application code changes. On the PR's last commit the backend job passed
1,609 tests with 55 skipped (the 14 new ones ran on the Linux runner too), CI's own quick
run of the gate passed, and E2E was green.

- **What it did.** In quick mode `COMMIT_READY` ran "the changed tests only" whenever any
  changed file looked like a test file, whatever else the commit changed. On the backend the
  pattern asked for `test_` twice in the path and matched none of the 166 test files, so every
  quick gate ran the whole suite, until #409 named a file `test_test_run_…`: that gate ran the
  one file, in 89 seconds, for a commit that changed `conftest.py` and three source files. On
  the frontend the pattern worked, so the rule was live there: a component changed together
  with any test file was checked by that test file alone.
- **The rule now** (`Get-QuickTestScope`, one decision for both sides): the changed test
  files alone when every changed file is a test file; otherwise the whole suite, and the log
  says which and why. Also the whole suite: a test file that was removed or renamed (a rename
  now counts as a removed file and a new one), a backend test file that another file of the
  tests names (three import helpers from a test module), and more than ten changed backend
  test files (they go to the batch runner). Unchanged: a change of frontend test files alone
  still runs the whole backend suite.
- **Checked.** 14 tests drive the function, taken from the script itself, on scratch folders
  and scratch repositories; with each part of the rule switched off in turn (the "not a test
  file" rule, the rename, the old pattern, the named-by check) the tests for it fail. Live,
  in a throwaway copy: with one backend and one frontend test file changed and nothing else,
  the gate ran those two files and named them (87 seconds); with a failing test added to
  each, it failed on both. The gate for this change itself ran the whole suite and said why
  (the script is not a test file).

**2026-11-16, night: five small server fixes from todo 58, and a sixth found while checking
them** (#409, merged as `7e8520f9f`; asked what comes next, the owner chose "Small server
fixes"). No database changes. On the PR's last commit the backend job passed 1,595 tests with
55 skipped on PostgreSQL 14.25 (1,561 and 55 on `main` before it: the 34 new tests, the same
skips), the round trip passed 13 of 13 on 16.16 as well, and E2E was green.

**On the cloud VM since 2026-11-16, 22:18 UTC** (the owner: "do Cloud server update"): the VM
was moved from the v1.18.72 tag to `main` at `38d1111b3` (no release, so it still reports
v1.18.72; no database changes) and rebuilt in 8 seconds from the layer cache. Before and
after, on the VM: `/api/v1/diagnostics/health/queries` without a login answered 500, now 401;
the log of the 3.5 hours before held 466 warnings, 465 of them "Slow query" lines, and in
the first three minutes after the restart there was one warning (the CSRF notice at startup)
and no slow-query line; the limit inside the container is 500 ms. The backup of the afternoon
and its key were still on the volume (same checksum), the hourly backup check ran (not due),
the first signal to the monitoring service went out at 22:20:36 UTC with no delivery
warning, and the address is not in the log. The home installs stay on v1.18.72 until the
next release.

- **One "slow query" line per slow statement, at one limit.** Two monitors watched the same
  engine: `performance_monitor.py` (limit `SQLALCHEMY_SLOW_QUERY_THRESHOLD_MS`, 300 ms) and
  `db/query_profiler.py` (a fixed 100 ms). Read from the cloud VM's log on v1.18.72: 133
  warnings in 50 minutes, 132 of them the profiler's, all between 118 and 197 ms, 102 of them
  the health check's catalogue query; the other monitor wrote none. The profiler now takes
  the same setting and only counts (its own line is at DEBUG), and `docker-compose.cloud.yml`
  sets 500 ms for that host. Seen on a scratch server from source: with the limit at 0, 324
  statements gave 324 `Slow query detected` lines and none from the profiler; at the stock
  limit, none of either.
- **The query profiler keeps its newest 2,000 records.** It appended one record per statement
  for the life of the process. The totals still count every statement, and the diagnostics
  health rate is computed from them (computed from the kept records it would have passed
  100 %).
- **The diagnostics endpoints answer (the sixth).** All five under `/api/v1/diagnostics`
  answered 500 "Request not available" on every server with authentication on, that is on
  every real server: their handlers had no `request` argument, which `require_permission`
  looks up by that name. Their tests ran with authentication off, where the check is skipped.
  Seen on the scratch server before the fix (five times 500) and after it (200 for an
  administrator). Tests now cover an administrator (200), a teacher (403) and no login (401)
  for each, and a scan fails if any of the 216 guarded endpoints lacks the argument (these
  five were the only ones).
- **`schedule_cleanup_task("hourly")` runs on the hour.** `"*/1"` in the minute field was every
  minute. Only `"daily"` is asked for today; a test now checks each frequency against its
  name.
- **A test run has a backups folder of its own.** `conftest.py` points `BACKUPS_DIR` at a
  temporary folder before anything of the backend is imported (three modules read it once at
  import) and removes it at the end. The tests that go through the backup endpoints wrote
  next to the developer's real backups and listed them. After a full run of the suite in a
  clone, its `backups` folder held nothing but the tracked `.gitkeep`.
- **CI tests the database version in use.** The `test-backend` job runs the suite with a
  PostgreSQL 14 service (Debian-based, like the server on the NAS) and repeats the
  backup/restore round-trip file against 16-alpine, which the Docker edition's own stack
  ships. Run here first on scratch containers: 9 passed on 14.25 and on 16.15 (4 more need
  `psql`, which this PC lacks and the CI runner has).
- **Not a code change: the cloud VM's backup key and its newest backup are on the dev PC as
  well** (the owner: "Yes, copy both"). Fetched over SSH into the owner's confidential folder
  outside the repository; the checksums equal the VM's, and the key opens the backup (30
  tables, 2,265 rows; decrypted in memory, nothing readable written). The temporary copy on
  the VM was removed.

### In v1.18.72

**2026-11-16, evening: somebody is told when the backup fails or the server stops** (todo 54;
the owner answered "continue" to "that is the next item I would take", then chose "Free
monitoring service" and, of the ten workflow files that never ran, "The five that cannot
run").

- **#408: a notice in the bell when the automatic backup fails.** Every active administrator
  gets it, at most once a day while the backup keeps failing (the server tries again every
  hour). It is shown in the user's language, names the reason and opens the Maintenance tab.
  A failed backup used to leave an ERROR line in the log and one line on a page.
- **A heartbeat for a monitoring service outside** (`services/monitor_heartbeat.py`,
  `MONITOR_PING_URL`; off unless set). While the server runs, its database answers and its
  backup is in order (made, and not more than 27 hours old), it calls the service's address
  once an hour. When one of them does not hold, the call is withheld, or the service's
  failure address is called (`MONITOR_FAIL_URL`) with a short fixed phrase; an error text
  never leaves the server, and the address is not written to the log. A dead man's switch is
  the one way to hear that the VM itself is down without a key to the tailnet being stored
  somewhere. The runbook says how to set it up ("Watching the server").
- **Mail settings saved in the application survive an update.** They were kept next to the
  code: in a Docker container that is the container's own layer, as it was for the backup
  key. On the cloud VM no mail is configured at all (seen: no `SMTP_*` variable, no saved
  file), so nothing can be mailed from there; had the settings been entered in the
  application, the next rebuild would have removed them. Now `/data/smtp_override.json` in
  Docker and the user's profile in SMS Lite. Nothing is copied into a path that is set
  explicitly: a throwaway backend pointed at its own folder must not inherit the developer's
  relay.
- **Found on the way: on a freshly installed SMS Lite the Import/Export part of the API did
  not load.** The export service created `backend/exports` next to the code when it was
  imported. In an installed copy that is the program folder, which a normal user cannot
  write to: the import raised, the router was skipped ("Some routers failed to load", a
  WARNING), and every endpoint in it answered 404, the mail settings among them. Once the
  folder exists the router loads and only the exports themselves fail: that is the case after
  a first start with the installer's rights (its "launch" at the end runs that way; read from
  the installer script, not tried) and in the release check, which runs the build once with
  a writable folder. Seen with a fresh
  build and a read-only program folder: 404 and 405 before, the settings saved and an export
  downloaded after. Exports now go to the first folder that can really be written to (next
  to the code, else `data/exports`), and loading the module cannot fail on it. On the
  released v1.18.71 an installed Lite cannot save mail settings either ("Access is denied").
- **Found on the way: an image built from a used working tree carried its local files.** The
  Dockerfile copies `src/backend` whole, and `.dockerignore` named neither the data folder
  nor databases, export files or keys (and its `__pycache__/` and `*.pyc` lines only ever
  applied at the root). In the main tree on the dev PC that is 177 generated export files, a
  backup key and the saved mail settings. The cloud VM builds from a clean checkout and no
  image was ever published, so nothing left this PC. The ignore file now names them (seen:
  planted files stay out of the image, and the image passes the same checks).
- **The five workflow files that could not run are deleted** (the owner's choice):
  `scheduled-production-health-check.yml` (it needs a self-hosted runner; none was ever
  registered) and the four under `.github/workflows/archive/` (GitHub runs the top level
  only). With them the `health-check` task of `orchestrated-maintenance.yml`, which only
  dispatched the first; the two validation scripts that expected the archived files now
  expect them gone. The five manual-only workflows that were never used stay.
- **With it:** the Backups list answered 500 when the backups folder could not be used, which
  is exactly when the notice sends the administrator there.
- **Seen, on scratch data only.** A server from source with a stand-in for the monitoring
  service: the backup after one minute, the signal after two and a half, the address absent
  from the log; with the backups made to fail, the notice in the administrator's bell in
  English and in Greek (a click opens Maintenance) and the failure address called with "the
  last automatic backup failed" and nothing else. Docker image on PostgreSQL 14: the signal
  leaves the container, the mail settings are on the data volume and still applied after the
  container is replaced. Packaged SMS Lite, fresh build, program folder read-only: no router
  skipped, mail settings saved into the profile (password encrypted) and there after a
  restart, an export made and downloaded.
- **Not done** (as of the merge): no monitoring service existed yet and the VM had neither
  this code nor an address. With v1.18.72 it has both: see the top of this document.

Released as v1.18.72 on 2026-11-16.

### In v1.18.71

**2026-11-15, after the tag** (the owner chose all four next steps offered: the release, the
removal of Socket.IO, the first stage of todo 52 and the tidying of this document).

- **#391 (`72f079ae8`): the idle Socket.IO channel is removed** (todo 56; the owner's decision).
  Nothing ever emitted on it, yet every page held connections to it: the notification hook
  opened one per component that used it (the bell, the open dropdown, every item in the list).
  Gone: `websocket_server.py`, `websocket_config.py`, `websocket_background_tasks.py`,
  `routers_websocket.py` (a router no code ever registered), the `/socket.io` mount, its two
  loops in the lifespan, `python-socketio`, `python-engineio`, the nginx location,
  `socket.io-client` with its two overrides and the Vite proxy entry. `useNotifications` reads
  over REST only. The bell keeps the unread count current at the moments the socket used to
  reconnect (appearing, back online, the page visible again); the dropdown and the items no
  longer fetch a count each. The bell's "offline" dot reported on that connection and is gone.
  The 15 skipped E2E tests that waited for Socket.IO events are deleted, with the unit tests of
  the removed modules; E2E in CI: 61 passed, 20 skipped. The native `/api/v1/notifications/ws`
  endpoint is untouched. Seen on a real server run from a virtualenv without the two packages
  (32/32 API checks, browser 17/17: no `/socket.io` request, no WebSocket, the count read once
  on appearing and once after a reload) and on a packaged SMS Lite built the same way (none of
  the Socket.IO modules in its module list, where the build before held 50).
  With it: `credits.spec.ts` read the logo's width once, right after the `<img>` became
  visible, and was flaky in CI that day (0, then fine on retry); it polls now.
- **#392 (`ea1edba4b`): a test run starts no scheduler and loads no saved mail settings.** The
  lifespan started the background schedulers and loaded `data/smtp_override.json` at every
  start, test runs included. The schedulers open sessions of their own on the *configured*
  database (they import `SessionLocal` by name, so the test suite's patch never reached them).
  On the dev PC, where `backend/.env` points at the shared database, every test that started
  the app read that database's scheduled reports and queued its report, cleanup,
  course-activation and purge jobs in the test process, and the operator's mail relay was
  written into the test's settings. Seen as an error line in a clone's test output (`Failed to
  schedule reports: no such table: reports`); CI and the clones have no `.env`. Both now
  belong to the startup tasks: a real server does them, a test run and a start with
  `DISABLE_STARTUP_TASKS` do not, which is what `ENV_VARS.md` always said the switch is for.
  Three tests; two of them fail against the old lifespan. Every release until now ran its
  gates in the main tree this way; nothing written by it was found.
- **#393 (`5e1b43adc`): the permission layer no longer holds the event loop (todo 52, first stage).** The
  decorators in `rbac.py` wrap an endpoint in a coroutine and did everything inline: the user
  lookup, the permission checks and, for the 63 plain `def` endpoints behind them, the endpoint
  itself. Each of those now runs in a worker thread (`run_in_threadpool`); the 160 `async def`
  endpoints are awaited as before, so their own database calls still hold the loop (stage 2).
  The answers are unchanged. Measured with a database made 65 ms slow per statement, the cloud
  host's round trip, the same code otherwise:

  | | before | after |
  |---|---|---|
  | 20 requests at once to a `def` endpoint | 10.8 s, each one about that long | 0.65 s |
  | `/health/live` meanwhile (worst) | 10.7 s | 0.05 s |
  | 20 requests at once to an `async def` endpoint | 8.1 s | 1.8 s |
  | a page's 8 GETs at once | 2.9 s | 0.8 s |

  Because endpoints now really overlap, the two in-memory caches (`cache.TimedLRUCache`,
  `cache_service.InMemoryCache`) got locks; without them four stress tests fail every time.
  Soaked with 20 workers of mixed reads and writes: SQLite 40 s (1,870 requests) and
  PostgreSQL 14 with the delay 45 s (259 requests), no request failed, no error line, no slot
  with two rows; two real races were caught by the unique index of #386 and retried as
  updates. What a server now does that it did not before: it uses several database
  connections at once (21 during the soak; the pool allows 30 per process). The QNAP's own
  `max_connections` was not looked up; with the cloud host and a PC install both busy it is
  the number to know.
- **#395 (`d45e69c1d`): the gate no longer makes a heading of a PR number, and names every
  Markdown file its auto-fix rewrote** (todo 58, last entry; found while tidying this
  document, #394, `96b347d8b`). The gate runs `markdownlint --fix` over every Markdown file.
  Rule MD018 took a wrapped line that begins with `#378, …` for a heading written without
  its space and made it one; the rule is off in `config/.markdownlint.json`. The gate's list
  of rewritten files compared line counts with `HEAD`, which a rewrite of a line that is
  already part of the commit does not change; an entry now carries the hash of the file's
  contents, a rename counts as two files, and a Greek file name is read as it is (it came
  back quoted or garbled, and its file was never looked at). Nine tests, six of which fail
  against the old script and configuration; seven deliberate breakages of the change are
  each caught. Seen with the real `markdownlint` in a scratch repository: old script and
  rule, the line becomes a heading and nothing is listed; new script and old rule, the file
  is listed; new script and rule, the line stays as written. Tooling only: nothing in the
  application changes.

**2026-11-16: the week's Dependabot batch, and a dependency nothing used** (the owner: "a lot of
bumps and changes, catch up").

- **Merged.** #399, #401 and #402 merged by themselves (Babel 7 patches; the first auto-merges
  seen through the merge App). By hand: #396 (`5144e0286`: fastapi 0.162.5, psycopg 3.3.9, ruff
  0.17.5, pytest-asyncio 1.5.0, virtualenv 21.15.6), #397 (`3183df59b`: `pypdf>=7.0.1`, used by
  tests and by the packaged-edition check only; the dev PC already ran 7.1.0) and #403
  (`a0695a69a`: 88 minor and patch updates of the frontend, among them vite 8.3.8, Capacitor
  8.6.2, TanStack Query 5.107.1, framer-motion 14.13.0 and zustand 5.1.0). CI/CD and E2E passed
  on `main` after the last one. #403 replaced #398: asked to rebase, Dependabot closed it and
  opened a new PR, because the contents of the group had changed.
- **Closed, not merged: #400, `@babel/core` 7 to 8.** Nothing in the project uses the top-level
  `@babel/core`: there is no Babel configuration, and its only users, `workbox-build` (through
  `vite-plugin-pwa`) and `eslint-plugin-react-hooks`, ask for `^7.24.4`. The bump would have
  put an unused Babel 8 at the top and a second copy of Babel 7 under both (915 packages
  became 950); its CI was green because they kept running on Babel 7. Dependabot was told to
  ignore the 8.x major by a comment on #400; it keeps that state itself, `dependabot.yml` does
  not show it.
- **#404: a test that could not pass on the dev PC reads its child's output as UTF-8.** The
  gate of the next entry stopped at batch 20 of 33 on a change that touches no Python (852
  passed, 1 failed). `test_migrations_keep_logging.py` (#387) starts a Python child that runs
  the migrations and reads its stderr; two migrations have "ΜΙΕΕΚ" in their description and
  Alembic logs it. The child wrote in what `PYTHONIOENCODING` says, the test read in the ANSI
  code page. The dev PC has the variable at `utf-8` (user level, last written 2026-11-11) and
  code page 1253, where the second byte of a UTF-8 "Μ" is no character: the thread reading
  the pipe died and `result.stderr` was `None`. The test pins UTF-8 on both sides now; it
  passes with the variable at `utf-8`, removed and at `cp1253`, and the gate ran 33 of 33
  batches (1506 passed), so no other test has the weakness. **Not explained:** the four runs
  in the main tree on the evening of 2026-11-15 passed this test; VS Code was restarted on
  2026-11-16 at 08:47, and that session may be the first to inherit the variable. CI never
  saw it (no `PYTHONIOENCODING` on its runners). Test code only.
- **#405: the direct `@babel/core` devDependency is removed, with the guard that added it** (the
  owner's OK). Before starting Vite, `NATIVE.ps1` looked for `node_modules\@babel\core` and,
  when it was missing, ran `npm install --save-dev @babel/core`; that is the only reason the
  package was listed in `package.json`. `@vitejs/plugin-react` 6 does not depend on Babel. The
  package stays installed in the same version (7.29.13) for its two users, and the lockfile
  loses one line. Without a direct entry Dependabot can only move it within the range those
  two allow.
- **#406: the direct `@babel/runtime` devDependency is removed** (the same case; the owner
  answered "next" when it was reported as waiting for a go-ahead). It was added at 8.x on
  2026-10-01 in `b319e67d5` with no reason given; nothing imports it and no override names it.
  Its five users (`react-i18next`, `i18next-browser-languagedetector`, `@testing-library/dom`,
  `@testing-library/react`, `workbox-build`) all ask for `^7`, and each carries its own
  7.29.10. Those five copies stay where they are: the lockfile only loses the unused top-level
  8.1.2. This entry first said that one shared 7.x would be left; npm does that only when the
  whole tree is deduplicated, which was not done. Checked on a real `npm ci` from the new
  lockfile in a clone: the production build is the same 80 files as the build before, byte for
  byte (two builds of one tree are identical, so the comparison means something), and `tsc`
  and the gate pass on that tree.

**2026-11-16, afternoon: the application backs itself up, and its backups can be restored**
(todo 55; the owner: "proceed according to plan").

- **#407: an automatic backup on every server.** A minute after its start and then once an
  hour a server checks how old its newest automatic backup is, and makes an encrypted one
  (`auto_backup_<date>_<time>.enc`) when there is none or it is older than 24 hours; the
  newest 30 are kept, and backups made by hand are never deleted by it. By age and not at a
  fixed hour, so that SMS Lite and a PC that is off at night get theirs. Not in a test run.
  The code that makes a backup moved out of the control endpoint into
  `services/database_backup.py`, which the endpoint and the scheduler share. Settings:
  `AUTO_BACKUP_ENABLED`, `AUTO_BACKUP_INTERVAL_HOURS`, `AUTO_BACKUP_KEEP`. Manage Backups shows
  what the server does and when it last did, marks the automatic ones, and gives the reason
  when the last attempt failed. The help text (EN/EL) and the PDF guide say what happens now.
  Described in `docs/admin/BACKUP_AND_RESTORE.md`.
- **The restore test (the "one restore test" of todo 55) found that a backup of a PostgreSQL
  database could not be restored through the application.** Three separate reasons, each seen
  on PostgreSQL 14 with the Docker image before it was fixed:
  - *Where `pg_dump` is installed (the Docker editions, so the cloud host) the backup was a
    plain `pg_dump` script.* Restoring it into the database it came from ran `psql` without
    `ON_ERROR_STOP`: every `CREATE TABLE` and `COPY` failed, nothing was restored, the
    `setval()` lines at the end moved every id counter back, and the answer was "success ...
    0 rows across 0 tables". The next login then could not store its refresh token (duplicate
    key). The application now writes its own data-only format on every edition, the one it
    restores itself in one transaction; `psql` gets `ON_ERROR_STOP` and one transaction, and a
    script it cannot apply is refused with psql's own first error.
  - *From the page, an encrypted PostgreSQL backup could not be restored at all.* The page
    decrypted it into the browser and uploaded it again as `decrypted_backup.db`; the upload
    takes SQLite files only. The page now sends one request and the server does the rest;
    plain `.sql` backups get a Restore button too.
  - *The data-only backup was not one snapshot.* Each table was copied as it was at that
    moment and the id counters were read first, so a save during the backup could leave a row
    without the row it points at (such a backup cannot be restored) or a counter below a
    saved id. It runs in one read-only snapshot now and reads the counters last.
- **The key that encrypts backups survives an update.** It was kept next to the code. In
  Docker that is the container's own layer: on the unchanged image, a backup made before the
  container was replaced answered "Failed to decrypt backup: " (nothing after the colon)
  afterwards; on the cloud host the backups were inside the container as well. In the
  installed SMS Lite it is the program folder, which a normal user cannot write to: the
  released v1.18.70 build, run with that folder read-only, answers 500 to an encrypted backup
  and logs no reason. The key is now on the data volume in Docker (`/data/.keys`) and in the
  user's profile in SMS Lite; a key found in the old place is copied over; the cloud compose
  file puts the backups on the data volume; a file encrypted with another key says so.
- **Two things on the same card.** "Backup Database" was disabled, with a note that backups
  exist only for SQLite and PostgreSQL, on every edition as soon as a health check had run
  (one runs after each restore): the panel read the engine from a field that only says
  "connected". And the list showed `utils.created:` in English (todo 58). Times in the list
  carry their UTC offset now: a backup made on a server running on UTC showed two hours early.
- **With it: a test batch could turn red in a tree without `.env`.** The gate for this change
  stopped at batch 11 of 33 with 57 errors, none of them in a file the change touches. In a
  fresh clone the settings get a generated `SECRET_KEY` when they are first loaded under
  pytest, but not inside a running test, where the placeholder is refused on purpose. A batch
  whose five files all load the settings late (through the `client` fixture) therefore
  failed whole, and which files share a batch is alphabetical: one new test file moved the
  boundaries. `conftest.py` loads the settings while the tests are collected. CI (its own
  rule) and the main tree (it has a `.env`) never met it.
- **Seen, on scratch data only** (an isolated copy under `D:\tmp`; nothing touched the shared
  database). Docker image on PostgreSQL 14: the automatic backup 60 s after the start, on the
  volume; data changed and restored through the API and through the page in a browser (one
  request, the three students back, a new row accepted afterwards); a plain `pg_dump` script
  refused with rows and counters unchanged; the container replaced and the earlier backup
  restored again; the database replaced by an empty one, the tables built by the application
  and the backup restored into it. From source on SQLite, and the packaged SMS Lite with a
  read-only program folder: automatic backup, restore, backup by hand. The backup and restore
  round-trip tests ran against PostgreSQL 14 (CI runs them against 16).
- **Found in the release smoke test: an "encrypted" backup of a SQLite database left its
  readable copy beside it on Windows**, in every build up to v1.18.70. The copy was still open
  when it was to be deleted, and the failure was only logged. #407 closes it first (seen: the
  v1.18.70 build leaves `backup_….db` next to `backup_….enc`, the new build leaves the `.enc`
  alone). Copies left by earlier versions stay until somebody deletes them; the release notes
  say so. The dev PC's backups folder has none (its backups are PostgreSQL ones).
- **Not done, not checked** (as of the merge; the release that followed made the first backup
  of the shared database and restored it in a drill, see the top of this document). The
  installer was not installed. The 22 older encrypted backups on the dev PC were not opened.

Released as v1.18.71 on 2026-11-16. Its APK has the frontend without the Socket.IO client and
the Capacitor packages at 8.6.2.

### In v1.18.70

**2026-11-14, #383 (`14c222534`):** `NATIVE.ps1 -Start` stays until the backend answers and
shows the startup stage it is in (`STARTUP_STATUS.ps1`), and no longer restarts a stack that is
already running (`Get-ProcessFromPidFile` assigned to PowerShell's read-only `$pid`).

**2026-11-15: a review of the current state, then four fixes the same day** (owner: "begin
improvements and fixes as suggested"). Looked at: GitHub (no open PR, issue, Dependabot,
code-scanning or secret-scanning alert; CI green on `main`), the code, the dev PC, and read-only
aggregate counts on the shared database (nothing was written to it). Each fix went through its
own PR, `COMMIT_READY -Quick` (31 to 32 backend batches, 0 failed), CI and a dispatched E2E run,
and was seen working on a real server on a scratch database. What is still open from the review
is todos 52 to 57 in "Next todos".

- **#384 (`c4fb4032e`): the dev backend ran on packages nobody tests.** `NATIVE.ps1 -Start`
  only checked that `src/backend/.venv` existed, so the dev PC ran SQLAlchemy 2.0.44, FastAPI
  0.136.3 and PyJWT 2.13.0 against pins of 2.1.8, 0.162.0 and 2.15.1, on `0.0.0.0`, against the
  shared database. A successful install now records the SHA-256 of `requirements.txt` in the
  venv, and a start whose record is missing or different installs first (`-NoDepsSync` skips
  it). Hot reload watches `src/backend` without its `.venv` (it watched the whole project root,
  so a pip update or an edited script restarted the backend and re-ran the migrations).
  `lifespan.py` skipped migrations, RBAC seeding and the admin bootstrap whenever pytest could
  be *imported*; the question is now "is pytest running". The dev PC's venv was brought to the
  pins by hand the same day.
- **#385 (`f99edc163`): a refresh token worked as a login token, and Socket.IO did not
  authenticate.** Access tokens had no `type`, and nothing checked it, so the 30-day refresh
  token was accepted as a bearer token everywhere and logging out did not end that. Every place
  that takes a bearer token now reads it through `decode_access_token`. The Socket.IO `connect`
  handler believed whatever `user_id` the client sent; it now needs a valid access token when
  authentication is on. Nothing is emitted on that channel (todo 56), so no data was exposed.
- **#386 (`4dedd346a`): one live row per attendance period and per daily rating, enforced by
  the database.** Nothing stopped a second row for a slot, and the absence limits and the category
  averages count rows. Counted on the shared database: 971 attendance rows with no repeat, 208
  ratings of which three were stored three times each (2026-09-29, identical scores). Migration
  `a7d4e9c2b5f8` (additive) soft-deletes surplus rows, never removes them, then adds two partial
  unique indexes (`WHERE deleted_at IS NULL`). `POST /daily-performance/` updates the slot's
  rating instead of adding one; the upserts and the sheet retry once when another save takes
  the slot first; the bulk endpoint and the semester import no longer add a slot twice. Proven
  on PostgreSQL 16 in a throwaway container, including two sheets saved at the same moment from
  two connections. **The shared database gets the migration the first time a build with it
  starts against it: six rating copies are soft-deleted, nothing else changes.** `grades` was
  not touched. One pair of rows there has the same student, course and assignment name (ids 141
  and 146); the owner looked at it the same day: **it is intended** (the same assignment graded
  in two categories, two weeks apart), so nothing is removed and nothing is to be done.
- **#387 (`992c185e2`): a running server logged nothing.** `migrations/env.py` applied alembic.ini's logging
  section whenever the application ran its own migrations, which is every start: 185 of 203
  loggers disabled, the application's log file handler removed, and `logs/app.log` ended at
  `[run_migrations] ENTER`. No error, traceback or access-log line of a running server was
  recorded, in any edition. alembic.ini's logging is now applied only on the `alembic` command
  line, and the runners no longer leave their `migrations.log` handler on the root logger. On a
  real start, 102 lines now follow the migrations in `app.log`. **Logs come back with this:
  two lines per request, tracebacks of refused logins, and lines that name accounts by e-mail.**
- **#388 (`8809ee07e`): housekeeping.** This section and todos 52 to 57; the second copy of the
  dependency pins removed from `pyproject.toml` (the two requirements files are the one list);
  `CLAUDE.md` without a hard-coded version.
- **#390 (`f526eba95`): quieter logs, dead refresh tokens removed, E2E setup failures fail** (the same day,
  after the owner's "continue"; the parts of todos 53 and 56 that needed no decision).
  *Logs:* a refused login (wrong password, lockout, inactive account) is one line, written
  where it is decided, with no traceback; an attempt during a lockout, which only the traceback
  recorded, has a warning of its own. `backend.db.utils.transaction` no longer writes a 4xx
  refusal as an error, and writes a broken unique key as one INFO line that names the
  constraint, without the statement, its parameters or PostgreSQL's `DETAIL` line (which
  carries the row's values). Server errors keep their ERROR line and their traceback. As they
  were: two lines per request, and a few lines that name an account by e-mail.
  *Refresh tokens:* revoked and expired rows are deleted at startup and by the daily
  maintenance job (02:00), never inside a request. `POST /auth/refresh` answers 401 for a
  revoked, an expired and a missing row alike, so no answer changes. **The shared database
  loses its dead rows (834 of 835 on 2026-11-15) the first time a build with this starts
  against it.**
  *E2E:* `report-workflows.spec.ts` turned nine setup failures into skips; they are failures
  now. `critical-flows` "should open student detail" skipped itself as "no students in the CI
  seed": the seed has four, and the test counted the cards before the list had loaded. It waits
  for a card and runs now; "should display students list" asserted a count of zero or more and
  now needs a card. On a scratch server with the CI seed: 16 passed, 1 skipped, three times
  over; with the students removed, or the API unreachable, the old files report "skipped" and
  the new ones "failed".

Released as v1.18.70 on 2026-11-15 (the record is at the top of this document). Nothing in
these needed a new Android build; #386 has a migration, which any build that has it applies at
its first start.

### In v1.18.69

**Todo 51: attendance on the cloud host stayed "pending sync" (2026-11-13).** The owner's phone,
pointed at the cloud VM, showed the attendance sheet as queued for sync on a good connection,
and text typed in the lesson log was saved a few characters at a time. Read from the VM's own
`/metrics` (the container keeps no access log): `POST /attendance/` answered 201 after 14 s on
average, 50 of 60 took more than 10 s, and 501 writes ended in a fast 400. Three causes:
- **One request per student and period.** A sheet went out as about 50 parallel writes, each
  with several database round trips at ~65 ms on a one-CPU VM. The app's limit is 10 s per
  request, a timeout counts as "offline", so the sheet was queued, and every retry sent the
  same burst. The 400s are FastAPI's "error parsing the body" for requests whose client had
  already hung up. **Fix:** `POST /api/v1/attendance/sheet` saves one course and date in one
  request with a fixed number of queries (`services/attendance_sheet_service.py`; needs
  `attendance:edit` and `students:edit`; a student that no longer exists is skipped and
  reported, so a queued sheet cannot become unsaveable). The page and the offline queue use it
  (`api/attendanceSheetAPI.ts`) and fall back to the per-record requests on 404/405/403, because
  the phone app can be newer than the server it talks to.
- **Every render of the Attendance page re-sent the queued sheet.** `useQueueFlushTriggers`
  re-ran its effect whenever the flush function changed, the page's `showToast` is a new
  function on each render, and nothing stopped two flushes from overlapping. Each lesson-log
  save re-renders the page. **Fix:** the hook keeps the latest function in a ref, flushes on
  mount and on its triggers only, and never starts a flush while one is running (all four
  queues: attendance, grades, students, lesson log).
- **Lesson-log text typed during a save that failed was not sent.** `saveNow` only made the
  follow-up attempt after a successful save. **Fix:** a save requested during another always
  gets its own attempt.
- **Not reproduced:** the owner also saw typed text disappear when typing fast. The server
  counted 12 lesson-log saves, all 200 and under a second, and no extra loads, so the editor was
  not reloading. The request bursts on the phone are the likely cause; to be confirmed on the
  phone after this release. (The owner's confirmation of 2026-11-15 names the attendance fix;
  the typed text was not mentioned.)
- **Not done:** the endpoints behind `require_permission` are `async` wrappers around blocking
  database calls, so one uvicorn process handles them one at a time. That is why the burst was
  so slow; with one request per sheet it no longer matters for attendance. (Now todo 52.)

**v1.18.67 (released 2026-11-13, tag on `ec987afa8`, run by the assistant).**

v1.18.67 ships the attendance lesson log (todo 41, #368), the tooling fixes (todos 42
and 43, #369), the Docker publish workflow fix (#370) and the two bugs the pre-release smoke
test found (#371: teacher report permissions with migration `d3a7b9c1e5f2`, and SMS Lite's 404
on API paths without a trailing slash). Two additive migrations: `c8e1f4a7d2b9`
(`lesson_logs`) and `d3a7b9c1e5f2`. The smoke test is described under "On `main` since
v1.18.66" below.

**Before the tag:** `RELEASE_READY` (no `-TagRelease`) took 36 minutes and exited 0: every
`COMMIT_READY -Quick` gate passed, the backend suite ran 1313 passed, 39 gated skips, 0 failed,
and the local installer was built and signed with the frozen-Lite check passing 11/11. The
generated GitHub body only counted "1 new feature, 1 bug fix" (the generator lists changes in
the CHANGELOG, not in the body), so it was rewritten by hand in `ec987afa8`; the tag was pushed
once CI/CD and E2E were green on that commit.

**Verified on the published assets:** `SMS_Installer_1.18.67.exe` 87,552,824 bytes, SHA-256
`2db12bdc…71df2` = GitHub's digest, Authenticode Valid, signer CN=AUT MIEEK (Limassol),
thumbprint `2693C1B1…075D`, DigiCert timestamp, file and product version v1.18.67;
`SMS_Android_1.18.67.apk` 4,191,900 bytes, SHA-256 `b8393d5c…22421` = GitHub's digest,
`versionName 1.18.67` / `versionCode 118067`, min SDK 24, target SDK 36, signed with the same
certificate as v1.18.66 (SHA-256 `686fb6ed…d2ea`, so phones upgrade in place). The release,
installer and APK workflows on the tag succeeded. Not checked: the installer was not installed,
and the APK was not run on a device.

**Release-flow note:** a `COMMIT_READY` run in a clone upgrades packages in the main tree's
root `.venv`; the owner's dev backend (`uvicorn --reload`, started from the project root) saw
those files change and restarted three times, which Vite reported as `ECONNRESET`. Starting it
with `--reload-dir src/backend` would stop that. (Done 2026-11-15, #384.)

### v1.18.66 (2026-11-12; tag on `d2cb7eba9`, run by the assistant)

v1.18.66 is a maintenance release: ten Dependabot merges (#357–#366) and a CI fix (#367). No
features and no database changes.
- pip minor/patch group (#357): SQLAlchemy 2.1.8, psycopg 3.3.8, pydantic 2.14.3, python-socketio
  5.18.1, pandas 3.1.1, python-multipart 0.0.33, virtualenv 21.15.5, ruff 0.17.4. Also
  pytest-asyncio 1.4.1.post1 (#358) and types-requests (#359).
- npm minor/patch group of 92 updates (#360) and five `@babel/*` patch bumps (#362–#366).
- `@types/node` 24 → 25 (#361), a major. The 2026-10-12 "ignore this major" covered only 26 ("the
  runtime is Node 22"); CI and the APK build run Node 22, the E2E and dependency workflows Node 24,
  and nothing runs 25. It is types only and green; whether to ignore the major is the owner's call.
- **CI flake, hardened (#367).** The `Install Gitleaks` step failed on at least seven Dependabot
  branches between 05:29 and 06:01 UTC on 2026-11-09 (plus one CodeQL `Initialize CodeQL` failure)
  and passed later: #357, #360 and #361 merged on 2026-11-10 with every non-skipped check green. The
  step downloaded with `curl -sSL` (no `-f`, no retry) and its error text could not be retrieved, so
  a transient download failure is an inference. Both downloads now use `curl -fsSL --retry 5
  --retry-delay 3 --retry-all-errors`, and the job passed on #367 with the new lines. One Dependabot
  npm version-update job also timed out that day (npm hung 900 s on `typescript`); later runs
  succeeded.

**Before the tag** (the venv and `node_modules` were first synced to the new requirements and
lockfile): every `COMMIT_READY -Quick` gate passed; the full suite ran 46/46 batches, 1300 tests
(1261 passed, 39 gated skips, 0 failed) on the new dependencies; the local installer was built and
signed (payload in 216 s, thumbprint `2693C1B1…075D`) and its smoke test, including the frozen-Lite
runtime check, passed. `RELEASE_READY` (no `-TagRelease`) took 38.6 minutes; the tag was pushed by
hand once CI/CD and E2E were green on the tagged commit.

**Verified on the published assets:** `SMS_Installer_1.18.66.exe` 87,524,144 bytes, SHA-256
`7201b029…31d8c` = GitHub's digest, Authenticode Valid, signer CN=AUT MIEEK (Limassol), thumbprint
`2693C1B1…075D`, DigiCert timestamp, file and product version v1.18.66; `SMS_Android_1.18.66.apk`
4,186,248 bytes, SHA-256 `9b74a2ce…d7eac` = GitHub's digest, `versionName 1.18.66` / `versionCode
118066`, min SDK 24, target SDK 36, signed with the same certificate as v1.18.65 (SHA-256
`686fb6ed…d2ea`, so phones upgrade in place). The release, installer and APK workflows on the tag
and all eight workflows on the tagged commit succeeded; the installer log shows "Signature status:
Valid" and the frozen-Lite check passing in CI.

**Release-notes gap, worked around:** the notes generator does not recognise Dependabot's `deps:`
commits ("Found 10 unrecognized commits"), so the generated GitHub release body had an empty "What's
Included" section and the CHANGELOG entry listed none of the ten updates. The v1.18.66 notes were
written by hand in `d2cb7eba9`, before the tag (the generator was fixed afterwards, todo 42).

**On `main` since v1.18.66 (released in v1.18.67):** the attendance lesson log (todo 41, #368; it adds the
`lesson_logs` table through the additive migration `c8e1f4a7d2b9`), then the release-notes
`Dependencies` category and three dev-tooling fixes (todos 42 and 43: `COMMIT_READY` in a git
worktree, the Playwright global setup following `PLAYWRIGHT_API_BASE_URL`, and a per-test restore of
logging and environment state in the backend tests). **The owner asked for v1.18.67 on 2026-11-12,
after the smoke test below**; it ships the lesson log, those fixes and the two smoke-test fixes.

**Pre-release smoke test of `main` (2026-11-12, `3e2c24b9d`, asked for by the owner before
deciding on v1.18.67).** Run from a clone, on throwaway databases only (never the QNAP one):
- *Editions:* the backend from source on SQLite and on PostgreSQL 16 (a container), a frozen SMS
  Lite built from the commit, and the Docker image on PostgreSQL. Each started from the v1.18.66
  schema; the Lite one opened a database that the published v1.18.66 Lite had created and filled.
  Every startup path applied `c8e1f4a7d2b9` and kept the existing data.
- *Checks, all passing on every edition:* 24 lesson-log API checks under `AUTH_MODE=strict`
  (partial update, blank to NULL, the 20 000-character limit, 404/422 cases, 401 without a token,
  teacher allowed, student 403, a deleted course hides its logs, update check reports its
  version); a real-browser run as a teacher (form login, autosave without a click, reload, the
  offline queue and its flush when the server returns, history edit, Greek labels, 412 px width,
  no console errors); and on Lite and Docker the packaging check (Greek PDFs with DejaVu, Excel,
  SPA assets).
- *Two bugs found, both older than this release, fixed in the same PR:*
  1. **A teacher's Dashboard showed "Error loading analytics data" in three cards, and the
     Analytics endpoints answered 403.** Every `/analytics`, `/reports`, `/metrics` and
     custom-report endpoint requires `reports:generate`. `backend.rbac`'s defaults and the
     permission reference give it (and `reports:export`) to teachers, but the roles seeded into
     the database (`routers_rbac._seed_defaults`) had neither, the two permission rows did not
     exist at all, and the seed only runs on an empty RBAC table. Fixed in the seed, plus the
     data-only migration `d3a7b9c1e5f2` for existing databases (it adds the two rows and links
     them to `teacher`; additive). A test now fails if the seed and the defaults drift apart for
     any permission a router requires. Verified on the Docker image against a PostgreSQL that
     was seeded before the fix, and on a rebuilt Lite. **Whether the QNAP database was affected
     was not checked** (it was not read); the migration is a no-op where the grants exist.
     The read-only roles `viewer` and `guest` still get 403 on the Dashboard overview
     (`reports:generate` is not theirs by either list): the owner's call.
  2. **SMS Lite answered a `GET` on an API path without its trailing slash with 404** (its SPA
     catch-all matched before the router's slash redirect; the other editions redirect). Three
     callers: Attendance's fallback loads of students and courses, and the admin Permissions
     page. The three URLs got their slash, and the Lite catch-all now redirects like the other
     editions (verified on the rebuilt Lite: 307, then the real answer).
- *Not covered:* the Android app (no native change since v1.18.66; the same SPA was driven at
  phone width in Chromium, not in the WebView), the installer itself, and the owner's native dev
  server. Noticed, not changed: `lifespan.py` skips migrations and the admin bootstrap whenever
  `pytest` is importable (so a plain `uvicorn` from the root `.venv` does neither; `NATIVE.ps1`
  uses `src/backend/.venv`, which has no pytest), that venv is behind `requirements.txt`
  (SQLAlchemy 2.0.44 against 2.1.8), and the Absence limits table is cut off at 412 px.
  (The first two were fixed on 2026-11-15, #384; the table on 2026-11-17, PR 411.)

### v1.18.65 and older

The records of v1.18.65 down to v1.18.51, and of the work between them, are in part 1 of
[`UNIFIED_WORK_PLAN_ARCHIVE_2026_H2.md`](./UNIFIED_WORK_PLAN_ARCHIVE_2026_H2.md), unchanged.

## 📋 Next todos

**The one list of open work**, highest priority first. Consolidated 2026-09-17 from the two
lists that used to hold it — in the PostgreSQL restore section and the smoke-test section —
which now point here. The evidence stays in those dated sections. When an item is done, remove
it here and mark it resolved where it was raised.

**Mandatory pre-flight before starting any new work:** check the repository's GitHub CI/CD state
for open PRs and failed or pending workflows, plus outstanding GitHub security and code-quality
findings (for example Dependabot, CodeQL, and quality-gate failures). Record material findings in
this list, then rank them against existing work by urgency and impact; security, broken CI/CD, and
release-blocking quality defects take priority for resolution. Do not treat a local clean working
tree as evidence that GitHub is clear.

*Everything from the original 2026-09-17 list is **done**, and so are the follow-ups it raised on 2026-09-21:*
*CI now runs the 9 restore round-trip tests against a `postgres:16-alpine` service (confirmed in the CI log),*
*the stale `import_export.spec.ts` was deleted as a broken duplicate of `feature_127_import_export.spec.ts`,*
*and GradingView now fetches a student's courses with one `getByStudent` request instead of one per course*
*(active enrolments only, matching the per-course endpoint; `GradingView.enrollments.test.tsx` fails on the old code).*
*What is left is below.*

**Open work as of 2026-11-15** (from the review of that day; what it fixed is under "In
v1.18.70" and "In v1.18.71" at the top). **v1.18.73 of 2026-11-17 carries PRs 409 to 418;
the cloud VM has not been updated to it and waits for the owner's word.** **Since then
`main` carries PRs 419 to 431, unreleased: a repair of two ways an account kept access it
should not have had (419), the permission documents and the user guide checked against the
application (420, 421), the small page repairs of todo 63 (422), an account whose last role
is revoked left with nothing (423), the in-app help read against the pages (424), and the
owner's seven decisions of 18 November on todo 63: two roles and "No role" with a closed
list of 44 permissions and imports for teachers (425), the Weight of a grade counts (426),
every account changes its own password (427), the audit log names its authors and has a
page (428), the older documents read and corrected (429); and after them a mark on the
Attendance page that is no longer lost when the server answers late (430), and an installer
built by hand that takes tracked files only, with the installation guide written anew (431).
What 430 and 431 found and did not change is in their entries under "On `main` since
v1.18.73": *Clear* on the Attendance page, the database choice of the Docker wizard, what the
uninstaller deletes, the nine local installer builds in `infra\installer\dist`. The first start of this code on
a database turns every Student, Viewer and Guest account into "No role" (migration
`5189ab647b5a`). The VM
has none of them; on it an account changed to "Student" still keeps its old access, Edit
followed by Save turns an administrator who got the role under Assign Role to User into a
teacher, and revoking an account's only role takes nothing away. What the readings found
and did not change is todo 63.** Older entries that are still open, further
down: 40 (a real Update
install), 44 (the cloud host: the Oracle agreement accepted at sign-up still to be read, idle
reclamation) and 50 (the owner's side of the privacy round). Todo 48 (the build-only Docker
run in the release flow) is closed by PR 413. **Found on 2026-11-17 and waiting for the
owner's word:** todo 59 (four smaller things about notifications; that a teacher can send
a message is settled in PR 417: the page offers it), todo 61 (found while the Search page
was repaired) and todo 62 (the export jobs of the Import/Export page work in one case of
many; found by the smoke test before v1.18.73). The six E2E tests of todo 53 that described things the application does not
have, and the four unused components of todo 60, are deleted in PR 418: todo 53 is closed. Todo 60 itself is done in PR 416: the Search page sorts,
pages and filters, and the Students page says when its list could not be loaded. Todo 51 is closed: the owner confirmed on
2026-11-15 that the attendance fix works on the phone. Also still open in their own sections: the contrast
design calls of 2026-10-07, and `viewer` and `guest` getting 403 on the Dashboard overview
(2026-11-12 smoke test; the owner's call). The Absence limits table that was cut off at
412 px in that smoke test fits a phone since PR 411.

**First in line: what only the owner can do, in todos 55 and 54.** Since v1.18.71 the cloud
VM backs up the shared database once a day, and a restore of its first backup was proven;
since v1.18.72 it reports to a monitoring service, and a failed backup puts a notice in the
administrators' bell; the owner set the service up and its test mail arrived. Since the
night of 2026-11-16 the VM's backup key and one backup are also on the dev PC, and since
2026-11-17 the key is in a third place: the owner put it, with a note on how to check a copy
and how to restore, into the vault of their own cloud storage, which opens only after a
second identity check. Left for the owner: a copy of a newer backup taken off the VM now and
then (todo 55). **The shared database's PostgreSQL 14 reached its
end of life on 2026-11-12, and no newer image runs on the NAS; the owner stays on 14.18 for
now** (todo 58).

52. **The server handles one request at a time** (the "not done" note of todo 51, read from the
    code, not measured). About 270 of 350 endpoints are `async def` around blocking database
    calls, the `require_permission` wrapper is `async` and calls the sync endpoints inline, and
    every edition starts one uvicorn process. So requests queue behind each other: on the cloud
    VM (65 ms per round trip) a page's parallel requests are served one after another, and one
    slow export, or a QNAP outage (5 s connect timeout per attempt), stalls every user and
    `/health`. In stages: (1) the wrapper does the user lookup and the permission check in the
    threadpool and runs sync endpoints there; (2) endpoints that never `await` become `def`,
    router by router (a script can find them); (3) measured on the VM through `/metrics`.
    #386 was the precondition: that queueing was the only thing keeping two saves of one slot
    apart inside a process. **The owner's go-ahead of 2026-11-15 covers stage (1) only**, measured
    before and after: **done in #393** (numbers under "In v1.18.71"). **Left, each
    waiting for a go-ahead:** stage (2), the 160 `async def` endpoints behind the decorators
    whose own database calls still hold the loop (20 at once still take 1.8 s instead of 0.65 s,
    and `/health/live` waits up to 1.4 s meanwhile), plus the dependencies that are awaited
    directly (`Depends(get_current_user)`, `/health`); stage (3), the same measurement on the
    VM through `/metrics`.
53. **20 of 81 E2E tests never run** (CI on `main`, `72f079ae8`: 61 passed, 20 skipped; it was
    60 and 36 of 96 on 2026-11-15 in the morning). Six suites are `describe.skip`: advanced
    search (13 tests), student resilience (2), and one test each in `student-list`,
    `saved-search`, `performance-benchmark` and the root `student-management.spec.ts`. In
    `critical-flows` one test is skipped outright. **Done in #390:** setup failures fail
    (`report-workflows.spec.ts` turned nine of them into skips), and the `critical-flows` test
    that skipped itself for "no students in the CI seed" runs (the seed has four; it did not
    wait for the list). **Done in #391:** the notifications suite (15 tests that waited for
    Socket.IO events) is deleted with the channel. ~~**Left:** make each of the six skipped
    suites run or delete it (deleting needs the owner's OK).~~ **Done in PR 415
    (2026-11-17):** ten of the twenty run (under "In v1.18.73"); a local run of
    the whole suite gives 71 passed and 10 skipped. **Left:**
    - ~~*The owner's OK to delete six tests that describe things the application does not
      have:* in `search_advanced.spec.ts` the group "Search page: not there at all" (save and
      load a search, clear all, keyboard navigation, search history); `saved-search.spec.ts`
      (no page for saved searches; the rule itself is tested in the backend);
      `student-list.spec.ts` (no table, no virtual scrolling; what the page has is tested
      elsewhere). Or build what they describe.~~ **Deleted in PR 418 (the owner's word of
      2026-11-17).** All 76 tests of the suite run. **Todo 53 is closed.**
    - ~~*Four wait for the repairs of todo 60* and should pass after them: sorting, paging and
      filters on the Search page (`test.fixme` in `search_advanced.spec.ts`) and the error
      state of the Students page (`student-resilience.spec.ts`).~~ **Done in PR 416:** all
      four run, and a fifth is new; a local run of the whole suite gives 76 passed and 6
      skipped. The six that are left are the six above.
54. **Nothing watches the cloud VM, and workflows that cannot run.**
    `scheduled-production-health-check.yml` needs a self-hosted runner
    (`[self-hosted, windows, production-lan]`); none is registered, its schedule is commented
    out and it has no run on record. With it, six dispatch-only workflows have no run on record:
    `reset-workflows.yml`, `archive-legacy-releases.yml`, `fetch-code-scanning-sarif.yml`,
    `upload-sarif.yml` and `sync-installer-artifact.yml`; four files under
    `.github/workflows/archive/` are inert (GitHub only runs the top level). Suggested: a cron
    job on the VM that checks `/health` and mails through the SMTP settings the app already has;
    delete the workflows that cannot run (owner's OK).
    - **Done in #408 (2026-11-16, unreleased):** the bell notice for a failed backup, the
      heartbeat for a monitoring service outside, and the five files that could not run
      deleted. Not the cron job with mail: the VM has no mail settings, and a job on the VM
      cannot report that the VM is down. The details are under "In v1.18.72".
    - **Done 2026-11-16 with v1.18.72:** the owner created an account at healthchecks.io, the
      address is in the VM's `.env`, and the first signal went out (the top of this document).
      The owner confirmed in screenshots: the check up, period 1 hour and grace 1 hour, and
      the service's test mail received (the top of this document).
      The integration is assigned to the check ("1 of 1").
    - **Left:** (a) nothing to set up; a real alarm was not tried. (b) The five manual-only
      workflows without a run on record stay, by the owner's choice: `reset-workflows.yml`,
      `archive-legacy-releases.yml`, `fetch-code-scanning-sarif.yml`, `upload-sarif.yml`,
      `sync-installer-artifact.yml`. (c) No mail is configured on the VM: the activation
      email of an approved account cannot be sent from there (the administrator gets the
      notice "Activation email not sent"). Entering the settings under Control Panel > Email
      on the VM works, and from #408 on they last.
55. **Nothing backs up the QNAP database on a schedule, and the application says it does.**
    Asked what backs it up, the owner answered on 2026-11-15: "the back up happens each and
    everytime a session occurs"; shown that the newest backup file on the dev PC is from
    6 November: "I thought the app does it".
    - *What the application tells its users.* The in-app help answers "Automated backups happen
      daily" (`helpBackupAnswer`) and, under lost data, "See daily automatic backups"
      (`helpDataLossAnswer`, English; the Greek text says "daily copies" too). The PDF guide
      lists "Auto-Save & Data Backup" among the features (`routers_help.py`).
    - *What exists.* No code makes a backup on a schedule. A backup is made when someone asks
      for one in the application, and automatically only before a session import, before a
      restore and as part of a semester archive. `DOCKER.ps1 -Update` copies the SQLite file of
      the Docker volume, which is not where the shared database is.
    - *What is on the dev PC.* `backups/database` holds 22 encrypted backups, dated from
      3 September to 6 November; the newest is `backup_20261106_152510.enc`. None from 12 to
      15 November, the day of the v1.18.70 migration included (the six rows that migration
      changed were saved separately, see the top of this document). What is on the NAS itself
      is not known here. No restore drill since 2026-09-17. The database is 15 MB.
    - *To do, on the owner's word* (2026-11-15: "nothing more now"): a daily backup of the QNAP
      database that is kept off the NAS, one restore test, and the help made true, or corrected
      until it is. Until then a backup exists only when someone creates one in the
      application.
    - **Done in #407 (2026-11-16, unreleased; the owner: "proceed according to plan"):** the
      automatic backup, the help made true, and what the restore test found (a PostgreSQL
      backup could not be restored through the application; the key was lost at an update).
      The details are under "In v1.18.71" and in
      `docs/admin/BACKUP_AND_RESTORE.md`.
    - **Done 2026-11-16 with v1.18.71 (the owner chose both):** the release and the update of
      the cloud VM, which made the first backup of the shared database a minute after its
      start; and a restore of that backup into a scratch database, identical to the live one
      table by table (the top of this document).
    - **Done 2026-11-16, night (the owner: "Yes, copy both"):** the VM's key and its newest
      backup (`auto_backup_20261116_150613.enc`) are on the dev PC, in the owner's confidential
      folder outside the repository; checksums equal, and the key opens the backup.
    - **Done 2026-11-17 by the owner: the key is in a third place.** The steps first given
      (a USB stick, or a password manager by way of PowerShell commands) were too complicated;
      the owner asked for something "like the Two-factor authentication". The vault of their
      own cloud storage is that: it opens only after a second identity check. The owner
      confirmed that the key and the note are in it. The key now exists on the VM, on the dev
      PC and there; the note beside it holds its checksum and the way to restore, and no
      secret.
    - **Left:** (a) the owner's: now and then a newer backup taken off the VM (the runbook has
      the commands; the copy on the dev PC is of 16 November and does not renew itself).
      (b) Whether the key next to the code on the dev PC
      still opens the 22 older encrypted backups there is not known. (c) The drill is one
      drill: after a release that changes the database, it is worth repeating.
56. **Small things from the same review.**
    - ~~*The Socket.IO channel carries nothing.* `send_notification_to_user`,
      `broadcast_notification` and `broadcast_to_room` in `websocket_server.py` have no caller;
      the frontend connects and never receives an event (notifications reach the page through
      the REST API). Wire it up or remove it (server, client hook, `socket.io-client`).~~
      **Closed by #391:** removed (the owner's decision).
    - ~~*`refresh_tokens`:* 835 rows, 1 live. Revoked and expired rows are never deleted.~~
      **Closed by #390:** deleted at startup and by the daily maintenance job.
    - *Soft-deleted rows in the shared database:* 55 students (deleted 2026-09-04 to 09-17, the
      test-data cleanups), 28 courses, 44 enrollments, 14 grades. The "81 students" in todo 50
      counts them; 26 are live.
    - ~~*`grades`:* one pair of rows with the same student, course and assignment name
      (#386).~~ **Closed 2026-11-15 by the owner: intended.** The same assignment is graded in
      two categories (ids 141 and 146); nothing is removed, and grades get no uniqueness rule
      by assignment name.
    - *A dead tool:* `scripts/utils/validators/import_checker.py` scans `<root>/backend`, which
      has not existed since the June flatten; nothing runs it or its test. Delete (owner's OK).
    - ~~*`migrations.log`* is written to `src/logs/`, not `logs/`: the runner takes `src` for the
      repository root.~~ **Closed by PR 412** (the folder that holds `VERSION`).
    - ~~*Log noise, now that logging works (#387):* a refused login is logged with a full
      traceback, and `backend.db.utils.transaction` logs an expected, retried unique-key conflict
      at ERROR with the SQL and its parameters.~~ **Closed by #390.**
57. ~~**This document is too big to read in one piece** (390 KB, 5,400 lines; the assistant's file
    reader stops at 256 KB, so the session checklist's "read the plan" cannot be done in one
    step). Closed todos and the dated sections older than v1.18.66 belong in the archive file,
    as "How to Use This Document" already says. Not done on 2026-11-15: it moves about 4,000
    lines.~~ **Done 2026-11-15 (the owner's go-ahead the same day):** 5,012 lines moved, word
    for word, to `UNIFIED_WORK_PLAN_ARCHIVE_2026_H2.md`; this document went from 415 KB to
    under 60 KB (5,759 lines to under 800). A script did the move and checked that every line
    of the old plan is in one of the two files. What stayed: the releases from v1.18.66 on,
    todos 52 to 58, the four older entries that are still open (40, 44, 48, 50) and the open
    contrast design calls. Not moved apart: a closed entry that still has an open part keeps
    its place here until that part is done. With it: three lines in the v1.18.68 and v1.18.67
    records had become level-1 headings in the middle of a paragraph and are text again (the
    cause is the last entry of todo 58).
58. **Found on 2026-11-15 while releasing v1.18.70, and not fixed.**
    - ~~*A test run uses the backups folder of the tree it runs in.* Two tests in
      `test_control_endpoints.py` (`test_download_database_backup_success`,
      `test_list_database_backups_includes_sql`) write a file into `backups/database`, and the
      semester-archive tests use `backups/semester_archives/.staging`. They remove what they
      create, and no backup was touched (seen on the dev PC: the folder's time changed during
      the release run, its 26 files did not). The tests should get a temporary `BACKUPS_DIR`;
      several modules read it once at import (`routers_adminops`, `database_manager`). The
      same class of problem as the schedulers and the mail settings, fixed in #392.~~
      **Closed by #409.**
    - ~~*The shared database runs PostgreSQL 14.18; CI's PostgreSQL service and the release checks
      use 16.* The v1.18.70 upgrade was repeated on 14 before the cloud host was updated. CI
      should test the version in use, or both.~~ **Closed by #409** for CI (14 for the
      suite, the round trip on 16 as well). The release checks on this PC use whichever scratch
      container the check needs.
    - ~~*The notification components do not share state.* The bell, the dropdown and every item
      call `useNotifications` and each gets its own copy, so marking an item as read does not
      change the dropdown's list or the bell's count until they next fetch. (The Socket.IO
      events were meant to keep them in step; nothing ever sent one.) A shared store or context
      would.~~ **Closed by PR 411** (one state in the hook's module; the "View all" window
      included).
    - *The native WebSocket endpoint has no client.* `/api/v1/notifications/ws` and
      `services/websocket_manager.py` work and are tested; `services/notificationWebSocket.ts`
      in the frontend is used by nothing but its own test. Use it or remove both (owner's call).
    - ~~*Both notification guides describe things the application does not have* (an
      administration panel, WebSocket settings, delivery dashboards). #391 corrected the
      delivery description at the top of each; the rest is as written in January 2026.~~
      **Closed by PR 414:** both rewritten from the code and checked in a running copy.
    - ~~*`schedule_cleanup_task("hourly")` would run every minute* (`"*/1"` in the minute field of
      `maintenance_scheduler.py`). Only `"daily"` is ever asked for.~~ **Closed by #409.**
    - *Installs older than v1.18.70 on the shared database:* see the note at the top of this
      document. The owner's stopped `sms-app` container is v1.18.63.
    - ~~*"Slow query" warnings on the cloud host.* `db/query_profiler.py` warns about every
      statement over 100 ms; the database is 65 ms away, so the health check's own catalogue
      query warns every 30 seconds (13 of the 15 warnings in the VM's first five minutes on
      v1.18.70). Now that the log works, that buries real warnings. The threshold should be a
      setting, raised in `docker-compose.cloud.yml`.~~ **Closed by #409** (on `main`; the VM
      gets it with its next update).
    - ~~*The query profiler never forgets.* It appends one record per statement to a list for the
      life of the process (read by the diagnostics router, emptied only by its reset endpoint).
      On a server that stays up for weeks that is a slow leak; it should keep the last few
      thousand.~~ **Closed by #409** (the VM gets it with its next update).
    - *The E2E auto-start cannot start a backend, and leaves a dead process behind.* Outside
      CI, when nothing answers at the API address, `playwright-global-setup.ts` starts
      `python -m uvicorn backend.main:app --port <port> --reload` detached, with the frontend
      folder as its working directory. `backend` cannot be imported from there (it lives under
      `src`), so uvicorn's reloader waits for ever with the port bound and nothing serving,
      and nothing stops it: the teardown only deletes the accounts a run created. Two of
      them, from runs of `report-workflows.spec.ts` against an address nothing listens on
      (the check for #390), sat on port 8019 for nearly five hours and kept a folder of an
      isolated copy in use; no database was involved. It should not be repaired as it is:
      started from the main checkout's `src`, the backend would read `backend/.env`, which on
      the dev PC points at the shared database, and the E2E suite would create its accounts
      there. Better to remove the auto-start and fail with a message that says how to start
      an isolated backend (the owner's call).
    - ~~*The gate's Markdown auto-fix can turn text into a heading without saying so.* A wrapped
      line that begins with a PR number (`#378, …`) is "corrected" by `markdownlint --fix`
      (rule MD018, no space after the hash) to `# 378, …`, a level-1 heading. It happened to
      three lines of this document on 2026-11-13. `COMMIT_READY` lists the files its auto-fix
      rewrote by comparing line counts with `HEAD`, so a rewrite of a line that is already part
      of the commit is not listed. The rule should be off (a `#378` at the start of a line is
      plain text in Markdown) and the list should compare contents.~~ **Closed by #395.**
    - *Found on 2026-11-16 with the backup work (#407), and not fixed:*
      - ~~*A translation that reads the same as its key is shown as the key.* `t()` in
        `LanguageContext.tsx` takes a value equal to the key's last part for "not found", so
        `utils.created` ("created") showed as `utils.created:` in English. `updated`,
        `warnings` and `errors` in `en/utils.js` are the same case. The backup list got a key
        of its own; `t()` should ask i18next whether the key exists.~~ **Closed by PR 411**
        (it asks; the scan found 27 such English texts, not four).
      - ~~*`hideLegacyDatabaseTools` shows the tools.* `DevToolsPanel` reads the prop as
        "visible"; the Control Panel passes it and gets them shown, which is what the page
        needs. The name is the wrong way round.~~ **Closed by PR 411**
        (`showLegacyDatabaseTools`).
      - *Two backup folders.* The Database panel keeps its own backups in
        `BACKUPS_DIR/postgres` (`pg_dump --clean` where it is installed), apart from Manage
        Backups (`BACKUPS_DIR/database`); the automatic backup's retention does not look there.
      - *No backup before a migration.* An update that changes the database leaves every
        earlier PostgreSQL backup restorable only with the earlier release. A backup made by
        the application right before it applies a migration would close that gap (the rows
        the v1.18.70 migration changed were saved by hand).
      - *`/admin/restore-encrypted-backup` has no caller any more* (the page restored through
        it until #407). Remove it or keep it (the owner's call).
      - *The Control API trusts the machine the server runs on* (`control_auth`, rule 3: with
        no `ADMIN_SHUTDOWN_TOKEN`, a request from the same machine needs no login). That is by
        design for a PC's own tools, and through Docker and on the cloud VM every request
        arrives from outside and is checked (a teacher gets 403, seen in the smoke test). But
        with SMS Lite, or a server run from source, the browser is on the same machine: anyone
        at that PC can list, make and restore backups, signed in as a teacher or not at all.
        On a PC that uses the shared database, that includes restoring over it. Such a PC
        also holds the database password, so this is not a new way in; whether Lite should
        ask for an administrator there is the owner's call.
      - *A replacement PostgreSQL should be of the same kind as the lost one.* The shared
        database runs a Debian-based server, the scratch ones here are Alpine-based: both
        report the collation `en_US.utf8`, and they sort text differently (seen in the restore
        drill). The data restores identically; lists sorted by name would come out in another
        order.
      - *Readable copies left by older builds.* Nothing removes the `backup_….db` files that
        builds up to v1.18.70 left next to encrypted SQLite backups on Windows (see "In
        v1.18.71"). A clean-up at startup would have to be sure a file is such a leftover (it
        has an `.enc` twin of the same name) before deleting it.
    - *Found on 2026-11-16 with #409, and not fixed:*
      - **The shared database's PostgreSQL is past its end of life (the owner's call).** The
        PostgreSQL project supports a major version for five years; 14 came out on 2021-09-30
        and its last release, 14.25, on 2026-11-12. The server on the NAS reports 14.18, seven
        minor releases behind and now on a branch that gets no more security fixes. It is
        reachable only inside the home network and the tailnet, which limits who could use a
        flaw. The application's side is already tested on both 14 and 16.
        **Corrected the same night, after the owner showed the container in Container
        Station:** it is not "a minor update: same data folder, a restart", as first written
        here. (1) The image is `arm32v7/postgres:14-bullseye`, and that tag was last pushed on
        2025-07-22 and stays at 14.18: pulling it again changes nothing. 14.25 exists only on
        the newer Debian bases (`14-bookworm`, `14-trixie`), as do 16 and 17. (2) The NAS uses
        32K memory pages, on which most images do not start (exit 139; `postgres:16-alpine`
        and every Python image in November 2025, `postgres:16` on Debian never tried).
        `docs/deployment/qnap/TS-431P3-DEPLOYMENT-ATTEMPT-SUMMARY.md` still says PostgreSQL
        cannot run on it at all; one has since March 2026. (3) The running container's data
        path (`/var/lib/postgresql/data`) is not the one in
        `docker-compose.qnap.postgres-only.yml` (`…/data/pgdata`), so the file in the
        repository is not what it was made from.
        **Tried by the owner the same night, without touching the database** (two throwaway
        containers, no port, no volume): `arm32v7/postgres:14-bookworm` and
        `arm32v7/postgres:17-bookworm` both stop at once with `libc.so.6: ELF load command
        address/offset not page-aligned`. So on this NAS the official images end with what
        the bullseye base had in July 2025, and no pull will ever bring 14.25 or a supported
        version. What is left, all the owner's call: (a) stay on 14.18, which is what was
        recommended for now: the server answers only inside the home network and the
        tailnet, to clients that hold its password, it is backed up daily off the NAS and a
        restore was proven; (b) an image built by us on the bullseye base (14.25, or 17 from
        source), which is untried, has to be rebuilt for every later fix, and sits on a
        Debian release that is itself out of support; (c) the database on other hardware
        (the cloud VM, or a small always-on machine with ordinary 4K pages), which is the
        real answer whenever the NAS's role is reconsidered.
        **Decided by the owner, 2026-11-17: "staying on 14.18 for now".** The two test
        containers are deleted.
      - ~~*The diagnostics summary calls every busy table an "N+1 pattern".* The profiler counts
        statements per table since the start, and `detect_n_plus_one` warns about any table
        with more than five. On a server that has run for an hour that is every table, and
        each call of `/diagnostics/queries/summary` or `/patterns` writes one warning per
        table (six on a scratch server after a login and two pages). A real detector would
        count per request.~~ **Closed by PR 412** (it counts per request, and writes no
        warning).
    - *Found on 2026-11-17 with PR 412, and not fixed:*
      - *One real N+1, in an endpoint no page calls.*
        `GET /analytics/course/{id}/students-comparison` reads `grades` once per enrolled
        student, and `students` once per student who has grades (15 and 0 on the scratch
        server; a class of 25 on the cloud VM would be 25 to 50 round trips of 65 ms). The
        frontend has no caller. One query for each would do, or the endpoint goes (the
        owner's call). It is the only entry the new detector gave over all 102 `GET`
        endpoints, with 15 students.
      - *`GET /admin/debug-processes` has no caller either.* It lists what the old
        "stop the dev server" control would kill. It answers again since PR 412; whether it
        stays is the owner's call.
      - *Two migration runners that are near copies.* `backend/run_migrations.py` (the Docker
        entrypoint, the command-line tools) and `backend/scripts/migrate/runner.py` (the
        server, SMS Lite) differ in a few lines. PR 412 gave them one function for the log
        folder; the rest is still twice.
      - *A test run writes into the `logs/` of the tree it runs in.* The tests that run the
        migrations append to `logs/migrations.log` (104 KB in a clone after five test
        files). The same class as the backups folder that PR 409 moved to a temporary one.
      - *SMS Lite's last resort was never seen working in a packaged build.* Since PR 412 it
        stops whatever holds port 8000 again when that does not answer Lite's shutdown
        request, which is what the code was written to do; on the dev PC that includes a
        development server on port 8000. Worth one look in the next smoke test of the
        packaged Lite.
      - ~~*The gate's "changed tests only" rule can pass a commit on one test file.* In `-Quick`
        mode `COMMIT_READY` (`Invoke-TestSuite`) runs only the changed backend test files when
        its pattern finds any, whatever else the commit changes (source files, `conftest.py`).
        The pattern asks for `test_` twice in the path, so it matched none of the 166 test
        files and every Quick gate ran the whole suite, until a new file of #409 was first
        named `test_test_run_…`: that gate ran the one file, in 89 seconds, and passed. The
        suite was then run in full by hand (56 batches, 1,607 passed), the file renamed, and
        the gate run again. To fix: the changed tests alone only when every changed backend
        file is a test file, otherwise the whole suite; and a pattern that means what it says.~~
        **Closed by #410**, for the frontend as well, where the same rule was live.
59. **Found on 2026-11-17 while checking the notification guides, and not changed.**
    - ~~*A teacher can send a message to every account, through the API only.* The broadcast
      endpoint asks for the permission `notifications:manage`; the teacher role has it, in
      the role defaults (`rbac.py`) and in the grants made at start (`routers_rbac.py`). The
      page shows the form to administrators only. On the scratch server a teacher's request
      was accepted and reached all three accounts. Either teachers may send (then the page
      should offer them the form) or they may not (then the permission goes from the role,
      in the databases that already have the grant as well). The owner's call. The test
      `test_broadcast_notification_requires_admin` accepts any answer and proves neither.~~
      **Closed by PR 417 (the owner, 2026-11-17: "allow it on the page"):** the page offers
      the form to teachers, and tests say who the server lets send.
    - *A message does not say who sent it.* Nothing of the sender is stored with a
      notification or shown with it: a teacher's message to all users looks like an
      administrator's. With two roles sending, a reader cannot tell, and neither can the
      log. Storing the sender and showing the name is a small change (the owner's call).
    - *"Specific users" asks for account numbers that no page shows.* User Management lists
      name, e-mail, role and status. A choice of names would make that target usable.
    - *The notification preferences are stored and never read.* `GET` and
      `PUT /notifications/preferences`, the table behind them and seventeen settings (per
      type, e-mail, SMS, quiet hours): no page uses them, and nothing consults them when a
      notification is created (`should_notify` has no caller). A teacher who switched the
      in-app notifications off still got the next message. Build or remove, with the
      WebSocket endpoint of todo 58 (the owner's call).
    - *Notifications are never removed.* "Delete" marks the row; no job deletes old or
      marked rows. The table is small today.
    - *`docs/user/USER_GUIDE_COMPLETE.md` has not been checked against the application.* The
      one sentence corrected in PR 414 stood next to others of the same kind (a "System
      Settings" list with "Email Notifications: Enable/disable", attendance thresholds of
      70 and 80 per cent). It needs the same reading as the two guides. So do
      `docs/admin/PERMISSION_REFERENCE.md` and `RBAC_ADMIN_GUIDE.md`: both name a permission
      `notifications:broadcast` for administrators only; the code has `notifications:manage`,
      for administrators and teachers. **The two permission documents, and the matrix beside
      them, were written anew in PR 420 (2026-11-17), and the user guide in PR 421; what the
      two readings found is todo 63. This entry is closed.**
60. **The Search page offers three things that do nothing, and the Students page calls a
    failed load an empty list** (found 2026-11-17 while making their E2E tests run; each seen
    in a running copy with the four students of the seed).
    - *"Sort by" and its direction change nothing.* The list for "o" is in the same order for
      relevance, name descending and name ascending. The page sends `sort` in the body of
      `POST /search/advanced`; the endpoint does not read it.
    - *"Results per page", Previous and Next change nothing.* The page sends `page` and
      `page_size` in the body; the endpoint takes `limit` and `offset` from the address and
      so always answers with the first 20. Its `total` is the number of results it returned,
      not the number there are. With twelve matching students and "10 per page" the page
      lists all twelve.
    - *The filters never show.* The panel says "No filters available" for every query. The
      server answers with the filters as a list (status: active, 4); the page reads them as
      a map (`useSearchFacets.ts`). The same request is sent once for every typed letter
      (four for "John"), where the search itself waits for the typing to stop.
    - *Smaller, on the same page:* it asks for the saved searches at every opening although
      nothing shows them; and a failed search shows the HTTP client's English text ("Network
      Error", "Request failed with status code 500"), whatever the language of the page.
    - *The Students page says "No students found" when its list could not be loaded:* no
      message, nothing to try again with.
    - ~~*Components that no page uses:* `VirtualStudentList`, `CascadedStudentView`,
      `StudentForm` and the hook `useRateLimit`. Delete (the owner's OK).~~ **Deleted in
      PR 418 (the owner's word of 2026-11-17). Todo 60 is closed.**
    - **Fixed in PR 415:** a course was listed as "Unknown".
    - ~~Each repair is small; together they are "make the Search page work". Suggested order:
      paging with a real total and sorting (server), the filters (page), the error state of
      the Students page. Four E2E tests are written and wait for them (todo 53). Needs the
      owner's go-ahead.~~ **Done in PR 416 (2026-11-17; the owner: "Repair the Search page
      and the Students error state"):** every entry above but the unused components, with
      what the first look at a running copy added (a Greek name was not found; the counts
      answered without a sign-in). The details are under "In v1.18.73".
61. **Found on 2026-11-17 while the Search page was repaired, and not changed.**
    - *Two search endpoints that cannot answer.* `POST /search/students/full-text` calls a
      method the search service does not have, and `POST /search/students/advanced` filters
      and orders by a status and two dates that a student record does not have. Both answer
      every request with `SEARCH_ERROR` (seen on a scratch server). No page calls them.
      Remove or repair (the owner's call).
    - *An older copy of the search code that nothing uses:* `src/frontend/src/hooks/useSearch.ts`
      (512 lines), `hooks/useSearchFacets.ts` and the test of the first; the page uses the
      files of the same names under `features/search`. And in that hook four functions for
      saved searches that no page calls. Delete (the owner's OK).
    - *Left without a user when the four components of todo 60 were deleted (PR 418):* the
      hook `useVirtualScroll` with its test, and `features/students/StudentRow.tsx`; only
      `VirtualStudentList` used them. A second `StudentRow.tsx` lies among the E2E tests
      (`tests/e2e/StudentRow.tsx`) and nothing imports it. And three runner scripts of early
      2026 in that folder (`run-batch-8-tests.ps1`, `run-batch-9-tests.ps1`,
      `run-full-regression.ps1`) start one or two spec files each, and the third calls the
      result "ready for release"; nothing uses them but a deployment checklist of v1.17.3.
      Delete (the owner's OK).
    - *SQLite does not enforce foreign keys.* `init_db` switches them on for one connection
      at start, and the engine opens a new connection for every use: on the connections the
      application works with, `PRAGMA foreign_keys` answers 0 (seen with the application's
      own engine). PostgreSQL enforces them. Switching it on for SQLite is a decision: an
      installation that already holds a row without its parent would refuse later changes
      to it, so each such database has to be looked at first. **What it led to (found
      2026-11-17, repaired in PR 419):** a deleted account's roles, permissions and
      notifications stayed, and the next account, which SQLite gives the same number, had
      them. Deleting and creating an account now clear those rows themselves. The setting is
      as it was, and other deletions (a student, a course) were not looked at for the same
      effect.
    - *Failures answered with HTTP 200.* Four routers (search, custom reports, import and
      export, dashboards; 83 places) answer a request they could not serve with status 200
      and `success: false` in the body. A page that reads only the status takes a failure
      for an answer, as the Search page did until PR 416.
    - *The search does not know a letter typed as two characters* (a vowel followed by a
      separate accent mark, as some keyboards and pasted texts give it). Names typed in the
      application on a Greek keyboard are not written that way.
62. **The export jobs of the Import/Export page work in one case of many** (found on
    2026-11-17 by the smoke test before v1.18.73; each seen on a scratch server; none of it
    is new in that release).
    - *Whatever format is chosen, the file is an Excel file.* The page sends the format in
      the body of the request (`file_format`); the endpoint starts the work with
      `export_format` from the address, which is "excel" when nothing is given. A job asked
      for as CSV or as PDF is stored as such, its download is named `.csv` or `.pdf`, and
      what is in it is an Excel file. The same fault as the Search page had (todo 60).
    - *With the format in the address, CSV and PDF fail:* "'Student' object has no attribute
      'status'".
    - *Two kinds of export that the endpoint accepts never end:* a job for `attendance` or
      for `dashboard` stays "processing". Nothing writes them, and the job is not marked as
      failed.
    - *A teacher can start a job and download its file, and may not look at it:* the role has
      `exports:generate` and `exports:download` and not `exports:view`, so the state of its
      own job and the list of jobs answer 403.
    - *The page itself (Control Panel > Import/Export) does not reach the server where a
      sign-in is required:* its requests carry no token. Seen in a browser as an
      administrator: the list of earlier imports and exports is refused with 401. The export
      dialog asks in the same way, and its value for Excel, "excel", is one the endpoint
      refuses (422; it knows "xlsx").
    - *What works:* an Excel export asked for with a token, which is what the smoke tests of
      this release and of the earlier ones check. The exports under Utils > Export are
      another part of the application and work.
    - *Added on 2026-11-18 by the reading of the panel's old guide (PR 429), read from the
      code and not tried:* the panel's import marks a job "ready" also when rows have
      errors, so the check stops nothing; it recognises a grade by student, course and
      assignment name alone, and a student by the e-mail address among deleted ones too.
      `docs/admin/IMPORT_EXPORT_GUIDE.md` now says what the panel does and sends the reader
      to Utils > Imports and Utils > Export.
    - To do, on the owner's word: repair it as the Search page was repaired, or take the
      dialog off the page. **Repaired in PR 436, on the owner's go-ahead of 19 November
      2026: see its entry under "On `main` since v1.18.73". This todo is closed.**

63. **Found on 2026-11-17 while the permission documents were checked against a running
    copy, and not changed** (each seen on a scratch server; the documents of PR 420 say what
    the application does today, these entries included).
    - **The owner's decisions of 2026-11-18, on what this entry had collected** (one
      message, after the report on PRs 422 to 424): "1. Who may import: both teachers and
      admins. 2. Student accounts: Remove "Student" from the role boxes. 3. Viewer and Guest:
      Remove both considering Removing the built-in permission list for accounts that never
      got a role row, which the note also asks for. It is a larger change: a start-up step,
      and most test fixtures. 4. A teacher has no page for changing their own password, should
      have access there. 5. Fix The audit log does not say who changed a role, and no page
      shows it. 6. About twenty-five older documents (admin and user) were not read: read and
      correct as needed . 7The Weight box of a grade: make it count. Also take up: audit log
      entries that do not say who changed a role; the registration form's message that appears
      in two languages at once; a sentence telling an account without access why its pages
      fail; the text of the one-page PDF behind the help."
      - *Points 1 to 3: done in PR 425* (see its entry: two roles, "No role", the closed list
        of 44 permissions, teachers import).
      - *Point 7: done in PR 426* (the Weight of a grade counts).
      - *Point 4 and three of the four smaller ones: done in PR 427* (every account changes
        its own password; the line for an account without a role; the sign-in form's
        messages; the Quick Guide).
      - *Point 5 and the fourth of the smaller ones: done in PR 428* (the audit log names
        the author, has an entry for every change of an account, a role or a permission,
        and a page shows it).
      - *Point 6: done in PR 429* (twenty-three older documents read against the code and
        corrected, none deleted; and what the reading found in the code). **All seven
        points and the four smaller ones are done.**
      - *Not in the message, and waiting for the owner's word:* a release and the update of
        the cloud VM; whether teachers also get the session file; the four tools nothing runs
        and the two unused page parts (delete or keep); what identifies a grade when a
        session file is imported (see the entry of PR 429). **The owner's go-ahead for all
        of them came on 19 November 2026** (the entry at the head of "On `main` since
        v1.18.73"): teachers and the grade are done in PR 432.
    - *Repaired in PR 423 (2026-11-18), on the owner's note of that day:* revoking an
      account's only role took nothing away. Such an account is now left with nothing (Role
      column "No role"). The built-in list for an account without role rows went altogether
      in PR 425.
    - **The owner's note of 2026-11-18 on the three decisions below** (who may import, student
      accounts, Viewer and Guest) gives a direction for each and leaves the choice open:
      a permission that opens nothing is wired up or deleted, and one the code asks for is
      in the database or the button goes; a student account is tied to a student record when
      it is created, or "Student" leaves the choices (the note calls that the right
      fallback while no link exists), and student accounts without a record are disabled; a
      Viewer gets one purpose that can be said in a sentence, with exports no wider than
      what it can see, or the role goes. What each choice means in this application is in
      the three entries marked with the note below.
    - *Repaired in PR 422 (2026-11-18):* the Permissions Catalog's empty role boxes; the
      requests that could take `*:*` from the administrators; the blank permission names of
      the Overview tab and the invented names of the Users tab; saving a Viewer or Guest
      account from Edit. (The two roles are gone since PR 425.)
    - *Done in PR 427 (the owner, 2026-11-18: "should have access there"):* a teacher had no
      page for changing the own password. As it was: the form is in User Accounts,
      which answers "Access Denied" to everybody but an administrator. A teacher asks an
      administrator for a reset.
    - *Done in PR 428 (the owner, 2026-11-18: "Fix"):* the audit log did not say who made
      a role or permission change. As it was: `user_id` and
      `user_email` are empty in those entries. And no page shows the audit log; only the API
      answers.
    - *Decided and done in PR 425 ("both teachers and admins"; the list is closed):*
      thirteen permissions the code asked for were not in the database, and eight in the
      database opened nothing. As it was: not in the database, so that only an administrator passes:
      `imports:create` and `imports:view` (a teacher cannot import, although the role holds
      `system:import`), `sessions:manage` (session export and import), `exports:view` (todo
      62), the four `jobs:` ones, the two `diagnostics:` ones, `admin:manage`,
      `reports:create`, `analytics:export`. In the database and asked for by no endpoint:
      `analytics:view`, `enrollments:view`, `enrollments:manage`, `system:import`,
      `system:export` and the three `.self:read`. And the built-in list for `viewer` lacks
      the two `exports:` permissions that the role's rows have. To decide: who should import,
      and whether the list is tidied. *With the note:* the choice is "administrators only"
      (the Imports tab and the session panel are then not offered to others, and
      `system:import` goes) or "teachers too" (the import permissions are added to the
      database and given to the role teacher). Either way, by the note: the thirteen keys get
      rows, so that the Permissions Catalog can grant them; each of the eight that open
      nothing is put on the endpoints it names or removed by a migration; and a test fails
      when an endpoint asks for a key that has no row.
    - *Decided and done in PR 425 ("Remove "Student" from the role boxes"; existing ones
      became "No role"):* a student account could do nothing. As it was: the code lets it read the student record that
      belongs to its account; nothing in the application ever ties a student record to an
      account (`students.user_id` is never set). Build that, or take "Student" off the role
      choices; today its one use is as the role without access. *With the note:* "No role"
      (PR 423) is now the state without access, so "Student" can leave the two role boxes
      without a gap; existing Student accounts would become "No role" by a migration, which
      changes nothing for them. Building the link instead is a feature of its own: a way to
      tie a record to an account, the student's own pages, and the privacy notice.
    - *Decided and done in PR 425 ("Remove both"):* a viewer exported everything and saw no
      figures. As it was: the viewer and guest roles hold
      `exports:generate` and `exports:download` (every list, and the ZIP of all data) and not
      `reports:generate`, so the Dashboard and the Analytics page open empty with refused
      requests. And every page shows a viewer its "Add" and "Save" buttons, which the server
      refuses. Whether read-only accounts are wanted at all is the owner's call. *With the
      note:* "remove Viewer and Guest" (their accounts become "No role", the roles and their
      grants go by a migration), or "one read-only role" that sees the figures
      (`reports:generate`), exports nothing, and is offered in User Accounts; the pages'
      "Add" and "Save" buttons would then still show and be refused, unless they are hidden
      for it, which is the larger part of that work.
    - *Two addresses answer without a sign-in that probably should not:*
      `GET /api/v1/analytics/reports/templates` (an empty list on the scratch copy) and
      `GET /control/api/restart` (whether a restart is possible here).
    - *The "User Guide" of Utils > Help & Documentation ("Complete reference guide", "Download
      English PDF") is a leaflet of one page* that the server composes itself
      (`routers_help.py`). `USER_GUIDE_COMPLETE.md` is not in the application.
    - *Older documents and tools of the same kind* (the owner, 2026-11-18, on the
      documents: "read and correct as needed"). **The documents: done in PR 429**, these
      nine and fourteen more. The tools below are still as they were. As it was: `docs/admin/`
      `PERMISSION_MANAGEMENT_GUIDE.md` (930 lines), `RBAC_OPERATIONS_GUIDE.md` (1,184),
      `RBAC_CODEBASE_REVIEW.md`, `RBAC_ENDPOINT_AUDIT.md`, `RBAC_DATABASE_SCHEMA.md`,
      `PERMISSION_MATRIX_ENDPOINT_MAPPING.md`; `docs/user/RBAC_GUIDE.md` and its Greek twin;
      `src/backend/API_PERMISSIONS_REFERENCE.md`. Most are from the design months and likely
      wrong in the same ways. And tools nothing runs (**deleted in PR 434**): `src/backend/scripts/seed_permissions.py`
      ("53 permissions", a second seed beside the one the application uses), and
      `scripts/audit_router_permissions.py`, `validate_rbac_decorators.py` and
      `rbac_monitor.py`, which look for `backend/routers` where it was before the folders
      were moved. Delete, or read and correct (the owner's OK).
    - *Seen once and not explained:* a scratch server on port 8013 stopped, without a line in
      its log, while the commit gate ran its first backend batches in the same clone. It did
      not happen during the next two gates.
    - **Added by the reading for the user guide (PR 421), none of it changed:**
    - *Repaired in PR 422:* the two names of texts ("currentRules:",
      "failedToLoadSemesters"), with a test that finds such keys; the session panel tells a
      refused account that it may not use it.
    - *Done in PR 424 (2026-11-18):* the help of Utils > Help & Documentation, read against
      the pages and written anew in both languages.
    - **Added by the reading of the help (PR 424), none of it changed:**
    - *Done in PR 426 (the owner, 2026-11-18: "make it count"):* the "Weight" of a grade
      changed nothing. As it was: Grades > Grade Entry has the box, with the
      hint "Higher weight = more important (1.0 is normal)", and Grade History shows it
      ("×1"). The final grade takes the plain average of a category's grades (tried: 20/20
      with weight 1 and 0/20 with weight 3 give 50%). Make it count within its category, or
      take the box away: the owner's call. Until then the help and the guide say that it
      does nothing.
    - *Two things nothing uses* (**deleted in PR 434**)*:* `components/tools/DevTools.tsx` (a panel with "Add Sample
      Data") is imported by no page, and `adminOpsAPI.generateSampleData` is called by
      nothing; the server's `POST /adminops/generate-sample-data` is therefore reachable
      only by hand. Delete, or put the button on a page (the owner's OK).
    - *Done in PR 427:* the one-page PDF of the help ("Quick Guide"), composed by
      `routers_help.py`, was read against the pages and written anew.
    - *Done in PR 427:* an account without access (No role) was not told why its pages
      fail. As it was: it sees
      "Error loading analytics data", "Failed to load data" and the like. One sentence at
      the top ("Your account has no role…") would say it.
    - *Not tried from end to end:* a scheduled report and a report sent by e-mail.
    - *Repaired in PR 425:* the privacy notice of the application said "A student account
      sees its own records only". It says now that students have no accounts.
    - *Repaired in PR 422:* the label "Courses" for a date of enrolment on a student's page.
      The "N/A" dates of "Recent Grades" were narrower than written here: only a grade
      without a "date submitted" (see the entry of PR 422).
    - *Done in PR 427 (it was the sign-in form):* an empty address was answered in two
      languages at once: "Παρακαλώ
      εισάγετε τη διεύθυνση email σας. / Please enter your email."
    - *A teacher is shown System > Control Panel > Maintenance > System Operations* with
      Backup Database, Restore DB and Clear DB. Clear is refused by the server. Backup and
      restore go through the Control API, which passes any request from the computer the
      application runs on (seen: its status answers a teacher, and a request without a
      sign-in, there). So on a shared PC with SMS Lite a teacher could restore another
      database; that was not tried. It is the Control API's rule as designed
      (`PERMISSION_MATRIX.md`); whether the panel should be shown to a teacher is the
      owner's call.
    - *Fifteen older user documents were not read* (the owner, 2026-11-18: "read and correct
      as needed"; open) (listed in `docs/user/INDEX.md`): two
      quick-start guides, three older user guides (one of v1.9.7), the theme, localization,
      import/export and rate-limiting guides, the two RBAC guides and a note on PDF
      conversion. There is no Greek version of the checked guide. Delete, or read and
      correct (the owner's OK).

**Older entries that are still open** (they keep their numbers; the closed entries that
stood between them are in part 2 of [`UNIFIED_WORK_PLAN_ARCHIVE_2026_H2.md`](./UNIFIED_WORK_PLAN_ARCHIVE_2026_H2.md)):

40. **A real Update install, end to end** (open since the v1.18.57 smoke test, 2026-10-13; todo 28) —
    verified so far: the update check offers the published release on a frozen Lite and on Docker.
    Never exercised: the Lite installer through UAC, the Docker host task, and the Android offer on
    a device. Each needs an install one release behind a published one: v1.18.66 is now out, so a
    PC on v1.18.65 can be updated to it.

<!-- -->

44. **Cloud host: deploy the backend on Oracle Always Free, keeping today's setup as the backup**
    (owner approved todo 19's proposal on 2026-11-12) — Oracle Always Free, home region
    Frankfurt, ARM (A1) with the AMD micro as fallback; the backend on the VM, PostgreSQL stays on
    the QNAP over Tailscale. **Owner's condition: the current way of running (the home PC's Docker
    or Lite against the QNAP database) stays in place as a backup, for redundancy**; the cloud
    host is added, nothing is retired. Steps, in order:
    - *Repository side (the assistant can do these now):* an image that runs on arm64 (never
      built: settle the Python wheels with a build-only run, see todo 48); a short Linux deploy
      for the VM (compose file, environment template, no `DOCKER.ps1`); `CORS_ORIGINS` with
      `https://localhost` and `TRUSTED_HOSTS` for the VM; a runbook under `docs/deployment/`.
      **Done 2026-11-13, unreleased and not yet run on a VM:** `infra/docker/cloud/`
      (`docker-compose.cloud.yml`: the full-stack image built on the VM, the QNAP database through
      `POSTGRES_*`, port 8000 on loopback only, `COOKIE_SECURE`, no default admin, no Redis; and
      `.env.cloud.example`) and the runbook `docs/deployment/CLOUD_HOST_ORACLE.md` (VM, Tailscale
      with `--accept-routes`, `tailscale serve` for tailnet-only HTTPS, phones, switching back to
      the home address, running both hosts on the same release). The backend's settings were
      loaded with that environment and gave the expected database URL, CORS list and trusted
      host; nothing else in it has been executed.
    - *Owner side:* open the Oracle account with Frankfurt as home region (card and phone needed),
      create the VM, join it to the tailnet. Before student data flows through it: confirm that
      Oracle's data-processing agreement covers Always Free and that ΜΙΕΕΚ policy allows it.
    - *Then, on the real VM:* measure VM-to-QNAP latency, decide how to keep the instance from
      being reclaimed as idle, point one phone at it, and write down how to switch a phone back
      to the home address when the VM is unavailable (and the other way round).
    - **Deployed 2026-11-13, with the owner at the Oracle console:** account `mieeksms`, home
      region Frankfurt; VM `sms-cloud` (A1.Flex, 1 OCPU, 6 GB, Ubuntu 24.04 `aarch64`, AD-1 after
      AD-2 was out of capacity). Docker, Tailscale and the app at `553ece489` were installed over
      SSH; the image built on the VM; `tailscale serve` publishes
      `https://sms-cloud.tail85a28b.ts.net` to the tailnet only. The owner chose to connect the
      **real QNAP database** at once; it was already at `d3a7b9c1e5f2`. Checked from the dev PC:
      SPA over HTTPS, a wrong login refused (400), data without a token refused (401), version
      v1.18.67. The owner logged in and used it: "works", but pages took over 3 seconds (todo 49).
    - **The QNAP is now a tailnet device itself** (`konaki`), and the VM connects to its tailnet
      address on port 55433. Before that it went through the dev PC `REC`'s subnet route, which
      only works while that PC is on. The database port is not reachable on the home public
      address (checked from the VM).
    - **Still open:** the two confirmations (Oracle's data-processing agreement for Always Free;
      ΜΙΕΕΚ policy); the phone pointed at the cloud address; idle reclamation; Tailscale key
      expiry for the VM and the QNAP; the VM still runs files copied by hand for todo 49 and
      must be moved to the merged commit. The runbook lists the rest.

<!-- -->

48. **Docker image: build-only run before each tag, and an arm64 build** (suggested 2026-11-12,
    accepted) — dispatch `docker-publish.yml` with `dry_run` in the release flow, so a broken
    `Dockerfile.fullstack` shows in CI and not on the owner's PC, and add `linux/arm64` to it
    (needed for todo 44's ARM VM; whether every Python wheel exists for arm64 is unknown).
    - **arm64 half done 2026-11-12:** `docker-publish.yml` has a `platforms` input (amd64, arm64
      or both; arm64 under QEMU) and the Dockerfile's frontend stage builds on
      `$BUILDPLATFORM`, so npm never runs emulated. A build-only arm64 run on the branch (run
      43314118411) succeeded in 5.5 minutes: 42 `aarch64` wheels downloaded, nothing compiled
      from source. The image was built, not started: its first real run is on the VM.
    - ~~**Still open:** dispatching the build-only run from the release flow.~~ **Closed by
      PR 413 (2026-11-17):** `DOCKER_BUILD_CHECK.ps1` dispatches the build-only run for both
      platforms and `RELEASE_READY.ps1` tags only after it passed; before a tag made by hand
      it is run on the commit that gets the tag (under "In v1.18.73"). **Used for the first
      time in the release of v1.18.73 (2026-11-17):** started by `RELEASE_READY` for the
      release commit, then run by hand on the commit that got the tag; both runs passed for
      both platforms (the top of this document).

<!-- -->

50. **Privacy hardening after a consent / GDPR review** (owner, 2026-11-13: "make sure that comply
    by Consent Management Checklist for GDPR Cyprus Compliance" before the cloud VM is updated;
    then "do all recommended") — no checklist by that name exists in the project, so the app was
    checked against GDPR Articles 6-9, Law 125(I)/2018 and the cookie rule of Law 112(I)/2004.
    Passing already: only strictly necessary cookies, no tracking, no third-party scripts.
    - **Done 2026-11-13 (unreleased):** health information left the general student response
      and is admin-only (`/students/{id}/health`), is masked in the audit log and is out of the
      semester export unless an administrator asks (the encrypted archive keeps it); the staff
      notes moved from the browser's `localStorage` to the server, per account (additive
      migration `f6c3d8b1a2e4`), with a one-time move of what a browser still holds; a public
      Privacy page (EN/EL) linked from the footer, with the controller's contacts from four
      `PRIVACY_*` settings. Described in `docs/admin/PRIVACY_AND_GDPR.md`.
    - **The owner's / ΜΙΕΕΚ's, not code:** the lawful basis in writing (and the Article 9
      condition for health data, or clearing that column), retention periods, Oracle's
      data-processing agreement for Always Free, the wording of the notice and the four contact
      settings. **The cloud VM stays on `54eab4a67` until the owner says otherwise.**
    - **Second round, same day (owner: "try to satisfy all above at a default state as
      recommended"), unreleased:** an administrator-only section in the student Edit dialog
      with the health information, a personal-data file for access requests
      (`/data-subject/students/{id}/export`, soft-deleted records included) and permanent
      erasure (`DELETE /data-subject/students/{id}`, registry number typed to confirm; audit
      entries of that student lose their personal details). The admin document gained a table
      of recommended defaults (lawful basis, health data, retention, hosting) that the
      institution confirms or changes; none is enforced automatically.
    - **Deliberately not done:** a consent register (nothing relies on consent), automatic
      deletion by retention period (no period has been decided, and deleting real records on a
      guess is not a default), and switching health recording off (the CSV import carries a
      health column on purpose; it is now admin-only instead). Oracle's agreement for Always
      Free could not be confirmed from public documents.
    - **Health data switched off, 2026-11-13 (owner: "make sure that no health data is passed
      ... if exist, we have to correct it asap"; no payment is possible, so the host stays on
      Always Free).** Oracle's Data Processing Agreement (14 August 2025) was read: no trial
      exclusion, but section 2.6 rules out regulated health data. A count on the real database
      found health text for 4 of 81 students and copies in 6 audit rows; the owner chose to
      delete it, and it was removed the same day (verified by count: 0 and 0, 81 students).
      `HEALTH_DATA_ENABLED` (default false) now keeps the app from storing, importing, showing
      or exporting it, with a guard on the model itself; the cloud compose file fixes it to
      false. **Not reached:** database backups, semester archives and export files made before
      that day may still contain the text. **Still open:** read the Oracle Cloud Services
      Agreement accepted at sign-up for how it treats a free account.

**Open design calls from the dark-theme work of 2026-10-07** (the owner's decision; the rest of
that entry is in part 2 of the archive):

- **Still below 3:1 in every theme (design calls, owner's decision):** white text on the
  Attendance Quick Actions "Present" (green-500, 2.3:1) and "Late" (yellow-500, 1.9:1)
  buttons; the light footer (`text-gray-400`, 2.5:1); small `text-slate-400` and
  `text-emerald-500` text on the dashboard (2.3–2.6:1). Not issues: greyed calendar days
  (disabled), the Operations section headings (audit false positive, checked visually);
  the Semester Archive "Preview" button looks like a dimmed disabled button (not checked).

**Where the rest went (2026-11-15, todo 57).** The closed entries of this list, the notes that
stood between them (the Tailwind 4 migration, the dependency rounds, the September and October
follow-ups) and the dated sections from September 29 back to June 15, 2026 are in
[`UNIFIED_WORK_PLAN_ARCHIVE_2026_H2.md`](./UNIFIED_WORK_PLAN_ARCHIVE_2026_H2.md), word for word. A section this plan names and
does not contain is there.

## 🗄️ Historical Archive (Feb–Aug 2026)

Older release-cycle logs (Feb 2026 Phase 6 work through the many v1.18.25
publication/preparation snapshots, April 2026) have been moved to
[`UNIFIED_WORK_PLAN_ARCHIVE_2026_H1.md`](./UNIFIED_WORK_PLAN_ARCHIVE_2026_H1.md)
to keep this file focused on current/recent state. Nothing in the archive
reflects current app state — check the sections above and `CHANGELOG.md`
for that.

The records from June 15 to early November 2026 (v1.18.29 to v1.18.65, the closed todos and
the dated sections) followed on 2026-11-15, into
[`UNIFIED_WORK_PLAN_ARCHIVE_2026_H2.md`](./UNIFIED_WORK_PLAN_ARCHIVE_2026_H2.md).

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
- [`UNIFIED_WORK_PLAN_ARCHIVE_2026_H2.md`](./UNIFIED_WORK_PLAN_ARCHIVE_2026_H2.md) - June to November 2026: v1.18.29 to v1.18.65, the closed todos and the dated sections, as they stood in this plan

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
