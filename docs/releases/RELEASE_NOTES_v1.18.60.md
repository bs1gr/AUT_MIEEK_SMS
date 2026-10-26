# Release Notes - Version 1.18.60

**Release Date**: 2026-10-27
**Previous Version**: v1.18.59

## 🔒 Security

- **filelock** 3.32.7 → 4.2.4: ReadWriteLock/SoftFileLock side-file and oplock advisories (affected 3.20.4–4.2.0). This advisory was also failing the `pip-audit` job on every pip PR.
- **OpenTelemetry** family 1.39.1/0.60b1 → 1.45.1/0.66b1 in the root `pyproject.toml`, matching `requirements.txt` (unbounded `tracestate` parsing).
- **vitest** and `@vitest/*` 4.1.11 → 4.1.12 (mocker code injection, Windows path traversal).
- **uuid** npm override `xcode → uuid ^11.1.1`: `@capacitor/cli` 8.5 pulls a vulnerable `uuid` 7 through `xcode` (GHSA-w5hq-g745-h8pq).
- **protobuf** 6.33.6 → 7.36.2 (CVE-2026-0994; `opentelemetry-proto` 1.45.1 allows `<8`).

## 🐛 Bug Fixes

- **i18n**: the language switcher was wrong on regional locales. i18next stores the detected locale verbatim (for example `en-US`) while the switcher compared against `en`, so an English UI showed "ΕΛ → EN" and the first tap did nothing visible. The language context now reduces any locale to the two shipped codes (`el*` → `el`, everything else → `en`). Found on an `en-US` Android device.
- **i18n**: the switcher's accessibility label and title used translation keys that never existed, and the navigation's two `aria-label`s were English literals. All are now translated in EN and EL.
- **docker**: the Docker images had been failing to build on `main` and every PR since 2026-10-25. `Dockerfile.fullstack` and `Dockerfile.frontend` now copy the lockfile and run `npm ci` instead of a lockfile-less `npm install`, which had floated to `@vitest/eslint-plugin` 1.6.28 (requires TypeScript 6).
- **android**: `ExampleInstrumentedTest` asserted the Capacitor template package and could never pass; it now checks `cy.mieek.sms`.

## 📱 Android

- **Capacitor 7.6.9 → 8.5.3** (core/cli/android; app 8.1.2, network/preferences 8.0.1) with the official 8.0 migration: minSdk 24, compile/target SDK 36, updated AndroidX and cordova-android versions, `density` added to `configChanges`, `=` assignments in `app/build.gradle`.
- `index.html`: `viewport-fit=cover` removed so Capacitor pads the WebView natively on every WebView version (no CSS reads the safe-area insets).
- AGP 9.4.1, google-services 4.5.0, Gradle 9.6 (Android Studio Rabbit sync fixes). Manifest: permissions before `<application>`; `fullBackupContent=false` plus `data_extraction_rules.xml` excluding app data from cloud backup and device transfer.
- The Capacitor 8 CLI needs Node 22 or later (CI already uses 22).

## 📦 Dependencies

- **Backend**: FastAPI 0.161.1, Starlette 1.9.0, SQLAlchemy 2.1.6, Alembic 1.20.1, pandas 3.1.0, reportlab 5.1.0, pydantic-settings 2.16.1, ruff 0.17.2, pypdf ≥ 6.21.2, virtualenv 21.14.13. Root `pyproject.toml` pins synced to `requirements.txt`.
- **Frontend**: every in-range minor/patch update (npm 11 lockfile), serialize-javascript 7.1.4, fast-uri 3.1.9. `@vitest/eslint-plugin` pinned to 1.6.27 until TypeScript 6.
- Supersedes Dependabot #289–#304.

## 🤖 CI/CD

- actions/setup-node v7, dependabot/fetch-metadata v3.1.0, actions/create-github-app-token 3.3.0.
- Frontend lint job: dropped the Playwright browser install, Python setup and a dead installer Greek-text step. The browser install had hung until the 25-minute job timeout on PR #306.
- `dependabot.yml`: ignore `@vitest/eslint-plugin` ≥ 1.6.28 until TypeScript 6.

## 📝 Documentation

- **plan**: recorded the v1.18.59 release, Smart App Control follow-ups, and the 2026-10-26 security/upgrade round (todos 34–36).

## ✅ Verification

- Backend `RUN_TESTS_BATCH`: 45/45 batches pass. `pip check` and `pip-audit`: clean.
- Frontend: `npm audit` 0 vulnerabilities, ESLint 0 errors, `tsc` clean, Vitest 1820/1820.
- Isolated E2E, Docker image smoke, frozen Lite smoke and Android emulator smoke (Android 16, SDK 36) passed on the release commit.

---

### 📊 Statistics

- **Total Commits**: 6 (PR #306 squashes 6 further commits)
- **Contributors**: 2
