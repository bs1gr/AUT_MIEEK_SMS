# Unified Work Plan - Student Management System

**Current Version**: 1.18.61
**Last Updated**: October 27, 2026
**Status**: ✅ **v1.18.61 released 2026-10-27** (tag on `6749d7860`; fix commit `8c88f1613`).

v1.18.61 ships (same day as v1.18.60, prompted by the owner's first real-phone check):
- **Exports never downloaded in the Android app.** PDF export did nothing on the phone. All 12
  export sites used `URL.createObjectURL` + `<a download>`, which Android's WebView drops for
  `blob:` URLs — broken since the APK existed. New `utils/downloadFile.ts`: web keeps the anchor;
  native writes to the app cache (`@capacitor/filesystem` 8.1.5) and opens the share sheet
  (`@capacitor/share` 8.0.3). Verified on the emulator: Export Center → Students → PDF fetched the
  report, wrote a valid 23.5 KB PDF and opened the chooser (Print, Drive, Messages…).
  **Confirmed by the owner on the real phone with the published APK (2026-10-27): export
  works.**
- `RELEASE_READY.ps1` now runs `INSTALLER_BUILDER -Action test` after the build (`444a35a7f`);
  it ran for the first time in this release and passed.

**Verified on the published v1.18.61 assets:** installer `SMS_Installer_1.18.61.exe` 82,118,568
bytes, SHA-256 `70b8d8a5…6fd3` = GitHub's digest, Authenticode Valid (CN=AUT MIEEK, DigiCert
timestamp), file/product version v1.18.61. APK `SMS_Android_1.18.61.apk` 4,180,294 bytes, SHA-256
`45aaf776…d3ab` = GitHub's digest, `versionName 1.18.61` / `versionCode 118061`, min SDK 24,
target SDK 36, signer CN=MIEEK SMS. Tag workflows (release-on-tag, installer, APK, wiki sync) and
the main CI/E2E run on `6749d7860` all succeeded. Release-time notes: the CI runner's own
Authenticode check still reports UnknownError (self-signed root not trusted there) and the
`CODESIGN_CERT_THUMBPRINT` gate is skipped — the gate is effectively soft (pre-existing, see
todo 30); `test_health.py::test_health_endpoint` reports "degraded" whenever host memory ≥ 90 %
(a running emulator tripped it once) — environment-sensitive, consider mocking the resource check.

v1.18.60 shipped (2026-10-27, tag on `614a2f2cf`; PR #306 squash `0854f69c5`):
- **Capacitor 7 → 8.5.3** with the Android project migration (compile/target SDK 36, min 24;
  AGP 9.4.1, Gradle 9.6 kept). `viewport-fit=cover` dropped so Capacitor pads the WebView
  (todo 36 checks the WebView ≥ 140 path on a real phone).
- **Every open security alert fixed:** filelock 4.2.4 (Dependabot #291–293, code scanning
  #1900–1902), root `pyproject.toml` OpenTelemetry 1.45.1 (#290), vitest 4.1.12 (#288, #294),
  and an npm override for `xcode → uuid` 11 (GHSA-w5hq-g745-h8pq). pip-audit and npm audit clean.
- **The Docker build was red on `main` from 2026-10-25:** the Dockerfiles ran a lockfile-less
  `npm install`, which floated to `@vitest/eslint-plugin` 1.6.28 (TypeScript ≥ 6 peer). Both
  now `npm ci` from the lockfile; Dependabot ignores that plugin ≥ 1.6.28 until TypeScript 6
  (todo 34).
- **Language switcher on regional locales** (`en-US` showed "ΕΛ → EN" over English text; first
  tap did nothing) and the switcher's and navigation's accessibility labels, which never
  translated.
- protobuf 7.36.2; all backend and frontend minor/patch updates; the root `pyproject.toml`
  pins synced to `requirements.txt`; setup-node 7, fetch-metadata 3.1.0; the frontend lint job
  no longer installs Playwright browsers (it hung for its full 25-minute limit once).

**Release run (RELEASE_READY, 32 min):** COMMIT_READY passed; batches 45/45 (1247 passed, 39
skipped); VERIFY_VERSION 11/11; Lite 151.9 MB with "SQLAlchemy: bundled 8 Cython extension(s) as
pure-Python modules"; installer 82.45 MB signed. **The APK tag workflow failed:**
`release-android-apk.yml` (and `release-installer-with-sha.yml`) still pinned Node 20, which
Capacitor 8's CLI refuses; `ci-cd-pipeline.yml` already used 22, so no PR run showed it. Fixed on
`main` in `a0dbadb4c`; the APK workflow was re-dispatched on `main` with `tag=v1.18.60` (it checks
the tag's source out), which is a re-run for the current release, not a historical tag.

**Verified on the published assets:** installer `SMS_Installer_1.18.60.exe` 82,111,776 bytes,
SHA-256 `2964f8e8…fa42` = GitHub's digest, Authenticode Valid (AUT MIEEK, DigiCert timestamp).
APK `SMS_Android_1.18.60.apk` (re-dispatched run 40424608692, success) 4,086,638 bytes, SHA-256
`65ea445b…564e` = GitHub's digest, `versionName 1.18.60` / `versionCode 118060`, min SDK 24,
target/compile SDK 36, signed with the MIEEK SMS release certificate. Docker publish is
manual-only and was not run (as before).

**Smoke test before the merge** (all on throwaway databases; results on PR #306): isolated E2E 40
passed; Docker image and frozen Lite 13/13 API, PDF and SPA checks each; release APK on an
Android 16 emulator (login, Greek UI, back button, offline banner, server URL kept across an
upgrade); instrumented test 1/1 under the new Android Studio Rabbit 2026.2.1.

v1.18.59 released 2026-10-21 (annotated tag on `a40b2f0b8`). It ships:
- **SMS Lite no longer bundles SQLAlchemy's compiled extensions** (`b4f6076aa`). Windows Smart
  App Control blocks those unsigned `.pyd` files, and **v1.18.58 Lite exited at startup on any PC
  with it enforced** (reproduced: exit 1 after 17 s, Code Integrity event 3077 on
  `_processors_cy.pyd`). The spec swaps all eight `_*_cy` extensions for the pure-Python
  modules the wheel ships beside them, and fails the build if one is left. **This is not
  enough on its own: Smart App Control also blocks the new unsigned `SMS_Lite.exe` itself**
  (todo 30);
- **SMS Lite bundles its PDF fonts** (`857613ba5`). It never shipped `backend/fonts`, so
  exports fell back to Helvetica, which has no Greek glyphs, and the student report PDF failed.
  This is the likely cause of the old "Greek PDF black squares" reports: ReportLab does embed
  DejaVuSans subsets;
- vite 7.3.7 (dev server `launch-editor` advisories), markdown-it 15.0.3, reportlab 5, redis 8,
  and the 2026-10-19 Dependabot and CodeQL round (below).

**Checked before tagging:**
- reportlab 5.0.1 renders Greek with the repo's DejaVuSans (embedded subsets, text extracts).
- redis-py 8.1.0 against `redis:7-alpine` (7.4.11, the compose image): 13/13 checks over both
  cache classes, including TTLs, pattern invalidation and `flushdb`.
- The SQLAlchemy swap on a frozen build from the `cp313-win_amd64` wheel, as CI uses: 8 swapped,
  0 left, and it ran with `cext=False`.
- Frozen v1.18.59 Lite, with Smart App Control off on the owner's PC (owner switched it off for
  the test): `/health` reports v1.18.59 within 6 s; login works; a student with a Greek name was
  created; the student report and student list PDFs embed DejaVuSans and contain the Greek
  name. No migrations since v1.18.58, so no database upgrade test.

**Verified on the published assets:** installer signature Valid (AUT MIEEK, DigiCert timestamp),
version `v1.18.59`; both SHA-256 hashes match GitHub's digests; the APK reports `1.18.59`
(`versionCode 118059`); all four tag workflows passed. The CI build log shows `SQLAlchemy: bundled
8 Cython extension(s) as pure-Python modules`, so the published Lite has none of the blocked
`.pyd` files. The markdown-it alerts closed after the dependency graph refreshed; no
Dependabot alerts are open. Docker publish is manual-only and was not run (as before).

v1.18.58 released 2026-10-14 (annotated tag on `092992de2`). It ships:
- participation observations as deductions (owner, 2026-10-13): a share of each attended day's
  Class Participation, 60/40/20% by severity, editable per course; the rest of the day is credit
  for presence (see todo 22, "Superseded 2026-10-13"). Existing courses fold their old sub-weights
  back into Class Participation, so **grades with ticked observations change**;
- a new-release announcement for every signed-in user (banner + bell; Install for admins);
- the grade breakdown's Greek-scale label (it said "Fail" for every grade);
- dev/test fixes: Vite proxies `/socket.io` (native dev live notifications), the E2E seed
  activates its courses.

**Smoke test before tagging**, on the release build:
- dev stack: every page loads cleanly; the observation flow (Courses defaults, Attendance tick,
  final grade 78.8 as calculated, breakdown note); it found the breakdown label bug above;
- frozen SMS Lite: the v1.18.57 database opens; `/notifications/release-announcement` is in the
  bundle; the observation grade via the API is exactly as calculated (77); the Courses tab shows
  the new panel; a copy reporting v1.18.50 shows the announcement with Install, no errors.

**Verified on the published assets:** installer signature Valid (AUT MIEEK, DigiCert timestamp);
both SHA-256 hashes match GitHub's digests; the APK reports `1.18.58` (`versionCode 118058`); all
eight workflows on the release commit passed. Docker publish is manual-only and was not run (as
before). The announcement first appears when a release newer than v1.18.58 is published.

**2026-10-19: Code scanning and PR maintenance round.**
- **CodeQL Alerts fixed:** Alert 1898 (`py/clear-text-logging-sensitive-data` in `src/backend/lite_simple_entrypoint.py:80`) and Alert 1897 (`py/clear-text-storage-sensitive-data` in `src/backend/lite_db.py:118`). Fixed by printing a static diagnostic message instead of prompting text to stderr in `_ask_password`, renaming `password_prompt_message` to `qnap_prompt_message` (with alias), and writing updated credentials files with restricted permissions (`0o600`) via low-level descriptor (`os.open`/`os.write`). CodeQL re-scan confirmed both alerts resolved (`fixed`).
- **Dependabot PRs reviewed and merged:** 14 PRs merged into `main` (#273–#286 covering `actions/setup-python`, `actions/setup-java`, `pypdf`, `slack-github-action`, `reportlab`, `redis`, `docker/metadata-action`, `pip-minor-patch`, `actions/stale`, `pytest`, `npm-minor-patch`, and `@babel/*`). PR #287 (`@capacitor/app` 8.1.2) closed with `@dependabot ignore this major version` due to breaking version mismatch with remaining Capacitor 7 packages.
- Zero open CodeQL code scanning alerts, zero open Dependabot security alerts, and zero open PRs remain.

**2026-10-26: Security fixes, Capacitor 8 and dependency round (PRs #305, #306; awaiting the
owner's merge, unreleased).**
- **#305:** filelock 4.2.4 (Dependabot #291–293, code scanning #1900–1902; it also failed the
  pip `audit` job on every pip PR), the root `pyproject.toml` OpenTelemetry family at 1.45.1
  (#290), vitest 4.1.12 (#288, #294).
- **`main` had been red since 2026-10-25:** `Dockerfile.fullstack` and `Dockerfile.frontend` ran
  `npm install` without the lockfile, which picked up `@vitest/eslint-plugin` 1.6.28 (TypeScript ≥ 6
  peer). Both now `npm ci` from the lockfile.
- **#306** (stacked on #305; merging it lands both):
  - Capacitor 8.5.3 with the Android migration (SDK 36, min 24; AGP 9.4 and Gradle 9.6 kept).
  - `viewport-fit=cover` dropped (todo 36).
  - An npm override for `xcode → uuid` (GHSA-w5hq-g745-h8pq).
  - protobuf 7.36.2.
  - All backend and frontend minor/patch updates.
  - The root `pyproject.toml` pins synced to `requirements.txt` (24 were months stale).
  - setup-node 7, fetch-metadata 3.1.0.
  - It supersedes Dependabot #293–#304.
- **Found by the Android smoke and fixed in #306:** on an `en-US` phone the language switcher
  showed "ΕΛ" over English text and the first tap did nothing (i18next keeps the regional
  locale). The switcher's and navigation's accessibility labels never translated.
- **Smoke test** (results on #306), every target on a throwaway database:
  - isolated E2E: 40 passed. The one failure, a 3 s load check run beside a Docker build,
    passed 18/18 when re-run alone.
  - Docker production image and frozen Lite: 13/13 API, PDF and SPA checks each.
  - release APK on an Android 16 emulator: login, Greek UI, back button, offline banner,
    server URL kept across an upgrade.
  - Backend batches: 1247 passed, 0 failed. Vitest: 1820 passed.
- Follow-ups: todos 34 (major upgrades review), 35 (Node 22 locally), 36 (system bars on a real
  phone).

v1.18.57 released 2026-10-13 (tag on `67042f28c`). It ships:
- todo 28: Control Panel Update per edition (Lite-only installer, Docker host task, guidance on a
  dev checkout, APK offer on Android);
- todo 29: Update reads the installed version correctly on Lite and Docker;
- todo 26: Lite stops after Logout or once no page is open;
- todo 22 step 2: the four legacy absence columns are dropped (owner: every device ran v1.18.56).
  The E2E failure from the heartbeat was fixed first (`066d2a18f`).

**Smoke test before tagging**, on the release build (todo 29 has the results):
- the v1.18.56 Lite database upgraded;
- the Lite lifetime rules held;
- the update check runs in Lite mode.

It found todo 29; the fix was rebuilt and the smoke test re-run.

**Verified on the published assets:**
- The installer's signature is Valid (AUT MIEEK, timestamped, `v1.18.57`), and both SHA-256 hashes
  match GitHub's digests.
- The APK reports `1.18.57` (`versionCode 118057`).
- All eight workflows on the release commit passed.
- A copy of the new Lite set to report v1.18.56 is offered v1.18.57, with the published installer
  and its digest.
- **Not exercised yet:** a real Update install through UAC, the Docker host task end to end, and
  the Android offer on a device. Each needs an install one version behind.
- **First move to v1.18.57 is manual on every PC.**

v1.18.56 released 2026-10-13 (tag on `025f20920`). It ships:
- todo 25: registration requests told apart from deactivated accounts (migration
  `e7a1c9d4f2b8`, additive), and one password rule everywhere;
- step 1 of removing the old absence columns: they are no longer mapped;
- the OpenTelemetry and Dependabot updates.

**Smoke test before tagging**, on the release build:
- **SMS Lite upgrade:** the frozen exe opened the database that v1.18.55 had created in the
  previous smoke test.
  - The migration ran, `d5e9f3a2b7c4` → `e7a1c9d4f2b8`, and the users-table rebuild kept the user
    and its referencing refresh token.
  - The existing admin logs in, and `/admin/users` returns `registration_pending`.
  - Courses return 200 with the legacy columns still in the database.
- **Fresh local SQLite and QNAP password window:** the same checks as v1.18.55, all passed.
- **Installer Lite page:** the owner clicked through it. On REC it shows the existing-database
  note; the password-rule message needs a PC without a Lite database.

**Verified on the published assets:**
- The installer's Authenticode signature is Valid (AUT MIEEK, timestamped, `v1.18.56`), and both
  SHA-256 hashes match GitHub's digests.
- The APK reports `1.18.56` (`versionCode 118056`).
- All eight workflows on the release commit passed: the release, installer and APK workflows
  (the first real runs of `checkout` v7 and `github-script` v9), and CI/CD and E2E.
- **Not exercised:** Docker publish did not run for this tag, so `build-push-action` v7 and
  `login-action` v4 still await a real run.
- The release notes carry a Highlights section.

v1.18.55 released 2026-10-12 (tag on `6abf8909b`). Todo 24 and its follow-ups:
- No public-password default admin on a shared database.
- The SMS Lite installer asks for a local-SQLite administrator, prefills QNAP on upgrades and
  removes old QNAP settings when SQLite is chosen.
- SMS Lite asks for the current QNAP password when QNAP refuses the saved one.
- No self-registration on local SQLite.
- The batch-runner retry fix.

Smoke-tested before tagging (todo 24, "Release smoke test"); two bugs found there were fixed in
`a10283871`. Verified on the published assets:
- The installer's Authenticode signature is Valid (AUT MIEEK, timestamped, `v1.18.55`), and both
  SHA-256 hashes match GitHub's digests.
- The APK reports `1.18.55` (`versionCode 118055`).
- The release, installer and APK workflows passed. The release notes carry a Highlights section.
- **Update every SMS Lite PC:** until then, each Lite start can recreate the public
  `admin@sms-lite.app` on the QNAP database.

The same evening, Dependabot: the OpenTelemetry family went in as one commit (`e4f01de70`,
replacing #263/#265, which pip could not resolve alone). #258–#262 (Actions majors, checked:
no self-hosted runner registered, no github-script v9 incompatibility, no removed build-push
variables), #264, #266 and #268 were merged. #267, #269, #270 and #272 were merged after
Dependabot rebased them, each with all checks green. #271 (`@types/node` 26) was closed and that
major ignored (the runtime is Node 22). No Dependabot PR is open.

**✅ Fixed the same evening (owner):** after a second router change, the probe from REC gets no
connection on `77.83.249.220:55433`. `172.16.0.2:55433` still answers on the LAN.
`docs/misc/LITE_QNAP_SETUP.md` now says the public address is closed and to use Tailscale.
What happened before the fix:

**QNAP PostgreSQL on the public IP (todo 6 finding):** the owner removed the router
port-forward on 2026-10-12, but a check from REC right after still found PostgreSQL on
`77.83.249.220:55433`: it answered PostgreSQL's SSL probe with `N`, the same as on
`172.16.0.2`. REC's own public IP is that address, so the request was looped back through the
router, which only reaches the QNAP while some rule still forwards the port. Next, check:
- the router's UPnP mappings, and myQNAPcloud's "Auto Router Configuration" on the QNAP;
- a DMZ host pointing at `172.16.0.2`;
- whether the change was saved and applied.

Confirm from outside with an open-port check over mobile data.

v1.18.54 released 2026-10-08 (tag on `a60da1e28`). Analytics rebuilt on final
grades, the new ΜΙΕΕΚ absence rules (fail over 30%, Class Participation lost over 10%, no
extended limit; migration `d5e9f3a2b7c4`, additive), special participation as Class Participation
sub-weights in the Courses tab, the Overview dashboard (Top Performers, needs-attention and
attendance-gap panels), and the fixes since v1.18.53 (invisible dark-modal Cancel button,
dark-theme text, export tips, Credits logo). Verified on the published assets:
- The installer's Authenticode signature is Valid (AUT MIEEK, DigiCert-timestamped, `v1.18.54`),
  and both SHA-256 hashes match GitHub's digests.
- The APK reports `1.18.54` (`versionCode 118054`) and bundles the new dashboard code.
- All workflows on the release commit passed, including `main`'s CI/CD and E2E; the lockfile
  change is only its two root `version` fields. The release notes carry a Highlights section.
- The QNAP database already had the migration (applied by the owner's dev server on restart).
  **Every install (laptop Docker, Lite installs, phones) should be updated**, so all of them
  apply the same absence rules; the old extended-limit columns can be dropped after that.

v1.18.53 released 2026-10-07 (tag on `7cd812fb4`). A frontend-only visual fix
release: the shadcn colour tokens are defined (`404e2cf63`; login button, field borders,
placeholders) and the remaining dark-theme text is readable (`1159386af`). Verified on the
published assets:
- The installer's Authenticode signature is Valid (AUT MIEEK, DigiCert-timestamped, `v1.18.53`),
  and both SHA-256 hashes match GitHub's digests.
- The APK reports `1.18.53` (`versionCode 118053`), and its `index-*.css` carries the new tokens,
  including the mieek-dark set.
- All workflows on the release commit passed, including `main`'s CI/CD and E2E. The release
  commit changed only the lockfile's two root `version` fields. The release notes carry a
  hand-written Highlights section.
- Smoke test, sized to the change (CSS/classes only): 78 before/after screenshots across six
  appearances, plus measured contrast on the fixed elements (see "Found during the migration",
  item 1 and item 5).

v1.18.52 released 2026-10-07 (tag on `74a4000b9`). A bug-fix release: in v1.18.51
a teacher's first pick of each course in Attendance reset to "Select course" (todo 20); the dark
theme's white panels and fields are readable (migration item 5); E2E checks that could not fail
now can. Verified on the published assets:
- The installer's Authenticode signature is Valid (AUT MIEEK, DigiCert-timestamped, `v1.18.52`),
  and both SHA-256 hashes match GitHub's digests.
- The APK reports `1.18.52` (`versionCode 118052`) and bundles the new CSS.
- All eight workflows on the release commit passed, including `main`'s CI/CD and E2E. The
  release commit changed only the lockfile's two root `version` fields. The release notes carry
  a hand-written Highlights section.
- Smoke test, sized to the change (frontend only; no backend or packaging changes since
  v1.18.51): CI's E2E ran the stricter attendance test against a production build, and the dark-
  theme rules were confirmed in a production CSS build and in the APK.

v1.18.51 (2026-10-06), tag on `5a1427229`. It ships everything from 2026-10-01 to 2026-10-06: the Capacitor 7.6.9 security fix (install the new APK on every phone), the Docker SQLite→QNAP merge fix, Lite fail-closed for QNAP, the browser queue during QNAP outages, the i18n sweep, Students filters, the Outlook panel, and the Tailwind 4 migration with its follow-ups.

Verified on the published v1.18.51 assets:
- The installer's Authenticode signature is Valid (AUT MIEEK, timestamped, `v1.18.51`), and both SHA-256 hashes match GitHub's digests.
- The APK manifest reports `1.18.51` (`versionCode 118051`), with the web assets bundled.
- The release, installer, APK, wiki-sync and asset-sanitizer workflows passed. The release notes
  carry a hand-written Highlights section.
- Smoke test before tagging:
  - Frozen `SMS_Lite` from the release candidate, fresh profile:
    - healthy in 20 s;
    - the default admin gets 403 until the password change, then 200; anonymous requests 401;
    - UI served with no failed static files or page errors, and the new CSS live;
    - scheduled shutdown after 31 s, with all 1209 install files intact.
  - Web, dev-server and Android builds screenshot-checked.
  - Docker image built in CI; E2E green.
- **CI on the release commit failed, fixed after the tag.** `RELEASE_READY.ps1` regenerated
  `src/frontend/package-lock.json` with `npm install --package-lock-only`. That added nested
  `inBundle` entries under `@tailwindcss/oxide-wasm32-wasi`, and CI's `npm ci` (Node 22)
  rejected them, so frontend lint and the frontend security scan failed. The released assets
  were unaffected: they built in their own workflows. The lockfile is back to the CI-proven one
  with only the version changed. The release script now updates just the two root `version`
  fields, as `scripts/bump-version.ps1` does. The `v1.18.51` tag keeps the old lockfile (tags
  are immutable).

v1.18.50 (2026-09-29), tag on `75e39a892`: self-registration needs an administrator's approval,
and approval emails the user. Verified on its published assets:
- The installer's Authenticode signature is Valid (AUT MIEEK, DigiCert-timestamped, `v1.18.50`), and its hash matches GitHub's digest.
- The APK manifest reports `1.18.50` (`versionCode 118050`), and its hash matches too.
- CI/CD, E2E, the release, installer, APK and wiki-sync workflows all passed.
- The release notes carry a hand-written Highlights section.

v1.18.49 (2026-09-25) added the ΜΙΕΕΚ absence limit.

- **Shipped in v1.18.50**:
  - registration approval (`434631cbc`, CI fixes `44b993081`);
  - the smoke-test fixes (`73e6ebee3`): E2E mail isolation and the Greek password dialog;
  - the repo/CI changes of 2026-09-29: rulesets, Dependabot App-token merges, the fixed
    `dependabot.yml`, and the COMMIT_READY translation check.
- **Shipped in v1.18.49**: the absence limit (`ee6653ae7`), with `SEMESTER_WEEKS = 14` confirmed (`f04a38916`), and the Vitest extension fix (`8da16cab5`).

**Earlier status (v1.18.47, 2026-09-24):** (tag on `ad9c8a6db`). It is a security release: SMS_Lite's API had required no login from the LAN (todo 3 below). Verified on the published assets: the installer's Authenticode signature is Valid (AUT MIEEK, timestamped, v1.18.47) and its hash matches GitHub's digest; the APK reports `versionName 1.18.47 / versionCode 118047`; the rebuilt exe returns 401 to anonymous LAN reads and writes. v1.18.46 (2026-09-22) fixed Lite deleting its own install on shutdown. v1.18.45 (2026-09-21) shipped the SMS_Lite router fix, the CodeQL path-injection guards, and the GradingView single-request change.

- **Shipped in v1.18.47**: the Lite authentication fix (`a2cd91a6b`) and the wiki auto-sync workflow (`1e011bc50`). The wiki sync ran on its own after the tag.

- **Shipped in v1.18.45** (see "v1.18.45 session" below): SMS_Lite failed to load `routers_semester_archive` (missing from the spec's hand-kept hiddenimports; the registry's fallback then reported a misleading `No module named 'routers'`); 5 CodeQL `py/path-injection` alerts closed with a real `realpath`+`startswith` guard; GradingView fetches a student's courses with one request; CI runs the restore round-trip tests against Postgres.
- **Shipped in v1.18.44**: the sections dated 2026-09-17 below (PostgreSQL restore, E2E teardown and disposable database, follow-ups closed).
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

**Priority 0 — GitHub security/CI findings (2026-10-01):** PyJWT is now `2.15.0` in both
runtime manifests, and its Dependabot alerts cleared after the dependency graph refreshed.
Both the frontend and root tooling lockfiles now resolve `brace-expansion` to `5.0.12`, with a
scoped root override; full npm audits in both package directories report zero vulnerabilities.
The remaining GitHub alert (#277) came from the root development lockfile, not the frontend
production tree. GitHub's SBOM still showed the pre-fix `5.0.9` snapshot; the lockfile is fixed
locally, and the alert should clear after the next graph refresh.

The first push's CI/E2E failures were caused by adding `@babel/runtime@8.0.5` without its
`src/frontend/package-lock.json` entry. The lock is synchronized, clean `npm ci` succeeds, and
CI/CD plus E2E passed on `b42b6c1d7`. A follow-up CodeQL alert (`PYSEC-2026-4013`) found that
`virtualenv==21.7.12` still had an activation-script injection; both runtime and development
requirements now use the fixed `21.7.13` release. A local `pip-audit` over both requirements
files reports no known vulnerabilities.

A manual CodeQL run found a high-severity clear-text SMTP password persistence path in
`services/smtp_override.py`. SMTP passwords are now Fernet-encrypted using a purpose-derived
key from `SECRET_KEY`, and legacy plaintext overrides migrate on load. The focused SMTP suite
passes (22 tests), Ruff is clean, and the local ignored override was verified encrypted.

**2026-10-05:** CodeQL raised two new high alerts on that commit (`3a8fd1fa7`), both in
`smtp_override.py`; the SARIF code flows show why:
- **#1888 clear-text storage — real.** `save()` started from `dict(data)`, so the caller's
  plaintext password was still in the dict that was written; overwriting the key afterwards
  does not remove it from the flow. A non-string or empty password was also written unchanged.
  `save()` now builds the file from an allow-list (`PLAIN_FIELDS`, also used by the PUT
  endpoint) and writes the password only encrypted, or `""` when it is explicitly cleared.
- **#1889 weak hashing — false positive from a name.** The "password" hashed with SHA-256 was the
  constant `_PASSWORD_KEY_CONTEXT`, a label. Key derivation now uses HKDF-SHA256 with that label as
  `info`, the standard primitive for deriving a key from a high-entropy secret. The derived key
  changed; the format was never released, and the one local override was re-encrypted in place.
- 25 SMTP tests pass (3 new: allow-list, cleared password, key mismatch drops the password).

Fixed in `963183010`. A manual CodeQL run on `main` marked both alerts **fixed**
(2026-10-05 10:27 UTC), and no code-scanning alerts are open.

**2026-10-06: two critical npm advisories published overnight** broke CI's "Security Scan
(Frontend)" (`npm audit --omit=dev`) on `1b6d5f16f`. That commit did not cause it.
- **`@capacitor/android` < 7.6.9** (GHSA-rvm3-566m-v7fv): remote content could be loaded at
  the app origin through Capacitor's internal HTTP proxy path. `@capacitor/core`, `android` and
  `cli` are now `^7.6.9`. `android/` builds `capacitor-android` from `node_modules` and pins no
  version, so the next APK carries the fix. **The installed APK (v1.18.50) is affected until
  then.**
- **`seroval` ≤ 1.6.2** (GHSA-p6vx-979v-rg4c critical, GHSA-jp82-f5mq-hwhp high). It reaches
  production dependencies only through `@tanstack/react-query-devtools` → `@kobalte/core` →
  `solid-js@1.9.15`, which pins `seroval ~1.5.4`; no `solid-js` 1.x allows a fixed one. npm's
  own fix downgraded the devtools. Instead, a scoped override under `solid-js` takes `seroval`
  and `seroval-plugins` to `^1.6.8`. In `solid-js` only `web/dist/server.*` (SSR) imports
  `seroval`, so the browser-side devtools never load it. The production bundle contains no
  devtools, `solid-js` or `seroval` code: TanStack swaps in a no-op outside development
  (checked in `dist`). Remove the override once `solid-js` allows `seroval` ≥ 1.6.3.
- `npm audit --omit=dev` now reports 0 vulnerabilities (`3af07f998`; CI and E2E green).

**2026-10-06, later: four Dependabot alerts on development dependencies.**
- **#281 `source-map-js` 1.2.1 (high, root lockfile, via `css-tree`).** Dependabot PR **#256**
  bumps it to 1.2.2. **Merged by the owner** (`5269ce578`); the alert is closed.
- **#283 `smol-toml` < 1.9.0 (medium) and #282 `katex` < 0.18.2 (low), root lockfile.** Both come
  in through `markdownlint-cli@0.49.1`, which is the latest release and still pins
  `smol-toml ~1.7.0` and (through `micromark-extension-math`) `katex ^0.16`. Root overrides now
  take `smol-toml` to `^1.9.0` and `katex` to `^0.18.2`, as for the other root overrides.
  markdownlint only parses math; KaTeX is loaded but never called. Verified in a scratch
  install: markdownlint 0.49.1 over every `**/*.md` with the repo config exits 0 with 0
  findings, its API lints math blocks, and smol-toml parses a TOML config.
- **#284 `postcss-selector-parser` < 7.1.6 (medium, frontend).** Its dependents are
  `tailwindcss` 3.4.19 and `postcss-nested` 6.2.0, both on `^6`, and 6.x has no fix.
  Dependabot's PR **#257** moves to Tailwind 4 and fails COMMIT_READY and Vitest. Instead, an
  override takes it to `^7.1.6`; 7.0.0's only breaking change is safe insertion during
  iteration. The built CSS is **byte-identical** to the 6.1.4 build (both files), with the
  same four existing CSS warnings. #257 closed itself on 2026-10-06, and the Tailwind 4
  migration was done by hand the same day (below).
- **Fixed the same day (owner: "migrate to Tailwind 4 and replace that plugin"):** the full
  frontend audit used to list 9 high findings in build tooling (`braces`, `micromatch`,
  `fast-glob`, `chokidar` via `tailwindcss` 3; `@typescript-eslint` ≤ 8.2 via
  `eslint-plugin-vitest`). After the Tailwind 4 migration and the switch to
  `@vitest/eslint-plugin` (section below), `npm audit` with dev dependencies reports 0.

**2026-10-06: Tailwind CSS 3 → 4, and `@vitest/eslint-plugin` replaces `eslint-plugin-vitest`.**
The goal was a migration nobody can see. Before and after were checked with full-page
screenshots against a throwaway backend: 21 routes and 4 open states (Add Student and Add
Course modals, notifications, feedback), in 6 theme combinations (light, dark, relaxing, fancy,
mieek, mieek-dark), plus 19 routes on a 412 px phone in light and mieek-dark. That is 176
screenshots. Two captures of the old build were identical to the pixel, so any difference is
real.
- **Result:** 164 of 176 identical. The other 12 are the desktop Courses page (with and without
  its modal): its title has `text-xl md:text-3xl leading-tight`. Tailwind 3's responsive
  `md:text-3xl` overrode `leading-tight`, so the line height was 36 px. Tailwind 4 makes
  `leading-*` apply (37.5 px), and content below moves down 2 px. That is the class as written,
  so it was kept. It is the only responsive `text-*` with `leading-*` in the code.
- **How it renders the same** (`src/index.css` header and `src/styles/`):
  - **Utilities are not in a cascade layer.** In Tailwind 4's layers, every unlayered rule in
    index.css (~2000 lines of theme overrides) would beat every utility whatever its specificity.
    Preflight is in a `base` layer.
  - **Tailwind 3's tokens:** the colour palette (Tailwind 4's OKLCH palette is more saturated,
    for example blue-500 `#2b7fff` vs `#3b82f6`), absolute `text-*` line heights, and the preflight
    (Tailwind 4's makes form controls transparent and square, and changes placeholders, button
    cursors and date inputs). They are generated from the tailwindcss@3.4.19 package.
  - **`space-*` and `divide-*`** (`tailwind3-compat.css`): Tailwind 4 puts the gap below each
    child in a zero-specificity `:where()`, so a child's own margin, or preflight's reset on buttons
    and headings, removed spacing (many pages were 16 px shorter). The file restores Tailwind 3's
    rule for the 24 classes in use; a new one gets Tailwind 4's behaviour unless added.
  - **mieek-dark overrides of utilities** (`mieek-dark-utilities.css`, 168 `@utility` blocks):
    Tailwind 3 applied variants to rules in `@layer utilities`. A disabled
    `disabled:bg-gray-50` input in mieek-dark was dark only because Tailwind 3 generated
    `[data-appearance="mieek-dark"] .disabled\:bg-gray-50:disabled` from the plain rule. The
    gradient overrides were rewritten for Tailwind 4's variables.
  - `dark:` is `&:is(.dark *)`, Tailwind 3's `darkMode: 'class'` specificity. Gradients use
    `/srgb` (Tailwind 4 interpolates in OKLab). Classes are generated from the old `content` globs.
  - The upgrade tool's own CSS conversion was not used: it copied stray declarations into every
    generated `@utility`. Its class renames were kept, except three that changed text: two
    "blur effects" strings and a test selector.
  - 15 `bg-opacity-*`/`border-opacity-*` uses the tool missed (modal backdrops went solid black)
    became `/50`-style modifiers. A comparison of the class sets of both builds against the source
    shows no other used class lost.
- **Removed:** `tailwind.config.js`, the unused `@tailwindcss/line-clamp`, five CSS files nothing
  imported (`src/frontend/index.css` and `mobile.css` from before the June restructure, and the
  CSS of the search components deleted on 2026-10-05), and the `postcss-selector-parser`
  override (nothing depends on it now). `autoprefixer` stays for the component stylesheets.
  `components.json` (shadcn CLI) points at `src/index.css` with no config, as Tailwind 4 expects.
- **Checks:** production, Android-mode (`--mode android`, CSS identical to the web build) and dev
  server builds all render the same; full Vitest suite 112 files, 1814 tests; ESLint 0 errors,
  with the four vitest rules active; `tsc` clean; isolated E2E 40 passed, 37 skipped, 1 failed.
  The failure was "dashboard manager should load quickly" at 3.21 s against a 3 s limit with 8
  workers on a cold dev server; that spec passes 18/18 on its own.
- **Browsers:** Tailwind 4 targets Chrome 111, Safari 16.4 and Firefox 128. Colour opacities
  ship a plain fallback before `color-mix()`, and nesting is compiled away, so older browsers
  mostly work. A phone with an Android System WebView older than 111 may render some details
  differently.

**Found during the migration** (items 1–3 done the same day, owner: "proceed"):
1. ~~**`--radius` was not defined anywhere**~~, so `rounded-lg`, `rounded-md` and `rounded-sm`
   (the shadcn/ui tokens in the old config) always rendered square corners. **Now `0.5rem`**:
   8, 6 and 4 px, Tailwind's own values for lg and md. The colour variables behind
   `bg-background`, `border-border`, `text-foreground` and the rest were still undefined.
   - **Defined 2026-10-07 (owner: option 2, full set; not yet released).** `:root`, `.dark` and
     `[data-appearance="mieek-dark"]` in `index.css` now set the shadcn tokens from the app's own
     palette (indigo-600 primary, slate neutrals, red-600 destructive). This is a visible change,
     on purpose: the login "Σύνδεση" button was invisible (no background), the login and Add
     Student fields had no border, and shadcn placeholders matched typed text.
   - Checked with 78 full-page screenshots (6 themes × login, 11 routes, Add Student modal)
     before and after, against a baseline captured twice (70 of 78 identical; the noise is the
     admin permissions / semester archive / dashboard pages, which load asynchronously). After
     the change every logged-in route differs only by the logout button's border (~110 px);
     the login screen and the Add Student modal differ as described. The first run made the
     mieek-dark login card white (it has no `.dark` class and took the light tokens); it now has its
     own token set. Not covered: pages behind data this seed lacks, and 412 px phone layouts.
2. ~~**The `body` rule in index.css never applied.**~~ Six declarations left at the end of
   `@layer utilities` swallowed it, so the browser dropped it. **Restored:** `letter-spacing:
   0.3px`, `font-weight: 500`, the font stack and background. A stray line also disabled one
   mieek-dark `.bg-white` rule (`#0b0b0b`); the `#141414` rule before it is what users see, and
   it was kept.
   - Checked with 176 English and 76 Greek screenshots (desktop and 412 px phone): no text
     overflows. Pages grow a little where wider text wraps (e.g. report templates +20 px). On a
     phone the Greek footer's version number wraps to a second line.
3. ~~**`GradeProgressBar` built `w-[${percentage}%]` at runtime.**~~ Tailwind cannot generate
   such classes, so the fill was full width except at 0, 75 and 100 %. **Deleted:** the whole
   `GradeDisplay.tsx` module (`GradeDisplay`, `GradeComparison`, `GradeProgressBar`) and its test.
   It had never been rendered since the initial commit; only the grading barrel's re-export kept
   it in the bundle (7 KB).
4. ~~`tests/e2e/pwa.spec.ts` is skipped as a whole~~ — **deleted 2026-10-07**, with its only
   runner `run-pwa-audit.ps1`. Two of its tests checked the deleted install prompt and
   `mobile.css`. The manifest test can only pass on a production build (`devOptions.enabled:
   false`), and the service-worker test awaited `serviceWorker.ready`, which passes or hangs
   whatever the result.
5. ~~**The dark theme (`theme=dark`) leaves the Grades page's selects and inputs white**~~ —
   **fixed 2026-10-07.** It was wider than Grades: the theme only sets light text on `#root`,
   and every white panel and form control without its own text class inherited it (preflight
   gives controls `color: inherit`). The Add Student modal was blank: title, labels and fields
   all light-on-white. Two zero-specificity rules in `index.css` now give `.bg-white` panels and
   controls dark text under `.dark`. Any `text-*` or `dark:*` class still wins. Elements with a
   `dark:bg-*` class (some admin-panel fields) and transparent controls (the shadcn `Input`,
   which takes its colour from the panel) are left alone.
   - Verified by full-page screenshots in `theme=dark` (14 views, baseline captured twice with
     0 px noise): login, dashboard, calendar and System unchanged; Grades, Attendance, Search,
     Courses, reports and the Add Student modal now readable. `theme=dark` combined with
     `mieek-dark`: 0 px changed. Light themes cannot match the rules.
   - **Fixed 2026-10-07 (not yet released; smoke-tested on a throwaway backend in `theme=dark` and light, contrast 11.9–16.1 measured):** the Courses and Attendance
     titles (`dark:text-gray-100`), the Attendance Quick Actions heading on its light gradient
     (`dark:text-gray-800`) and the three Students filter labels (`dark:text-slate-300`). Only
     `dark:` classes, so light themes are unchanged. `tsc`, ESLint and 318 Vitest tests pass
     (students, courses, attendance). The screenshots showed four more dim spots, fixed the
     same way and re-measured (12.0 contrast): the Attendance and Courses subtitles
     (`dark:text-gray-300`), the student-card ID line and the Students section arrow. Only
     these three pages were checked; other pages may have the same pattern.
   - **Contrast audit, all pages (2026-10-07, after v1.18.53; not yet released).** A script
     measured every visible text element against its effective background on login, 11 routes
     and the Add Student modal in all six appearances. In `theme=dark`, 41 elements were below
     3:1; now 18, and each of those also fails in the light theme. Fixed:
     - **Regression from v1.18.53 (`404e2cf63`):** the shadcn outline `Button` took
       `bg-background` (dark navy in `.dark`) while inheriting the white modal's dark text, so
       **Cancel in the Add/Edit Student and Course modals was invisible in the dark theme**
       (1.0:1). The outline variant is now `bg-transparent`, as it effectively was before the
       tokens existed; the border stays.
     - Dark theme: Import/Export and Semester Archive titles and description, the admin tabs,
       the Calendar title and print link, the Courses weekly-hours total, the student-card
       "View Performance" link, and the Search pagination text.
     - **Not contrast, found in the screenshots:** the Export Center's tips showed raw keys
       (`exportTipExcel` …): `<Trans>` read the default namespace, the keys are in `export`.
       Test: `ExportCenter.tips.test.tsx` (real i18n instance; fails on the old code).
   - **Still below 3:1 in every theme (design calls, owner's decision):** white text on the
     Attendance Quick Actions "Present" (green-500, 2.3:1) and "Late" (yellow-500, 1.9:1)
     buttons; the light footer (`text-gray-400`, 2.5:1); small `text-slate-400` and
     `text-emerald-500` text on the dashboard (2.3–2.6:1). Not issues: greyed calendar days
     (disabled), the Operations section headings (audit false positive, checked visually);
     the Semester Archive "Preview" button looks like a dimmed disabled button (not checked).
   - **Also found:** the shadcn `Input` uses `placeholder:text-muted-foreground`, one of the
     undefined colour variables (item 1), so its placeholders are the same colour as typed text
     in every theme.

**Fixed, found by the screenshots:** the Add and Edit Student modals' Academic Year dropdown
offered "Please select a student and course" (`pleaseSelect`, a grading message) as its empty
option. It now reads "Select academic year" / "Επιλέξτε τάξη" (`selectAcademicYear`), with a test.

**Dependabot PRs (2026-10-05, owner: "fix as recommended"):**
- **Merged:** #253 (pip minor/patch group, 33 updates) and #255 (npm minor/patch group, 177
  updates; it includes the postcss bump that the old override used to block).
  - #255's only failing check was `dependabot-auto-approve`: the merge App secrets are missing
    (todo 8). It was approved by hand.
- **Closed, with `@dependabot ignore this major version`:**
  - #243 (eslint 10): `eslint-plugin-react@7.37.5` and `eslint-plugin-jsx-a11y@6.10.2` support
    eslint ≤9 only, so `npm ci` fails.
  - #238 (filelock 4): it conflicts with `virtualenv==21.7.13`, which is pinned for
    PYSEC-2026-4013.
  - Reverse either with `@dependabot unignore <name>`.
- **Actions bumps (#231–#235) are safe to take.** The only failing check, "Native DeepClean
  Safety", was broken on every workflow PR. Its helper `scripts/ci/native-safety.ps1` still
  looked for `NATIVE.ps1` at the repo root, from before the June restructure; fixed. Release
  notes checked:
  - the majors move to the Node 24 runtime;
  - setup-buildx v4 drops inputs this repo does not use;
  - setup-dotnet v6 and cache v6 are internal ESM migrations.
1. ~~**The 0.7s commit-gate flake**~~ (2026-09-16) — **closed 2026-10-28: mitigated, cause
   unknown.** Since the 2026-10-12 retry fix, 117 backend batch runs logged 3 sightings
   (2026-10-12 23:35 batch 9, 23:54 batch 1; 2026-10-26 23:39 batch 10), each the same exit −1
   part-way through, and the one retry passed every time. None of the 7 failed runs in that
   window was this flake: 2 were the 2026-10-21 Smart App Control incident, 3 were
   `test_health` under ≥ 90 % host RAM (2026-10-27), 2 were the env-var leak fixed in #329. At
   ~2.6 % of runs and fully absorbed by the retry it no longer blocks anything; reopen only if
   a batch dies twice in a row (the runner then fails with "aborted part-way" twice), and then
   capture the killer with Process Monitor or an ETW trace as noted below. The batch runner
   now logs the exit code, names a silent abort and retries it once, so the next occurrence
   should explain itself. Evidence: "The batch runner now records *why* a batch failed".
   **Recurred 2026-10-07 21:37** (COMMIT_READY -Quick, frontend-only change): batch 21 of 26
   (`test_registration_approval`, `test_report_scheduler`, `test_reports_router`,
   `test_request_id_middleware`, `test_request_id`) printed 46 passing dots, then the
   interpreter exited with -1 (0xFFFFFFFF) after 15.7 s, with no traceback; FastFail stopped the
   run, so no retry happened. `RUN_TESTS_BATCH.ps1 -RetestFailed` passed the same files (47
   tests). Second sighting; the files differ from the first, so it is not one test.
   **Third sighting 2026-10-08:** batch 24 (`test_search_*`, `test_semester_archive_*`), exit -1
   after 5 s; `-RetestFailed` passed the same files (127 tests). Three different batches now:
   worth a real investigation (e.g. capture a crash dump / faulthandler output) when time allows.
   **Investigated 2026-10-12 — cause not found, gate hardened.**
   - *Not a Python crash:* the Windows Application log has no Application Error / WER entry for
     python around either sighting, and Defender logged no detection. pytest's faulthandler is
     on by default and printed nothing. `-1` (0xFFFFFFFF) is what `TerminateProcess(-1)` leaves
     (.NET's `Process.Kill()` and `Stop-Process` use it), so something outside the interpreter
     ended it. Nothing in `COMMIT_READY.ps1` or the runner kills processes, and the backend
     calls `os._exit` only with 0.
   - *Why the gate still failed:* the runner retried only a batch that printed nothing. Sightings
     2 and 3 had already printed dots, so they failed with no retry (the first sighting printed
     nothing, which is why the original retry covered it).
   - *Fix:* a batch is now retried once when its exit code is not one pytest returns (outside
     0–5), whatever it printed; the log keeps the last progress line before the abort. A reported
     failure (exit 1) is still never retried, and a batch that dies twice still fails the run.
     `test_run_tests_batch_retry.py` (4 tests; two fail on the old runner) plays the runner against
     a stub `python`.
   - *Still open:* what kills the process. If it recurs, the log now says "aborted part-way
     through the run" with the last progress line; run Process Monitor or an ETW trace on the
     gate to see the killer's process name.
2. ~~**`SMS_ALLOW_DIRECT_PYTEST=1` in the Windows user environment**~~ — **done 2026-09-22**,
   cleared from the User scope (`[Environment]::SetEnvironmentVariable(...,"User")`); the
   `conftest.py` guard now applies to new shells. This session's own process still carries the
   old value in its inherited env, which is expected and harmless.
3. ~~**Review SMS_Lite's auth mode and bind address**~~ — **fixed 2026-09-24, released in v1.18.47.**
   Confirmed against the v1.18.46 build: Lite ran with the config default `AUTH_MODE=permissive`
   on `0.0.0.0:8000`, so anonymous LAN requests could read *and write* the API. Lite now defaults
   to `AUTH_MODE=strict`, like Docker. The unauthenticated `/api/v1/lite/*-shutdown` endpoints now
   accept loopback callers only. `debug.log` no longer records the database password. Re-verified
   on a running fixed Lite: anonymous LAN requests get 401, logged-in and refresh-cookie
   sessions work, and a LAN shutdown call gets 403. Tests: `test_lite_security_defaults.py`
   (the strict-mode tests fail under `permissive`). **Every existing Lite install must be
   upgraded to v1.18.47.** The wiki's RBAC, Security and Deployment pages were updated.
4. ~~**Confirm `SEMESTER_WEEKS` for ΜΙΕΕΚ**~~ — **confirmed by the owner on 2026-09-25: 14 weeks**,
   which matches the default. The absence limit's semester total is `periods_per_week × 14`.
5. ~~**`src/frontend/.env` has `VITE_API_URL=http://localhost:8000/api/v1`**~~ — **fixed 2026-10-07**:
   the line is commented out in the local (git-ignored) `.env`, so the app uses the relative
   `/api/v1` and the Vite proxy; a second stack needs no override. Original report (found 2026-09-25):
   Even when Vite proxies to a different backend (`VITE_DEV_PROXY_TARGET`), `/auth/refresh` goes to
   that absolute URL, so a second dev stack talks to the main backend's refresh endpoint. It is harmless
   with a single stack. Override `VITE_API_URL` whenever you run a second stack.
6. ~~**Review accounts created by the old open registration**~~ — **done 2026-10-12.** The QNAP
   database had four users and no strangers: `admin@example.com` (Native/Docker bootstrap),
   the owner, `admin@sms-lite.app` (Lite's default admin, 136 refresh tokens) and
   `test@example.com` (the E2E user, left by an E2E run against the dev server on 2026-06-09;
   1406 refresh tokens). Both default-password accounts were public in the repo; **deleted on
   the owner's instruction** (tokens removed, no audit rows). That showed every Lite start would
   recreate `admin@sms-lite.app` with its public password on the shared database, so whoever
   logged in first could claim an admin account; fixed the same day (todo 24).
   **✅ Fixed 2026-10-12 (owner closed the router forward; verified from REC, see the header).
   Found here: the QNAP PostgreSQL was reachable on the public IP.** A Lite PC's
   stale credentials pointed at `77.83.249.220:55433` and got `password authentication failed`
   back, so the PostgreSQL server answered there: the router forwards that port. The student
   database is then one 8-character password away from the internet. Remove the port
   forward on the router and reach QNAP over Tailscale only (subnet route `172.16.0.2/32`, as
   the laptop does). `docs/misc/LITE_QNAP_SETUP.md` still documents the external address.
7. ~~**Optional: authenticate a sending domain in Brevo**~~ — **closed 2026-10-12, owner: keep
   as is.** Brevo has one sender, `AUT MIEEK <faltsasam@gmail.com>` (verified), and no domain.
   DKIM is Brevo's default and DMARC says "Freemail domain not recommended", both because the
   sender is Gmail. Mail is delivered with Brevo's rewritten sender. Reopen only to use the
   school's domain or a bought one (Brevo code, DKIM and DMARC DNS records). Original (2026-09-28):
   SMTP works, but Brevo
   rewrites the `@gmail.com` sender to `…@…brevosend.com`, because it cannot send as Gmail. With your
   own domain verified in Brevo, emails can come from e.g. `noreply@<domain>` and are less likely
   to land in spam.
8. ~~**Create the Dependabot merge GitHub App and store its secrets**~~ — **done 2026-10-12.**
   `sms-dependabot-merge-bs1gr` (App ID 5291512) is private, has no webhook and is installed on
   this repo only. It has Contents and Pull requests read/write (plus metadata read). Both
   `DEPENDABOT_MERGE_APP_CLIENT_ID` and `DEPENDABOT_MERGE_APP_PRIVATE_KEY` are set as Actions
   **and** Dependabot secrets. Verified by signing a JWT with the key and getting an
   installation token that reaches only `bs1gr/AUT_MIEEK_SMS`. No Dependabot PR was open to watch
   a real auto-merge; check the next one. The owner was asked to delete the local `.pem` (it was in a OneDrive-synced
   folder). Original: (2026-09-29). The App needs
   Contents and Pull requests read/write only, and should be installed on this repo only. Store
   `DEPENDABOT_MERGE_APP_CLIENT_ID` and `DEPENDABOT_MERGE_APP_PRIVATE_KEY` as both Actions and
   Dependabot secrets. Until then, Dependabot patch PRs are approved but not auto-merged.
   Re-run their failed "Auto-approve Dependabot" job afterwards. See the 2026-09-29 section.
9. ~~**Change the dev database's `admin@example.com` password**~~ — **resolved 2026-10-12 by
   deactivating it** (owner's choice; they have their own admin). Since v1.18.55, bootstrap no
   longer reactivates it. The same check found `admin@sms-lite.app` **recreated** on the QNAP
   database at 17:01 (DB time), after its deletion that day. It was never used (forced password
   change still pending, no sessions or audit rows), so an older SMS Lite started against QNAP
   before being updated. The owner deleted it again in User Management the same evening; the QNAP
database now has only `admin@example.com` (inactive) and the owner's account. If it comes
   back, some PC still runs Lite older than v1.18.55. Original report (found 2026-09-29):
   **Change the dev database's `admin@example.com` password**. The account still
   has `password_change_required=True` from when bootstrap created it. Since v1.18.48 the server
   enforces that flag, so Native and Docker (same database) return `403
   AUTH_PASSWORD_CHANGE_REQUIRED` for every data request until the password is changed. The UI
   asks for the change at login. Bootstrap does not raise the flag again: `DEFAULT_ADMIN_AUTO_RESET`
   and `FORCE_RESET` default to `False`.
10. ~~**API response `meta.version` is wrong**~~ — **fixed 2026-10-05.** New `backend/version.py`
    holds the one VERSION-file reader. `app_factory` and `main` used to keep their own copies; both
    now import it. `ResponseMeta` defaults to it, the `success_response`, `error_response` and
    `paginated_response` helpers default to it, and so does the middleware. The `APP_VERSION`
    setting and its `.env.example` line are gone. A local `.env` that still has the line is
    ignored (`extra="ignore"`).
    Tests: the schema default and helpers, the middleware with `APP_VERSION=1.0.0` set, and a real
    404 envelope. That envelope now reports `v1.18.50`, the same as `/health`. A new finding is
    recorded as todo 17.
    Original report (found 2026-09-29; the frontend does not read it):
    Success envelopes use `settings.APP_VERSION`, and a local `src/backend/.env` line
    `APP_VERSION=1.0.0` (copied from `.env.example`) wins over the VERSION file. Error envelopes use
    the hard-coded schema default `"1.15.0"` (`schemas/response.py`). Fix: take both from the VERSION
    file, the same source `/health` uses, and drop `APP_VERSION` from `.env.example`.
11. ~~**Dependabot cannot update `postcss` in `src/frontend`**~~ — **fixed 2026-10-05.** The override is
    now `"postcss": "$postcss"`; the lockfile is unchanged. Reproduced in a scratch copy: bumping the
    direct dependency to `^8.5.28` fails with `EOVERRIDE` under the old override and resolves 8.5.29
    under the new one. (A local edit had added `$postcss` as a second, duplicate key; removed.)
    Original report (found 2026-09-29): the npm job logs
    `EOVERRIDE: Override for postcss@8.5.28 conflicts with direct dependency`. `package.json` lists
    postcss both as a devDependency and under `overrides` (both `^8.5.26`). Dependabot bumps only the
    direct entry, so npm rejects the mismatch. Write the override as `"postcss": "$postcss"` so it
    follows the direct dependency. The job's other PRs were still opened.
12. ~~**`t('<ns>.key')` calls that never resolve**~~ — **fixed 2026-10-05.** The recorded scope
    (66 calls in 14 files) was low. A scan that checks each literal key against the real i18n
    resources, per language and honouring `{ ns }` options, found **227 unresolved calls in 35
    files**, but most were in code that never renders. The owner's rule: wire in anything meant
    to run; delete what is genuinely dead.
    - **Deleted as dead** (≈40 files including tests). For each, the reason it never rendered:
      - `pages/AdminPermissionsPage`: `/admin/permissions` moved to `features/admin` on 2026-01-28;
        the old page stayed behind.
      - `features/advanced-search/**`, `components/SearchResults` and `api/search-client`: a
        second implementation of Issue #147, never routed. #147's design names
        `features/search/SearchView` as the search page, and `/search` renders it.
      - `components/{SavedSearches,AdvancedFilters}` and
        `features/search/{SavedSearches,SearchBar,AdvancedFilters}`: exported, never rendered.
      - `features/notifications/` duplicated the live `components/notifications`.
      - `ErrorRetry`: its last user went in the 2026-08-30 dead-code cleanup.
      - `ui/ErrorMessage` and `useErrorHandler`: never used outside tests.
      - `AsyncErrorBoundary`: never mounted.
      - `SavedReportsPanel` duplicated Custom Reports; `ChartDrillDown` was never placed in a chart.
      - `MainLayout`, `PwaReloadPrompt`, `PwaInstallPrompt` and `pwa.config.ts` (Feature #143 WIP):
        `MainLayout` was never mounted, and `vite.config.ts` already auto-updates the service
        worker. The owner chose delete.
      - export-admin `ExportDashboard`, `ExportJobList` and `ExportScheduler`, plus the six stubs
        in `components/index.tsx`: a "Phase 6 proposal" UI. It calls `/schedules`, `/metrics`,
        `/rerun` and `DELETE /exports`, none of which the backend has. `EmailConfigPanel`, the
        one live part, moved to its own file.
    - **Fixed in live code** (14 files): logout button, backend-status banner, section error
      boundary, notification pager, feedback modal, app error boundary, report field selector,
      search facets and results, student profile, the course and student query hooks, and the
      auth page. Each now uses the namespace that holds its keys. Missing keys were added in EN
      and EL (`common`, `errors`, `messages`, `customReports`, `search`).
    - **`OfflineBanner` showed raw keys in both languages.** Its `offline` namespace existed in
      `translations.ts`, but `i18n/config.ts` never registered it. It is registered now.
    - **Guard:** `i18n/__tests__/useTranslationKeys.test.ts` fails on any literal key a
      `useTranslation(...)` file cannot resolve in EN or EL. It checks the real resources with no
      English fallback. Its positive control is the one known exception, below.
    - **Predictions panel wired in (owner, 2026-10-05: "fix the predictive-analytics panel").**
      It was broken at every layer:
      - The backend route called `AnalyticsService.get_student_predictive_analytics`, which never
        existed (lost when the analytics feature was deferred in March), so it always answered 500.
        It is now implemented from the student's grades (percentages, in date order) and
        attendance (Present and Excused count, as on the Students page), using the existing
        `PredictiveAnalyticsService`.
      - Its text fields (risk factors, recommendations) were English sentences. They are now codes
        that the panel translates, EN and EL.
      - The panel read the `analytics` namespace's `predictive` keys through the root namespace
        (the todo-12 bug class). Its prop types did not match the API either.
      - Now the panel uses the `analytics` namespace, localised dates and weekdays, and
        percentages. It shows "Outlook" on the Student Profile and hides itself on a 403 (the
        student role lacks `reports:view`).
      - Tests: `test_student_predictive_endpoint.py` and `StudentPredictionsSection.test.tsx`
        (EN, EL, insufficient data, 403). The old panel test only checked that something
        rendered, so it was deleted. The i18n guard has no known exceptions now; its positive
        control is a synthetic file.
      - Deleted as dead: three more predictive endpoints (`/predictive/class/{id}/risk-assessment`,
        `/predictive/class/{id}/at-risk-students`, `/predictive/course/{id}`) and their unused
        hooks. Their service methods never existed, and "class" has no model.
    - Follow-up (same day): `useExportAdmin.ts` held 19 more hooks for those missing endpoints. It
      is now `hooks/useEmailConfig.ts`, with only the three email-settings hooks in use, and
      `types/export.ts` is now `types/email.ts`.
    - Also dead, found while fixing todo 15:
      - `EnhancedAttendanceCalendar` (693 lines) has never been rendered since the initial commit; only a barrel exported it.
      - `analyticsAPI.getDashboardStats`, `getAttendanceStats` and `getGradeStats` were 'helpers used by tests' and nothing else.
      - `api/api.d.ts` was an ambient `declare module '@/api/api'` that TypeScript never used, because path resolution finds `api.ts` first. It was out of date: it said `getAll` returns a paginated object, but it returns an array.
      All were deleted. `tsc` stays clean.
    - Verified: `tsc` clean, ESLint 0 errors, and the full frontend suite (109 files, 1798 tests)
      passes.
13. ~~**Attendance: make Daily Performance participation assessment compact and optionally granular**~~
    — **done in `0e80d0570`, CI-verified 2026-10-05.** CI on `3a8fd1fa7` ran the full Vitest suite
    (128/128 files), including the participation tests. `Not applied (10/10)` is gone. Its
    replacement, `notScored` ("Not assessed — no score is recorded"), resolves in Greek through
    `useLanguage()`'s attendance fallback. In-app checking on the dev database is blocked by todo 9.
    (reported 2026-10-01). In Attendance > Daily Performance, render the participation choices
    (for example, No participation / Low participation / ...) as three columns on one row instead
    of consuming a large vertical area. Permit selective scoring: a teacher must be able to score
    only the criteria they choose, without being forced to score every participation criterion.
    Criteria left unscored must retain the existing aggregate-scoring semantics. Clarify and rename
    the unclear participation option currently shown below the participation slider as
    `Not applied (10/10)`; define its behaviour and make the distinction understandable in both
    Greek and English. Add focused UI/behaviour tests, including mixed scored/unscored criteria.
    **Implementation in progress (2026-10-01):** the UI now uses an explicit opt-in per ordinary
    criterion and places the three optional participation observations immediately below the
    participation slider in a three-column responsive grid. Unselected observations save no
    score and therefore retain aggregate-score behaviour. The focused participation tests now
    pass twice locally; broader frontend-suite and CI verification remain pending.
14. ~~**Attendance: investigate Docker/QNAP course-list mismatch**~~ — **fixed in `0e80d0570`,
    CI-verified 2026-10-05.** The test "offers only courses with active enrolled students for
    attendance" passed in CI's full run. Not yet confirmed on the Docker/QNAP stack itself; that
    needs todo 9 first, or another account.
    (reported 2026-10-01). In the
    Attendance course dropdown, Docker running from the laptop against the remote QNAP PostgreSQL
    shows all courses rather than only the teacher's enrolled/assigned courses. Reproduce using the
    configured Docker-to-QNAP connection; determine whether the cause is synchronization, an
    incorrect database/configuration target, or missing backend/frontend enrolment filtering; then
    implement and test the smallest correct fix.
    **Root cause and implementation in progress (2026-10-01):** Attendance loads all courses,
    then deliberately kept all of them visible whenever enrollment checks were incomplete or found
    no active students. The selector now fails closed and admits only courses with active
    enrollments; frontend test/CI verification is pending the locked local frontend dependencies.
15. ~~**Students: add useful sorting/filtering by department and academic year**~~ — **done 2026-10-05.**
    - **Fields.** "Department" is `class_division` (Τμήμα Τάξης, e.g. A1, A2, B1) and "academic
      year" is `academic_year` (A/B, shown as Τάξη Α/Β), going by the app's own Greek labels.
      Both are fields on the student record, so how many current enrolments a student has
      (several, or none) does not affect where they appear. Students missing a value are listed
      under **Not set**.
    - **Controls.** Above the list, the Students page now has three dropdowns: academic year,
      class division, and sort by name, class division or academic year. The options come from
      the values in use, sorted naturally (A2 before A10). Records without a value sort last. A
      Clear button resets all three.
    - **Defaults kept.** The page still opens with active students expanded and inactive
      collapsed; the filters apply to both sections. Labels exist in EN and EL.
    - **Tests.** `StudentsView.filters.test.tsx` (7 tests) renders with the real i18n instance
      and includes a Greek case.
    - **Found and fixed on the way: the page only ever loaded the first 100 students.**
      `studentsAPI.getAll()` defaults to `limit=100`. The new `studentsAPI.getAllPages()` pages
      1000 at a time (the backend maximum) and is now used by `useStudents` (the Students and
      Attendance pages and the DevTools panel). `CoursesView`'s enrol-students list, which had
      the same cap, uses it too.
    Original report (reported
    2026-10-01). The Students list currently presents active students together. Add clear controls
    to sort and/or filter by department and academic year, preserving the active-student default and
    defining how students with multiple or no current enrolments appear. Provide bilingual labels
    and focused tests.
16. ~~**Make SQLite versus QNAP PostgreSQL storage behaviour explicit across deployment modes**~~
    — **done 2026-10-05** (`10c841c53` behaviour, then visibility and docs). The owner decided:
    - **SMS Lite never runs on a local database while it is set up for QNAP.** It used to switch
      to `sms_lite.db` "for this session" whenever QNAP was unreachable, or when the credentials
      file was unreadable, saying so only in debug.log. A teacher's entries that day never
      reached QNAP and vanished from view once QNAP was back.
      - Now `backend/lite_db.py` shows a native, bilingual Retry/Cancel box and loops until QNAP
        answers; Cancel quits.
      - Without a credentials file, Lite is still a standalone install on SQLite.
      - Verified on a frozen build: with credentials pointing at a dead port, the process
        waits at the "SMS Lite — QNAP" dialog, nothing listens on :8000, no `sms_lite.db` is
        created, and debug.log has the message.
      - Tests: `test_lite_db.py` (7).
    - **Docker keeps changes in the browser while QNAP is unreachable** (owner's choice over a
      local-database-plus-merge design).
      - The backend already answered 503 `DATABASE_UNAVAILABLE` for unhandled `OperationalError`.
        But the attendance, grades and performance routers turn every exception into
        `internal_server_error()`, so there an outage was a 500 and the change was lost.
        `internal_server_error()` now hands a database `OperationalError` through.
        Tests: `test_database_unavailable_writes.py` (they fail on the old code).
      - Frontend: one `isOfflineError` (it was copied into three hooks) now also queues on 503
        `DATABASE_UNAVAILABLE`.
      - The student, attendance and grade queues flush through the shared
        `useQueueFlushTriggers`: on mount, on `online`, when the database is back, and every
        30 s. The browser stays online while only the database is down, so the `online` event
        alone never fired.
      - The API client sets the "database unavailable" state; `OfflineBanner` warns (EN/EL),
        also in Lite/local mode, with the pending counts.
      - Limit: a queue replays while its page is open, or the next time it is opened, as
        before.
    - Also fixed: the banner's pending counts were always singular ("2 attendance record").
      `offline.js` used the i18next v3 `_plural` suffix, which v25 ignores; it is now `_other`.
    - **Visibility.**
      - The health payload now takes the engine from the URL in use. Lite on QNAP sets a
        PostgreSQL URL but leaves `DATABASE_ENGINE=sqlite`, so the System page used to show it
        as SQLite with no target.
      - The System page now marks SQLite with an amber "Local database on this machine only"
        badge, next to the existing green "Remote DB connected (QNAP/VPN)" badge.
      - Tests: `test_health.py` and `ServerControl.test.tsx`.
    - **Docs.** `QNAP_POSTGRES_SINGLE_SOURCE.md` has a per-mode table: Lite with and without
      credentials, Docker with and without PostgreSQL, Native, and Android. For each it covers
      storage location, sharing, what happens when QNAP is unreachable, migrations, switching
      risks and safe setup.
    - **Migration tool made safe.** `QNAP_RECONCILE_RUNBOOK.md` said to run
      `migrate_sqlite_to_postgres` against the live QNAP database without `--no-truncate`, and
      the script's default then truncated every QNAP table.
      - The script now refuses a non-empty destination unless `--truncate` (replace) or
        `--no-truncate` (append) is given.
      - The Control Panel's SQLite-backup restore into PostgreSQL passes `--truncate`
        explicitly, so a restore still replaces.
      - The runbook is rewritten: the tool cannot merge, and the recovery path for old Lite
        fallback data goes through the app's import or re-entry.
      - Tests: `test_migrate_sqlite_to_postgres_safety.py`.
    - **Owner decided (2026-10-05):** Docker without PostgreSQL settings starts on its own SQLite
      volume and shows the amber badge. This is intended; no change.    Original report (reported 2026-10-01). Document and make distinguishable, in the applicable configuration/UI,
    what happens when local SQLite is retained instead of connecting to QNAP PostgreSQL for SMS Lite,
    Docker SMS, and Capacitor. Specify per mode: storage location, whether data is shared or isolated,
    migration/initialisation behaviour, offline expectations, switching risks, and the safe
    configuration path. Add tests or deployment checks for the chosen configuration behaviour.
17. ~~**`ResponseStandardizationMiddleware` never wrapped anything**~~ — **deleted 2026-10-05**
    (owner's choice). It was registered, but under `BaseHTTPMiddleware` `call_next` never returns
    a `JSONResponse`, so every response passed through unchanged. Its unit test only passed by
    calling `dispatch()` with a hand-made `JSONResponse`. Removing it changes no behaviour. The
    `meta.version` test for real error envelopes moved to `test_response_schemas.py`.
18. ~~**`DOCKER.ps1 -Start` merged a host's own SQLite into QNAP**~~ — **fixed 2026-10-06.**
    - **Found 2026-09-29** while planning the laptop's Docker-to-QNAP access, and recorded only
      in session notes until now.
    - **The bug.** With PostgreSQL settings, `Invoke-SqliteToPostgresMigration` copies a local
      SQLite database (`data\student_management.db`, or the largest one in the `sms_data` volume)
      into PostgreSQL before every start, and it passed `--no-truncate`. A Docker install that
      had run on SQLite (the installer's `-Silent` default) therefore appended every local row
      whose id was free into the shared QNAP database on its first remote start: its own users,
      students and grades. There was no opt-out. Todo 16 made the tool refuse a non-empty
      destination by default, but the explicit `--no-truncate` bypassed that.
    - **The fix.** Both migration calls now use the tool's default, which copies only into an
      empty database and exits 4 otherwise. On 4, startup continues, warns that the local database
      was NOT copied, leaves it untouched, and writes `data\.triggers\sqlite_to_postgres.auto.skipped`.
      Later starts with the same source only mention it. A first move into a new, empty
      PostgreSQL still copies as before.
    - **Also fixed:** the exit code is read straight after each `docker` call. A failed credential
      repair used to leave `$LASTEXITCODE` from the repair's own commands, which could pass a
      failed migration as a success.
    - **Tests.** `test_docker_ps1_sqlite_automigration.py` runs the real function from DOCKER.ps1
      under `pwsh` with a stub `docker`. It covers an empty destination (copied and archived,
      no `--no-truncate`), a destination with data (SQLite untouched, not retried), and other
      failures (startup stops). Against the old script, the first two fail. The test is skipped
      where `pwsh` is missing; the CI runners have it.
    - **Docs.** The `QNAP_POSTGRES_SINGLE_SOURCE.md` switching section and the reconcile
      runbook now describe this.
    - **Owner, until v1.18.51 is installed:** the laptop's installed Docker app (v1.18.50) still
      merges. Before its first start with the remote profile, stop it and rename the SQLite file
      in the `sms_data` volume to `*.local-only`.
19. **Future: host the backend on a free cloud VM so the Android app does not depend on a
    home machine — research first, no implementation yet** (raised 2026-10-06). The owner's
    rule: cloud migration is a difficult task, so it starts only after a thorough study of the
    host's limitations and of what the move would expose. The candidate under consideration is
    an Oracle Cloud Always Free ARM VM (Frankfurt), running the single-image Docker stack plus
    Tailscale to the QNAP PostgreSQL. If latency is a problem, Postgres would move onto the VM
    and the QNAP would become the backup target. The Android app must never talk to PostgreSQL
    directly: only the backend holds the database credentials.
    - **Research to complete before deciding:**
      - *Host limits.* Free-tier terms as they stand at the time, and how they change. Oracle's
        reclamation of idle instances, ARM capacity in Frankfurt, egress caps, account
        suspension risk, and whether there is any SLA. Compare at least Oracle, GCP e2-micro and
        a PaaS (Render or Koyeb) against these.
      - *Exposure.* What becomes reachable, and by whom: Tailscale-only versus a public port,
        HTTPS (`tailscale serve`/Funnel or a reverse proxy), Oracle security lists, SSH
        hardening, and secrets on a third-party host. ~~The QNAP DB password is in the public
        repo and must be rotated~~ — **rotated by the owner on 2026-10-07** (`\password sms_user`
        inside `sms-postgres-qnap`; SCRAM-SHA-256). The old password is rejected; the new one is
        in REC's `config/.env` and `src/backend/.env` and the QNAP's `.env.qnap.postgres-only`, and
        logs in (verified). The old one was removed from 6 docs and a script's built-in fallback
        (`apply_recovered_key_and_restore.ps1` now requires `DATABASE_URL`); it stays in git
        history, where it no longer opens anything. **Still to update: the laptop's installed
        `config\.env` and every SMS Lite install** (re-run `SaveLiteEditionQnapCredentials.ps1`).
        Procedure, pitfalls and status: `docs/deployment/QNAP_DB_PASSWORD_ROTATION.md`.
      - *Data protection.* Student personal data on a third-party provider means GDPR: an EU
        region, the provider's data-processing terms, and whether ΜΙΕΕΚ policy allows it.
      - *Latency and availability.* Per-request round trips from the VM to the QNAP over
        Tailscale (the ORM is chatty). What happens when the home connection or the QNAP is
        down. Measure on a real VM before choosing between remote-QNAP and Postgres-on-VM.
      - *Backups and exit plan.* VM → QNAP `pg_dump` schedule, restore drill, and how to move
        back off the provider.
    - **Code findings (read-only review, 2026-10-06), to re-check when the work starts:**
      - Ready: the single-image remote-Postgres profile (`SMS_DATABASE_PROFILE=remote`,
        `POSTGRES_HOST=172.16.0.2`) already describes the target. `Dockerfile.fullstack`'s base
        images are multi-arch, so it should build natively on arm64; the Python wheels have not
        been confirmed by a real build. The managed-Postgres path (`POSTGRES_HOST=localhost` →
        `sms-postgres`) and the prod overlay's `db-backup` cover the Postgres-on-VM variant.
      - Not portable: `DOCKER.ps1` assumes Windows. It uses backslash paths (`config\.env`,
        `infra\docker\compose`), which do not resolve under Linux `pwsh`. It also starts Docker
        Desktop, checks Windows admin rights and opens a browser. A cloud host would need its own
        short Linux deploy (compose file or script), not DOCKER.ps1.
      - Config gap: the APK's WebView origin is `https://localhost` (`androidScheme: 'https'`),
        but the backend only auto-adds `capacitor://localhost` (the iOS origin). `CORS_ORIGINS`
        must include `https://localhost`, as `ANDROID_TAILSCALE_GUIDE.md` says. `config/.env`
        currently has no `CORS_ORIGINS`. `TRUSTED_HOSTS` must also name the VM's host/IP.
    - **Deliverable of the research step:** a written decision (host, topology, exposure model,
      backup plan) recorded here, for the owner to approve before any deployment work.
30. ~~**Sign SMS Lite with a publicly trusted certificate (Smart App Control)**~~ (raised 2026-10-21) —
    **closed 2026-10-28 by owner decision: no paid code signing, now or later.** The project keeps
    signing every binary with its own self-signed AUT MIEEK certificate (payload, uninstaller and
    installer since #325; release gate enforces the thumbprint). **Accepted consequence:** SMS
    Lite cannot start on a PC where Smart App Control is enforced (no per-app exception exists),
    and SmartScreen shows the installer as from an unknown publisher. Users are told how to proceed
    in `docs/deployment/LITE_EDITION_GUIDE.md` ("Windows blocks the installer or SMS_Lite.exe"):
    SmartScreen "More info → Run anyway"; Smart App Control must be turned off (ask IT on school
    PCs). Do not reopen unless the owner changes the decision; a free route would only come from
    reapplying to SignPath Foundation once the project has more public visibility.
    History below.
    (original: owner: ship the SQLAlchemy fix in v1.18.59 now, signing next. Until then SMS Lite
    does not start on any PC where Smart App Control is enforced.)
    - **What blocks it:** the `VerifiedAndReputableDesktop` policy allows a file only if
      Microsoft's cloud trusts it or it carries a trusted signature. Only the installer is
      signed. `SMS_Lite.exe` and 188 of the 260 binaries in v1.18.58's `_internal` were unsigned.
      A new build's exe has no reputation, so it is blocked outright (Code Integrity 3077/3033).
    - **The AUT MIEEK certificate does not help:** it is self-signed. A test-signed
      `SMS_Lite.exe` was still blocked on the owner's PC, where that certificate is in the
      trusted root store: Code Integrity rated the signature at signing level 1 (VerificationError
      18). Microsoft's FAQ: there are no per-app exceptions; the fix is "a valid certificate"
      (Microsoft Trusted Root Program).
    - **Options:** Azure Artifact Signing (formerly Trusted Signing; about $10/month, identity
      validation, works from GitHub Actions), or an OV code-signing certificate from a public CA.
      Sign `SMS_Lite.exe`, every unsigned `.exe`/`.dll`/`.pyd` under `_internal`, and the
      installer, in both `INSTALLER_BUILDER.ps1` and `release-installer-with-sha.yml`. Then
      re-test with Smart App Control on.
    - **Owner's PC:** Smart App Control is **permanently off** there since 2026-10-21 (owner's
      decision), so it can no longer show what users see. Test the signed build on another PC
      with Smart App Control enforced. The dev venv has the pure-Python
      `sqlalchemy-2.1.4-py3-none-any.whl`, which matches what Lite now bundles.
    - **Review 2026-10-27.** State today: the installer is signed with the self-signed AUT MIEEK
      PFX held in GitHub secrets; `SIGN_INSTALLER.ps1` signs one file (the installer); the CI
      gate in `release-installer-with-sha.yml` skips when `CODESIGN_CERT_THUMBPRINT` is unset
      and accepts `UnknownError`, so it cannot fail; the local Lite build has 180 of 210
      `.exe/.dll/.pyd` files unsigned (the other 30 are PSF/Microsoft-signed). Providers:
      (a) **SignPath Foundation** — free for OSS, the MIT public repo qualifies, the project
      applies at signpath.org; publisher shows "SignPath Foundation", every release needs a
      manual approval in their portal, approval is discretionary. (b) **Azure Artifact
      Signing** — ~$10/month + a paid Azure subscription; EU organisations qualify (the
      college, not a person: individuals must be in the US/Canada; organisations need ~3 years
      of tax history); signs from GitHub Actions via OIDC, PFX secrets go away. (c) **OV cert
      from a public CA** — €70–400/year; keys must sit in an HSM, so CI signing needs the CA's
      cloud signer. **Decision: apply to SignPath first, Azure as fallback.** Owner action:
      the SignPath application. Engineering (same for every provider, can start now): sign
      every unsigned binary under `_internal`, `SMS_Lite.exe` and `SMS_Manager.exe` before Inno
      packs them, add Inno's `SignTool` directive for the uninstaller, then make the CI gate
      require `Valid` + the new thumbprint and drop the `UnknownError` allowance. Todo 32's
      exclude-list fix first shrinks the file count.
    - **Engineering done 2026-10-27 (self-signed certificate for now):** `SIGN_INSTALLER.ps1`
      gained `-Path` (files and directories: signs every `.exe/.dll/.pyd` that has no signature,
      leaves PSF/Microsoft-signed files alone, skips files already carrying our certificate, so
      it is idempotent; verifies every target afterwards). `INSTALLER_BUILDER.ps1` runs the new
      `Invoke-PayloadSigning` after the SMS_Manager build and before Inno (fails if any PE file
      under `SMS_Lite` stays unsigned), passes `/dSMS_SIGN /Ssmssign=…` to ISCC so Inno signs the
      uninstaller and Setup.exe through the same script (`SMS_Installer.iss`: `SignTool=smssign`,
      `SignedUninstaller=yes` under `#ifdef SMS_SIGN`; `-SkipCodeSign` builds still compile), and
      keeps the certificate in one `$CodeSignThumbprint`. The release gate in
      `release-installer-with-sha.yml` now fails (exit 1) on skipped signing, missing
      thumbprint secret, missing signer, thumbprint mismatch or any status other than
      `Valid`/`UnknownError`; it used to warn and pass on all of them. The
      `CODESIGN_CERT_THUMBPRINT` repository secret had never existed (which is why the old gate
      always skipped); **the owner set it on 2026-10-27** to
      `2693C1B15C8A8E5E45614308489DC6F4268B075D`, the Limassol certificate that signs the
      published installers, so the gate is live from the next release. When the trusted
      certificate arrives: change `$CodeSignThumbprint`, the secret, and drop `UnknownError`
      from the gate.
    - **SignPath Foundation DECLINED 2026-10-28** (reply from SignPath): not enough public
      visibility. They weigh community adoption (stars, forks, contributors), external
      references, "institutional backing" and sustained activity; reapplying is welcome once the
      project is more visible. Their paid subscription is the alternative they offer. Remaining
      routes, cheapest first: (a) an OV code-signing certificate for an individual from a public
      CA, e.g. Certum Standard Code Signing in the Cloud (~€49/yr list, cloud HSM "SimplySign", no
      USB token; Certum's "Open Source" tier was historically token-based, check before buying);
      publisher becomes the owner's name; (b) Azure Artifact Signing (~$10/month) — individuals
      only in the US/Canada, so it must be registered by the school as an organisation; (c)
      reapply to SignPath with an institutional-backing letter from the school. **Owner chose
      none of them (2026-10-28): no paid signing.** See the closing note at the top of todo 30.
    - **SignPath Foundation application SUBMITTED by the owner 2026-10-28** ("Thank you, we'll
      be in touch soon"). Answers given: maintainer type "Individual maintainer(s)", no company,
      build system GitHub Actions, privacy URL `…#privacy-policy`, honest reputation note
      (single-school use, small public footprint). Waiting on SignPath; on approval follow the
      steps below. If declined: Azure Artifact Signing (registered to the school).
    - **SignPath Foundation application prepared 2026-10-28.** Their conditions (signpath.org/terms):
      OSI licence for all components (MIT; bundled DejaVu fonts are free-licensed), no
      proprietary components, actively maintained, already released in the form to be signed,
      functionality described on the download page, a "Code signing policy" section with team
      roles, a privacy statement, MFA for every team member on GitHub and SignPath, manual
      approval of every signing request, and builds only on GitHub-hosted runners (our release
      workflow already is). The README now has "What it does", "Code signing policy" (roles:
      Vasilis Samaras as committer, reviewer and approver) and "Privacy policy" (no telemetry;
      only the GitHub releases update check, admin-configured SMTP, and the user's own server for
      Android). **After approval:** add the line "Free code signing provided by SignPath.io,
      certificate by SignPath Foundation" to that README section; move signing from the local
      PFX to `signpath/github-action-submit-signing-request@v3` in the release workflow (upload
      the unsigned `SMS_Lite` folder + `SMS_Manager.exe` as an artifact, deep-sign every PE file
      via an artifact configuration with `<directory>`/`<pe-file-set>`, then compile and submit
      the Inno installer as a second request, since SignPath documents nested signing for MSI but
      not for Inno); set `$CodeSignThumbprint` and the `CODESIGN_CERT_THUMBPRINT` secret to the
      new certificate; drop `UnknownError` from the gate. Publisher shown to users becomes
      "SignPath Foundation". Then test with Smart App Control enforced on another PC.
    - **First real tag run (v1.18.62, 2026-10-28): the installer workflow failed
      before the gate.** The runner imports the PFX only into `CurrentUser\My`, so the
      self-signed chain is untrusted there and `Get-AuthenticodeSignature` reports
      `UnknownError`; INSTALLER_BUILDER's post-sign check demanded `Valid` and blocked the
      build (the APK workflow succeeded, so the release was published with the APK only).
      Fix (#330): the import step also adds the certificate's public part to the runner's
      Root store, and the builder accepts `UnknownError` only together with the expected
      thumbprint. The first re-dispatch then **hung 50 minutes** in the import step: adding to
      `CurrentUser\Root` pops a modal security confirmation nobody can click on a headless
      runner. Follow-up: `LocalMachine\Root` (the hosted runner is admin, no prompt) and a
      5-minute `timeout-minutes` on that step. Re-dispatched again for the same tag (allowed:
      it is the current release, not a historical one).
31. ~~**Run the frozen Lite in the release pipeline, not just build it**~~ (raised 2026-10-21) — **done 2026-10-28, first ran in CI on the v1.18.62 tag.**
    Neither `RELEASE_READY.ps1` nor `INSTALLER_BUILDER.ps1 -Action test` starts the built
    `SMS_Lite.exe`, which is how the missing PDF fonts (fixed in v1.18.59, `857613ba5`) shipped
    unnoticed: the spec never listed them, from its first commit (2026-06-12) to v1.18.58. The local build also comes from the developer's venv, not from the clean
    `pip install` that CI uses for the published installer. Add a runtime check to the release
    workflow before upload: start the exe in a throwaway profile (`USERPROFILE`/`LOCALAPPDATA`
    redirected, `BROWSER` set to a no-op, `DEFAULT_ADMIN_*` env vars), wait for `/health`, log
    in, create a student with a Greek name, and fetch a PDF export. Then check that DejaVuSans is
    embedded and the Greek text extracts. The v1.18.59 smoke scripts did exactly this
    (`lite_sac_start.ps1`, `lite_api_check.py`). CI runners do not enforce Smart App Control, so
    this does not replace todo 30's test.
    **2026-10-27 partial:** `RELEASE_READY.ps1` now runs `INSTALLER_BUILDER -Action test`
    (Authenticode Valid + version resource) right after the installer build and fails the
    release if it fails — it had never run that phase. The v1.18.60 installer passed it when run
    by hand. **Done 2026-10-28:** `infra/scripts/release/LITE_RUNTIME_CHECK.ps1` +
    `lite_runtime_check.py` start the built `SMS_Lite.exe` in a throwaway profile
    (`USERPROFILE`/`LOCALAPPDATA`/`APPDATA` under `%TEMP%`, `BROWSER` no-op, seeded admin), wait
    for `/health`, then check login, a Greek student and course, both PDF exports (DejaVu
    embedded + Greek text extractable), the Excel export, the SPA index and every referenced
    asset, and stop the process tree. `INSTALLER_BUILDER`'s smoke test runs it whenever
    `dist\SMS_Lite\SMS_Lite.exe` exists (`-SkipLiteRuntimeCheck` to opt out), so `-Action test`,
    `-Action build`, `RELEASE_READY` and the tag workflow all get it; the script refuses to start
    if port 8000 is taken because Lite shuts down whatever holds it. 11 checks, ~20 s locally.
    pypdf is dev-only, so the wrapper pip-installs it when missing (CI installs
    requirements.txt only).
32. ~~**The Lite spec's exclude list has never worked**~~ (found 2026-10-21) — **fixed 2026-10-27.**
    `lite_simple_entrypoint.spec` passed `excludedimports=[...]`, but PyInstaller's argument is
    `excludes=`, and `Analysis(**_kwargs)` dropped unknown names silently. The runtime audit
    before switching it on found that three entries would have broken Lite: `redis`
    (`backend.cache` and `cache_service` import it at module load; `REDIS_ENABLED=false` only
    stops connecting), `pandas` + `numpy` (CSV/Excel import in `import_export_service`), and
    `pythoncom`/`pywintypes`/`win32com` (dnspython's `win32util`, the docker SDK). Those stay.
    The real win was `mypy`: reached only through `pydantic.mypy` (the type-checker plugin), it
    alone contributed 75 unsigned `.pyd` files. Result: unsigned PE files in `_internal` 180 → 105,
    bundle 152 → 147 MB, frozen-Lite smoke 14/14. Same change: the `bottle`/`proxy_tools` hidden
    imports and `collect_data_files('bottle')` are gone (two errors per build), and
    `collect_submodules('passlib')` no longer bundles `passlib.tests`. Still bundled and
    worth a look later: PIL 12.8 MB (reportlab/openpyxl optional image support), grpc 10.7 MB
    (OTel gRPC exporter), and both psycopg 2 and 3 drivers (6.3 MB each).
33. ~~**`SMS_Manager.exe` targets .NET 5**~~ (found 2026-10-21, build log) — **fixed 2026-10-28.**
    `net5.0` was out of support (NETSDK1138), and `Program.cs` lines 670 and 703 had four
    nullable-reference warnings. Docker installs only. Now `net10.0` (LTS to Nov 2028; net8.0
    would have lapsed in Nov 2026); the obsolete `System.Security.Principal.Windows` /
    `Microsoft.Win32.Registry` 5.0.0 packages are gone (both in the shared framework); the
    `MainModule.FileName` lookups use `Environment.ProcessPath` with an `AppContext.BaseDirectory`
    fallback. Build 7 warnings → 0. CI: `installer.yml` and `sync-installer-artifact.yml` SDK
    8.0.x → 10.0.x, and `release-installer-with-sha.yml` now sets up 10.0.x explicitly instead of
    relying on the runner image. Single-file exe 59 → 80 MB (the .NET 10 runtime; Inno's LZMA
    compresses it). Not run interactively: it relaunches itself elevated (UAC prompt) and drives
    Docker, so the Docker-edition launch is the owner's check on the next install.
34. ~~**Review the remaining major upgrades and plan them**~~ — **done 2026-10-27, all five steps merged, shipped in v1.18.62** (raised 2026-10-26; owner: "sooner or
    later we have to review all the larger upgrades"). PR #306 took only the recommended set
    (Capacitor 8, protobuf 7, Actions majors). Still behind, all frontend. The backend majors
    (Pillow 13, python-dateutil 3, …) are transitive and arrive when their parents allow them:

    | Group | From → to | What it touches |
    |---|---|---|
    | TypeScript | 5.9 → 6 (7 is the Go-native compiler, evaluate separately) | `tsconfig` deprecations; **lifts the `@vitest/eslint-plugin` 1.6.27 pin** (1.6.28 needs TS ≥ 6) and its Dependabot ignore in `.github/dependabot.yml` |
    | Build/test toolchain (move together) | Vite 7 → 8, Vitest 4 → 5 (+ `@vitest/ui`, `coverage-v8`), `@vitejs/plugin-react` 5 → 6, `vite-plugin-pwa` 1 → 2, jsdom 27 → 29 | `vite.config.ts`, PWA/service worker, test setup, the Android/Lite/Docker builds |
    | Lint | ESLint 9 → 10, `@eslint/js` 10 | rule churn, plugin compatibility (flat config already in use) |
    | i18n | i18next 25 → 26, react-i18next 16 → 17 | every screen; `LanguageContext`'s namespace-fallback `t()` |
    | UI libraries | lucide-react 0.557 → 1.x, framer-motion 12 → 14, date-fns 3 → 4, `@hookform/resolvers` 5 → 6 | icon renames, animations (the fixed-clock tests), date formatting, form validation |

    - **Deliverable of the review:** per group, the breaking changes that apply to this codebase,
      an effort and risk estimate, and an order, for the owner to approve. Then one PR per group,
      each with the full smoke test (isolated E2E, Docker, frozen Lite, Android emulator).
      Suggested order: TypeScript 6 → toolchain → ESLint → UI libraries → i18n.
    - Until then Dependabot keeps opening one PR per major. Close them with
      `@dependabot ignore this major version` only if a group is deliberately deferred.
    - **Review 2026-10-27 (usage survey of `src/frontend`), replaces the order above:**
      - `date-fns`: **zero imports** — remove the dependency, don't upgrade it.
      - `@hookform/resolvers` 6: only the Effect resolver broke; we use `zodResolver` in 4
        files. Trivial. `framer-motion` 14: only `motion`/`AnimatePresence` in 10 files, 7
        tests mock the package, Motion lists no breaking change for that usage. Trivial.
      - `i18next` 26 + `react-i18next` 17 (together; 17 needs i18next ≥ 26.2): the removed
        options (`initImmediate`, `interpolation.format`, `simplifyPluralSuffix`) are not set;
        the 3 `<Trans>` usages have explicit `i18nKey`; plurals already use `_one/_other`.
        Low risk, but 84 files import it → full Vitest + E2E.
      - TypeScript 6: no `baseUrl`, resolution already `bundler`, `types` set explicitly, tests
        excluded from tsc. Low risk; lifts the `@vitest/eslint-plugin` pin. **TypeScript 7.0.2
        is on npm but has no stable JS compiler API and typescript-eslint's peer stops at
        < 6.1 → stays out.**
      - ESLint 10: flat config already, no jiti. `eslint-plugin-react` 7.37.5 and
        `eslint-plugin-jsx-a11y` 6.10.2 peer-range stops at ESLint 9 → bump them too; expect new
        `eslint:recommended` findings. Low–medium.
      - `lucide-react` 1.x: 72 distinct icons, no brand icons. **Hazard is in-repo:**
        `src/lucide-react.d.ts` and `src/types/lucide-react.d.ts` declare the module and
        re-export aliases (`LucidePenLine as Edit3`), which would hide a removed export from
        tsc and reach runtime as `undefined`. Delete both shims first, then let tsc list the
        real renames (`XCircle`, `CheckCircle`, `AlertCircle`, `HelpCircle`, `Edit`, `Edit3`,
        `BarChart3`, `PieChart` are the usual ones). Medium, mechanical.
      - Toolchain (Vite 8 / Vitest 5 / plugin-react 6 / vite-plugin-pwa 2 / jsdom 30): the only
        large group. `vite.config.ts` touchpoints: `manualChunks` function, `minify: 'terser'`
        - options, `assetFileNames` function, `modulePreload.polyfill` — verify each against the
        official Rolldown migration guide. Vitest 5 clears mocks before every test by default
        and throws on non-top-level `vi.mock`/`vi.hoisted` (68 mocking files, 11 hoisted);
        reporter output moves under `.vitest/`. plugin-react 6 drops Babel (we pass none; v5
        works on Vite 8, can follow later). jsdom 30 needs Node ≥ 22.22 (dev PC 22.23, CI
        latest 22). Medium–high; touches the Android, Lite and Docker builds.
      - **Order (one PR each, full smoke each):** (1) small majors in one PR: drop date-fns,
        resolvers 6, framer-motion 14, i18next 26 + react-i18next 17 → **PR #313, 2026-10-27**;
        (2) TypeScript 6 + unpin `@vitest/eslint-plugin` and its Dependabot ignore → **PR #315,
        merged 2026-10-27** (TS 6.0.3: config already matched the new defaults, tsc clean with no
        code change; `DOM.Iterable` dropped from `lib` because 6.0 folds it into `DOM`);
        (3) ESLint 10 → **PR #317, merged 2026-10-27.** The "two plugin bumps" do not exist:
        `eslint-plugin-react` 7.37.5 and `eslint-plugin-jsx-a11y` 6.10.2 are still the newest
        releases and their peer ranges stop at ESLint 9, so `npm install` refuses ESLint 10.
        Resolution: package.json `overrides` pin both plugins' `eslint` peer to `$eslint`
        (a declared npm mechanism, honoured by `npm ci`; no `--legacy-peer-deps`). Safe because
        jsx-a11y calls none of the APIs ESLint 10 removed and the only react rule we enable,
        `react/no-unescaped-entities`, is clean (the plugin's other rules still use
        `context.getSourceCode()` / `isSpaceBetweenTokens()`, so do not enable more of them until
        the plugin ships ESLint 10 support — then drop the overrides). New `eslint:recommended`
        rule `preserve-caught-error` found 5 rethrows without `cause` in the dashboard hooks
        (fixed; `ES2022.Error` added to `lib`). `--format unix` left core (not used).
        (4) lucide-react 1.x after deleting the shims → **PR #318, merged 2026-10-27**: 0.557 →
        1.62.0, both `.d.ts` shims deleted, tsc clean with no renames needed (1.x still exports
        every alias we use, confirmed at runtime for all 70 names), icons chunk 14 → 18 KB;
        (5) toolchain last, split in two: (5a) Vitest 5 + jsdom 30 → **PR #319, merged
        2026-10-27** (vitest/coverage-v8/ui 5.0.5, jsdom 30.1.3; pre-scan found no nested
        `vi.mock`, no unawaited `.resolves/.rejects`, no removed subpath imports, no
        `sequential`; the new `clearMocks: true` default broke nothing; one file broke because
        Vitest 5 forwards `global.document = …` to jsdom (`calendarUtils.test.ts` now spies on
        the real document); json/html/junit reporters write under `.vitest/` → git-ignored and
        added to the CI artifact upload); (5b) Vite 8.3.5 + plugin-react 6.1.2 +
        vite-plugin-pwa 2.0.0 → **PR #320, merged 2026-10-27 — todo 34 complete, only the
        follow-ups below remain.** Config: `rollupOptions` →
        `rolldownOptions` (same keys; the `manualChunks` function is deprecated in favour of
        `advancedChunks` but kept because the chunk graph is the TDZ-safe one), `__dirname` →
        `import.meta.dirname` in both configs (Vite 8 warns that the upcoming native config
        loader has no `__dirname`). `minify: 'terser'` + `terserOptions` still honoured.
        Build 13.5 s → 6.5 s; 96 → 83 precache entries at the same total bytes (Rolldown emits
        fewer tiny chunks; every css/html/icon/image entry still present). Default
        `build.target` rose to chrome111/safari16.4 (fine for the WebView ≥ 133 we ship to and
        Edge on Lite). Verified: tsc, lint, Vitest 1835, isolated E2E 59/36 skipped,
        `build:android` + emulator (WebView 133: login, Dashboard, Analytics, all API 200),
        frozen Lite bundle built from the Vite 8 dist (same-origin build, no absolute API URL
        baked, index.html bundled) and **launched later the same day once the owner stopped the
        NATIVE dev server that held port 8000: smoke 14/14** (health, login, Greek student +
        course, both PDFs with DejaVu embedded, Excel export, SPA index + all 11 referenced
        assets; health "degraded" only from host RAM ≥ 90 %). Never launch the Lite exe while
        anything else holds 8000 — it kills the holder. Follow-ups: `manualChunks` → Rolldown `codeSplitting` (the
        current name; `advancedChunks` is also deprecated) → **done 2026-10-27**, one group
        with the same `name(id)` logic; the output is byte-identical to the #320 build (every
        chunk hash unchanged), so the TDZ check is satisfied by construction; drop the
        `rollupOptions` alias warnings if Vite 9 removes it.
35. ~~**Node 22 on the dev PC**~~ — **done 2026-10-26.** The Capacitor 8 CLI refuses Node < 22.
    nvm-windows now uses Node 22.23.4 (CI's major), with npm 11.21.1, not npm 10.9 with its
    arborist crash. The old npm 8.19.1 is gone, which also ends the lockfile `libc` stripping.
    **Correction 2026-10-27:** a second npm 8.19.1 (a 2022 `npm install -g npm`) still lived in
    `%APPDATA%\npm` ahead of nvm on PATH and stripped `libc` again; its shims and
    `node_modules\npm` are parked in `%APPDATA%\npm-stale-npm8-backup`.
    `npm run build:android` and `cap doctor` pass. Global tools were reinstalled at their old
    versions. npm 11 skips global install scripts by default, so react-devtools' Electron
    binary was not downloaded. Node 20.19.5 is still installed (`nvm use 20.19.5`).
36. **Check Capacitor 8's system-bar handling on a real phone** (raised 2026-10-26). PR #306 drops
    `viewport-fit=cover`, so Capacitor pads the WebView instead of drawing under the status and
    navigation bars (no CSS reads the safe-area insets, and many overlays are `position: fixed`).
    The emulator smoke ran WebView 133, which takes the padded path. **WebView ≥ 140 takes the
    viewport-fit path, and only a real, updated phone shows it.** Check the header, modals, the
    offline banner and the bottom of long pages for overlap with the bars, in both themes.
    - **Review 2026-10-27: the premise is wrong.** Capacitor 8.5.3's `SystemBars.java` takes
      the edge-to-edge path only when WebView ≥ 140 **and** the viewport meta contains
      `viewport-fit=cover` (`shouldPassthroughInsets`, line 194). The tag is gone, so every
      WebView version takes the padded path the emulator (WebView 133) already exercised; no
      untested branch is left for a real phone. The docs agree (`native`/`css` honour
      `viewport-fit` only on ≥ 140; default mode `css`). The owner used the published v1.18.61
      APK on their phone on 2026-10-27 and reported nothing about the bars. What a phone (or
      the emulator) can still show: (a) the padded strips show the *native window background*
      and the status-bar icon colour follows the *system* night mode, while the app theme is
      independent (ThemeContext) → app dark + system light = light strip, dark icons, dark
      header; (b) keyboard: bottom padding switches to the IME inset — check a form at the
      bottom of a long page; (c) a notched phone shows whether the cutout inset is padded.
      **Downgraded** to a quick look at the next phone check, plus one small follow-up to pick:
      keep padding and set the window background to the app colours, or go edge-to-edge
      properly (restore `viewport-fit=cover`, pad the header and fixed overlays with
      `var(--safe-area-inset-*)`, which the default `css` mode injects). Either way add
      `EdgeToEdge.enable(this)` to `MainActivity` as the docs recommend (Capacitor 9 defaults
      `insetsHandling` to `native`).
    - **Decision + done 2026-10-27: option (a), strips follow the app chrome.** Capacitor's docs
      close the easy routes: with targetSdk 36 Android enforces edge-to-edge,
      `StatusBar.setBackgroundColor` and `overlaysWebView` "no longer have any effect", and the
      core `SystemBars` plugin only has `setStyle` (icon colour). The strips show the
      window/WebView background, which follows the *device* night mode (DayNight theme). So a
      40-line local plugin, `WindowChromePlugin.java` (`setBackgroundColor`, repaints the
      activity window + WebView background), plus `src/frontend/src/utils/nativeSystemBars.ts`,
      which reads the live `<html>` (`.dark` from ThemeContext → `#1a202c`; appearance
      `mieek-dark` → `#0a0a0a`, `modern-dark` → `#0f172a`; else white) and calls
      `WindowChrome.setBackgroundColor` + `SystemBars.setStyle` (Dark = light icons). Both
      providers call it after they update the DOM; no-op on the web, failures logged.
      `MainActivity` registers the plugin and calls `EdgeToEdge.enable(this)` before
      `super.onCreate` (the docs' recommendation; Capacitor 9's default). Three lessons from the
      emulator and `SystemBars.java`: (1) setting only the icon style is wrong in padded mode
      (device dark → black strip, forced dark icons → unreadable); the strip colour has to be
      ours first. (2) The strips are the *decor view's* inset padding, so they show the decor
      background, and `SystemBars.setStyle` (line 300) resets that to the theme's
      `windowBackground` on every call, including the two it makes itself on every
      configuration change — the plugin therefore recolours the decor view, and re-applies the
      last colour (posted after Capacitor's handler) in `handleOnConfigurationChanged`; the web
      side calls `setStyle` first and the colour second. (3) Never hand the decor view a new
      window drawable: `DecorView` resets its padding for a new background, which wiped the
      inset padding and drew the header under the status bar. **Still open:**
      real edge-to-edge (`viewport-fit=cover` + safe-area padding on the header and fixed
      overlays) — only a WebView ≥ 140 device can show it and the emulator image has 133.
29. ~~**Update saw SMS Lite and Docker as version "unknown"**~~ — **fixed 2026-10-13, found in
    the v1.18.57 smoke test.** On the frozen Lite build the update check returned
    `current_version: "unknown"`, `update_available: false`, so todo 28's Update would never
    have offered a newer release.
    - **Cause:** `maintenance._get_version()` read `VERSION` four folders above itself. That holds
      only in a checkout: SMS Lite keeps it in `_internal\VERSION`, the Docker image at
      `/app/VERSION`. Older releases had the same bug.
    - **Fix:** it uses `backend.version.get_version()`, which knows all three layouts. Test:
      `test_control_maintenance.py` (+1).
    - **The same smoke test passed:**
      - the v1.18.56 Lite database upgraded, and the four absence columns were dropped;
      - a page held open for 130 s kept Lite running, and Lite exited 89 s after it closed;
      - Lite exited 31 s after Logout with the page still open.
28. ~~**Control Panel Update: each edition updates itself in place**~~ — **done 2026-10-13 (owner's
    choices: installer as the Lite-only update engine, a host task for Docker, guidance for a dev
    checkout and an APK offer for Android; one release; not yet released).**
    - **What was wrong:**
      - **SMS Lite:** Update ran the installer `/VERYSILENT`. Silent runs skip the edition page,
        and the edition defaulted to Docker. So an SMS Lite PC got the Docker edition's files,
        while `SMS_Lite.exe` was never replaced. The launch itself used `Popen` on an installer that
        requires admin rights, which Windows refuses without UAC.
      - **Every edition** received the backend and frontend sources, the compose files, `config` and
        `.github/scripts`.
      - **Developer checkouts** counted as "native" and would have run the installer too.
      - **Docker:** `DOCKER.ps1 -UpdateClean` only rebuilds the sources already installed, so it never
        fetches a release. The host watcher was never installed or started, and the triggers folder
        was not mounted into the container: the bridge could not work.
    - **Now:**
      - **Installer.** `ResolveEdition` picks the edition from `/EDITION=lite|docker`, then the
        edition the last install recorded (`RegisterPreviousData`), then the existing files, then
        Docker. SMS Lite gets only its own folder plus `templates`.
        - `/WAITLITE=1` waits for SMS Lite to exit, using WMI; `/RESTARTLITE=1` starts it again as
          the original user.
        - For Docker, `scripts\update-watcher.ps1` is installed and registered as the scheduled task
          "SMS Update Watcher": at logon of the installing user, highest privileges, interactive
          (no stored password). It is removed on uninstall.
      - **Backend** (`routers/control/maintenance.py`). Modes are `lite` (`SMS_DEPLOYMENT_MODE` is set
        by the Lite entrypoint), `docker` and `native`.
        - Lite: verify the SHA-256 (refused without a published hash), launch the installer through
          UAC with `LITE_INSTALLER_ARGS`, then exit. Declining UAC fails cleanly and leaves Lite
          running.
        - Docker: a request is accepted only while the host task's heartbeat is recent. The request
          carries no command.
        - Native: refused, with the git steps.
        - After the Docker rebuild, status is read from the host status file.
      - **Host task.** It takes only a 32-hex job id from the request. It installs the latest
        release only if the SHA-256 matches the asset digest and the signature is a valid AUT MIEEK
        one, then runs `DOCKER.ps1 -Update`. It writes a heartbeat and status files, holds a
        single-instance mutex, and restarts itself after an update. `DOCKER.ps1` now mounts
        `data\.triggers` into the container.
      - **Panel.** A card per mode explains what Update does. The button is enabled only where it
        can work (Lite with an installer; Docker with the task running) and is hidden on a dev
        checkout. Docker polling survives the container restart.
      - **Android.** `AppUpdateBanner` compares the APK's build version with the latest release and
        offers `SMS_Android_*.apk`; "Later" hides it until the next version.
    - **Tests:**
      - `test_control_maintenance.py` (22: per mode, UAC declined, no hash, Docker status after the
        rebuild, installer chosen by name);
      - `test_update_watcher_ps1.py` (6, under pwsh: a verified install as the Docker edition, then
        the rebuild; SHA-256 mismatch, wrong signer or no digest installs nothing; same version is
        left alone; a malformed job id is ignored);
      - `UpdatesPanel.modes.test.tsx` (5) and `AppUpdateBanner.test.tsx` (5);
      - the installer compiles.
    - **First update from v1.18.56 or older must be manual:** those versions' Update could not do
      it (see above).
27. ~~**"Routes: 53" in the laptop's Lite log**~~ — **not a lost API; fixed the Lite check it
    misled (2026-10-13; not yet released).** The laptop's `debug.log` (copied by the owner)
    showed ~343–348 routes per start before, and 53 since v1.18.56. My own v1.18.56 smoke runs
    logged 53 too and still passed, because they only called endpoints that were present.
    - **Cause:** FastAPI 0.143.0 (in v1.18.56 via the pip group) keeps an included router as one
      nested `_IncludedRouter` entry in `app.routes`. The count dropped while the API stayed
      complete: 289 paths and 339 operations in OpenAPI, and grades, analytics and
      notifications answer 401, not 404.
    - **Side effect fixed:** Lite's startup check listed route paths, so it found no Control router
      and registered it a second time. `lite_db.app_serves()` now asks routing (through nested
      routers) whether a path is served, and the log shows OpenAPI operations
      (`api_operation_count`). Only the Lite entrypoint walked `app.routes`.
    - **Tests:** `test_lite_db.py` (+2: a nested router; the real app serves
      `/control/api/status` with more than 250 operations).
    - **Also in that log:** 32 lines from older builds carry a database URL with its password
      unmasked. The owner should delete the laptop's `debug.log` and the copy on the OneDrive
      desktop.
26. ~~**SMS Lite stopped 30 s after the login page appeared**~~ — **fixed 2026-10-13 (owner's
    rule; not yet released).** Reported from the laptop: a login attempt on a local-SQLite Lite got
    "the server is not available".
    - **Cause:** a failed session refresh, which happens every time the login page opens with no
      session, called `logout()`, and that scheduled Lite's 30-second shutdown. Only a
      successful login cancelled it.
    - **Owner's rule:** Lite stops 30 s after Logout, or once no SMS page is open.
    - **Now:**
      - Only an explicit Logout schedules the shutdown (`AuthContext.endSession`).
      - Every open page, including the login page and LAN/phone pages, sends
        `GET /api/v1/lite/heartbeat` every 10 s (`useLiteHeartbeat`). A non-Lite server's 404
        stops it after one request.
      - Lite exits after 90 s with no API request (`INACTIVITY_TIMEOUT_SECS`, was 30 min). The
        owner chose 90 s over 30: browsers slow background-tab timers to about once a minute.
      - The inactivity clock starts when the server starts, not at import: startup can wait at
        the QNAP retry or password window.
    - **Tests:** `useLiteHeartbeat.test.ts` (3); `AuthContext.test.tsx` (+2: Logout schedules, a
      failed refresh does not). Check the frozen exe's behaviour in the next release smoke test.
    - **Same day:**
      - REC's local `debug.log`, which held one pre-redaction line with a QNAP connection
        password, was deleted (owner).
      - For the laptop's admin access, the owner was given a one-time `DEFAULT_ADMIN_*` +
        `DEFAULT_ADMIN_FORCE_RESET` start. It was verified on the v1.18.56 build: the account is
        created in a database that already has users and must change its password. The
        laptop's result is not confirmed yet.
      - The laptop's own `debug.log` is the one to read for its Lite problems.
25. ~~**A deactivated account looked like a registration request; two password rules**~~ —
    **fixed 2026-10-12 (owner: "yes please"; not yet released).** Found in the owner's
    screenshot of User Management.
    - **Deactivated vs pending.** The panel treated every inactive account as a self-registration
      awaiting approval. The deactivated `admin@example.com` was under "new registrations wait
      here", one click on Approve from being active again. Migration `e7a1c9d4f2b8` (additive)
      adds `users.registration_pending`:
      - self-registration in approval mode sets it, and activation (Approve, or Edit → active)
        clears it;
      - the backfill marks inactive users named by a "registration" notification;
      - the panel shows "Pending approval" with Approve only for those, and "Inactive" with no
        Approve for deactivated accounts (re-activate with Edit). The banner counts only
        requests.
    - **One password rule.** The backend requires 8–128 characters, no whitespace, an uppercase and a
      lowercase letter, a digit and a symbol. The forced-change dialog listed that rule. The
      panel's own 0–6 score accepted passwords the server refused (12 characters without a
      symbol) and its hint said "at least 12". The installer checked only the length.
      - **Frontend:** `utils/passwordPolicy.ts` mirrors the backend (Unicode letters, as Python's
        `isupper` does). The change-own, reset and create forms check it before sending and name
        the missing requirements. The meter counts requirements met.
      - **Installer:** `MeetsPasswordRule` applies the same rule to the Lite admin password.
    - **Tests:**
      - `test_registration_approval.py` (+1);
      - `test_registration_pending_migration.py` (backfill on a real migration chain);
      - `passwordPolicy.test.ts`;
      - `AdminUsersPanel.approval.test.tsx` (+3: deactivated has no Approve, own-password rule,
        refused reset never calls the API);
      - the installer compiles.
24. ~~**Default admins on a shared database, and a Lite PC set to SQLite still using QNAP**~~ —
    **fixed 2026-10-12 (owner's design; not yet released).** Reported by the owner with a
    screenshot: after choosing local SQLite in the installer, Lite showed the "SMS Lite — QNAP"
    box for an old external address and a rejected password.
    - **Cause:** choosing SQLite only skipped writing `qnap-credentials.json`; a file left by
      an earlier install stayed, and Lite treats its existence as "use QNAP". The page also
      always preselected SQLite, even on a PC that used QNAP.
    - **Bootstrap** (`scripts/admin/bootstrap.py`, also Docker and Native): a default admin is
      created only in a database with no users (or with `DEFAULT_ADMIN_FORCE_RESET`). An existing
      account is restored to an active admin only by `FORCE_RESET`/`AUTO_RESET`, so a deactivated
      or demoted default admin stays so. New `DEFAULT_ADMIN_PASSWORD_CHANGE_REQUIRED` (default
      true). E2E is unaffected: `seed_e2e_data.py` creates its own users.
    - **Installer (Lite page):**
      - **QNAP:** all five fields are required; incomplete details used to fall back to SQLite
        silently.
      - **Local SQLite with no database yet:** asks for the administrator email, name and password
        (owner: no forced change, they chose it). It writes `local-secrets\initial-admin.json`,
        which Lite consumes on first start and deletes.
      - **Existing QNAP settings:** QNAP is preselected and prefilled, except the password.
        Choosing SQLite asks for confirmation, then removes `qnap-credentials.json`.
      - **Silent installs** change nothing.
      - **Also fixed:** the QNAP password field sat on top of the Port field, and the setup log
        recorded the QNAP password in clear text.
    - **Lite:** QNAP mode ignores `initial-admin.json`. A file whose email or password startup
      would reject is ignored instead of crashing Lite (`email-validator` is now bundled
      explicitly). A refused password gets its own EN/EL message ("re-run the installer"),
      instead of "unreachable ... check Tailscale".
    - **Tests:** `test_admin_bootstrap.py` (+3; 3 fail on the old code), `test_lite_db.py` (+11).
      The installer compiles with ISCC (exit 0). **Not yet clicked through as a GUI:** do that in
      the release smoke test (fresh PC, upgrade of a QNAP PC, switch to SQLite).
    - **Follow-ups the same day (owner: "add the 2 improvements", and registration on SQLite):**
      - **Wrong QNAP password, after installation:** when QNAP refuses the saved password, Lite
        opens a WinForms password window (PowerShell; the message goes in through an environment
        variable and the password comes back on stdout, never on a command line). It tests the
        password, saves only that field in `qnap-credentials.json` if it works, asks again if
        not, and quits on Cancel.
      - **Installer:** the QNAP host and port must be valid (the host goes into a PowerShell
        command) and are checked for an answer (5 s TCP). If they don't answer, it warns and
        offers to continue. A login test would need Docker, so the password is left to Lite's
        prompt.
      - **Registration on local SQLite:** Lite without QNAP credentials runs with
        `SELF_REGISTRATION_MODE=disabled` (requests could only reach that PC's own admin).
        `GET /auth/registration-mode` (public) lets the login page show "Accounts on this
        installation are created by its administrator" instead of the form (EN/EL). An older
        server without the endpoint keeps the form. QNAP, Docker and Native keep approval.
      - **Tests:** `test_lite_db.py` (+5: prompt-and-save, wrong-then-cancel, dialog script parses
        in PowerShell, registration off on SQLite / on with QNAP), `test_registration_approval.py`
        (+3), `RegisterWidget.test.tsx` (+3), `AuthControls.test.tsx` updated.
      - **Checked on screen (2026-10-12):**
        - **Password window:** the real `PASSWORD_DIALOG_PS` was opened from Python as Lite opens
          it, then captured by its window handle. Title "SMS Lite - QNAP", EN and EL text fit, and
          the field has focus. It opens on the active monitor.
        - **Login page:** a throwaway backend (`SELF_REGISTRATION_MODE=disabled`, temporary SQLite)
          and Vite were screenshotted with Playwright in EN and EL. The note shows, there are no
          registration fields, and no request failed.
        - **Release smoke test (v1.18.55, 2026-10-12)** on the frozen `SMS_Lite.exe` and the
          signed installer:
          - **Throwaway profile:** `USERPROFILE` was redirected, so the real Lite data was never
            touched.
          - **QNAP refuses the saved password:** a fake PostgreSQL that refuses `WrongPass` showed
            the password window. Typing the right password connected, and only the password
            changed in `qnap-credentials.json`.
          - **Local SQLite with `initial-admin.json`:**
            - healthy in seconds;
            - `registration-mode` disabled, and anonymous registration gets 403;
            - the installer's admin logs in with no forced change and reads data (200);
            - `admin@sms-lite.app` does not exist (400 invalid credentials);
            - the admin file is gone.
          - **Two bugs found and fixed before tagging (`a10283871`):**
            - bootstrap's emoji `print` raised `UnicodeEncodeError` on the frozen app's
              code-page stdout after creating the account, so the plaintext admin file was kept;
            - prefilling saved QNAP settings showed the Browse button's "Credentials loaded" box
              before the wizard opened.
          - **Installer Lite page:** clicked through by the owner on the rebuilt installer, all
            as expected. QNAP was preselected and prefilled without the password; the
            empty-password, unreachable-host, switch-to-SQLite and admin-field messages appeared;
            setup was cancelled. UI Automation could not drive the Inno wizard's buttons.
23. ~~**Overview dashboard: active students only, "Recently Enrolled" replaced**~~ — **done
    2026-10-07 (owner's choice of panels; not yet released).**
    - Year-of-study counts only active students, as a share of active students.
    - "Recently Enrolled Students" removed (owner: "no point").
    - **Students needing attention** (from `/analytics/overview`): failing a course, Class
      Participation lost, or near/over the 30% absence limit, with the reasons.
    - **Attendance not recorded** (new `GET /analytics/attendance-gaps?days=7`): per course,
      scheduled teaching days of the last 7 days (today excluded, weekends never) with no
      attendance. Schedules are read as the Attendance page reads them (English day names or a
      Monday-based index); courses without a schedule are counted as unchecked. Holidays are not
      known, so a day off can show up.
    - **Fixed on the way:** the Top Performers loader requested `/attendance` and `/grades`
      without the trailing slash; the backend's redirect pointed at the absolute backend URL and
      dropped the Authorization header (401 behind the Vite proxy).
    - **Top Performers rebuilt (2026-10-08, owner: "fix them too").** They showed 0.0% / F for
      everyone: the dashboard re-implemented grading in the browser (four requests per student,
      up to 60 students, its own category lists, needing evaluation rules the course list did
      not always carry), and anything unmatched scored 0. The three tiles above them ("This
      week" = active students, "Assessments" = courses of at most 60 students, "Performance" =
      that same 0) came from it too. Now `TopPerformersPanel` uses `/analytics/overview`: top 5
      active students by average final grade, attendance (Present + Late) or exam average
      (new `exam_average`: mean of each course's midterm/final grades; plus `credits`), in
      percent; students with nothing graded are left out. The tiles show average final grade
      (pass rate), attendance and grading progress (graded / enrolments). About 800 lines of
      browser-side grading and 13 unused translation keys removed. Verified in the browser on
      seeded data (Bob Williams 90.3% = (91.5 + 89.0) / 2 by hand) in EN and EL;
      `TopPerformersPanel.test.tsx` (modes, unranked students, Greek).
    - **E2E red on `cbb6166f5`, fixed before release:** `analytics-dashboard.spec.ts` checked the
      old card titles; its other 40 tests were vacuous (`expect(x === true || x === false)`,
      "body is visible"). Rewritten as 5 tests that create their own data (tracked and
      cleaned up): cards and no failed requests, a student's course list, "—" with nothing
      graded, a rule-based final grade (75.7%), the class view's at-risk row, Greek. They found
      a real bug: the overview queries kept data for 60 s, and the hash navigation from the
      dashboard reused it, so a grade or student added a moment ago was missing from Analytics.
      The overview queries now refetch whenever a page or panel opens (`staleTime: 0`).
      Running E2E locally against a throwaway backend needs `PLAYWRIGHT_API_BASE_URL` too, or the
      helpers call `:8000`, which may be the owner's dev server on the QNAP database.
    - Tests: `DashboardAttentionPanels.test.tsx` (EN and EL with the real i18n instance),
      `test_analytics_overview.py` (+2: gaps window, schedule parsing). The Greek checks in the
      analytics tests now set `i18nextLng` in localStorage: `LanguageProvider` reads it first,
      so the earlier Greek runs had silently rendered English.
22. ~~**ΜΙΕΕΚ absence rules changed: fail over 30%, Class Participation lost over 10%**~~ — **done
    2026-10-07 (owner's decisions; not yet released). Supersedes the 2026-09-25 rule (10%, 15%
    with Directorate approval).**
    - **Rule** (`absence_limit_service`): absences = Absent + Excused over the scheduled periods.
      Over `absence_limit_percent` (30) attendance is insufficient and the course is failed
      (flag only). Over `participation_limit_percent` (10) the Class Participation share,
      including its special sub-weights, counts as 0 in the final grade
      (`_calculate_final_grade_from_records`, `participation_forfeited` in the response). The
      warning starts at 80% of the fail allowance.
    - **Extended limit removed** (owner: "remove it"): the approval endpoint, schema fields,
      Attendance panel column and session export/import of approvals are gone.
    - **Migration `d5e9f3a2b7c4` is additive:** it adds `courses.participation_limit_percent`
      (10) and sets every course's `absence_limit_percent` to 30. The old
      `courses.absence_limit_extended_percent` and `course_enrollments.extended_absence_*`
      columns stay, unused, because older installed apps share the QNAP database and still read
      them. **Follow-up, corrected 2026-10-12:** "drop them once every install runs this
      version" was wrong. v1.18.54 and v1.18.55 still *map* the columns, and SQLAlchemy selects
      every mapped column, so dropping them would break every course and enrollment query on
      those installs. Two steps:
      1. **Done on `main` after v1.18.55 (owner: all installs updated):** the four columns are no
         longer mapped in `models.py`. The database keeps them; they have server defaults, so
         inserts still work. `test_unmapped_legacy_columns.py` runs the real migrations to head
         and checks that.
      2. **Done 2026-10-13 (owner: every device runs v1.18.56; not yet released):** migration
         `f2b6d8a1c3e5` drops the four columns. Downgrade restores them empty, with their old
         defaults. `test_unmapped_legacy_columns.py` runs the chain on SQLite: courses and
         enrollments survive the batch rebuild, and downgrade brings the columns back. The
         owner's `--reload` dev backend applies it to QNAP when it restarts. Importing an export
      from before this change ignores its old `absence_limit_percent`, so the 10% fail rule
      cannot come back from a backup.
    - **Special participation moved to the Courses tab** (owner: "sub-weights of CP"): the
      Class Participation row holds the whole share, split into No participation / Minor
      participation / Minor (mobile); the rest is for the normal per-period ratings. Stored as
      before (Class Participation keeps the remainder, three special rules), so grading is
      unchanged. The editor was removed from the Grading page. **Correction (same day):** the
      first commit put the editor in `CourseEvaluationRules.tsx`, which nothing mounts (only the
      feature barrel exported it); the browser smoke test showed it. The editor and the two limit
      inputs now live in `CoursesView.tsx` (the real Courses tab, which had no limit inputs at
      all, so the limits were never editable in the app), and the dead component is deleted.
      Both save paths (Save, and "Clear all" on the schedule tab) write the same layout.
    - **Superseded 2026-10-13 (owner): observations are deductions, not sub-weights.** A tick
      used to add a 2/10-style category with positive weight. Now Class Participation keeps its
      whole share; each attended day is an equal slice of it, and the most severe observation
      ticked that day takes its `deduction_percent` of the slice (defaults by severity: no
      participation 60%, mobile use 40%, minor 20%; editable per course). The rest of each day
      is credit for physical presence. Capped at what Class Participation earned; nothing when
      the share is forfeited. Stored as weight-0 rules; old sub-weights fold back into Class
      Participation when read (no migration). Older installs on the shared QNAP DB ignore the
      weight-0 rules once a course is re-saved (no deduction, full share).
    - **Analytics:** "Grades: 0" next to a final grade came from participation ratings; the
      course rows now count them. A lost Class Participation share is marked and is an at-risk
      reason.
    - **Tests:** `test_absence_limits.py` rewritten (13: thresholds in whole periods, 80 → 72
      when the share is lost, old exports), `test_analytics_overview.py` updated,
      `AbsenceLimitsPanel.test.tsx` rewritten, new `CourseEvaluationRules.test.tsx` (share,
      save layout, too-high sub-weights, defaults), analytics page test extended.
    - The owner's native dev backend (uvicorn --reload on the QNAP database) was stopped before
      this work so half-done edits and the migration would not reach the shared database.
21. ~~**Analytics page: wrong numbers and a course list not tied to the student**~~ — **rebuilt
    2026-10-07 (owner: "fix + redesign"; percent only; attendance as in the absence limit). Not
    yet released.**
    - **Reported by the owner:** picking a student showed every course; the average grade was
      "totally wrong"; the Credits logo was broken.
    - **Causes found:** the Course list held every course with any enrolment; the summary cards
      averaged every raw grade entry of every student and course, ignored the selection, counted
      inactive students and courses, and showed `0.00%` for "no data"; student charts only saw
      grades from the last 90 days; the student view's distribution was the whole course's;
      attendance had four definitions (Present only / Present + Excused / absence limit);
      treemap, Sankey and heatmap drew invented data (minimum 5, per-entry pass/fail,
      week-of-month).
    - **Now:** `services/analytics_overview_service.py` with `GET /analytics/overview`
      (academic year, division, course) and `GET /analytics/student/{id}/overview`. Every figure
      starts from a live enrolment: final grade from the course's evaluation rules (plain mean
      for a course without rules, `null` with no grades), attendance = (Present + Late) /
      recorded, the absence-limit status. Student view: only their courses, final grade vs class
      average and rank, grades over time, attendance by status, per-course grade list. Class view:
      average final grade by course, distribution in 10-point bands, attendance vs grade per
      student, "needs attention" (failing a course, or near/over the absence limit) with the
      reasons. Cards follow the selection and show "—" for no data. The PDF/Excel export uses
      the same figures (all active students). Saved custom dashboards' old chart ids are mapped.
    - **Credits logo:** the service worker never precached `.jpg`, so a cached page showed it
      broken when the server had no copy (the owner's screen was a 1.18.50 build cached for
      `127.0.0.1:8000`, which in native dev serves only the API). `jpg` is now precached.
    - **Tests:** `test_analytics_overview.py` (7, hand-checked numbers: rules 0.4×80+0.6×70 =
      74, dropped and inactive left out, Late attends, Excused absent); `AnalyticsDashboard.test`
      (7, real i18n in EN and EL: course list per student, "—" not 0, course drill-down, at-risk
      list, year filter). Smoke-tested in the browser on a throwaway backend with seeded grades,
      light and dark, desktop and 412 px; figures re-computed by hand; no console errors.
    - **Removed as dead:** the old charts, `divisionUtils`, `chartAnimations`,
      `dataOptimization`, and the unused analytics hooks. The old backend endpoints stay (other
      screens use them).
20. ~~**CI red on `main`: a flaky E2E test, and an Attendance bug hidden behind a vacuous one**~~
    — **fixed 2026-10-07.**
    - **Found by the pre-flight.** The CI/CD Pipeline's E2E job failed on `c1348c7ca` (docs only):
      `advanced_search.spec.ts` "renders students or shows empty state", 3/3 attempts. The same
      code had passed on `7a50b9b86`. The page snapshot at failure showed four students rendered.
    - **Cause:** `locator.isVisible({ timeout })` ignores the timeout and checks once, so it lost
      whenever the list was still loading or animating open. Now one retrying
      `expect(empty.or(listItem)).toBeVisible()`. `report-workflows.spec.ts` had the same probe
      before deciding to skip; it now waits with `waitFor`.
    - **The attendance E2E test could not fail.** `student-management.spec.ts` "should mark
      student attendance" returned early (a silent pass) at four points. It also clicked
      `button:has-text("Present")`, which is the "mark all Present" quick action: with no date
      selected, no student row ever rendered. It now selects the course, a day and the student's
      own `Present - <name>` button, and checks that the button turns selected.
    - **That stricter test found a real bug, released in v1.18.51.** Selecting a course in
      Attendance fetches its details, which replaces `localCourses` and re-runs the enrolment
      check. Since `0e80d0570` (todo 14) that check first emptied `coursesWithEnrollment`, and the
      effect that keeps the selection valid then cleared the course. **A teacher's first pick of
      each course bounced back to "Select course"** (picking it again worked: the details were
      cached). A refetch of the student list did the same. Now a re-check keeps the last known
      set; the set still starts empty, so a course is never offered before its enrolments are
      known. Test: "keeps the selected course while enrollments are re-checked" in
      `AttendanceView.specialParticipation.test.tsx` fails on the old code.
    - Verified: the three changed specs pass in full against a disposable database (11 tests);
      the attendance Vitest file passes (4 tests); ESLint 0 errors; `tsc` clean.

---

## 🔎 Pre-release smoke test for v1.18.50 (September 29, 2026)

Every mode was tested on `main` (`b8a8edd0f` plus the two fixes below). Each check used a real login
and real data reads, not just health checks.

| Mode | How | Result |
|---|---|---|
| Backend | COMMIT_READY quick (25 batches), CI | 1152 passed |
| Frontend | full Vitest suite | 127 files, 2063 tests passed |
| E2E | `RUN_E2E_ISOLATED.ps1` (throwaway SQLite) | 41 passed, 37 skipped |
| Native | `NATIVE.ps1`, dev Postgres, read-only | healthy, `v1.18.49`; database, migrations and frontend green; login OK. Data requests answered 403 because the dev admin must still change its password (todo 9). |
| SMS_Lite | fresh PyInstaller build, first run under a throwaway `USERPROFILE` | All 18 flow checks passed (details below). |
| Docker | `DOCKER.ps1 -Update` (image rebuilt from `main`) | healthy, `v1.18.49`; login, static files and deep links OK. The UI shows the forced password-change dialog for the dev admin, which uses the same database as Native. |

SMS_Lite checks:
- Forced password change on first login.
- Registration flow: register, account pending, admin notified, approve, login. With no SMTP
  configured, approval returns `not_configured` and the approving admin is told to inform the user.
- Static files come back as real images.
- A browser login on `127.0.0.1` survives a reload.
- The logout shutdown exits and leaves the install intact.

Fixed before the release:

- **`RUN_E2E_ISOLATED` sent real mail.** Every backend started from a checkout loads the SMTP
  settings saved in Control Panel > Email (`src/backend/data/smtp_override.json`). So the "isolated"
  E2E backend loaded the developer's Brevo relay, and `register.spec`'s approval emailed a test
  address through it. A spec that saved email settings would also have overwritten them.
  `smtp_override.py` now honours `SMTP_OVERRIDE_PATH`, and the script points it into its run
  directory. Verified in the E2E backend log, which captures INFO lines: no override loaded.
- **The forced password-change dialog was all English in the Greek UI.** It is the first screen of
  every new account, including every fresh SMS_Lite install.
  - `ChangePasswordPromptModal` called `useTranslation()` with keys such as
    `controlPanel.changePasswordRequired`. The default namespace has no `controlPanel`, so every
    string fell back to its English default.
  - It now uses the `controlPanel` namespace, with no English defaults to hide a miss.
  - Three ungrammatical Greek strings, never displayed before, were corrected.
  - The new `ChangePasswordPromptModal.test.tsx` uses the app's real i18n instance. The test-utils
    instance has no `controlPanel` namespace and could not show the bug. The new test failed before
    the fix.

Found, not fixed: todos 9–12.

Lessons for next time:
- SMS_Lite always opens the default browser. Under a throwaway `USERPROFILE`, that is a separate
  Edge instance with a fresh profile, which signs into the owner's Microsoft account and syncs.
  Close it by its process tree (its parent is the SMS_Lite PID) and delete the folder.

---

## 🛡️ Repository rulesets, Dependabot auto-merge, CI gate fixes (September 29, 2026) — repo/CI only

Surfaced by Dependabot PR #230 (`fast-uri` 3.1.6 → 3.1.8, merged as `6189bbf3e`), whose PR-only checks failed for reasons unrelated to the bump.

- **COMMIT_READY's translation check could not pass under Vitest 4** (`9e1f067c8`). It passed `run`
  twice (the npm `test` script already runs `vitest run`) and used `--reporter=basic`, which Vitest 4
  removed. Now `--reporter=dot`.
- **PR Hygiene's `commit-ready` job was removed** (`9e1f067c8`). It ran `COMMIT_READY -Quick` on a
  bare Windows runner with no Node/Python setup, so it could only fail. `commit-ready-smoke.yml`
  runs the same gate with dependencies installed.
- **Dependabot auto-merge failed with "Resource not accessible by integration"** (`5affca4b5`): the
  token had `contents: read`. The job now only runs for PRs authored by `dependabot[bot]`. Patch
  updates auto-merge once CI passes; minor updates are auto-approved only.
- **Auto-merge now uses a GitHub App token, not `GITHUB_TOKEN`.** GitHub starts no workflows for
  events caused by `GITHUB_TOKEN`, so CI and E2E never ran on `main` after a Dependabot merge.
  - The App has Contents and Pull requests read/write only. It has no Workflows permission and no
    ruleset bypass, so auto-merge still waits for the checks and the approval.
  - `GITHUB_TOKEN` still approves, and is back to `contents: read`.
  - GitHub Actions bumps are approved but merged by hand, because merging them would need the
    Workflows permission.
  - Secrets: `DEPENDABOT_MERGE_APP_CLIENT_ID` and `DEPENDABOT_MERGE_APP_PRIVATE_KEY`, each in both
    the Actions and the Dependabot secret stores. Until they exist, patch PRs fail at "Decide
    whether to auto-merge" with a message naming them. See Next todos item 8.
- **`dependabot.yml` has been invalid since it was added (2025-12-18).** It had a top-level
  `security-updates:` key, which is not part of the schema; checked against the SchemaStore
  `dependabot-2.0` schema. Security updates are a repository setting, and it is on. pip and npm also
  pointed at `/backend/` and `/frontend/`, which moved to `src/` on 2026-06-12. Every Dependabot PR
  on record looks like a security update. The file is fixed and now validates. Minor and patch
  bumps are grouped into one weekly PR per ecosystem; major bumps stay separate.
- **Protection moved from classic branch protection to rulesets** (Settings → Rules → Rulesets,
  created via the API):
  - **`main branch`** (default branch): PR required with 1 approval; required checks
    `🧪 Backend Tests (Pytest)`, `🧪 Frontend Tests (Vitest)`, `🏗️ Build Frontend (Production)`,
    pinned to the GitHub Actions app (id 15368), not strict; no force-push; no deletion.
  - **`release tags`** (`refs/tags/v*`): no deletion, no update, no force-push. This enforces
    "historical release tags are immutable". Creating tags is still allowed, so releases work as before.
  - Both rulesets let the **Repository admin** role bypass them always, so the owner's direct pushes
    and a bad-tag rollback still work (git prints "Bypassed rule violations").
  - The classic rule on `main` was deleted, so the rulesets are the only protection.
- **The nightly branch-protection job was removed.** `orchestrated-maintenance.yml` dispatched
  `apply-branch-protection.yml` every night. It got a 403 each time but reported success. With an
  admin token it would have reinstated classic protection with check names that never run
  (`Import checker`, `CI`, …) and `enforce_admins: true`. The workflow and
  `scripts/trigger_branch_protection.ps1` are deleted.

**If you rename or remove any of the three required CI jobs, update the `main branch` ruleset in the
same change.** Otherwise every PR waits forever for a check that never reports.

---

## 🔐 Self-registration needs admin approval; activation emails the user (September 28, 2026) — released in v1.18.50

**Before:** the login page's registration form created an **active** teacher account and signed
straight in. Anyone who could reach the server had teacher access to every student's data, and
no admin was told.

- **Approval by default.** `SELF_REGISTRATION_MODE` has three values: `approval` (the default),
  `open` (the old behaviour) and `disabled` (public registration is refused with
  `AUTH_REGISTRATION_DISABLED`). Admin-token registrations always skip approval.
- **Pending accounts are inactive.** The applicant sees "request submitted, an administrator must
  approve". A login attempt with the correct password gets `403 AUTH_ACCOUNT_INACTIVE`. The check
  runs only after the password verifies, so it reveals nothing about the account to someone
  without the password.
- **Login never checked `is_active` before.** An account an admin had deactivated still got
  tokens, then failed silently on `/auth/me`. Both cases now get the same clear 403.
- **Admins are told.** Every active admin gets an in-app `registration` notification, rendered in
  the UI language from its data. Clicking it opens `#/power?showControl=1&showUsers=1`, which
  expands User Management. Inactive accounts sort first, with a count banner and a one-click
  **Approve** button.
- **Activation emails the user.** When `PATCH /admin/users/{id}` moves an account from inactive to
  active, the user gets a bilingual email over the configured SMTP (plain-text part included,
  user fields HTML-escaped). The response carries `activation_email: sent | failed | not_configured`.
  If the email did not go out, the admin gets an error toast plus a persistent
  `activation_email_failed` notification asking them to tell the user in person. It goes to the
  approving admin only. The activation itself always stands. The email includes a login link
  only when the admin's origin is not loopback.
- **Leak fixed.** `PATCH` and `POST /admin/users` returned the ORM row, including
  `hashed_password` and lockout state. Both now return `UserResponse`.
- **Notification times were 3 hours off under SQLite (SMS_Lite).** Naive UTC timestamps were sent
  without an offset. `NotificationResponse` now marks them as UTC. Postgres (`timestamptz`, UTC)
  was already correct.
- **`src/backend/data/smtp_override.json` was not git-ignored.** It holds the SMTP password saved
  from Control Panel > Email, and the repo is public. It is now ignored.
- **Login and registration say "the server is not available"** instead of "status code 500"
  when the backend is down. This covers no response, nginx 502/504, and the Vite proxy's bare 500.
  Real backend errors keep their own messages.

**Verification:** `test_registration_approval.py` (17 tests), a notification-UTC test, and frontend
tests (register/login widgets, NotificationItem, AdminUsersPanel approval, `isServerUnreachable`).
Full suites passed: backend 1152 passed and 39 skipped; frontend 2049. Checked in the running
app on an isolated stack (backend :8010 on a throwaway SQLite, Vite :5174, a local fake SMTP
sink):
- register, then login blocked, then admin notification, then Approve, then login works;
- with SMTP up, the email arrived with the correct recipient, subject and body;
- with SMTP down, the admin got the error toast and the bell notification, and the user could
  still sign in.

Brevo SMTP was then configured on the dev machine and its test email was delivered.

**Commits:** `434631cbc` (feature) and `44b993081` (CI fixes), both pushed. CI/CD and E2E are green on `44b993081`.

**CI broke after the push (fixed in `44b993081`).** Two separate problems:

- **Backend: 39 errors in CI, none locally.** The teardown in `test_run_migrations.py` reloads
  `backend.config`, which creates a *new* `settings` object. Modules imported earlier, such as
  `routers_auth`, kept the old one. So conftest's per-test patches, including
  `SELF_REGISTRATION_MODE=open`, stopped reaching them for every test that ran afterwards, and the
  `admin_token` fixture's account stayed inactive. CI runs the whole suite in one process;
  `RUN_TESTS_BATCH` isolates groups, which is why it did not show locally. The fixture now puts the
  original object back.
- **E2E: 3 specs assumed public registration signs straight in.** Three changes:
  - `registerUser` now creates accounts as the seeded admin.
  - `register.spec` checks the approval flow.
  - `ui-register.spec` checks the pending message and that no sign-in happens. This spec is not in
    CI's E2E subset, so it had been failing unseen.

  Full isolated E2E: 41 passed, 37 skipped.

**Gotcha:** TotalAV real-time scanning slowed file reads about 10×. `require('typescript')` took
5s, and Vitest workers timed out at start ("Failed to start threads worker"), which looked like
test failures. With it stopped, the same files pass in 37s.

---

## 🎓 ΜΙΕΕΚ absence limit: 10%, or 15% with Directorate approval (September 25, 2026) — released in v1.18.49

**The rule:** attendance is compulsory, and the limit is counted separately for each course.
- A student may miss at most **10%** of a course's scheduled semester periods.
- With documented reasons and **Directorate approval**, the limit is **15%**.
- Going **over** the limit makes attendance **Ανεπαρκής**: the student loses the final exam and
  repeats the course.

The owner decided three things: calculate the semester total rather than enter it; show a
**warning flag only** (grade entry is never blocked); and keep `absence_penalty`, with the new limits
added alongside it with defaults.

- **Counting:** `backend/services/absence_limit_service.py`.
  - Units are teaching periods, since attendance is recorded one row per period. The total is
    `periods_per_week × SEMESTER_WEEKS`, falling back to `hours_per_week` for courses without a
    period schedule.
  - **Absent and Excused both count.** A justification only matters through the approval; Late
    does not count.
  - "Over" means strictly more than the limit. For example, 42 periods × 10% = 4.2, so 4 absences
    are allowed and the 5th is insufficient.
  - A student is flagged "near limit" once they have used 80% of their allowance.
  - A course with no schedule reports `unknown`, never `insufficient`.
- **Schema** (migration `c4d8e2f1a6b3`, additive):
  - `courses.absence_limit_percent` (default 10) and `absence_limit_extended_percent` (default 15).
  - `course_enrollments.extended_absence_approved`, `_approved_at` and `_note`.
  - The new fields round-trip through session export/import and course import.
- **API:**
  - `GET /attendance/absence-status/course/{id}` and `/student/{id}`.
  - `PUT /enrollments/course/{c}/student/{s}/extended-absence` (`courses:edit`). Editing the note
    keeps the original approval date.
  - `/analytics/.../final-grade` now also returns `attendance_insufficient` and `absence_limit`.
    The grade itself is unchanged.
- **UI** (EN/EL):
  - An "Absence limit (ΜΙΕΕΚ)" panel in Attendance: each student's absences against the limit,
    their status, and an approval checkbox with a note.
  - A red warning on the Grading screen and in the grade breakdown for an insufficient student.
  - The two limit inputs sit beside the absence penalty in Evaluation Rules. Like the penalty, they
    only autosave once the course has rules totalling 100%.
- **Also fixed:** reports under-counted unexcused absences (`unexcused = absent - excused`, where
  Absent and Excused are separate statuses). They now report `absent`.
- **Not changed:** the student profile's attendance rate still counts Excused as attended, and semester
  archive "passed" status still ignores the flag. Both are consistent with "warn only".

**Verification:**
- Tests: `test_absence_limits.py` (14), `AbsenceLimitsPanel.test.tsx` (6), and 2 new
  `GradeBreakdownModal` tests. The 24 neighbouring backend test files still pass.
- In a browser, against an isolated backend on a throwaway SQLite database: EN and EL panels;
  5/42 absences → Ανεπαρκής, 4/42 → near limit, 1/42 → Επαρκής. Approval moved the limit to
  6 (15%) and withdrawal moved it back. The note saved on blur. The Greek grading warning appeared
  with the form still enabled, and no warning appeared for an in-limit student.
- The running `--reload` dev backend applied the migration to the dev Postgres on its own. All 55
  courses got 10/15, and a read-only pass over the real data gave 42 enrolled students, all `ok`,
  with no absences recorded yet. Revert with `alembic downgrade b97c31e9c95f`.

---

## 📚 Wiki brought up to date + auto-sync on release (September 24, 2026)

The GitHub wiki had stopped at v1.18.38, and several pages had been wrong since it was first written.
Examples: a `.sha256` sidecar that is never published; 13 permissions and admin/teacher/viewer roles
(the real numbers are 54 permissions and admin/staff/teacher/student); RS256 JWTs; a deleted dashboard
wizard; E2E spec names that don't exist; `i18n/locales/*.json` (the real files are
`src/frontend/src/locales/*.js`; `CLAUDE.md` had the same wrong path and is fixed too); and a
milestone table with four "v1.18.25" rows. All 15 pages were re-verified against the code and rewritten
where needed.

**Auto-sync:** `.github/workflows/wiki-sync.yml` runs `infra/scripts/release/sync_wiki.py`
after `release-on-tag.yml` succeeds, daily (asset sizes appear only after upload), and on
demand. It rewrites only `<!-- wiki-sync:KEY -->` marker pairs (version, date, asset sizes,
Android versionCode, the last 8 CHANGELOG releases) and inserts a milestone row for a new version.
Hand-written prose and existing rows are never touched. Tests: `test_sync_wiki_script.py`.
Hand-maintained numbers (test counts, module counts) still need a manual refresh now and then.

---

## 🚢 v1.18.45 session (September 21, 2026) — released

**Status**: ✅ RELEASED | Tag `v1.18.45` on `c6f3c758f`. Commits `3025270be`, `906f4a04d`, `66179b8ac`, `220727ab2`, `9aa9c06e0`.

- **Lite bug reported from a remote laptop.** Log: `Some routers failed to load ... routers_semester_archive: No module named 'routers'`. The real cause was hidden: `router_registry._try_add` retried a failed `backend.routers.X` import as a bare `routers.X`, and *that* error replaced the original. The router was the only registered one missing from `lite_simple_entrypoint.spec`'s hiddenimports. Fixed in the spec, the registry now re-raises the first error, and `test_lite_spec_covers_routers.py` fails (naming the router) if a registered router is missing from the spec. Verified on a rebuilt exe: 16 semester routes served, no warning. **Only a rebuilt SMS_Lite fixes a machine** — the laptop needs the v1.18.45 installer.
- **CodeQL.** Inline `# codeql[...]` comments are *not honoured* by GitHub code scanning (commit `3025270be` did nothing; a manual run re-raised the alerts as #1863-1867). What worked: resolve with `os.path.realpath` and require `startswith(root + os.sep)` (`906f4a04d`). Alerts: 0 open. `codeql.yml` does not run on direct pushes — trigger it with `gh workflow run codeql.yml --ref main`.
- **Todos closed.** CI `test-backend` has a `postgres:16-alpine` service and `SMS_TEST_POSTGRES_URL`, so the 9 round-trip tests run (confirmed in the log: 1089 passed, 30 skipped). `import_export.spec.ts` deleted (skipped duplicate of `feature_127_import_export.spec.ts`, hash-less route). GradingView uses `enrollmentsAPI.getByStudent` with an active-only filter; the new test fails on the old code.
- **Released with** `RELEASE_READY.ps1 -ReleaseVersion 1.18.45 -TagRelease` (exit 0, first try). Verified on the published assets: installer Authenticode Valid (CN=AUT MIEEK, timestamped, v1.18.45), APK `versionName 1.18.45 / versionCode 118045`, release body 722 chars with 4 fences, all three release workflows green.
- **Gotchas.** The release-manager subagent hands back early (it reported "still running" and stopped) — poll `rr.log` yourself. `infra/installer/windows/dist/SMS_Lite.exe` is a stale June onefile build; the real one is `dist/SMS_Lite/SMS_Lite.exe`. Building Lite locally needs `src/frontend/dist` first (`VITE_API_URL=/api/v1 npm run build`).

## 🧪 E2E runs against a disposable database (September 17, 2026)

**Status**: ✅ DONE, not yet released. Closes the second half of todo 3 — the durable fix the
teardown was only a stopgap for.

**`infra/scripts/testing/RUN_E2E_ISOLATED.ps1`** creates a throwaway SQLite database, migrates
and seeds it with `backend/seed_e2e_data.py`, starts a backend bound to it, runs Playwright, then
stops the backend and deletes the database. It is the same recipe `.github/workflows/e2e-tests.yml`
already uses — **CI was never the problem; it has always run against a disposable database in a
fresh workspace.** The leak was purely local, where E2E ran against whatever `DATABASE_URL` the
machine is configured with: here, the real development PostgreSQL.

Running it also makes a local run match CI in a way that matters: in a seeded database
`test@example.com` is an **admin** and `admin@example.com` exists with the password
`loginAsAdmin` expects, which is what the specs were originally written against.

**Why the teardown was not enough.** `students` and `courses` are **soft-deleted** — they carry
`is_active` and `deleted_at`, so the tracker's DELETE hides a row from the app but leaves it in
the table. The dev database currently holds 63 student rows of which 4 are active, and 55 course
rows of which 36 are active. The earlier "counts unchanged" measurement was taken through the
API, so it was true as far as the application is concerned but did not mean the tables had
stopped growing. Only accounts are hard-deleted. A disposable database is the only thing that
actually stops the accumulation.

### Two things that had to be right

- **The database must live inside the repository.** `config.py` validates that a SQLite path sits
  under an allowed root and rejects anything else, including the system temp directory — the
  first attempt failed with "Database path must be within an allowed directory". It now uses
  `data/e2e-runs/<timestamp>/`, which is gitignored, and CI puts its database in the workspace
  for the same reason.
- **`VITE_API_URL=/api/v1` and `VITE_DEV_PROXY_TARGET`**, the two variables `NATIVE.ps1` sets.
  With a relative API base the frontend's requests go to Vite on 5173 and are proxied to the
  backend, staying same-origin so the browser attaches the HttpOnly `refresh_token` cookie.
  Without them the frontend calls port 8000 directly, the refresh becomes cross-origin, the
  cookie is not sent, `POST /api/v1/auth/refresh` answers **401**, and every `loginViaAPI` spec
  dies on the login page — while `loginViaUI` specs still pass, which is what made it confusing.
  Earlier runs only worked because Playwright was reusing the Vite server `NATIVE.ps1` had
  already started with those variables set.

The script refuses to run if port 8000 is already in use, rather than silently testing against a
backend someone else started — which would be the development database, the exact thing it
exists to avoid. It also saves and restores the environment variables it sets, so a throwaway
`DATABASE_URL` cannot outlive it.

### Verification

`student-management.spec.ts` **7/7** and `login.spec.ts` **3/3** against the disposable database,
with the global teardown reporting "Removed 4 test account(s)" and the database deleted
afterwards. Raw PostgreSQL row counts taken directly (not through the API) before and after two
full isolated runs: students 63/4 active, courses 55/36 active, users 4/4 — **identical**. The
development database is not touched at all.

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
`loginAsAdmin` uses the same resolution. It was hardcoded to `admin@example.com` /
`YourSecurePassword123!`, which is exactly what `seed_e2e_data.py` creates — correct for a
seeded E2E database, but not for a local run pointed at the dev PostgreSQL, where it simply
throws. The candidate list keeps it working in both.

**Accounts are covered even in specs that do not use the tracker.** `registerUser` now appends
every account it creates to `test-results/e2e-created-users.jsonl` (`tests/e2e/created-users.ts`),
and a new `playwright-global-teardown.ts` deletes whatever the file holds at the end of the run.
Because the record is a file rather than in-memory state, it survives the process: a run that
crashes is tidied up by the **next** one. Accounts it cannot delete are named and the record is
kept, so nothing is silently dropped.

**Verified**:
- before and after a full `student-management.spec.ts` run — 8 students, 27 courses and
  11 accounts, unchanged. The same run previously added 5 students, 3 courses and 4 accounts.
  **Measured through the API**: `students` and `courses` are soft-deleted (`is_active`,
  `deleted_at`), so the rows are hidden rather than removed and the tables still grow. Only
  accounts are hard-deleted. That is why the disposable database above, not this, is the fix;
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

The role depends on which database the run points at, which is the real point. `seed_e2e_data.py`
creates `test@example.com` as an **admin**, so the `role: 'admin'` label was right for a seeded
E2E database (and for CI) — but on this machine E2E runs against the dev PostgreSQL, where the
same account is a **teacher**. The label was never checked against anything either way; it was
only logged. The helper now reads the role back from the session after login and returns the
truth (locally the log shows `role: teacher`; in CI it is admin), and a spec that needs admin
rights says so with the new `expectRole(page, 'admin')` or uses `loginAsAdmin`. Nothing in these
specs needed admin: all 7 pass locally as a teacher and in CI as an admin. The durable fix is
done — see "E2E runs against a disposable database" above (`RUN_E2E_ISOLATED.ps1`).

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
  database was done the same day - see "E2E runs against a disposable database". Original note: every run registers accounts
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
- **`SMS_ALLOW_DIRECT_PYTEST=1` is set in the Windows user environment** (→ **Next todos #2**),
  disabling the `conftest.py` guard — see the gate-audit section. Only fixable outside the repo.
- **The 0.7s commit-gate flake is still unexplained** (→ **Next todos #1**) — the batch runner
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
Windows environment variables if the guard is meant to apply here. Tracked as **Next todos #2**.

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



