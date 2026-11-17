# Unified Work Plan - Student Management System

**Current Version**: 1.18.73
**Last Updated**: November 18, 2026
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
`main` carries PRs 419 to 421, unreleased: a repair of two ways an account kept access it
should not have had (419), and the permission documents and the user guide checked against
the application (420, 421). The VM has neither; on it an account changed to "Student" still
keeps its old access. What the two readings found and did not change is todo 63.** Older entries that are still open, further
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
    - To do, on the owner's word: repair it as the Search page was repaired, or take the
      dialog off the page.

63. **Found on 2026-11-17 while the permission documents were checked against a running
    copy, and not changed** (each seen on a scratch server; the documents of PR 420 say what
    the application does today, these entries included).
    - *Revoking an account's only role takes nothing away.* Control Panel > Maintenance > RBAC
      Configuration > Assign Role to User > Revoke removes the row, answers "revoked", and
      the account goes on as before: the word in its Role column stays, and an account
      without role rows gets the built-in permissions of that word (`_default_role_permissions`).
      A teacher whose Teacher role was revoked still read, added and exported students. What
      should such an account become: a Student, or nothing at all? The owner's call; it is a
      few lines either way. Until then the guide says how access is taken away (Edit: role
      Student, or untick Active).
    - *The Permissions Catalog cannot grant to a role, or revoke from one.* The box that
      should list the roles is empty: the page asks `GET /rbac/roles`, which does not exist
      (the address is `/admin/rbac/roles`). Granting to one account by its number works.
    - *The same catalog's request can lock every administrator out.*
      `POST /permissions/roles/revoke` accepts `*:*` for the role `admin`
      (`POST /admin/rbac/revoke-permission` refuses it). After it no administrator can open
      the account or role panels. A restart puts the grant back. The page cannot send it
      today, because of the entry above.
    - *The Overview tab shows no permission names* (it reads `name`; the server sends `key`):
      39 blank rows, and "Role-Permission Mappings" with the role and nothing after the
      arrow. *The Users tab shows invented names:* "User 3", "user_3@system", "Legacy role:
      user" for every account. And `rbacAPI.grantPermission` in `api.ts` posts to
      `/admin/rbac/grant-permission`, which does not exist; nothing calls it.
    - *An account with the role Viewer or Guest cannot be saved from Edit in User Accounts.*
      The role box offers Administrator, Teacher and Student, shows "Administrator" for such
      an account and sends "viewer", which the server refuses (422, "Could not update user").
      Nor can such an account be created there. To repair: offer the two roles in both
      places, or take them out of Assign Role to User.
    - *A teacher has no page for changing the own password.* The form is in User Accounts,
      which answers "Access Denied" to everybody but an administrator. A teacher asks an
      administrator for a reset.
    - *The audit log does not say who made a role or permission change:* `user_id` and
      `user_email` are empty in those entries. And no page shows the audit log; only the API
      answers.
    - *Thirteen permissions the code asks for are not in the database, and eight in the
      database open nothing.* Not in the database, so that only an administrator passes:
      `imports:create` and `imports:view` (a teacher cannot import, although the role holds
      `system:import`), `sessions:manage` (session export and import), `exports:view` (todo
      62), the four `jobs:` ones, the two `diagnostics:` ones, `admin:manage`,
      `reports:create`, `analytics:export`. In the database and asked for by no endpoint:
      `analytics:view`, `enrollments:view`, `enrollments:manage`, `system:import`,
      `system:export` and the three `.self:read`. And the built-in list for `viewer` lacks
      the two `exports:` permissions that the role's rows have. To decide: who should import,
      and whether the list is tidied.
    - *A student account can do nothing.* The code lets it read the student record that
      belongs to its account; nothing in the application ever ties a student record to an
      account (`students.user_id` is never set). Build that, or take "Student" off the role
      choices; today its one use is as the role without access.
    - *A viewer exports everything and sees no figures.* The viewer and guest roles hold
      `exports:generate` and `exports:download` (every list, and the ZIP of all data) and not
      `reports:generate`, so the Dashboard and the Analytics page open empty with refused
      requests. And every page shows a viewer its "Add" and "Save" buttons, which the server
      refuses. Whether read-only accounts are wanted at all is the owner's call.
    - *Two addresses answer without a sign-in that probably should not:*
      `GET /api/v1/analytics/reports/templates` (an empty list on the scratch copy) and
      `GET /control/api/restart` (whether a restart is possible here).
    - *The "User Guide" of Utils > Help & Documentation ("Complete reference guide", "Download
      English PDF") is a leaflet of one page* that the server composes itself
      (`routers_help.py`). `USER_GUIDE_COMPLETE.md` is not in the application.
    - *Older documents and tools of the same kind, not read:* `docs/admin/`
      `PERMISSION_MANAGEMENT_GUIDE.md` (930 lines), `RBAC_OPERATIONS_GUIDE.md` (1,184),
      `RBAC_CODEBASE_REVIEW.md`, `RBAC_ENDPOINT_AUDIT.md`, `RBAC_DATABASE_SCHEMA.md`,
      `PERMISSION_MATRIX_ENDPOINT_MAPPING.md`; `docs/user/RBAC_GUIDE.md` and its Greek twin;
      `src/backend/API_PERMISSIONS_REFERENCE.md`. Most are from the design months and likely
      wrong in the same ways. And tools nothing runs: `src/backend/scripts/seed_permissions.py`
      ("53 permissions", a second seed beside the one the application uses), and
      `scripts/audit_router_permissions.py`, `validate_rbac_decorators.py` and
      `rbac_monitor.py`, which look for `backend/routers` where it was before the folders
      were moved. Delete, or read and correct (the owner's OK).
    - *Seen once and not explained:* a scratch server on port 8013 stopped, without a line in
      its log, while the commit gate ran its first backend batches in the same clone. It did
      not happen during the next two gates.
    - **Added by the reading for the user guide (PR 421), none of it changed:**
    - *Two pages show the name of a text where the text should be:* "currentRules:" above
      the rules of a course (Courses > Evaluation Rules), and "failedToLoadSemesters" in
      Utils > Export > Session Export/Import for a teacher, whose request for the semesters
      is refused. The panel is offered to accounts that cannot use it.
    - *The help of Utils > Help & Documentation is older than the pages in places.* "Click
      Save Attendance" (there is no such button); "Only unexcused absences affect grades"
      (excused periods count towards both absence limits, as the Attendance page itself
      says); "What is absence penalty?" describes a deduction per absence without the limits.
      Eighteen groups, ninety-one answers: they need the reading the guide got.
    - *The privacy notice of the application says "A student account sees its own records
      only".* It sees none (the entry on student accounts above).
    - *On a student's page* the dates of "Recent Grades" read "N/A" for grades that have a
      date, and the line under each enrolled course reads "Courses: 17/11/2026".
    - *The registration form answers an empty address in two languages at once:* "Παρακαλώ
      εισάγετε τη διεύθυνση email σας. / Please enter your email."
    - *A teacher is shown System > Control Panel > Maintenance > System Operations* with
      Backup Database, Restore DB and Clear DB. Clear is refused by the server. Backup and
      restore go through the Control API, which passes any request from the computer the
      application runs on (seen: its status answers a teacher, and a request without a
      sign-in, there). So on a shared PC with SMS Lite a teacher could restore another
      database; that was not tried. It is the Control API's rule as designed
      (`PERMISSION_MATRIX.md`); whether the panel should be shown to a teacher is the
      owner's call.
    - *Fifteen older user documents were not read* (listed in `docs/user/INDEX.md`): two
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
