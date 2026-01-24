# Smoke Test Checklist 1.12.x

**Purpose**: Guided smoke test to validate core functionality, installer assets, and bilingual UX before tagging or releasing any v1.12.x build.

**Estimated Time**: 25–35 minutes (manual path) · 10 minutes (automated quick path)

**Supported Modes**: Docker (recommended) · Native (development parity)

**Last Reviewed**: 2025-12-13

---

## 1. Pre-Test Preparation

- [ ] Confirm clean working tree (`git status` shows no pending changes)
- [ ] `.env` files present in `backend/` and `frontend/`
- [ ] Back up production database if reusing real data (`backups/` directory)
- [ ] Verify PowerShell execution policy allows repo scripts (`Get-ExecutionPolicy`)

### Version sanity check

```powershell
Get-Content .\VERSION              # Expect 1.12.x
(Get-Content .\frontend\package.json | ConvertFrom-Json).version

```text
- [ ] Version files aligned with target release number (VERSION + package.json)

---

## 2. Quick Automation Path (Smoke Baseline)

This path should be executed first; the manual sections deepen coverage.

```powershell
# 1. Reset + run deterministic encoding regeneration

python fix_greek_encoding_permanent.py

# 2. Run quick commit-ready validation

.\COMMIT_READY.ps1 -Quick

# 3. Launch developer smoke script (native defaults)

scripts\dev\SMOKE_TEST.ps1

```text
- [ ] `COMMIT_READY.ps1 -Quick` finishes without failures (lint, format, essential tests)
- [ ] `scripts\dev\SMOKE_TEST.ps1` reports success for API + frontend probes
- [ ] `fix_greek_encoding_permanent.py` updates `installer/*.txt` timestamps

If any step fails, resolve before continuing. Re-run the failing script to confirm the fix.

---

## 3. Platform Startup Verification (10 min)

### Docker Flow (Production Parity)

```powershell
.\DOCKER.ps1 -Stop
.\DOCKER.ps1 -Update            # rebuilds if needed
.\DOCKER.ps1 -Start

```text
- [ ] Container image builds without errors
- [ ] `curl http://localhost:8080/health` returns **200** with `database_status="ok"`
- [ ] Frontend reachable at `http://localhost:8080`
- [ ] Swagger UI at `http://localhost:8080/docs`
- [ ] `docker logs sms-fullstack` shows no exceptions or migration failures

### Native Flow (Developer Parity)

```powershell
.\NATIVE.ps1 -Stop
.\NATIVE.ps1 -Setup             # only required after dependency changes
.\NATIVE.ps1 -Start

```text
- [ ] Backend running on port **8000** (check `http://localhost:8000/health`)
- [ ] Frontend on port **5173** with hot reload
- [ ] Lifespan migration task completes instantly (no blocking output)
- [ ] CTRL+C stops both services cleanly (`NATIVE.ps1 -Stop` as fallback)

---

## 4. Authentication & Security (5 min)

- [ ] Register new admin user via UI (validation prompts in EN + EL)
- [ ] Logout/login cycle succeeds; refresh token persists session
- [ ] Attempt API request burst (`for` loop) returns 429 after rate limit
- [ ] Requests include `Retry-After` header per limiter settings
- [ ] (Docker) Confirm CSRF cookie present and enforced on POST without token

---

## 5. Core Workflows (10 min)

### Students

- [ ] Create student with Greek name (`Γιάννης Παπαδόπουλος`) + unique email
- [ ] Student visible in list and searchable in both languages
- [ ] Edit email field and verify persistence after page refresh
- [ ] Soft delete hides from active list; appears when filtering for inactive

### Courses & Enrollments

- [ ] Create course (code `CS101`) with semester metadata
- [ ] Enroll previously created student; enrollment reflected on student detail view
- [ ] Verify attendance tab lists enrolled students without duplicates

### Grades & Performance

- [ ] Add Midterm (40%) + Final (60%) components and observe weighted calculation
- [ ] Set absence penalty on course; final grade reflects deduction
- [ ] Export grade report (CSV) → file opens with correct encoding

### Attendance

- [ ] Record attendance (Present/Late/Absent) for created course/date
- [ ] Generate attendance summary and confirm totals match UI badges

---

## 6. Internationalization & Accessibility (3 min)

- [ ] Language auto-detect respects browser locale (EN / EL)
- [ ] Manual toggle persists via localStorage on refresh
- [ ] Confirm new v1.12.x strings (Operations dashboard, Installer notes) translated
- [ ] Check high-contrast theme toggle (if enabled) maintains readability

---

## 7. API & Monitoring (4 min)

- [ ] `/api/v1/students` response includes pagination metadata
- [ ] Error probe (`POST /api/v1/students` with invalid payload) returns RFC 7807 structure
- [ ] Health endpoints (`/health`, `/health/ready`, `/health/live`) all healthy
- [ ] `backend/logs/app.log` contains request IDs and no stack traces
- [ ] Structured log `backend/logs/structured.json` rotates without exceeding 2 MB

---

## 8. Installer & Encoding Checks (3 min)

- [ ] Run `installer/README.md` quick-start section to ensure prerequisites satisfied
- [ ] `INSTALLER_BUILDER.ps1 -DryRun` completes (no missing assets)
- [ ] Greek installer text files display correct version + diacritics after regeneration
- [ ] Generated `SMS_Installer.exe` (if built) installs and launches application splash screen

---

## 9. Final Gate & Sign-off (3 min)

- [ ] `COMMIT_READY.ps1 -Standard` (or `-Full` before GA) finishes successfully
- [ ] `git status` remains clean after all scripts run (no unintended changes)
- [ ] Document all findings in release notes or deployment checklist
- [ ] Tag and release only after every checkbox above is satisfied

---

### Optional Follow-ups

- Capture key screenshots for release archives or QA docs
- Record timings for Docker build and smoke scenarios to feed performance baselines
- Create GitHub discussion entry summarising anomalies or noteworthy observations

