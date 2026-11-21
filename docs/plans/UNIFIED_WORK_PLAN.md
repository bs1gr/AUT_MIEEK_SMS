# Unified Work Plan - Student Management System

**Current Version**: 1.18.78
**Last Updated**: November 21, 2026
**Status**: ✅ **v1.18.78 released 2026-11-21** (tag on `1ea198829`, run by the assistant; the
owner's go-ahead of 2026-11-20, after going through every open todo: "Release + update VM").
It carries PRs 448 to 455, under "In v1.18.78" below: backups, restore and the other
dangerous Control Panel actions need a signed-in administrator also on the PC itself (448 to
450), a backup right before a migration (451), no log files written into the checkout by a
test run (452), readable leftovers beside encrypted backups removed (453), the Database
panel's backups encrypted (454), readable Present/Late buttons, footer and Dashboard text
(455). **No database change** (the shared database stays at `e2b7c9d4a1f6`; the test data
erased on 2026-11-20 was a data change by hand, under "In v1.18.78").

- **Before the tag:** `RELEASE_READY` (no `-TagRelease`, release commit `41aa010ff`, 93 min
  under a memory watchdog, never under 4.4 GB free): exit 0, backend 2,075 passed, 43 skipped,
  0 failed, the frontend suite passed; the local test installer built and its checks passed
  (never uploaded). The hand-written notes commit `1ea198829` passed `COMMIT_READY -Quick`;
  `DOCKER_BUILD_CHECK.ps1 -Version 1.18.78` on it: the image builds for amd64 and arm64 (4.7
  min; the release commit's own run passed too); CI/CD and E2E green on the same commit; the
  tag's release, installer and APK workflows succeeded.
- **Verified on the published assets:** `SMS_Installer_1.18.78.exe` 87,426,656 bytes, SHA-256
  `e94ccc4d…ffdb` = GitHub's digest, Authenticode Valid, CN=AUT MIEEK, thumbprint
  `2693C1B1…075D`, timestamped, file version v1.18.78, not the local build (90,215,520 bytes);
  `SMS_Android_1.18.78.apk` 4,636,637 bytes, SHA-256 `a94dfa37…2d2e` = GitHub's digest,
  `versionCode 118078`, signer `686fb6ed…d2ea` as before. The release has the hand-written text
  (identical to `.github/RELEASE_NOTES_v1.18.78.md`) and those two files only.
- **The cloud VM runs v1.18.78** (2026-11-21, 07:22 to 07:25 UTC, over SSH, on the same
  go-ahead): `.env` copied to `~/env.cloud.backup.20261121`, the privacy controller's name and
  contact added to it (the owner's values, typed in the session; not recorded here, todo 50),
  `git checkout v1.18.78`, `docker compose up -d --build` (106 s), healthy 19 s later. `/health`
  v1.18.78 with the database connected, on the VM and through the tailnet; the student list
  answers 401 without a sign-in; `/api/v1/privacy/info` answers `configured: true` with the
  owner's values; no ERROR line, no traceback (one WARNING, the standing CSRF notice). **The
  plain panel backup of 16 November was encrypted at the first automatic check** (07:26:00
  UTC, "Encrypted 1 old plain backup(s)…"): `/data/backups/postgres` is empty and
  `primary_student_management_20261116_184624.enc` is in `/data/backups/database`. No
  backup was forced (no database change); the daily one stays at about 15:36 UTC.
- **The owner's Docker test install on the dev PC runs v1.18.78** (2026-11-21, the installer
  run by hand through UAC; todo 40 says why not from the page, and what is still untested).

**Before that: v1.18.77 released 2026-11-20** (tag on `09c7c0d3a`, run by the assistant; the
owner: "review current state and if all todos are covered, prepare a new release so to include
all the changes accordingly"; every open todo waits for the owner, so it carries what `main`
had). It carries PR 447 only, under "In v1.18.77" below: **`/health` no longer holds the event
loop** (todo 52 stage 3) and the dead import validator is gone (todo 56). **No database
change** (the shared database stays at `e2b7c9d4a1f6`).

- **Before the tag:** `RELEASE_READY` (no `-TagRelease`, release commit `da95ba89e`): exit 0,
  backend 1,997 passed, 43 skipped, 0 failed, the frontend suite passed; the local test
  installer built and its smoke and frozen-Lite checks passed (never uploaded). The hand-written
  notes commit `09c7c0d3a` passed `COMMIT_READY -Quick`; `DOCKER_BUILD_CHECK.ps1 -Version
  1.18.77` on it: the image builds for amd64 and arm64 (0.7 min, from the cache of the run on
  `da95ba89e` 15 minutes earlier, 5.6 min; only docs differ); CI/CD and E2E green on the same
  commit; the tag's release, installer and APK workflows succeeded.
- **Verified on the published assets:** `SMS_Installer_1.18.77.exe` 87,421,360 bytes, SHA-256
  `89b11646…f337` = GitHub's digest, Authenticode Valid, CN=AUT MIEEK, thumbprint
  `2693C1B1…075D`, timestamped, file version v1.18.77, not the local build (90,217,600 bytes);
  `SMS_Android_1.18.77.apk` 4,636,109 bytes, SHA-256 `58bd79f5…a214` = GitHub's digest,
  `versionCode 118077`, signer `686fb6ed…d2ea` as before. The release has the hand-written text
  (identical to `.github/RELEASE_NOTES_v1.18.77.md`) and those two files only.
- **The cloud VM was not moved onto the tag.** It runs `main` at `4c4694367` since 07:54 UTC
  (the same code, still reporting v1.18.76); moving it to `v1.18.77` changes only the version
  number and needs the owner's word.

**Before that: v1.18.76 released 2026-11-20** (tag on `46dbfa7ee`, run by the assistant; the
owner: "do all three ... They would then ship in the next release. A v1.18.76 release with PRs
442 to 445. and also Update the cloud VM, which still runs v1.18.74"). It carries PRs 442 to 446,
under "In v1.18.76" below: **the Android app keeps its sign-in** (it lost it on every restart and
every 30 minutes) **and signs in from the phone's password manager**, 230 endpoints that never
wait are plain `def` (todo 52 stage 2), failures answered with their real status instead of 200,
rate limits on 51 write endpoints that had none, SQLite foreign keys where the data allows. **No
database change** (the shared database stays at `e2b7c9d4a1f6`).

- **Before the tag:** `RELEASE_READY` (no `-TagRelease`): exit 0, backend 1,991 passed, 43
  skipped, 0 failed, the frontend suite passed. `DOCKER_BUILD_CHECK.ps1 -Version 1.18.76` on
  `46dbfa7ee` (the commit with the hand-written notes): the image builds for amd64 and arm64
  (5.7 min); CI/CD and E2E green on the same commit; the tag's release, installer and APK
  workflows succeeded.
- **Verified on the published assets:** `SMS_Installer_1.18.76.exe` 87,450,992 bytes, SHA-256
  `e29a5aef…36e3` = GitHub's digest, Authenticode Valid, CN=AUT MIEEK, thumbprint
  `2693C1B1…075D`, timestamped, file version v1.18.76, not the local build (90,216,592 bytes);
  `SMS_Android_1.18.76.apk` 4,636,097 bytes, SHA-256 `a9708c40…97ad` = GitHub's digest,
  `versionCode 118076`, signer `686fb6ed…d2ea` as before; its web bundle carries the app's
  session header and its code the `SavedLoginPlugin`. The release has the hand-written text and
  those two files only.
- **The cloud VM runs v1.18.76** (2026-11-20, 03:20 to 03:23 UTC, over SSH, on the same word):
  `git checkout v1.18.76`, `docker compose up -d --build` (106 s), healthy after 127 s;
  `/health` v1.18.76 with the database connected, on the VM and through the tailnet; no ERROR
  line, no traceback (one WARNING, the standing CSRF notice); the five backups and the key on
  the volume; the student list answers 401 without a sign-in; a preflight from
  `https://localhost` with the app's header is allowed, a renewal without a token answers 401.
  No backup was forced first (no database change; a forced one moves the daily hour, which is
  15:19 UTC again). **Since 07:54 UTC the same day the VM runs `main` at `4c4694367`** (PR 447,
  the `/health` fix, unreleased; it still reports v1.18.76): numbers under "On `main` since
  v1.18.76".
- **On the owner's phone** (Galaxy A55, the published APK installed over Wi-Fi debugging with
  `adb install -r`, updated in place, owner's go-ahead): signed in once, then the app closed
  and reopened from the PC: **still on the Dashboard**, and the cloud server's log shows
  `POST /auth/refresh` 200 at that moment (v1.18.75 never sent one). The sign-in itself went
  through the new sheet: the phone's log shows Android's `CredentialSelectorActivity` for
  `cy.mieek.sms`, Samsung Pass's Credential Manager service answering, the owner's fingerprint,
  the entry selected. The owner's words: "It was already saved since an older try, so I just tap
  fingerprint". **Not seen:** the offer to save a password not yet saved (the owner's was saved
  already). The phone also has a Samsung "Dual App" copy of SMS (Android user 95) that was never
  set up; it shares the code, not the settings.

**Before that: v1.18.75 released 2026-11-19** (tag on `92201ca8e`, run by the assistant; the
owner, after the list of what waited: "create a suitable plan order to accomplish all pending
tasks and suggested, and continue"; step 2 of the order of work in "Next todos"). It carries
PRs 437 to 441 only, under "In v1.18.75" below: a message names its sender and "Specific
users" is a list of names, the in-app setting of an account is honoured, search finds a letter
typed with a separate accent mark, two search endpoints that could never answer are gone, the
installer's pages for both editions and languages, the Docker cleanup no longer leaves SMS
down, and the Updates tab of the Control Panel works in the Docker edition. **No database
change.** The cloud VM was not updated (it runs v1.18.74; that needs the owner's word).

- **Before the tag:** the smoke test of what the release changes (23 checks through the API on
  scratch servers from source): v1.18.74 failed 7, exactly those changes (one: a sender name
  written into the body of a message was kept, so a message could be signed by anyone); the
  candidate passed 23 of 23. `RELEASE_READY` (no `-TagRelease`): exit 0, 1,964 passed and 0
  failed. `DOCKER_BUILD_CHECK.ps1 -Version 1.18.75` on `92201ca8e` (the commit with the
  hand-written notes): success, amd64 and arm64; CI/CD and E2E green on the same commit; the
  tag's release, installer and APK workflows succeeded.
- **Verified on the published assets:** `SMS_Installer_1.18.75.exe` 87,449,640 bytes, SHA-256
  `bbdc1deb…a3bf` = GitHub's digest, Authenticode Valid, CN=AUT MIEEK, thumbprint
  `2693C1B1…075D`, timestamped, file version v1.18.75, not the local build (90,225,888 bytes);
  `SMS_Android_1.18.75.apk` 4,201,246 bytes, SHA-256 `ff560944…d22e`, `versionCode 118075`,
  signer `686fb6ed…d2ea` as before (phones upgrade in place). The release carries the
  hand-written text and those two files only. **Not done:** the installer was not installed,
  the APK not run on a device.

**Before that: v1.18.74 released 2026-11-19** (tag on `fdaa0233a`, run by the assistant; the
owner, after the list of what waited: "after getting finished with the tasks pending, you
should proceed without stop until finish all suggested actions as of these you listed", a
list that begins with "Release v1.18.74 and the cloud VM update"). It carries PRs 419 to 436
and ships what is under "In v1.18.74" below: two roles (Administrator, Teacher) and "No role"
for every other account, four repairs of access an account kept or got, attendance marks that
are no longer lost on a slow connection and a *Clear* that clears, the Weight of a grade, the
session file and the imports for teachers, the audit log with its authors, the Import/Export
panel, the installer's database choice, and the documents read against the application.
**Three database changes, made by the first start** (`5189ab647b5a`, `9c41f7e2a6d3`,
`e2b7c9d4a1f6`): rows of roles and permissions only; the records of students, courses, grades
and attendance are not touched. The open work is listed at the start of "Next todos".

**The Docker build check.** `RELEASE_READY` started a build-only run for the release commit
`b8dd61be8` (run 44451488890: amd64 and arm64, passed, nothing published). The tag was to go
on the commit with the hand-written notes, so `DOCKER_BUILD_CHECK.ps1 -Version 1.18.74` was
run on that commit, `fdaa0233a`: it dispatched run 44453971966, waited 6.8 minutes and ended
with exit code 0. The tag was made after that, and after CI/CD (the backend job 1,928 passed
with 55 skipped, the frontend job 2,135, its E2E job 77) and E2E (77 passed, none flaky, none
skipped) were green on the same commit.

**Before the tag:** the smoke test and the `RELEASE_READY` run are the first entry under "In
v1.18.74". In short: the released v1.18.73 was run first as the "before" (eleven of the
checks fail there, the things this release changes); then the server from source on
PostgreSQL 14.25 upgraded from the database v1.18.73 had made, a first start on SQLite, and
the packaged SMS Lite upgraded with its data, each as an administrator and as a teacher (45 to
48 checks through the API, the packaged-edition check, ten pages in a browser). `RELEASE_READY`
(no `-TagRelease`): 66.8 minutes, exit 0, every gate passed, 62/62 batches with 1,940 passed,
43 gated skips and 0 failed. **Not done: the Docker image was not built or run on this PC**
(its build took the PC's free memory down to 722 MB and the memory watch stopped it; CI builds
it, and the cloud VM built and runs it, below). The installer was not installed, and the
Android app was not run on a device.

**Verified on the published assets:** `SMS_Installer_1.18.74.exe` 87,443,520 bytes, SHA-256
`668215e6…57b320` = GitHub's digest, Authenticode Valid, signer CN=AUT MIEEK, thumbprint
`2693C1B1…075D`, timestamped, file version v1.18.74, and not the file that was built on this
PC (that one has 90,207,816 bytes); `SMS_Android_1.18.74.apk` 4,200,886 bytes, SHA-256
`68525d36…c33c3a` = GitHub's digest, `versionName 1.18.74` / `versionCode 118074`, target SDK
36, signed with the same certificate as v1.18.73 (SHA-256 `686fb6ed…d2ea`, so phones upgrade
in place); three of the new texts are in its bundle (the question of *Clear*, "Εκκαθάριση",
the import wizard's "Nothing is stored yet"). The release on GitHub carries the hand-written
text and those two files only. The release, installer and APK workflows on the tag succeeded.

**The cloud VM runs v1.18.74** (updated 2026-11-19, 04:11 to 04:14 UTC, by the assistant over
SSH, on the same go-ahead). Before: `main` at `38d1111b3` (v1.18.72 with #409), healthy. In
order:

- a read-only record of the shared database's roles, grants and permission list and of the
  counts of its records (taken inside the container; ids, role words and keys only);
- a fresh backup, made on the VM by the application's own function
  (`auto_backup_20261119_041110.enc`, 575,786 bytes): it stays on the VM beside those of 16 to
  18 November, and it was not copied or opened;
- `git checkout v1.18.74` and `docker compose up -d --build`: the image was built in 109
  seconds, and the container was healthy 134 seconds after the build began;
- the container's first start ran the three migrations on the shared database (PostgreSQL
  14.18), in order, from `a7d4e9c2b5f8` to `e2b7c9d4a1f6`.

After: `/health` reports v1.18.74 with the database connected, on the VM and through the
tailnet address; the list of students and the audit log answer 401 without a sign-in; the
log has no ERROR line, no traceback and no skipped router (one WARNING, the standing notice
that CSRF protection is off); the four backups and the key are on the volume. **On the shared
database:** the roles are admin and teacher (viewer and guest are gone with their 18 grants;
no account held either); 44 permissions (eight removed, thirteen added); 51 grants (admin
25, teacher 26, with `sessions:manage` and the import permissions); **both accounts are
administrators and neither was changed**; the counts of accounts, students, courses,
enrolments, grades, attendance rows and audit entries are what they were (2, 81, 55, 84, 34,
1,042, 555). The record of before and after, with the way back, is
`backups\pre_v1.18.74_migration_rows_2026-11-19.json` in the main tree (ignored by git).

Two things the update brought to light, neither changed:

- **The hour of the daily backup moved.** The backup made before the update counts as the
  day's, and the next automatic one comes 24 hours after the newest: at about 04:11 UTC
  (06:11 in Cyprus) from now on, instead of 15:19 UTC (17:19). What is entered during a day
  is in a backup the next morning instead of the same afternoon. An automatic backup forced
  at the wanted hour moves it back (one command on the VM, on the owner's word).
- **On the shared database the role admin holds two rows fewer than on a new database**
  (`reports:export` and `reports:generate`; it held neither before the update). Its wildcard
  opens both, so nothing is refused: only the list of what the role holds, in the Permissions
  Catalog, is two lines shorter than on a new installation.

The status records of v1.18.73 back to v1.18.67 are in part 4 of [`UNIFIED_WORK_PLAN_ARCHIVE_2026_H2.md`](./UNIFIED_WORK_PLAN_ARCHIVE_2026_H2.md), word for
word (moved 2026-11-20, todo 57).

### On `main` since v1.18.78 (unreleased)

**2026-11-21: the release-notes generator keeps Greek text intact** (PR 456, merged as `7bf7a7132`, CI green: 38 checks passed, the new test ran on Linux too; the
owner: "if all ok, continue with next"). `GENERATE_RELEASE_DOCS.ps1` now decodes its `git
log` as UTF-8 (`[Console]::OutputEncoding` set for that one call and put back in a `finally`,
and `i18n.logOutputEncoding=UTF-8`), whatever the console's code page. Test:
`test_release_docs_generator.py::test_greek_in_a_commit_subject_reaches_the_documents_intact`
runs the real generator with the console at code page 737 and a subject with "ΜΙΕΕΚ"; it
fails on the old script (the CHANGELOG line garbled, as in v1.18.78) and passes on the new one.

### In v1.18.78

**Found while releasing v1.18.78 (2026-11-21), fixed after it (above):** `GENERATE_RELEASE_DOCS.ps1`
reads `git log` through the console's code page (737 on the dev PC), so a Greek word in a
commit subject reached `CHANGELOG.md` and `docs/releases/RELEASE_NOTES_v1.18.78.md` garbled
("ΜΙΕΕΚ" in the subject of `2848b2be3`). Corrected by hand in both files. The script needs
`[Console]::OutputEncoding` set to UTF-8 around its `git log` (the same trap as the memory
note on code page 737).

**2026-11-20: the owner went through every open todo before a release** (the owner: "help me
go through all todos one by one before a release"). The answers, each recorded in its todo:
the contrast design calls fixed (PR 455, below); the test data in the shared database erased
(todo 56, the next entry); the privacy controller's name and contact set on the VM when it is
updated, never in the repository (todo 50); the closed records moved to the archive (todo
57, the same day); the Lite update through UAC tried on this PC after the release (todo 40);
todo 44 closed; the two migration runners left as they are (todo 58); and v1.18.78 released
with the cloud VM moved onto it.

**2026-11-20: the test data in the shared database is erased** (todo 56; the owner, shown the
list of soft-deleted rows first: "Test data only"). A read-only listing found 55
soft-deleted students, all test accounts (`SID…`, `PROBE…`, `VRF…`), and 28 soft-deleted
courses, all test courses, plus the live and empty probe course `PC50411`. It also found 21
soft-deleted enrolments of **real** students (S2026001 to S2026017 in AUT0303 on 25
September, and four in AUT0105 and AUT0106 in October): those are someone's un-enrolments
and were **kept**.

- **First a backup:** the application's own encrypted backup, `backup_20261120_224719.enc`
  (581,198 bytes, 30 tables, 2,449 rows), taken by the same code as the panel's. It was
  decrypted afterwards and holds the erased rows (for example `VRF48697`).
- **Then one transaction**, written to refuse anything else: the foreign keys were read from
  `information_schema`, the counts (55 and 29) and the test-like patterns were asserted, and a
  course that held rows of any other student was refused. Deleted: 1 attendance row, 23
  enrolments, 1 daily-performance row and 14 grades of those test students and courses, then
  the 55 students and 29 courses; the old and new values of their 116 audit-log entries were
  set to NULL (the entries stay, without the data). Committed.
- **After:** 26 students, 26 courses (27 before), 40 enrolments, 24 grades, 1,121 attendance
  rows (1,122 before). No soft-deleted student, course or grade remains; the 21 real
  un-enrolments do. No code or schema change.

**2026-11-20: the four contrast design calls of 2026-10-07 are fixed** (PR 455, merged as
`9b462bb56`, CI green: 38 checks, E2E green on a dispatched run; the owner, going through the
open todos before a release: "Fix all four").

- **Measured, not guessed:** the frontend was built and the four elements were placed in a page
  with their real wrapper classes and the compiled CSS, then measured (text against its
  composited background, every stop of a gradient, transitions switched off) in all 32
  combinations of theme (light, dark, relaxing, fancy) and appearance (default and the seven
  named ones). Before, at their worst: Present 2.28:1, Late 1.67, the footer 2.47, the small
  Dashboard text 2.12 to 2.47, the Dashboard card hints 1.61 to 3.35. After, at their worst:
  5.02, 13.17, 5.70, 6.28 and 5.68; every one of the 32 is at least 4.5:1 (WCAG AA for small
  text).
- **What changed:** Present is `bg-green-700` with white text, Late `bg-yellow-400` with
  `text-slate-950` (on the Quick Actions and on each student's row); the footer takes the
  appearance's own muted text colour (`--appearance-muted-text`, grey-600 where an appearance
  sets none), which also fixed a dark theme combined with a light appearance; the semester,
  "+N more" and year-percentage lines of the Dashboard are `text-slate-600`; the hint of a
  Dashboard card is `text-slate-600` instead of its accent colour (darker accents still failed
  on the dark appearances; the card's icon keeps the accent).
- Test: `src/__tests__/contrastDesignCalls.test.ts` (the pairs that failed must not come back;
  its three tests fail on the old code, as checked). The two Attendance E2E tests that check a
  marked button's colour (`student-management.spec.ts`) look for the new classes.

**2026-11-20: the Database panel's backups are the application's encrypted backups** (PR 454,
merged as `a16769ce7`, CI green: 38 checks passed, CodeQL clean after its two alerts were
repaired; todo 58; the owner: "make that panel use the same encrypted backup as everything
else"). The one plain panel backup on the VM
(`/data/backups/postgres/primary_student_management_20261116_184624.sql.gz`) is encrypted by
the first automatic check after the VM runs a release with this change.

- **Found:** Control Panel > Maintenance > Database Management wrote its own backups (pg_dump
  scripts or data-only COPY files, some gzipped) **in the clear** into
  `<BACKUPS_DIR>/postgres`, with a list of its own; every other backup was encrypted in
  `<BACKUPS_DIR>/database`.
- **Now** (`services/database_panel_backups.py`, the panel's endpoints): Backup makes the same
  encrypted backup as Manage Backups (`create_database_backup`: the configured `DATABASE_URL`
  for the primary, an extra instance by its own settings, never through an address built from
  its password);
  the list shows the encrypted PostgreSQL backups of that folder (automatic, manual,
  pre-migration), each matched to its instance by host and database name; Download serves the
  `.enc` file; Delete removes it with its metadata; Restore decrypts in a private temporary
  folder and hands the content to the same engine as before (`restore_sql_content`). Only plain
  `*.enc` names are accepted. A SQLite backup is left to Manage Backups.
- **The old plain files** are encrypted where they lie at every automatic backup check
  (`encrypt_legacy_plaintext`): SQL unzipped, encrypted as `<name>.enc`, decrypted again and
  compared byte for byte, and only then the plain file and its `.meta.json` deleted. A file
  younger than ten minutes waits (a backup in progress passes through that folder).
- **The page:** each backup carries an "Encrypted" label (EN/EL, with a hint that a downloaded
  copy opens only with the installation's key); the data-only notice no longer says "or with
  psql"; the Backup request drops the gzip option the server now ignores.
- Tests: `test_database_panel_backups.py` (backup, address of an extra instance, the list,
  names, delete, restore through the same engine, SQLite refused, legacy files encrypted and
  checked, a young file waits, a mismatch keeps the plain file, the automatic check does it,
  the endpoints end to end; two of them fail on the old router and check, as checked); the
  traversal test of the download accepts only `*.enc` names; a Vitest test of the panel.

**2026-11-20: the readable copies older builds left beside encrypted backups are removed**
(PR 453, merged as `1011c4e93`, CI green: 38 checks passed; todo 58).

- `database_backup.remove_readable_leftovers()`, at every automatic backup check (the first a
  minute after the start; also when the automatic backup is switched off): a `<name>.db` in
  `<BACKUPS_DIR>/database` is deleted only when a non-empty `<name>.enc` stands beside it, which
  is how builds up to v1.18.70 left them on Windows (the whole SQLite database in the clear). A
  backup made unencrypted on purpose has no twin and stays; nothing else is touched. The log
  names what was removed. The v1.18.71 notes asked people to delete them by hand.
- Tests: `test_readable_backup_leftovers.py` (removed beside a twin; kept without one, with an
  empty twin, and for other files; no folder; done by the check even when switched off).

**2026-11-20: a test run writes no log files into the checkout** (PR 452, merged as
`84317544a`, CI green: 38 checks passed; todo 58).

- One setting, `SMS_LOG_DIR` (`backend.logging_config.log_dir_override`), moves every log file
  the server writes by default: `app.log` (the app factory), `migrations.log` (both runners,
  through `migrations_log_dir`) and the log of a development frontend started from the
  Control Panel. The Control Panel's log viewer reads `app.log` from there too. Unset, nothing
  changes. An explicit `log_dir` passed to `initialize_logging` still wins.
- `conftest.py` sets it to a temporary folder for the run, as it does for `BACKUPS_DIR`. Before,
  every run added to the checkout's `logs/migrations.log` (900 KB in a clone),
  `src/backend/logs/app.log` (rotating, a few MB) and left an empty `src/logs/frontend-*.log`
  per Control API start test (about forty in a clone). Measured: the checkout's three log
  folders are byte for byte the same after the affected test files ran (5,845,439 bytes).
- Tests: `test_log_dir_setting.py`; the default-folder test clears the setting.

**2026-11-20: a backup right before a migration changes the database** (PR 451, merged as
`df41a31fc`, CI green: 38 checks passed; todo 58, taken up on the owner's "continue", which
asked for best practices).

- `services/pre_migration_backup.py`, called by both migration runners before `upgrade head`:
  when migrations are pending it makes an encrypted `pre_migration_<timestamp>.enc` in
  `<BACKUPS_DIR>/database`, of the very database the runner migrates (the runner's Alembic URL,
  by the rule of `migrations/env.py`, not merely `DATABASE_URL`; `create_database_backup` takes
  a `db_url` for it).
- **No backup** for a new empty database, one already at head, or one at a revision this code
  does not know (a newer release migrated it; this code does not migrate it either).
- **A failed backup stops the migration** (the usual rule for an upgrade that changes data): the
  runner reports failure, the log names `SMS_SKIP_MIGRATION_BACKUP=1` for an operator who has a
  backup of their own, and the administrators get a bell notice. A database the backup cannot
  handle at all (in-memory, an unsupported engine) is not a failure.
- These backups are listed and restored like any other and are never pruned by the automatic
  retention. `docs/admin/BACKUP_AND_RESTORE.md` has a section "Before an update changes the
  database".
- Tests: `test_pre_migration_backup.py` (a backup that restores the row and the old revision;
  the three cases without one; a failed backup leaves the database at its old revision and tells
  the administrators; the skip setting; both runners back up, then migrate). The three runner
  tests fail on the runners without the step (checked). On SQLite; the PostgreSQL path is the
  automatic backup's own, proven in the restore drill.

**2026-11-20: the sign-in settings, credential import and update install need a signed-in
administrator too** (PR 450, merged as `f9c6815f3`, CI green, the E2E run dispatched by hand
passed; the owner's "yes" to the three actions PR 449 left on the same-machine rule).

- `require_signed_in_control_admin` now also guards `GET`/`POST
  /control/api/maintenance/auth-settings` (the settings can switch sign-in off), `POST
  /control/api/database/import-credentials` (it points the server at another database), `POST
  /control/api/maintenance/updates/auto-install` and its `…/{job_id}/status`. Its refusal says
  "This needs a signed-in administrator." The update check stays open to anyone at the PC.
- **The page:** Control Panel > Updates keeps the check for everyone, but for an account that
  is not an administrator the install button is off, with a note that says why (EN/EL key
  `updateNeedsAdmin`), instead of a button the server refuses.
- Tests: `test_control_backups_need_admin.py` is now `test_control_admin_only.py` and covers
  the five addresses as well; the tests of these endpoints sign in as a real administrator
  (`control_admin_headers`); two Vitest cases for the Updates panel by role.
  `PERMISSION_MATRIX.md` regenerated (5 rows) and its text names the new members.

**2026-11-20: backups, restore and the database's contents need a signed-in administrator,
also on the PC itself** (PR 449, merged as `32e9e019e`, CI green: 38 checks passed, none
failed; the server side of the same decision as PR 448). Neither PR changes the database;
the cloud VM and the home installs get both with the next release.

- **The rule:** `require_signed_in_control_admin` in `control_auth.py` passes an
  administrator's access token or the operator's `X-ADMIN-TOKEN`, and nothing else; the
  same-machine trust of `require_control_admin` does not apply. It guards 19 endpoints: every
  backup address of `/control/api/operations/database-*` and `/control/api/database/backups…`
  (list, make, download, zip, save to a folder, delete, restore, upload a database), and
  `/api/v1/admin/list-encrypted-backups`, `reset-database` (drops every table) and
  `sample-data` (writes test students). The last three were not named in the decision; they
  belong to the same family and passed with no sign-in from the PC. Start, stop, restart and
  the status keep the same-machine rule that the PC's own tools rely on. No script or tool
  called the guarded endpoints; both pages send the signed-in user's token.
- ~~**Not changed, and worth a look (same-machine rule still applies):**
  `POST /control/api/maintenance/auth-settings` (it can set `AUTH_MODE`),
  `POST /control/api/database/import-credentials` (it can point the server at another
  database) and `POST /control/api/maintenance/updates/auto-install`.~~ **Done the same day
  on the owner's "yes"** (the entry above).
- **Found in the tests:** the `admin_token` fixture is a teacher (registration never grants
  `admin`), and `control_auth` looked up tokens in another database than the test's. Every
  Control API test passed only because the test client counts as the same machine. The
  `client` fixture now hands `control_auth` the test's own session, and a new
  `control_admin_headers` fixture is a real administrator; the backup tests use it.
  `test_backup_requires_authentication` accepted 200, 400, 401, 404 or 500 and now asks for 403.
- Tests: `test_control_backups_need_admin.py` (all 15 addresses refuse nobody signed in and a
  teacher on the same machine; an administrator and the operator token pass; the status still
  trusts the machine). `PERMISSION_MATRIX.md` regenerated (19 rows changed) and its text
  explains the second rule.

**2026-11-20: unused endpoints removed, backups and restore hidden from teachers** (PR 448,
merged as `08e21c487`, CI green, the E2E run dispatched by hand passed; the owner: "do
recommended", after a review of todos 58 and 63 with a recommendation for each).

- **Removed, nothing called them:**
  - The notification WebSocket: `/api/v1/notifications/ws`, `services/websocket_manager.py`,
    and the frontend's `services/notificationWebSocket.ts` with its test. The broadcast
    endpoint no longer pushes anything; it stores one notification per receiver as before,
    and it is a plain `def` now (no `await` left).
  - `POST /api/v1/admin/restore-encrypted-backup` with its file-name check;
    `GET /api/v1/admin/debug-processes`.
  - `GET /api/v1/analytics/course/{id}/students-comparison` and its service method. It read
    the grades once per student (the one N+1 the detector found), and its plain average
    ignored the course's evaluation rules, so its figures disagreed with the final grades.
  - `GET /api/v1/analytics/reports/templates`, which answered without a sign-in; the pages
    use `/api/v1/custom-reports/templates`.
- **The E2E suite no longer starts a backend.** Outside CI, with nothing answering at the API
  address, `playwright-global-setup.ts` stops with a message that names
  `RUN_E2E_ISOLATED.ps1`. The E2E guide's advice to start a backend from the checkout (which
  would have used the shared database) is replaced by the same.
- **Control Panel > Maintenance: System Operations and Database Management are for
  administrators only.** Both offer backup and restore through the Control API, which trusts
  the PC itself (todo 58), so a teacher at an SMS Lite PC could use them. The server side of
  that rule is the entry above.
- **Todo 63's scheduled and e-mailed report, tested end to end the same day** (the owner's OK
  in the same decision). A throwaway server from a clone of `1b8a6d7ff` on its own SQLite
  database, with the owner's Brevo settings handed over in memory: a report scheduled every
  minute and one generated by hand with e-mail both completed (PDF, 44 KB), and
  `email_notification_service` logged "Email sent successfully" at 14:01:38 and 14:02:02 UTC.
  The schedule was switched off after one run. **The owner received both e-mails, with
  their PDF.** The server and its database were deleted afterwards.
- Not changed, by the same decision: `GET /control/api/restart` stays open (it only says
  whether a restart is possible), and the in-app User Guide stays the one-page leaflet.
- Tests: `test_removed_endpoints.py` (the five addresses answer 404; no WebSocket route), and a
  Vitest test of the Maintenance tab by role, which fails on the old Control Panel.
  `PERMISSION_MATRIX.md` regenerated: 337 endpoints, 342 before.

### In v1.18.77

Release commit `da95ba89e` (`RELEASE_READY -ReleaseVersion 1.18.77`, no `-TagRelease`, run by
the assistant on the owner's word "prepare a new release so to include all the changes
accordingly"): exit 0, backend 1,997 passed, 43 skipped, 0 failed, the frontend suite passed,
the local test installer built and signed (never uploaded). Tagged on `09c7c0d3a` (the
hand-written notes) and verified: see the status block at the head of this plan.

**2026-11-20: `/health` no longer holds the event loop, and a dead tool is gone** (PR 447,
merged as `4c4694367`, CI green: 39 checks passed, none failed; the owner: "do all
suggested", after the report that todo 52 stage 3 was the one step left).

- **Stage 3 measured on the cloud VM** (read only: `/metrics` read from inside the container
  and a probe against `127.0.0.1` from the VM itself; no sign-in, nothing written; container
  v1.18.76, up 3 h 44 min). `GET /health` was **440 of the 501 requests** the container had
  answered and **322.7 of their 336.4 seconds** (96 per cent), mean 0.73 s per call: Docker's
  check every 30 s. The probe: `/health` alone 0.60 to 0.72 s; **15 at once took 2.7 s to
  13.6 s**, one after another, and `/health/live` asked 30 times meanwhile answered in 4 ms
  except once, **12.95 s**. So the server still stalled for 0.7 s every 30 s, and 15 health
  calls at once stalled it for 13 s. The real requests of those hours were three of each
  kind from the owner's phone check (students list 0.91 s, analytics overview 0.90 s, courses
  0.66 s, unread count 0.13 s); they are too few, and the container's counters start with the
  container, so no before and after of stage 2 can be read from them.
- **Cause.** `GET /health` and `GET /health/ready` (`app_factory.py`) and the Control API's
  `GET /health` (`admin_routes.py`) were `async def` with only blocking database work and no
  `await`: the shape stage 2 fixed, but stage 2's script walked the router files only. They
  are plain `def` now; `/health/live` stays `async def` (no database). Answers unchanged.
- **Tests** (`test_health_endpoints_off_the_loop.py`, 6): a database stand-in that takes 0.4 s
  per call; the loop's longest stall (4 of the 6 fail on the old code: 0.40 s held, five
  calls 2.01 s), the answer's shape, and a guard that no `async def` endpoint in `routers/`
  never awaits except the seven left on purpose in stage 2.
- **Left `async def` with no `await`, outside `routers/`, on purpose:** seven rare admin
  actions in `admin_routes.py` (reset, performance, restore, list backups, sample data, debug
  processes, shutdown), the static-file routes and the root of `app_factory.py`,
  `/metrics` (CPU only) and SMS Lite's own routes. None is called on a timer.
- **On the cloud VM since 2026-11-20, 07:54 UTC** (the owner: "add the fix", on the report that
  the VM still lacked it): `git checkout 4c4694367` (a `main` commit, not a tag, as on
  2026-11-16; it still reports v1.18.76 because `VERSION` is unchanged), `docker compose up
  -d --build` (9 s from the layer cache), healthy after 29 s; `/health` answers with the
  database connected; no ERROR line, no traceback (one WARNING, the standing CSRF notice);
  the five backups and the key are on the volume; no database change, no forced backup (the
  daily one stays at 15:19 UTC). Rolling back is `git checkout v1.18.76` and the same
  rebuild. **The same probe afterwards** (from the VM, 15 `/health` calls at once and
  `/health/live` asked 30 times meanwhile; two warm rounds):

  | | before (v1.18.76) | after (`4c4694367`) |
  |---|---|---|
  | `/health` alone | 0.60 to 0.72 s | 0.60 to 0.63 s |
  | 15 `/health` at once | 2.7 s to 13.6 s | 1.3 s to 1.9 s |
  | `/health/live` meanwhile, worst | 12.95 s | 0.15 s to 0.33 s |

  The loop is free: `/health/live` answers in a fraction of a second while 15 health checks
  run. One check still takes 0.6 s, which is its own database work (about nine round trips
  at 65 ms), and 15 of them at once take three times that on one CPU; my forecast of "about
  1 s" was too low (not measured further). Docker's one call every 30 s no longer holds
  anything up.
- **The unused import validator is deleted** (todo 56): `scripts/utils/validators/` and its
  one test, which scanned a `backend/` folder that has not existed since the June flatten.
  The two READMEs, `CONSOLIDATION_MAP.md` and the example in `scripts/run_in_venv.py` no longer
  name it.
- **Plan text corrected** (todos 44, 50, 52, 56, 61, 63 and the lists that cite them): see the
  entries; the Oracle agreement, the phone and the key expiry were recorded as done at the
  head of this plan (the v1.18.68 paragraph) and still stood as open in todos 44 and 50.

### In v1.18.76

**2026-11-20: the Android app keeps its sign-in, offers to save the password, and signs in from
the phone's password manager with one tap** (the owner, with Google's page on Android autofill:
"if I log in with my credentials from my mobile, I should rather keep them saved and re enter
the login by my built in Autofill service"; then "do all three: check on your phone over Wi-Fi
debugging whether the session survives, change the field to username, and add the Credential
Manager piece").

- **Checked on the owner's phone first** (Galaxy A55, Android 17, app v1.18.75, paired over
  Wi-Fi with a QR code made on the PC): signed in on the Dashboard, the app closed and reopened
  from the PC: **back on the sign-in page**. The cloud server's log had four sign-ins from the
  app since its restart on 19 November and **not one renewal request**.
- **Two causes, read from the code.** (1) `authService.refreshAccessToken` posted to a bare
  `/api/v1/auth/refresh`; inside the app that is the app's own files (`https://localhost`), not
  the server the owner chose, so no renewal ever reached a server. (2) Even there, the 30-day
  renewal token lives only in an HttpOnly `SameSite=Lax` cookie, which the app's WebView
  neither keeps nor sends for a server at another address. So the app lost its session on
  every restart and whenever the 30-minute access token ran out.
- **Repair.** The renewal goes to the chosen server (`getApiBaseUrl()`, the same address as
  every other request). The app (only the app: header `X-SMS-Native-Session: 1` **and** origin
  `https://localhost` or `capacitor://localhost`, which a web page cannot claim) gets the
  renewal token in the body of the sign-in and of each renewal, keeps it in its private storage
  (Capacitor Preferences; the app's backups are off) and sends it in the body. A refused token
  is forgotten; one that met an unreachable server is kept. Signing out sends it, so the server
  revokes it, and forgets it; a failed renewal neither revokes nor forgets it. Browsers and SMS
  Lite are unchanged: the cookie stays the only copy and the body never carries the token.
- **Saved sign-ins (the assistant's design).** The e-mail field is `autocomplete="username"`
  (it was `email`; password managers pair username + current-password as one sign-in). A local
  plugin, `SavedLoginPlugin.java` (`androidx.credentials` 1.5.0, with the Play services
  provider for Android before 14), uses Android's Credential Manager: after a typed sign-in the
  server accepted, the phone's password manager offers to save it; when the sign-in page opens
  (once per run of the app, not right after a sign-out), the phone's sheet of saved sign-ins
  opens, and a pick signs in at once; a button "Sign in with a saved password" opens it again.
  A saved password the server refuses says so (`auth.savedLoginFailed`).
- **Tests.** Server: `test_native_app_session.py` (3): the app gets the token and renews with
  it alone, rotation, sign-out revokes; five browser-like requests (no header, a web origin
  asking for it, the app's origin without asking, another port, `http://localhost`) never get
  it in the body. App: `authService.native.test.ts` (6), `AuthContext.native.test.tsx` (3),
  `LoginWidget.savedLogin.test.tsx` (7); the earlier auth tests pass unchanged.
- **Seen in the Android emulator** (Android 16, a debug build of this branch, a scratch server
  from the branch): signed in as a teacher, closed and reopened the app: **still on the
  Dashboard** (`POST /auth/refresh` 200 in the server's log); with a 1-minute access token,
  a search after it ran out answered 401, the app renewed and repeated it (200), the page
  stayed; sign-out: all three of the teacher's tokens revoked, the app back on the sign-in page
  after a restart; the saved-password button reached Google's credential service, which had
  nothing saved on the emulator, and the page went on. **Not seen:** saving and picking a real
  saved password (the emulator has no Google account); that is the owner's phone after the
  release.
- **Found on the way:** the keystore on this PC (`C:\Users\Vasilis\.android\sms-release.jks`,
  `CN=SMS App`) is **not** the key of the published APKs (`CN=MIEEK SMS`, SHA-256
  `686fb6ed…d2ea`, kept only in the repository's secrets), so a build made here cannot update
  the app on a phone; a test build would need the app uninstalled first (its server setting
  and any unsent offline changes would be lost), which was not done.

**2026-11-19: 230 endpoints that never await are plain `def`, so the server stops queueing
behind them** (todo 52, stage 2; the owner, after the list of what waited: "create a suitable
plan order to accomplish all pending tasks and suggested, and continue". The entry said it is
a large change and asked first; it is 230 one-word changes and was done as one reviewable rule
instead of router by router, which would have been 35 gates).

- **The rule, applied by a script** (`async def` to `def` on a route function whose body has
  no `await`, `async for` or `async with`): FastAPI runs a `def` endpoint in its worker
  threads, so the database calls of the endpoint no longer hold the event loop. Skipped on
  purpose, left `async def`: the seven whose body names `asyncio`, `anyio`,
  `run_in_threadpool` or `BackgroundTasks` (`generate_report`, `bulk_generate_reports`,
  `create_student_import`, `create_course_import`, `create_grade_import`,
  `commit_import_job`, `create_export`). 230 changed in 35 router files; the decorators on
  them (`require_permission` 144, `limiter.limit` 72, `require_any_permission` 2,
  `require_all_permissions` 1) already handled plain `def` endpoints since stage 1 (PR 393).
- **Two callers read from the code.** `start_monitoring_stack` was awaited by
  `trigger_monitoring_from_container`; both are `def` now and the `await` is gone. A test
  called `download_database_backup` with `await`; it calls it plainly. A search for `await`,
  `asyncio.run`, `run_until_complete` and `iscoroutinefunction` on the 225 changed names found
  nothing else.
- **Measured** on a scratch server with a database made 65 ms slow per statement (the cloud
  host's round trip), the same data, 20 authenticated GETs at once, `/health/live` asked
  every 20 ms meanwhile:

  | endpoint | before: 20 at once, worst `/health/live` | after |
  |---|---|---|
  | `GET /courses/` | 3.43 s, 3.16 s | 0.60 s, 0.15 s |
  | `GET /grades/` | 3.30 s, 3.05 s | 0.54 s, 0.14 s |

  (each run beside a commit gate, so the after figures are a little noisy). What is left of
  the queueing: the dependencies that are awaited directly (`Depends(get_current_user)`,
  `/health`) still do their database work on the loop, and stage 3 (the same measurement on
  the cloud VM through `/metrics`) needs the VM on this code.
- **What a server now does that it did not:** every one of these endpoints can overlap, so a
  busy server uses more database connections at once (the pool allows 30 per process; stage
  1's soak used 21). The QNAP's `max_connections` has not been looked up.
- **The rate-limit guard.** The first whole-suite run failed one test,
  `test_rate_limit_enforcement.py`: it had only ever looked at plain `def` endpoints, and 51
  `async def` write endpoints had no limit. That was repaired on its own first (PR 444, the
  entry above); this change was then made again by the same script on top of it (230 again,
  the same as before apart from PR 444's lines). **Whole backend suite** (batch runner, in the
  clone): 1,988 passed, none failed.

**2026-11-20: 51 write endpoints that had no rate limit have one, and the guard test sees
`async def`** (found while making todo 52 stage 2: the `def` change made the guard fail).

- **What was wrong.** `test_rate_limit_enforcement.py` enforces the rule "every write endpoint
  has `@limiter.limit`", but it walked `ast.FunctionDef` only: an `async def` endpoint was
  never looked at. 51 POST/PUT/DELETE endpoints, all `async def`, had no limit: custom reports
  (11), dashboards (4), the profiler reset (1), feedback (4), import/export (7), permissions
  (7), roles (12), search (5). Turning them into `def` (stage 2) brought them into the guard's
  view and it failed.
- **Repair.** The guard checks both kinds. Each of the 51 got its limit after the route
  decorator, as in the other routers (the assistant's choice of class): `RATE_LIMIT_READ`
  for `advanced_search` (a read sent as POST, as the Search page types); `RATE_LIMIT_HEAVY`
  for report generation (single and bulk), the three imports, the import commit, the export,
  the test e-mail, the GitHub feedback import and the import of the default templates;
  `RATE_LIMIT_WRITE` for the rest. The limits are per client and minute (1,000 / 200 / 500 by
  default, changeable in the Control Panel), so ordinary use does not reach them.
- **Shown:** the guard fails on the old routers and passes on the new; with the limiter
  switched on and a write limit of 3, the fourth dashboard create answers 429 on the new
  router and never on the old one (a throwaway test, not kept). Whole backend suite in the
  clone: 1,971 passed, none failed.

**2026-11-19: SQLite enforces foreign keys where its data allows it** (todo 61; the owner,
after the list of what waited: "create a suitable plan order to accomplish all pending tasks
and suggested, and continue").

- **What was wrong.** `init_db` ran `PRAGMA foreign_keys=ON` once, on one connection, and the
  engine opens a new SQLite connection for every use (`NullPool`): the application's
  connections answered `PRAGMA foreign_keys` with 0. A deleted parent left its children, and
  the next row that got the same number inherited them (PR 419 repaired one such case by
  hand, for accounts). PostgreSQL always enforced them.
- **The assistant's choice** (the entry of todo 61 left it open: "each installation's
  database has to be looked at first"): the server looks at its own database. At the end of
  the startup work, after the migrations and the seeding, `backend.db.sqlite_foreign_keys`
  runs `PRAGMA foreign_key_check`. **No row without its parent: every new connection runs
  `PRAGMA foreign_keys=ON`** (log line "SQLite foreign keys are enforced"). **Some rows
  without a parent: nothing changes**, the installation works as it did, and a warning names
  the tables ("SQLite foreign keys NOT enforced: 2 row(s) have no parent row (user_roles ->
  roles: 1, user_roles -> users: 1) ..."); once the rows are repaired or removed, the next
  start switches enforcement on. It never raises and does nothing on PostgreSQL. To turn it
  round: delete the call in `lifespan.py`.
- **What it changes for a clean installation:** a delete of a row that others still point at
  is now refused with the database's own error instead of leaving orphans, as on PostgreSQL
  (the account and the student-erasure endpoints already delete their dependants first, since
  they were written for PostgreSQL).
- **Tests.** `test_sqlite_foreign_keys.py` (7): the pragma does not reach new connections
  without the switch; a clean database refuses an orphan insert and a delete of a parent
  that still has a child on every new connection; a database with an orphan is left as it
  was and the log names the tables; a second call stacks no listener; another engine is not
  touched; a failing check never raises. `db_setup.py` gained an opt-in,
  `SMS_TEST_SQLITE_FOREIGN_KEYS=1`, that runs the whole suite with enforcement on.
- **Seen on a scratch server** (SQLite file, the clone's code): an empty database logged
  "enforced"; the same file with one `user_roles` row for account 9999 and role 9999 inserted
  by hand logged the warning above and started normally.
- **The whole suite with enforcement on** (`SMS_TEST_SQLITE_FOREIGN_KEYS=1`, the batch runner,
  in the clone): 1,947 passed, 24 failed. Twenty-three are test fixtures, not code: the test's
  stand-in for the signed-in user is account 1, which has no row, so the audit rows, report
  rows and archive rows the tests write point at nobody (`test_audit*.py`,
  `test_custom_report_generation_service.py`, the GitHub feedback import, the semester
  archive). The last one is the installer check that the clone's new files are not yet
  tracked. A real signed-in user always has a row, and deleting an account clears its
  refresh tokens and nulls its audit rows first (`routers_auth.py`), so no path of the
  application was found to break. The opt-in therefore stays off by default; the fixtures
  are not changed here. The suite without the opt-in is CI's run on this PR.

**2026-11-19: a request the server could not serve is no longer answered with 200** (todo 61;
the owner, after the list of what waited: "create a suitable plan order to accomplish all
pending tasks and suggested, and continue").

- **What was wrong.** Four routers (search, custom reports, import and export, dashboards;
  81 places after PR 439 removed two search endpoints) answered a refusal or a failure with
  HTTP 200 and `{"success": false, "error": {...}}`. A caller that read only the status took
  the failure for an answer: the custom reports list became an object that was not a list,
  and the download of a report that was not there saved the JSON of the failure as a "PDF".
- **The assistant's choice** (the entry said "a fix changes answers the pages rely on"): the
  body is **unchanged**, the status is not. `error_json(...)` in `schemas/response.py` builds
  the same envelope as `error_response(...)` and answers it with the status that goes with
  the code: `UNAUTHORIZED` 401, `FORBIDDEN` 403, `NOT_FOUND` and `FILE_NOT_FOUND` 404,
  `DUPLICATE_ERROR` 409, `VALIDATION_ERROR` and the `INVALID_*` codes 422, every other
  `*_ERROR` 500. A caller that reads `error.message` from the body keeps working; one that
  read the status as "it worked" was wrong before and sees the failure now. The helper is typed
  `Any`: FastAPI refuses `-> APIResponse[...] | JSONResponse` as a return annotation, and the
  whole router then fails to load with only a warning in the log (seen: every test of the
  import/export panel errored at setup until the annotations were put back).
- **The pages, read first.** Dashboards (`useDashboards.ts`) and custom reports
  (`customReportsAPI.ts`) already caught an HTTP error and read `error.message` from the body
  (they were written for this and never received it). The Search hook keeps the server's
  message when the error arrives as a status (a test); the Import/Export client
  (`importExportApi.ts`) did show `Error.message` in the wizard and the dialogs, which for an
  HTTP error is axios's "Request failed with status code 422": a wrapper (`asServerError`)
  now hands them the server's text, also from the Blob of a failed download (5 tests). The
  old 200 answer is still read as a failure by both.
- **Tests.** The dashboards, search-contract and search-endpoint tests that pinned the 200
  now expect 404, 403, 409, 422 and 500 with the same envelope; `test_failures_are_not_
  answered_with_200.py` (17) covers the status of each code, five "not there" answers, the
  403 that the custom-report endpoint gives for a report that is missing or not the caller's
  (as before), and the helper itself.
- **Not changed:** the answers of the other routers (they raise `HTTPException`); the
  endpoints' documented `responses` lists.
- **The whole backend suite** (batch runner, in the clone): 1,980 passed, 1 failed, the
  installer check that the clone's new files are not yet tracked.

### In v1.18.75

**2026-11-19: the Updates tab of the Control Panel sends the login token, so the update check no
longer answers 403 in the Docker edition** (PR 441, merged as `48617cf26`; the owner, with a screenshot of the Docker stack at
`localhost:8080/#/power`: "on docker image running, the update check fails"; "Request failed
with status code 403").

- **Cause, read from the container's log.** `GET /control/api/maintenance/updates/check` was
  refused with "Rejected control API call — non-loopback request without token"
  (`control_auth.require_control_admin`), while every `GET /control/api/status` of the same
  page was granted "via admin bearer token". `UpdatesPanel.tsx` called a bare `axios`, which
  carries no login token; the token is put on `apiClient` and `controlApiClient` only. The
  Control API lets a request in with an admin token, with the `X-ADMIN-TOKEN` header, or from
  a loopback address. SMS Lite and a developer checkout are reached from the same machine
  (loopback), so the missing token never showed there; in the Docker edition the browser
  reaches the container from the Docker bridge (`172.17.0.1`), so the token is the only way
  in. The panel's other two calls (start the update, ask its status) used the same bare
  `axios` and would have been refused the same way; that is read from the code, not run.
- **Repair.** `UpdatesPanel` calls `controlApiClient` (relative paths, the token, and the
  Android server address) and no longer takes the unused `controlApi` property.
- **Tests.** `UpdatesPanel.auth.test.tsx` renders the panel over the real client with a
  recording adapter and asserts `Authorization: Bearer …` on the update check: it fails on the
  old panel and passes on the new one. `UpdatesPanel.modes.test.tsx` (5) now mocks
  `controlApiClient`.
- **Verified:** the two test files (6 tests), ESLint and `tsc --noEmit` pass; the handler,
  run inside the v1.18.74 image once the guard is passed, answers (latest release 1.18.74,
  edition Docker, method host task), so nothing else was hiding behind the 403. **Not
  verified:** the repaired page in a browser against a rebuilt Docker image (the owner's stack
  was stopped during the session and no image is built on this PC) and whether the host updater
  task is running on the owner's PC (`host_updater_ready`). A Docker stack runs this
  repair only from the next release.
- **Merged:** PR 441, branch commit `d86cce795`, as `48617cf26` with `--admin` after every CI
  check was green (backend job 9 min 45 s, frontend 3 min 7 s, the Ubuntu and Windows quick
  gates 12 and 20 min; the Windows one was cancelled once, at about 20 minutes, by the
  assistant, who took it for a hang after misreading local time as UTC, and re-run). E2E was
  skipped: no test under `src/frontend/tests` touches the Updates
  tab.

**2026-11-19: after Docker's cleanup SMS comes back; every text of the wizard in both
languages; the installer's older notes, two unused pages and a CI step** (PR 438, merged as `27adbfca3`; on the PR's commit CI's backend job passed 1,948 tests with 55 skipped, E2E 77 with none flaky, and the gate job on Ubuntu and Windows, its repaired page check included. The owner's
answer to the report on PR 437, quoted in todo 64, which this closes).

- **`DOCKER.ps1`'s cleanup.** `-Prune`, `-PruneAll` and `-DeepClean` stay Docker's own
  cleanup (the owner's point 1 asks for the way back, not for a narrower cleanup). Read from
  the script: `-Start` already rebuilt a removed image and recreated a removed container, and
  `-Update` rebuilds from the installed version after a backup; but `-DeepClean` stopped and
  removed the running SMS container and left SMS down, and no cleanup said how to get it
  back. Now every cleanup ends with "Your data is kept (volume 'sms_data'). To bring SMS
  back:" and the two commands, and **`-DeepClean` rebuilds and starts SMS again at the end
  when it was running before**. `-Prune` and `-PruneAll` never touched a running container
  and still do not. The Docker guide (section 5) says so.
- **Every text the wizard and the uninstaller show is a message of both languages.** Thirty-
  six texts moved out of the code into `[CustomMessages]` (English) and `Greek.isl` (Greek):
  the titles and subtitles of the pages "Prerequisites Check", "QNAP Database Configuration
  (Optional)" and "Completing Installation"; every label of SMS Lite's QNAP page and of the
  Docker edition's database page (the Lite page's **Browse...** reuses the existing
  `DbBrowse`); the eight lines the Docker build page can show; four message boxes; and the
  uninstaller's question about the Docker images. Some English was corrected on the way: the
  build page "builds the SMS Docker image" (it said "container"; it starts nothing), its
  error line names `DOCKER_INSTALL.log` and `DOCKER.ps1 -Install`, its success line says how
  to start SMS, and the uninstaller's question says that the data in the volumes is not
  removed. The English stays ASCII (the `.iss` has no byte order mark; the "— OR —" label
  is now "- or -").
- **The two unused pages** `installer_complete_lite.rtf` and `installer_complete_lite_el.rtf`
  are deleted: no line of the script named them, their text was the stale one, and SMS
  Lite's last page is the message `LiteFinishedText` since PR 437. (A tracked deletion; `git
  revert` of this PR's commit brings them back.)
- **The installer's older notes.** `INSTALLER_TROUBLESHOOTING.md`, the one written as a live
  guide, is written anew against the scripts (it named a log and a progress window the
  installer no longer has). The other eleven are records of their day (a fix, a build, an
  audit, a plan, the test plan of v1.18.3, a changelog that stopped at v1.18.11): their text
  is kept as history, and each now says so at its head, names what is different today and
  points to the README and the installation guide. **`MANUAL_CLEANUP_GUIDE.md` had a
  dangerous step**: "Clean Docker System (Optional but Recommended)", `docker system prune
  -a -f --volumes`, after a step that stops Docker. With the container stopped, the volume
  `sms_data`, the database of the Docker edition, is unused, and `--volumes` deletes it. The
  command no longer has `--volumes`, and the note says why.
- **The CI step** of `commit-ready-smoke.yml` (Windows job) that looked for the page
  generator at the repository's root and always skipped now runs
  `infra/scripts/diagnostics/fix_greek_encoding_permanent.py` and fails when the tracked
  `.rtf` pages differ from what it writes for this version.
- **Tests:** `test_docker_cleanup_brings_sms_back.py` (8) takes `Invoke-DockerCleanup` out of
  `DOCKER.ps1` and runs it with Docker replaced by stubs that record what is asked: each
  cleanup prints the way back; `-DeepClean` starts SMS after the cleanup when it was running
  and not when it was down; `-Prune` and `-PruneAll` leave the SMS container alone; nothing
  prunes volumes; and `-Start`/`-Update` still rebuild and recreate. Two more in
  `test_installer_info_pages.py`: no page title, label or message box of the wizard's code is
  written as text, and every message has the same `%1` places in both languages and ASCII
  English. Five of the new tests fail on `main`; with the other installer tests, 40 pass.
- **Verified:** the installer's script compiles with and without SMS Lite; `DOCKER.ps1`
  parses; the CI step's two commands were run here. **The owner on 2026-11-19, after looking at the Greek wizard: "greek are ok."** Before that no wizard had been run, so
  whether each Greek text fits its label was not known (Greek is often longer, and several
  labels have a fixed width). Nor was any cleanup run against Docker. The Greek was written
  by the assistant and read by nobody else.

**2026-11-19, later (the owner: "first proceed with 2, 3, and 4" of the list of what waited):**

- *2, the cloud VM's daily backup hour:* a one-time timer on the VM (`sms-backup-hour`, made
  with `systemd-run`, gone after it ran or after a reboot) runs one forced automatic backup at
  15:19:06 UTC today, so the daily backup is back at about 15:19 UTC (17:19 in Cyprus).
  Its output goes to `~/backup_hour_2026-11-19.log` on the VM. Nothing else on the VM was
  changed.
- *3:* the Recycle Bin was already empty (the nine local builds are gone). CLAUDE.md's i18n
  example corrected in PR 439.
- *4, the older entries:* **PR 439 merged** (`caba53fbd`, todo 61: two dead search endpoints
  and unused code removed) and **PR 440 merged** (`e3f988fc2`, todo 59's four findings and
  todo 61's separate accent marks); both unreleased, CI and E2E green. **Not done, each
  needing the owner's word:** todo 52 stage 2 (about 160 endpoints turned from `async def`
  to `def`, router by router: a large change) and stage 3 (a measurement on the VM); todo 55
  (b) and (c) open or restore real backups, which needs a new yes; todo 61's foreign keys on
  SQLite (each installation's database looked at first) and the 83 places that answer a
  failure with HTTP 200 (a change of the API's answers that the pages read); todos 40, 44
  and 50 are the owner's own steps (an update on a device one release behind; Oracle's
  agreement and ΜΙΕΕΚ policy, the phone, Tailscale key expiry). Oracle's pages refuse an
  automated reader (HTTP 403), so the agreement of todo 50 has to be read in a browser.

**2026-11-19: the installer's information pages are right for both editions and in both
languages, and the Docker guide and the installer's README are written anew** (PR 437,
merged as `1edcb8283`; on the PR's commit CI's backend job passed 1,938 tests with 55
skipped, the frontend job 2,135 and E2E 77, each at its first try, and the gate job passed on
Ubuntu and Windows. The owner's "continue" after the report on v1.18.74, which named this as
what it would take up: the stale texts that PRs 431 and 435 had listed and left).

- **What was wrong, read from the scripts.** The wizard shows one page before the files are
  copied and one after, the same two whichever edition was chosen on "Installation Type".
  Both were written for the Docker edition: somebody installing SMS Lite read "Docker Desktop
  installed and running" among the requirements and then "The installer will now set up the
  SMS Docker container. This may take 5-10 minutes". For the Docker edition the page said
  "Docker container will be built and started": the wizard's next page builds the image
  (`run_docker_install.cmd`: `DOCKER.ps1 -Install -Silent -NoShortcut`) and starts nothing.
  The English pages were files written by hand and said "v1.18.30" through 44 releases. The
  Greek pages were written at every build and said something else again ("the first start
  takes 5-10 minutes (container download)", and a closing line with a misspelt
  word). The last page of an SMS Lite installation was English text in the wizard's code,
  in a Greek wizard too, and told the reader to "log in with admin account (see
  documentation)", although the wizard itself asks for the administrator of a new local
  database since v1.18.55.
- **The pages.** `infra/scripts/diagnostics/fix_greek_encoding_permanent.py`, which the
  installer build already ran for the Greek pages, now writes all four
  (`installer_welcome.rtf`, `installer_complete.rtf` and their `_el` twins) from one set of
  lines per language, with the version of the `VERSION` file. Each page has a part for the
  Docker edition and a part for SMS Lite, under the names the page "Installation Type" uses.
  Before the files: what each edition needs (for Lite: no Docker, nothing is built) and what
  is installed. After the files: for Docker, that the next page builds the image, that the
  wizard does not start the application, how to start it (the shortcut, 1, START,
  `http://localhost:8080`) and where the first administrator's address and password are
  (`config\.env`), or the existing account with the shared QNAP database; for Lite, the
  shortcut and which account to sign in with. The published installer gets the pages from
  this script: the tag's workflow runs the same build.
- **The last page of SMS Lite** is the message `LiteFinishedText`, English in the script and
  Greek in `Greek.isl`: how to start it, and which account (the one typed into the wizard,
  or the existing one). The script's head comment no longer names v1.18.11 and its "latest
  changes".
- **`docs/deployment/DOCKER_OPERATIONS.md` is written anew against `DOCKER.ps1`.** It was the
  guide of v1.9.3: two containers (`sms-backend`, `sms-frontend`) that have been one
  (`sms-app` from the image `sms-fullstack`) for a long time, a script `SMART_SETUP.ps1`
  that does not exist, a "Power Tab", `docker rmi sms-backend:1.3.8`, and a first-time setup
  that "starts containers" where `-Install` asks first and the installer's call starts
  nothing. Now: what runs and where its settings and data are, the three ways the database
  can be set, every option of the script and what it does, how to see whether it is up, the
  two kinds of backup (with PostgreSQL `-Backup` copies nothing and says so), the cleanup
  options, monitoring, and the section on updating as it was (v1.18.57; it was right). **One
  thing an administrator should know and the old guide did not say: `-Prune`, `-PruneAll`
  and `-DeepClean` call Docker's own cleanup, which is not limited to SMS**: on a PC with
  other containers they remove those containers' leftovers too (every stopped container,
  with `-DeepClean` every unused image). They keep the volumes.
- **`infra/installer/windows/README.md` is written anew** for whoever changes or builds the
  installer: the two editions, which installer is the real one (the tag's; a local build is
  for testing), the files of the folder and which are generated, where the wizard's texts
  are and how they are kept in two languages, the build and a compile check without an
  installer, the certificate (valid until 27 November 2028), the uninstaller's file name.
  It was the README of v1.18.11 ("Fresh Install", an upgrade that "restores `.env` files",
  `Uninstall_SMS_1.18.11.exe`, "25-30 MB").
- **Smaller:** `docs/misc/INSTALLER_STRATEGY.md`, a design of May 2026, says at its head what
  it is and where today's facts are (three of the files it draws were never written);
  `docs/operations/INSTALLATION_GUIDE.md` names the new pages (sections 1 and 2).
- **Tests:** `test_installer_info_pages.py` (10): the four files are the ones `[Languages]`
  names; the tracked files are what the generator writes for this version (a page edited by
  hand, or a version bumped without the generator, fails with the command to run); plain
  ASCII RTF with the Greek letters as escapes; each page has a part for each edition in both
  languages, under the wizard's own names for them; the two languages of a page are built
  alike line for line, with the same addresses, setting names and numbers; SMS Lite's part
  does not name Docker Desktop; and each thing the page after the files says is tied to the
  text of the script it describes (the build page's place, the silent `-Install` that returns
  before the start, the first line of the menu, the port, the two setting names, the folder,
  the wizard's own sentences about the administrator). All ten fail on the tree before this
  change (the test of the escapes only because the old function took no code page). The
  existing check that every `CustomMessage` name exists in both languages covers the new one.
- **Verified:** the generator's four files are byte for byte the same before and after the
  linter's reformat of the script; the installer's script compiles with Inno Setup's
  `ISCC /O-` with and without SMS Lite, and a copy with a missing bracket in the changed line
  fails (exit 2). **A wrong message name does not fail the compile** (the name is looked up
  when the wizard runs): the test above is what guards it. The three installer test files
  pass together (30). Each of the four pages was loaded into a Windows rich-text control,
  the kind of control the wizard shows them in: the text, the Greek letters and the bullets
  come out as written. `GREEK_ENCODING_AUDIT.ps1 -Audit` and the installer input guard pass.
- **Not verified, and it cannot be here: no wizard was run and no page was seen.** The
  installer needs administrator rights, and its window cannot be driven from a test. What
  the pages say is checked as text against the scripts; how they look, and whether the
  Greek of the last page fits its place, is not. The Greek was written by the assistant and
  read by nobody else.
- **Found and not changed** (todo 64): about forty texts of the wizard are still English in
  the code; two `.rtf` files that nothing shows; older notes in the installer's folder; a CI
  step that looks for the generator where it is not.

### In v1.18.74

**2026-11-19: before the tag of v1.18.74: the local installer builds, the smoke test, the
release run** (everything of the owner's go-ahead below is merged: PRs 432 to 436. What
followed the tag, the published files and the update of the cloud VM, is at the head of this
plan.)

- **The nine local installer builds** (`infra\installer\dist`, v1.18.65 to v1.18.73, 798 MB;
  made before PR 431, so with the PC's own settings and data in them) **are in the Recycle
  Bin.** The owner's list said "delete or keep"; the bin keeps it reversible, and emptying it
  is the owner's. The build of this release is the first that takes tracked files only.
- **Smoke test (isolated copies under `D:\tmp`, scratch databases only; the code of PR 436's
  commit, which is the code of the release before its version number).** Each edition as an
  administrator and as a teacher: 45 to 48 checks through the API (the checks of v1.18.73 and
  fourteen for what is new: the two roles and "No role", the audit log's author, a mark taken
  off the attendance sheet, the session file as a teacher with the two grades of one
  assignment kept apart, the return to a backup refused, export jobs as CSV and PDF, an
  import with a fault and one without, an account's own password), the packaged-edition
  check, and ten pages in a browser with every API answer and every console line watched.
  - *The released v1.18.73 first, as the "before":* the server from source on PostgreSQL
    14.25 and the packaged SMS Lite. Eleven of the checks fail there, the things this
    release changes (and the released server drops the connection of an export job it cannot
    write).
  - *The server from source on PostgreSQL 14.25, upgraded from the database v1.18.73 had
    made:* the three migrations ran in order (`5189ab647b5a`, `9c41f7e2a6d3`,
    `e2b7c9d4a1f6`); the roles are admin and teacher; the three Student accounts are "No
    role" (one signs in and is refused the list of students); 44 permissions and 53 grants;
    the teacher's role holds 26 with `sessions:manage`; the unique index on a permission's
    key was there before and is there after; 6 students, 6 grades and 6 attendance rows as
    before. 48/48, among them the teacher, the students, the grades and the message of
    before; in the browser all claims for each role; no ERROR line in 1,703 log lines.
  - *The server from source, a first start on SQLite:* 45/45, 11/11, in the browser all
    claims for each role, no ERROR line in 1,448 log lines; the new database has the unique
    index.
  - *Packaged SMS Lite, upgraded:* the released v1.18.73 build in a throwaway profile (34 of
    45), then the new build on that profile: 48/48, 11/11, in the browser all claims for each
    role, no ERROR line in 1,124 log lines; the profile's database is at `e2b7c9d4a1f6` and
    got its unique index.
  - **Not done this time: the Docker image was not built or run on this PC.** Its build took
    the PC's free memory down to 722 MB and the memory watch stopped it (the PC restarted
    from such a shortage on 18 November). The PostgreSQL path was tried with the server from
    source instead, old code and then new code on one database. The image is built by CI on
    every change and for both processor types before the tag. Not checked either: the
    installer was not installed, and the Android app was not run on a device.
- **`RELEASE_READY` (no `-TagRelease`):** 66.8 minutes, exit 0, every gate passed; the backend
  suite ran 62/62 batches with 1,940 passed, 43 gated skips and 0 failed; the local installer
  (90,207,816 bytes) was built and signed, with the frozen-Lite check passing 11/11. The
  release commit is `b8dd61be8`. The generated GitHub body said only "5 new features" and "8
  bug fixes" and is rewritten by hand in the commit that carries this entry.

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

**2026-11-19: the Import/Export panel of the Control Panel does what it offers** (PR 436,
merged as `e40e0a294`; on the PR's commit CI's backend job passed 1,928 tests with 55
skipped, the frontend job 2,135 and E2E 77, each at its first try. Todo 62, the last of the things of the owner's go-ahead above that is code. The plan had
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
uninstaller says what it deletes** (PR 435, merged as `9fd729c26`; on the PR's commit CI's
backend job passed 1,900 tests with 55 skipped, the frontend job 2,125 and E2E 77, each at
its first try. Two of the things of the owner's go-ahead above.
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

### v1.18.73 and older

The records of v1.18.73 down to v1.18.66 are in part 4 of [`UNIFIED_WORK_PLAN_ARCHIVE_2026_H2.md`](./UNIFIED_WORK_PLAN_ARCHIVE_2026_H2.md), and those of
v1.18.65 down to v1.18.51 in part 1, word for word.

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

**Open work as of 2026-11-21** (after the owner went through every open todo on 2026-11-20;
the answers are under "In v1.18.78"). v1.18.78 is released and the cloud VM runs it, with
the privacy controller's name and contact in its `.env` (2026-11-21, the top of this plan).
The owner's Docker test install on the dev PC was updated to it by hand through UAC (todo
40). Still open: todo 40's Docker host task (with v1.18.79) and its Lite half; todo 50's owner side; todo 55's copy
of a newer backup taken off the VM now and then; todo 58's PostgreSQL 14 on the NAS (the owner
stays on 14.18 for now) and its smaller items; todo 63's remaining readings. Closed on
2026-11-20: todo 44 (the owner: "Close it"), the contrast design calls (PR 455), the test data
in the shared database (todo 56). Moot: `viewer` and `guest` getting 403 on the Dashboard
overview, since those roles no longer exist (PR 425 turned them into "No role").

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

**Order of work, set 2026-11-19** (the owner, after the list of what waited: "create a suitable
plan order to accomplish all pending tasks and suggested, and continue"). That word covers the
v1.18.75 release, todo 52 stage 2, todo 55 (b) and (c), and the two decisions of todo 61. It
does not cover, and each is asked for afterwards: a release after v1.18.75, updating the cloud
VM, and todo 52 stage 3 (it measures on the VM). One heavy local job at a time (a gate, the
release run, a whole suite); while the release runs detached, only text is read and written.
Where the list left a choice open, the entry says which one the assistant took.

1. PR 441 (the Updates tab sends the login token): merge when CI is green; the plan notes of
   PRs 437 to 441 and todo 40's Android half (done on the owner's phone, 2026-11-19).
2. ~~**Release v1.18.75 with PRs 437 to 441 only.**~~ **Done 2026-11-19** (status block). First, so that the large changes below do not
   ride on it: the isolated smoke test, `RELEASE_READY`, the Docker build check, the tag, the
   published files checked.
3. Todo 55 (b) and (c): try the key on the 22 older backups (decrypted in memory, nothing
   written out), then repeat the restore drill on a fresh backup taken off the VM, since
   v1.18.74 changed the database.
4. Todo 61, SQLite foreign keys: a read-only count of rows without a parent, then enforcement
   switched on only for a database where that count is zero; a database that has such rows
   keeps working as today and logs what it found (the assistant's choice: it cannot refuse a
   change an installation could make before).
5. Todo 61, failures answered with 200: router by router, the page that calls it read first and
   changed in the same PR.
6. Todo 52 stage 2: router by router, each its own PR, measured before and after with the
   measurement of stage 1; it stops at the first router whose tests fail for a reason that is
   not understood.

**Steps 3 to 6 done, 2026-11-19/20:** step 3 as above; step 4 in PR 442 (`e7e730e8a`); step 5
in PR 443 (`c44f0df40`), as one PR for the four routers rather than one per router; step 6 in
PR 445 (`3750dc1bf`), as one rule applied by a script in one PR rather than 35 (the entry says
why). Step 6's first suite run found that the rate-limit guard had never looked at `async def`
endpoints; PR 444 (`190936bf7`) gave those 51 write endpoints their limit first. All four
are under "In v1.18.76". **All of it was released and put on the cloud VM on 2026-11-20 (the
owner: "do all three ... A v1.18.76 release with PRs 442 to 445. and also Update the cloud
VM"); stage 3 was measured the same day, and PR 447 (the `/health` fix it found) is on the VM
since 07:54 UTC (the owner: "add the fix"; top of this plan).** What waits for the owner's
word: the next release.

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
    - **Done 2026-11-20 (owner: "fix 54 (c)" and "try it with my email account"):**
      - **(c) Mail on the VM:** the home Brevo settings were copied into the VM's data volume
        through `smtp_override.save()` inside the container, so the password was re-encrypted
        with the VM's `SECRET_KEY`; it was never shown. The container was restarted and logged
        "SMTP override settings loaded".
      - The first test was refused by Brevo (`525 Unauthorized IP address`). The account only
        accepts authorised IPs, and the owner authorised the VM's `141.147.0.14` from Brevo's
        "Verify a new IP" e-mail. The second test was sent through
        `EmailNotificationService.send_email`, and the owner received it.
      - **(a) Real alarm:** a fail signal sent from the VM at 12:36 UTC and the ping at
        12:38 UTC each brought an e-mail (DOWN, then UP); the owner received both.
      - The runbook `docs/deployment/CLOUD_HOST_ORACLE.md` has a "Mail" section. It notes that
        the ephemeral public IP now matters for mail: if it changes, the new address must be
        authorised in Brevo.
    - ~~**Left:** (a) nothing to set up; a real alarm was not tried.~~ (b) The five manual-only
      workflows without a run on record stay, by the owner's choice: `reset-workflows.yml`,
      `archive-legacy-releases.yml`, `fetch-code-scanning-sarif.yml`, `upload-sarif.yml`,
      `sync-installer-artifact.yml`. ~~(c) No mail is configured on the VM: the activation
      email of an approved account cannot be sent from there (the administrator gets the
      notice "Activation email not sent").~~ Done 2026-11-20 (above).
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
      the commands; **a copy of 2026-11-20 is on the dev PC**, see below; it does not renew
      itself). **Done 2026-11-20 (the owner: "treat the backup as well"):** the VM's newest
      backup, `auto_backup_20261119_151908.enc` (made 15:19 UTC on 19 November after the
      v1.18.74 migration: 30 tables, 2,361 rows), is in the owner's confidential folder
      beside the one of 16 November. Its SHA-256 on the VM and on the PC are equal
      (`75a11fb2…3387`); the VM's key was only hashed, not copied (equal to the checksum in
      the note, `25cd8be0…0809`), and it opens the file (decrypted in memory, header and
      length agree, nothing written out); the temporary copy on the VM is deleted; the note
      `READ-ME-restore.txt` lists both. Not restored into a database: that shows the key and
      the format, not that the file restores (the drill of 2026-11-19 did that for the
      backup of that morning).
      ~~(b) Whether the key next to the code on the dev PC still opens the 22 older encrypted
      backups there is not known.~~ **Done 2026-11-19 (the owner: "accomplish all pending
      tasks"):** the key `src/.keys/master.key` opens all 24 encrypted files in
      `backups/database` (22 made by hand, from 3 September to 6 November, and the dev PC's own
      two automatic ones of 16 and 17 November): each decrypted in memory, its header and
      length agree, and each is a data-only SQL text of 80 KB to 810 KB; nothing was written
      out. That shows the key and the format, not that each file restores.
      ~~(c) The drill is one drill: after a release that changes the database, it is worth
      repeating.~~ **Repeated 2026-11-19, after v1.18.74 had changed the shared database:** the
      newest backup on the VM (`auto_backup_20261119_041110.enc`, made by the VM just before its
      update, so at revision `a7d4e9c2b5f8`: 30 tables, 2,371 rows) and the VM's key were copied
      to a scratch folder (the VM's copies deleted at once), decrypted in memory, and restored
      by `database_manager.restore_sql_content` into a scratch PostgreSQL 14 built to that
      revision by the tag's migrations; then upgraded to `e2b7c9d4a1f6`, the way an update
      does. Against the live shared database, read-only, table by table (row count and a
      checksum of every row): **28 of 31 tables identical**; `refresh_tokens` has one row less
      (a sign-in since 04:11); `permissions` and `role_permissions` differ in the
      `created_at`/`updated_at` that the migrations stamp when they run, and are identical in
      id, key and every other column (checksum without the timestamps equal on both sides).
      The scratch database, the backup, the key and the files were deleted afterwards.
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
    - ~~*The native WebSocket endpoint has no client.* `/api/v1/notifications/ws` and
      `services/websocket_manager.py` work and are tested; `services/notificationWebSocket.ts`
      in the frontend is used by nothing but its own test. Use it or remove both (owner's call).~~
      **Removed, both sides** (owner 2026-11-20: "do recommended"; under "In v1.18.78").
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
    - **Removed** (owner 2026-11-20: "do recommended"; the setup now stops with a message
      naming `RUN_E2E_ISOLATED.ps1`). As it was: ~~*The E2E auto-start cannot start a backend, and leaves a dead process behind.* Outside
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
      an isolated backend (the owner's call).~~
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
      - ~~*Two backup folders.* The Database panel keeps its own backups in
        `BACKUPS_DIR/postgres` (`pg_dump --clean` where it is installed), apart from Manage
        Backups (`BACKUPS_DIR/database`); the automatic backup's retention does not look there.~~
        **Done 2026-11-20 on the owner's word** ("make that panel use the same encrypted backup
        as everything else"): the files there were also unencrypted. Under "In v1.18.78".
      - ~~*No backup before a migration.* An update that changes the database leaves every
        earlier PostgreSQL backup restorable only with the earlier release. A backup made by
        the application right before it applies a migration would close that gap (the rows
        the v1.18.70 migration changed were saved by hand).~~ **Done 2026-11-20** (under "In v1.18.78"): both runners make one, and a failed one stops the migration.
      - ~~*`/admin/restore-encrypted-backup` has no caller any more* (the page restored through
        it until #407). Remove it or keep it (the owner's call).~~ **Removed** (owner
        2026-11-20).
      - *The Control API trusts the machine the server runs on* (`control_auth`, rule 3: with
        no `ADMIN_SHUTDOWN_TOKEN`, a request from the same machine needs no login). That is by
        design for a PC's own tools, and through Docker and on the cloud VM every request
        arrives from outside and is checked (a teacher gets 403, seen in the smoke test). But
        with SMS Lite, or a server run from source, the browser is on the same machine: anyone
        at that PC can list, make and restore backups, signed in as a teacher or not at all.
        On a PC that uses the shared database, that includes restoring over it. Such a PC
        also holds the database password, so this is not a new way in; whether Lite should
        ask for an administrator there is the owner's call. **Decided 2026-11-20 ("do
        recommended"):** backup, restore and the backup list ask for a signed-in
        administrator also from the PC itself; start, stop and restart keep the PC's trust
        for its own tools. The page side (the two sections hidden from teachers) is under "In v1.18.78"; the server side is the entry above it there (19 endpoints).
      - ~~*A replacement PostgreSQL should be of the same kind as the lost one.* The shared
        database runs a Debian-based server, the scratch ones here are Alpine-based: both
        report the collation `en_US.utf8`, and they sort text differently (seen in the restore
        drill). The data restores identically; lists sorted by name would come out in another
        order.~~ **Closed 2026-11-20:** nothing to change in the code; the restore guide
        (`docs/admin/BACKUP_AND_RESTORE.md`, "Restoring") says it.
      - ~~*Readable copies left by older builds.* Nothing removes the `backup_….db` files that
        builds up to v1.18.70 left next to encrypted SQLite backups on Windows (see "In
        v1.18.71"). A clean-up at startup would have to be sure a file is such a leftover (it
        has an `.enc` twin of the same name) before deleting it.~~ **Done 2026-11-20** (under
        "In v1.18.78"; on this PC they had already gone with the pre-13-November
        copies).
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
      - **Removed, endpoint and service method** (owner 2026-11-20; its average also ignored
        the course's evaluation rules). As it was: *One real N+1, in an endpoint no page calls.*
        `GET /analytics/course/{id}/students-comparison` reads `grades` once per enrolled
        student, and `students` once per student who has grades (15 and 0 on the scratch
        server; a class of 25 on the cloud VM would be 25 to 50 round trips of 65 ms). The
        frontend has no caller. One query for each would do, or the endpoint goes (the
        owner's call). It is the only entry the new detector gave over all 102 `GET`
        endpoints, with 15 students.
      - ~~*`GET /admin/debug-processes` has no caller either.* It lists what the old
        "stop the dev server" control would kill. It answers again since PR 412; whether it
        stays is the owner's call.~~ **Removed** (owner 2026-11-20).
      - *Two migration runners that are near copies.* `backend/run_migrations.py` (the Docker
        entrypoint, the command-line tools) and `backend/scripts/migrate/runner.py` (the
        server, SMS Lite) differ in a few lines. PR 412 gave them one function for the log
        folder; the rest is still twice. **Read again on 2026-11-20, not merged:** one
        difference is meaningful. The entrypoint's runner takes "can't locate revision" (a
        database a newer release migrated) as success, so a Docker container still starts on
        the shared database after a rollback or beside a newer install. The server's runner
        reports it as a failure, and the lifespan then skips seeding the role defaults, which
        keeps older code from writing old roles back into a newer database. A merge needs a
        result with three outcomes (applied, database newer, failed) and each caller's choice
        kept; it touches the start of every edition, so it waits for a release cycle of its own.
        **The owner, 2026-11-20 ("Keep deferred"): not done unless the two drift apart.**
      - ~~*A test run writes into the `logs/` of the tree it runs in.* The tests that run the
        migrations append to `logs/migrations.log` (104 KB in a clone after five test
        files). The same class as the backups folder that PR 409 moved to a temporary one.~~
        **Done 2026-11-20** (`SMS_LOG_DIR`, under "In v1.18.78"; it was also
        `app.log` and the frontend logs).
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
        of them came on 19 November 2026** (the entry "the owner's go-ahead for everything that waited" under "In
        v1.18.74"): teachers and the grade are done in PR 432.
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
      `GET /control/api/restart` (whether a restart is possible here). **Decided 2026-11-20
      ("do recommended"):** the first is removed (no page called it); the second stays open
      (it says only whether a restart is possible).
    - *The "User Guide" of Utils > Help & Documentation ("Complete reference guide", "Download
      English PDF") is a leaflet of one page* that the server composes itself
      (`routers_help.py`). `USER_GUIDE_COMPLETE.md` is not in the application. **Decided
      2026-11-20: left as it is.**
    - *Older documents and tools of the same kind* (the owner, 2026-11-18, on the
      documents: "read and correct as needed"). **The documents: done in PR 429**, these
      nine and fourteen more; the tools below were deleted in PR 434. This entry is closed. As it
      was: `docs/admin/`
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
    - ~~*Not tried from end to end:* a scheduled report and a report sent by e-mail.~~ **Tried
      2026-11-20 on an isolated copy (the owner's OK: "do recommended"): both work, and the
      owner received both e-mails with their PDF** (under "In v1.18.78").
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
      owner's call. **Done 2026-11-20 ("do recommended"):** System Operations and Database
      Management (which has its own backup and restore) are shown to administrators only;
      under "In v1.18.78".
    - ~~*Fifteen older user documents were not read* (the owner, 2026-11-18: "read and correct
      as needed"; open) (listed in `docs/user/INDEX.md`): two
      quick-start guides, three older user guides (one of v1.9.7), the theme, localization,
      import/export and rate-limiting guides, the two RBAC guides and a note on PDF
      conversion. There is no Greek version of the checked guide. Delete, or read and
      correct (the owner's OK).~~ **Done in PR 429:** they are among the 22 documents that
      entry read and corrected (see "In v1.18.74"), and the Greek guide
      `ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md` is in `docs/user/`.

**Older entries that are still open** (they keep their numbers; the closed entries that
stood between them are in part 2 of [`UNIFIED_WORK_PLAN_ARCHIVE_2026_H2.md`](./UNIFIED_WORK_PLAN_ARCHIVE_2026_H2.md),
and 44 and 48 in its part 5):

40. **A real Update install, end to end** (open since the v1.18.57 smoke test, 2026-10-13; todo 28) —
    verified so far: the update check offers the published release on a frozen Lite and on Docker.
    Never exercised: the Lite installer through UAC, the Docker host task, and the Android offer on
    a device. Each needs an install one release behind a published one: v1.18.66 is now out, so a
    PC on v1.18.65 can be updated to it.
    - **Android half closed 2026-11-19 (owner):** an update on a phone one release behind the
      published one was done on the owner's Android phone, and "works fine". **Still never
      exercised:** the Lite installer through UAC and the Docker host task.
    - **The owner, 2026-11-20 ("Test Lite after release"):** once v1.18.78 is published, Lite
      v1.18.77 is installed on the dev PC into a folder of its own and updated from the app;
      the owner clicks Yes at the UAC prompt. The Docker host task stays open.
    - **Not possible as planned (2026-11-21):** the installer has one AppId, `DisableDirPage`
      and `UsePreviousAppDir`, so a second install cannot have a folder of its own; on the dev
      PC it would have replaced the owner's Docker test install (`C:\Program Files\SMS`,
      v1.18.74, on a local SQLite file). Windows Sandbox is not installed. **The owner chose to
      update that Docker install instead:**
      - *The Control Panel's Update answered 403* (the owner, signed in as admin): v1.18.74's
        Updates tab did not send the login token, and the Docker edition sees the browser on
        the bridge address, so the Control API refused it. That is PR 441, released in
        v1.18.75; a v1.18.74 Docker install cannot update itself from the page. The only other
        way to start the host task is to write its request file, which the assistant's
        permission check refused; the owner chose the installer by hand.
      - *By hand, through UAC (the owner):* the published `SMS_Installer_1.18.78.exe` (digest
        and signature checked first) over the Docker install: the UAC prompt named AUT MIEEK,
        the wizard kept the Docker edition, and the installer rebuilt and started the
        container itself. After: `install_metadata.txt` v1.18.78 from v1.18.74, image
        `sms-fullstack:v1.18.78`, healthy, the same SQLite data, no ERROR line; the scheduled
        task "SMS Update Watcher" registered again and running. In the browser the Updates tab
        says "up to date, v1.18.78" with no 403; the log: "Control API access granted via
        admin bearer token", the update check 200.
      - **Still never exercised:** the host task itself (download, digest, signature, silent
        install, rebuild from the page's request) and the Lite installer through UAC. The
        Docker half can be done when v1.18.79 is out: that test install is now on a version
        whose Update button works.

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
      that day may still contain the text. ~~**Still open:** read the Oracle Cloud Services
      Agreement accepted at sign-up for how it treats a free account.~~ **Read the same day**
      (the v1.18.68 paragraph at the head of this plan: the Cyprus Cloud Services Agreement of
      22 June 2023 and the Data Processing Agreement of 14 August 2025 exclude neither free
      nor trial accounts); only the free account's order record could not be read.
    - **The owner's decisions, 2026-11-20** (recorded in `docs/admin/PRIVACY_AND_GDPR.md`,
      "Decided for the ΜΙΕΕΚ installation"):
      - **Lawful basis:** Article 6(1)(e), public task (plus 6(1)(c) where a law requires the record).
      - **Retention:** the proposed periods are adopted, written down only. No automatic deletion
        is built; that would need a new decision.
      - **Controller on the Privacy page:** the owner, as the teacher.
      - **Older copies, done 2026-11-20 (owner: "do suggested"):** files on the dev PC written
        on or before 13 November that copy the current database went to the Recycle Bin, none
        of them opened. That was 246 files, 12.7 MB, all git-ignored, under `backups\database`
        (with `.metadata`), `backups\postgres`, `backups\semester_archives` and
        `src\backend\exports` (165 near-empty `export_1_*.xlsx`). Nothing in Downloads,
        Desktop, Documents or OneDrive matched. The VM's backups start on 16 November and are
        clean, as are the copies in the owner's confidential folder.
      - **Kept as the owner's own archives:** the older installations' files in other folders
        on the dev PC (2025 to June 2026). Under the adopted one-year backup rule they can go
        when the owner chooses.
      - **Out of reach:** snapshots on the QNAP itself, and files already sent to others.
      - **Still open:** the controller's name and contact for the `PRIVACY_*` settings (supplied
        by the owner, set in the servers' `.env`, never in the repository). **The owner,
        2026-11-20 ("Set them at the VM update"):** asked for when the VM is moved onto
        v1.18.78, and written into the VM's `.env` only. **Done 2026-11-21 on the VM** (the
        owner typed them; the Privacy page answers `configured: true`). A home install that
        should show them needs the same two settings in its own `.env`.

**Open design calls from the dark-theme work of 2026-10-07** (the owner's decision; the rest of
that entry is in part 2 of the archive):

- ~~**Still below 3:1 in every theme (design calls, owner's decision):** white text on the
  Attendance Quick Actions "Present" (green-500, 2.3:1) and "Late" (yellow-500, 1.9:1)
  buttons; the light footer (`text-gray-400`, 2.5:1); small `text-slate-400` and
  `text-emerald-500` text on the dashboard (2.3–2.6:1).~~ **Fixed 2026-11-20 (the owner:
  "Fix all four"):** at least 4.5:1 in all 32 combinations of theme and appearance (under "In v1.18.78"). Not issues: greyed calendar days
  (disabled), the Operations section headings (audit false positive, checked visually);
  the Semester Archive "Preview" button looks like a dimmed disabled button (not checked).

**Where the rest went (2026-11-15, todo 57).** The closed entries of this list, the notes that
stood between them (the Tailwind 4 migration, the dependency rounds, the September and October
follow-ups) and the dated sections from September 29 back to June 15, 2026 are in
[`UNIFIED_WORK_PLAN_ARCHIVE_2026_H2.md`](./UNIFIED_WORK_PLAN_ARCHIVE_2026_H2.md), word for word. A section this plan names and
does not contain is there.
On 2026-11-20 the closed todos 44, 48, 52, 53, 56, 57, 59, 60, 61, 62 and 64 went to part 5 of it, and the records of v1.18.73 back to v1.18.66 to part 4.

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
