# Unified Work Plan - Student Management System

**Current Version**: 1.18.71
**Last Updated**: November 16, 2026
**Status**: ✅ **v1.18.71 released 2026-11-16** (tag on `9afbbeea1`, run by the assistant; asked
after #407 was merged, the owner chose "Release v1.18.71" and "Yes, do the drill"). It ships
what was on `main` since v1.18.70 ("In v1.18.71" below): the automatic daily backup and a
restore that works (#407), the permission layer that no longer holds the event loop (#393),
the removal of the idle Socket.IO channel (#391) and the week's dependency updates. No
database changes. The open work is listed at the start of "Next todos".

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

### On `main` since v1.18.71 (unreleased)

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
- **Not done:** no monitoring service exists yet and the VM has neither this code nor an
  address (todo 54). Not released.

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
  (The first two were fixed on 2026-11-15, #384; the table is still open.)

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
v1.18.70" and "In v1.18.71" at the top). Older entries that are still open, further
down: 40 (a real Update
install), 44 (the cloud host: the Oracle agreement accepted at sign-up still to be read, idle
reclamation), 48 (dispatching the build-only Docker run from the release flow) and 50 (the
owner's side of the privacy round). Todo 51 is closed: the owner confirmed on 2026-11-15 that
the attendance fix works on the phone. Also still open in their own sections: the contrast
design calls of 2026-10-07, `viewer` and `guest` getting 403 on the Dashboard overview, and
the Absence limits table cut off at 412 px (2026-11-12 smoke test).

**First in line: the owner's parts of todos 55 and 54.** Since v1.18.71 the cloud VM backs up
the shared database once a day, and a restore of its first backup was proven. What no software
does: a copy of the VM's backup key kept somewhere else, and a copy of a backup taken off the
VM now and then (todo 55). The code that tells somebody when a backup fails or the server
stops is on `main` (#408, unreleased); it needs an account at a monitoring service, the
release that carries it and the address in the VM's `.env` (todo 54).

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
    Socket.IO events) is deleted with the channel. **Left:** make each of the six skipped
    suites run or delete it (deleting needs the owner's OK).
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
      cannot report that the VM is down. The details are under "On `main` since v1.18.71".
    - **Left:** (a) the owner's: an account at a monitoring service (healthchecks.io or the
      like), and its address in the VM's `.env`; the runbook has the steps ("Watching the
      server"). It works from the release that carries #408. (b) The five manual-only
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
    - **Left:** (a) the owner's: a copy of the VM's key kept somewhere else, and now and then a
      copy of a backup taken off the VM (the runbook has the commands). Until then the backups
      and their key exist on the VM only. (b) Whether the key next to the code on the dev PC
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
    - *`migrations.log`* is written to `src/logs/`, not `logs/`: the runner takes `src` for the
      repository root.
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
    - *A test run uses the backups folder of the tree it runs in.* Two tests in
      `test_control_endpoints.py` (`test_download_database_backup_success`,
      `test_list_database_backups_includes_sql`) write a file into `backups/database`, and the
      semester-archive tests use `backups/semester_archives/.staging`. They remove what they
      create, and no backup was touched (seen on the dev PC: the folder's time changed during
      the release run, its 26 files did not). The tests should get a temporary `BACKUPS_DIR`;
      several modules read it once at import (`routers_adminops`, `database_manager`). The
      same class of problem as the schedulers and the mail settings, fixed in #392.
    - *The shared database runs PostgreSQL 14.18; CI's PostgreSQL service and the release checks
      use 16.* The v1.18.70 upgrade was repeated on 14 before the cloud host was updated. CI
      should test the version in use, or both.
    - *The notification components do not share state.* The bell, the dropdown and every item
      call `useNotifications` and each gets its own copy, so marking an item as read does not
      change the dropdown's list or the bell's count until they next fetch. (The Socket.IO
      events were meant to keep them in step; nothing ever sent one.) A shared store or context
      would.
    - *The native WebSocket endpoint has no client.* `/api/v1/notifications/ws` and
      `services/websocket_manager.py` work and are tested; `services/notificationWebSocket.ts`
      in the frontend is used by nothing but its own test. Use it or remove both (owner's call).
    - *Both notification guides describe things the application does not have* (an
      administration panel, WebSocket settings, delivery dashboards). #391 corrected the
      delivery description at the top of each; the rest is as written in January 2026.
    - *`schedule_cleanup_task("hourly")` would run every minute* (`"*/1"` in the minute field of
      `maintenance_scheduler.py`). Only `"daily"` is ever asked for.
    - *Installs older than v1.18.70 on the shared database:* see the note at the top of this
      document. The owner's stopped `sms-app` container is v1.18.63.
    - *"Slow query" warnings on the cloud host.* `db/query_profiler.py` warns about every
      statement over 100 ms; the database is 65 ms away, so the health check's own catalogue
      query warns every 30 seconds (13 of the 15 warnings in the VM's first five minutes on
      v1.18.70). Now that the log works, that buries real warnings. The threshold should be a
      setting, raised in `docker-compose.cloud.yml`.
    - *The query profiler never forgets.* It appends one record per statement to a list for the
      life of the process (read by the diagnostics router, emptied only by its reset endpoint).
      On a server that stays up for weeks that is a slow leak; it should keep the last few
      thousand.
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
      - *A translation that reads the same as its key is shown as the key.* `t()` in
        `LanguageContext.tsx` takes a value equal to the key's last part for "not found", so
        `utils.created` ("created") showed as `utils.created:` in English. `updated`,
        `warnings` and `errors` in `en/utils.js` are the same case. The backup list got a key
        of its own; `t()` should ask i18next whether the key exists.
      - *`hideLegacyDatabaseTools` shows the tools.* `DevToolsPanel` reads the prop as
        "visible"; the Control Panel passes it and gets them shown, which is what the page
        needs. The name is the wrong way round.
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
    - **Still open:** dispatching the build-only run from the release flow.

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
